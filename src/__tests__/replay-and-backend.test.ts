import {
  AtomicNonceStore,
  DeviceKeyRegistry,
  ServerVerificationService,
} from '../server';
import { generateSecureProof } from '../proof';
import { generateEphemeralP256KeyPair } from '../crypto/signature';
import { LivenessResult } from '../types';

describe('Replay Protection & Reference Backend Verification Suite', () => {
  describe('AtomicNonceStore & Replay Defense', () => {
    let nonceStore: AtomicNonceStore;

    beforeEach(() => {
      nonceStore = new AtomicNonceStore();
    });

    test('issues unpredictable nonces with session and device bindings', () => {
      const challenge = nonceStore.issueChallenge({
        sessionId: 'sess_001',
        userId: 'USER_101',
        deviceId: 'DEV_PIXEL',
        ttlMs: 60000,
      });

      expect(typeof challenge.nonce).toBe('string');
      expect(challenge.nonce.length).toBeGreaterThanOrEqual(40);
      expect(challenge.status).toBe('ISSUED');
      expect(challenge.sessionId).toBe('sess_001');
      expect(challenge.userId).toBe('USER_101');
      expect(challenge.deviceId).toBe('DEV_PIXEL');
    });

    test('atomically consumes nonce exactly once', async () => {
      const challenge = nonceStore.issueChallenge({
        sessionId: 'sess_001',
        userId: 'USER_101',
        deviceId: 'DEV_PIXEL',
      });

      const firstConsume = await nonceStore.consumeNonce(challenge.nonce, {
        sessionId: 'sess_001',
        userId: 'USER_101',
        deviceId: 'DEV_PIXEL',
        proofId: 'proof_123',
      });

      expect(firstConsume.success).toBe(true);
      expect(firstConsume.record?.status).toBe('CONSUMED');

      // Second consumption of the same nonce MUST be rejected as a replay attack
      const secondConsume = await nonceStore.consumeNonce(challenge.nonce, {
        sessionId: 'sess_001',
        userId: 'USER_101',
        deviceId: 'DEV_PIXEL',
        proofId: 'proof_replay_attack',
      });

      expect(secondConsume.success).toBe(false);
      expect(secondConsume.code).toBe('NONCE_ALREADY_CONSUMED');
      expect(secondConsume.reason).toContain('Replay attack detected');
    });

    test('rejects unknown or expired nonces', async () => {
      const unknownResult = await nonceStore.consumeNonce('nonce_that_does_not_exist', {
        sessionId: 's',
        userId: 'u',
        deviceId: 'd',
      });
      expect(unknownResult.success).toBe(false);
      expect(unknownResult.code).toBe('NONCE_NOT_FOUND');

      // Expired nonce
      const expiredChallenge = nonceStore.issueChallenge({
        sessionId: 'sess_exp',
        userId: 'USER_EXP',
        deviceId: 'DEV_EXP',
        ttlMs: 100, // 100ms TTL
      });

      // Advance time by 200ms
      const expiredResult = await nonceStore.consumeNonce(expiredChallenge.nonce, {
        sessionId: 'sess_exp',
        userId: 'USER_EXP',
        deviceId: 'DEV_EXP',
        now: Date.now() + 500,
      });

      expect(expiredResult.success).toBe(false);
      expect(expiredResult.code).toBe('NONCE_EXPIRED');
    });

    test('rejects session, user, or device substitution attacks', async () => {
      const challenge = nonceStore.issueChallenge({
        sessionId: 'sess_legit',
        userId: 'USER_LEGIT',
        deviceId: 'DEV_LEGIT',
      });

      // Wrong session ID
      const sessionMismatch = await nonceStore.consumeNonce(challenge.nonce, {
        sessionId: 'sess_attacker',
        userId: 'USER_LEGIT',
        deviceId: 'DEV_LEGIT',
      });
      expect(sessionMismatch.success).toBe(false);
      expect(sessionMismatch.code).toBe('SESSION_MISMATCH');

      // Wrong user ID
      const userMismatch = await nonceStore.consumeNonce(challenge.nonce, {
        sessionId: 'sess_legit',
        userId: 'USER_ATTACKER',
        deviceId: 'DEV_LEGIT',
      });
      expect(userMismatch.success).toBe(false);
      expect(userMismatch.code).toBe('USER_MISMATCH');

      // Wrong device ID
      const deviceMismatch = await nonceStore.consumeNonce(challenge.nonce, {
        sessionId: 'sess_legit',
        userId: 'USER_LEGIT',
        deviceId: 'DEV_ATTACKER',
      });
      expect(deviceMismatch.success).toBe(false);
      expect(deviceMismatch.code).toBe('DEVICE_MISMATCH');
    });

    test('adversarial test: concurrent replay requests cannot both succeed', async () => {
      const challenge = nonceStore.issueChallenge({
        sessionId: 'sess_concurrent',
        userId: 'USER_CONCURRENT',
        deviceId: 'DEV_CONCURRENT',
      });

      // Fire 10 simultaneous asynchronous consumption attempts for the exact same nonce
      const concurrencyCount = 10;
      const tasks = Array.from({ length: concurrencyCount }, (_, i) =>
        nonceStore.consumeNonce(challenge.nonce, {
          sessionId: 'sess_concurrent',
          userId: 'USER_CONCURRENT',
          deviceId: 'DEV_CONCURRENT',
          proofId: `proof_concurrent_${i}`,
        })
      );

      const results = await Promise.all(tasks);

      const successfulConsumptions = results.filter((r) => r.success);
      const rejectedConsumptions = results.filter((r) => !r.success);

      // Exactly ONE request must succeed; all others must be rejected
      expect(successfulConsumptions.length).toBe(1);
      expect(rejectedConsumptions.length).toBe(concurrencyCount - 1);
      for (const rej of rejectedConsumptions) {
        expect(rej.code).toBe('NONCE_ALREADY_CONSUMED');
      }
    });

    test('pruneExpired cleans up stale challenges', () => {
      nonceStore.issueChallenge({
        sessionId: 's1',
        userId: 'u1',
        deviceId: 'd1',
        ttlMs: 100,
      });
      nonceStore.issueChallenge({
        sessionId: 's2',
        userId: 'u2',
        deviceId: 'd2',
        ttlMs: 60000,
      });

      const pruned = nonceStore.pruneExpired(Date.now() + 1000);
      expect(pruned).toBe(1);
    });
  });

  describe('DeviceKeyRegistry (Key Lifecycle & Rotation)', () => {
    let keyRegistry: DeviceKeyRegistry;
    const keyPair1 = generateEphemeralP256KeyPair();
    const keyPair2 = generateEphemeralP256KeyPair();

    beforeEach(() => {
      keyRegistry = new DeviceKeyRegistry();
    });

    test('registers and retrieves active device public key', () => {
      const reg = keyRegistry.registerKey({
        deviceId: 'DEV_001',
        userId: 'USER_001',
        publicKey: keyPair1.publicKeyBase64,
        isHardwareBacked: true,
      });

      expect(reg.keyVersion).toBe(1);
      expect(reg.isHardwareBacked).toBe(true);

      const activeKey = keyRegistry.getActiveKey('DEV_001', 'USER_001');
      expect(activeKey).toBeDefined();
      expect(activeKey?.publicKey).toBe(keyPair1.publicKeyBase64);
    });

    test('key rotation increments version and updates active key', () => {
      keyRegistry.registerKey({
        deviceId: 'DEV_001',
        userId: 'USER_001',
        publicKey: keyPair1.publicKeyBase64,
        isHardwareBacked: true,
      });

      const rotated = keyRegistry.rotateKey('DEV_001', 'USER_001', keyPair2.publicKeyBase64, true, true);
      expect(rotated.keyVersion).toBe(2);
      expect(rotated.publicKey).toBe(keyPair2.publicKeyBase64);
      expect(rotated.isStrongBoxBacked).toBe(true);

      const activeKey = keyRegistry.getActiveKey('DEV_001', 'USER_001');
      expect(activeKey?.publicKey).toBe(keyPair2.publicKeyBase64);
    });

    test('key revocation invalidates active key', () => {
      keyRegistry.registerKey({
        deviceId: 'DEV_001',
        userId: 'USER_001',
        publicKey: keyPair1.publicKeyBase64,
        isHardwareBacked: true,
      });

      const revoked = keyRegistry.revokeKey('DEV_001', 'USER_001');
      expect(revoked).toBe(true);

      const activeKey = keyRegistry.getActiveKey('DEV_001', 'USER_001');
      expect(activeKey).toBeUndefined();
    });
  });

  describe('ServerVerificationService (End-to-End)', () => {
    let server: ServerVerificationService;
    const deviceKey = generateEphemeralP256KeyPair();
    const userId = 'USER_ALEX_99';
    const deviceId = 'PIXEL_DEVICE_77';

    const liveResult: LivenessResult = {
      status: 'live',
      score: 0.93,
      confidence: 0.95,
      passiveScore: 0.89,
      challengePassed: true,
      samplesCollected: 4,
      durationMs: 1200,
      timestamp: Date.now(),
      similarity: 0.86,
      isMatch: true,
      matchedUserId: userId,
    };

    beforeEach(() => {
      server = new ServerVerificationService();
      server.keyRegistry.registerKey({
        deviceId,
        userId,
        publicKey: deviceKey.publicKeyBase64,
        isHardwareBacked: true,
      });
    });

    test('complete verification workflow succeeds', async () => {
      // 1. Mobile requests challenge from server
      const challenge = server.issueChallenge({
        sessionId: 'sess_live_123',
        userId,
        deviceId,
      });

      // 2. Mobile signs proof with Android Keystore key
      const proof = await generateSecureProof({
        userId,
        sessionId: 'sess_live_123',
        deviceId,
        nonce: challenge.nonce,
        result: liveResult,
        challengeType: 'smile',
        signer: { type: 'ecdsa', privateKey: deviceKey.privateKeyHex },
      });

      // 3. Server verifies proof
      const res = await server.verifyProof(proof);
      expect(res.success).toBe(true);
      expect(res.code).toBe('VERIFIED');
      expect(res.cryptographicVerification.signatureValid).toBe(true);
      expect(res.cryptographicVerification.nonceConsumed).toBe(true);
      expect(res.cryptographicVerification.deviceKeyHardwareBacked).toBe(true);
      expect(res.livenessVerification.isLive).toBe(true);
    });

    test('replaying a valid proof fails with NONCE_REPLAY_ATTACK', async () => {
      const challenge = server.issueChallenge({
        sessionId: 'sess_replay_test',
        userId,
        deviceId,
      });

      const proof = await generateSecureProof({
        userId,
        sessionId: 'sess_replay_test',
        deviceId,
        nonce: challenge.nonce,
        result: liveResult,
        challengeType: 'smile',
        signer: { type: 'ecdsa', privateKey: deviceKey.privateKeyHex },
      });

      // First submission passes
      const firstRes = await server.verifyProof(proof);
      expect(firstRes.success).toBe(true);

      // Replay attempt fails
      const replayRes = await server.verifyProof(proof);
      expect(replayRes.success).toBe(false);
      expect(replayRes.code).toBe('NONCE_REPLAY_ATTACK');
      expect(replayRes.reason).toContain('Replay attack detected');
    });

    test('valid signature but spoof face score fails liveness check', async () => {
      const challenge = server.issueChallenge({
        sessionId: 'sess_spoof_test',
        userId,
        deviceId,
      });

      const spoofResult: LivenessResult = {
        ...liveResult,
        status: 'spoof',
        score: 0.25, // Low score (spoof detected by MiniFASNet)
        passiveScore: 0.20,
      };

      // Device genuinely signs the failed check
      const proof = await generateSecureProof({
        userId,
        sessionId: 'sess_spoof_test',
        deviceId,
        nonce: challenge.nonce,
        result: spoofResult,
        challengeType: 'smile',
        signer: { type: 'ecdsa', privateKey: deviceKey.privateKeyHex },
      });

      const res = await server.verifyProof(proof);
      // Cryptographic signature is authentic, but liveness is rejected!
      expect(res.success).toBe(false);
      expect(res.code).toBe('LIVENESS_FAILED');
      expect(res.cryptographicVerification.signatureValid).toBe(true);
      expect(res.livenessVerification.isLive).toBe(false);
      expect(res.reason).toContain('below required thresholds');
    });

    test('rejects unregistered device public keys', async () => {
      const unregKeyPair = generateEphemeralP256KeyPair();
      const challenge = server.issueChallenge({
        sessionId: 'sess_unreg',
        userId: 'USER_UNREG',
        deviceId: 'DEV_UNREG',
      });

      const proof = await generateSecureProof({
        userId: 'USER_UNREG',
        sessionId: 'sess_unreg',
        deviceId: 'DEV_UNREG',
        nonce: challenge.nonce,
        result: liveResult,
        signer: { type: 'ecdsa', privateKey: unregKeyPair.privateKeyHex },
      });

      const res = await server.verifyProof(proof);
      expect(res.success).toBe(false);
      expect(res.code).toBe('DEVICE_KEY_NOT_REGISTERED');
    });
  });
});
