import {
  generateSecureProof,
  verifySecureProof,
  serializeCanonicalProofPayload,
  validateProofStructure,
  SecureBiometricProof,
  CURRENT_PROTOCOL_VERSION,
} from '../proof';
import { generateEphemeralP256KeyPair } from '../crypto/signature';
import { LivenessResult } from '../types';

describe('Secure Biometric Proof Suite (Protocol v2.0)', () => {
  const keyPair = generateEphemeralP256KeyPair();
  const mockLivenessResult: LivenessResult = {
    status: 'live',
    score: 0.94,
    confidence: 0.96,
    passiveScore: 0.91,
    challengePassed: true,
    samplesCollected: 4,
    durationMs: 1420,
    timestamp: Date.now(),
    similarity: 0.88,
    isMatch: true,
    matchedUserId: 'USER_PRIMARY_01',
  };

  describe('Canonical Serialization & Structure Validation', () => {
    test('produces deterministic canonical string encoding all fields', () => {
      const canonical = serializeCanonicalProofPayload({
        protocolVersion: CURRENT_PROTOCOL_VERSION,
        proofId: 'prf_test123',
        sessionId: 'sess_abc456',
        deviceId: 'dev_phone789',
        userId: 'USER_PRIMARY_01',
        issuedAt: '2026-11-10T00:00:00.000Z',
        expiresAt: '2026-11-10T00:01:00.000Z',
        nonce: 'nonce_secret_xyz',
        livenessScore: 0.94,
        passiveScore: 0.91,
        recognitionScore: 0.88,
        isMatch: true,
        challengeType: 'smile',
        challengeResult: true,
        durationMs: 1420,
        modelVersion: 'MiniFASNetV2-80x80',
        signatureAlgorithm: 'ECDSA_P256_SHA256',
      });

      expect(typeof canonical).toBe('string');
      expect(canonical).toContain('v=2.0');
      expect(canonical).toContain('uid=USER_PRIMARY_01');
      expect(canonical).toContain('ls=0.9400');
      expect(canonical).toContain('ps=0.9100');
      expect(canonical).toContain('rs=0.8800');
      expect(canonical).toContain('match=true');
      expect(canonical).toContain('ctype=smile');
      expect(canonical).toContain('cres=true');
    });

    test('validateProofStructure rejects unsupported protocol versions', () => {
      const check = validateProofStructure({
        protocolVersion: '1.0',
        proofId: 'prf_1',
      });
      expect(check.valid).toBe(false);
      expect(check.code).toBe('UNSUPPORTED_VERSION');
    });

    test('validateProofStructure rejects out of bounds scores', () => {
      const baseProof = {
        protocolVersion: CURRENT_PROTOCOL_VERSION,
        proofId: 'prf_1',
        sessionId: 's_1',
        deviceId: 'd_1',
        userId: 'u_1',
        issuedAt: '2026-11-10T00:00:00.000Z',
        expiresAt: '2026-11-10T00:01:00.000Z',
        nonce: 'n_1',
        livenessScore: 1.5, // Invalid > 1.0
        passiveScore: 0.9,
        challengeResult: true,
        durationMs: 1000,
        modelVersion: 'MiniFASNetV2',
        signatureAlgorithm: 'ECDSA_P256_SHA256',
        signature: 'sig',
      };

      const checkHigh = validateProofStructure(baseProof);
      expect(checkHigh.valid).toBe(false);
      expect(checkHigh.code).toBe('SCORE_OUT_OF_BOUNDS');

      const checkNegative = validateProofStructure({ ...baseProof, livenessScore: -0.1 });
      expect(checkNegative.valid).toBe(false);
      expect(checkNegative.code).toBe('SCORE_OUT_OF_BOUNDS');
    });
  });

  describe('ECDSA P-256 Proof Generation & Verification', () => {
    let validProof: SecureBiometricProof;

    beforeAll(async () => {
      validProof = await generateSecureProof({
        userId: 'USER_PRIMARY_01',
        sessionId: 'session_live_999',
        deviceId: 'device_pixel_8a',
        nonce: 'server_issued_nonce_555',
        result: mockLivenessResult,
        challengeType: 'smile',
        signer: { type: 'ecdsa', privateKey: keyPair.privateKeyHex },
      });
    });

    test('valid ECDSA proof passes verification', () => {
      const verification = verifySecureProof(validProof, {
        key: keyPair.publicKeyBase64,
        expectedSessionId: 'session_live_999',
        expectedUserId: 'USER_PRIMARY_01',
        expectedDeviceId: 'device_pixel_8a',
        expectedNonce: 'server_issued_nonce_555',
      });

      expect(verification.valid).toBe(true);
      expect(verification.code).toBe('VALID');
    });

    test('adversarial test: tampering with livenessScore fails verification', () => {
      // Attacker inflates liveness score from 0.94 to 0.99
      const tampered = { ...validProof, livenessScore: 0.99 };
      const verification = verifySecureProof(tampered, {
        key: keyPair.publicKeyBase64,
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('SIGNATURE_INVALID');
      expect(verification.reason).toContain('tampered');
    });

    test('adversarial test: tampering with userId fails verification', () => {
      // Attacker modifies userId to impersonate another user
      const tampered = { ...validProof, userId: 'USER_VICTIM_02' };
      const verification = verifySecureProof(tampered, {
        key: keyPair.publicKeyBase64,
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('SIGNATURE_INVALID');
    });

    test('adversarial test: tampering with challengeType fails verification', () => {
      const tampered = { ...validProof, challengeType: 'blink' as const };
      const verification = verifySecureProof(tampered, {
        key: keyPair.publicKeyBase64,
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('SIGNATURE_INVALID');
    });

    test('adversarial test: tampering with challengeResult fails verification', () => {
      const tampered = { ...validProof, challengeResult: false };
      const verification = verifySecureProof(tampered, {
        key: keyPair.publicKeyBase64,
      });

      expect(verification.valid).toBe(false);
    });

    test('adversarial test: tampering with timestamps fails verification', () => {
      // Shift issuedAt by 2 seconds while keeping expiresAt > issuedAt
      const originalIssuedMs = Date.parse(validProof.issuedAt);
      const tamperedIssuedIso = new Date(originalIssuedMs + 2000).toISOString();
      const tampered = { ...validProof, issuedAt: tamperedIssuedIso };
      const verification = verifySecureProof(tampered, {
        key: keyPair.publicKeyBase64,
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('SIGNATURE_INVALID');
    });

    test('adversarial test: tampering with nonce fails verification', () => {
      const tampered = { ...validProof, nonce: 'tampered_nonce_xyz' };
      const verification = verifySecureProof(tampered, {
        key: keyPair.publicKeyBase64,
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('SIGNATURE_INVALID');
    });

    test('rejects expired proof', () => {
      // Simulate proof verification 5 minutes after expiration
      const futureNow = new Date(Date.parse(validProof.expiresAt) + 300000);
      const verification = verifySecureProof(validProof, {
        key: keyPair.publicKeyBase64,
        now: futureNow,
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('PROOF_EXPIRED');
    });

    test('rejects future-dated proof', () => {
      // Simulate verification on a clock before issuedAt
      const pastNow = new Date(Date.parse(validProof.issuedAt) - 600000);
      const verification = verifySecureProof(validProof, {
        key: keyPair.publicKeyBase64,
        now: pastNow,
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('PROOF_FUTURE_DATED');
    });

    test('rejects wrong session ID binding', () => {
      const verification = verifySecureProof(validProof, {
        key: keyPair.publicKeyBase64,
        expectedSessionId: 'different_session_000',
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('SESSION_MISMATCH');
    });

    test('rejects wrong device key binding', () => {
      const verification = verifySecureProof(validProof, {
        key: keyPair.publicKeyBase64,
        expectedDeviceId: 'different_device_id',
      });

      expect(verification.valid).toBe(false);
      expect(verification.code).toBe('DEVICE_KEY_MISMATCH');
    });
  });

  describe('HMAC-SHA256 Proof Generation & Verification', () => {
    const hmacSecret = 'server_shared_hmac_secret_key_777';

    test('generates and verifies HMAC-SHA256 signed proof', async () => {
      const proof = await generateSecureProof({
        userId: 'USER_HMAC_01',
        sessionId: 'session_hmac_1',
        deviceId: 'device_kiosk_terminal',
        nonce: 'nonce_kiosk_123',
        result: mockLivenessResult,
        challengeType: 'smile',
        signer: { type: 'hmac', secretKey: hmacSecret },
      });

      expect(proof.signatureAlgorithm).toBe('HMAC_SHA256');

      const verification = verifySecureProof(proof, {
        key: hmacSecret,
      });

      expect(verification.valid).toBe(true);
      expect(verification.code).toBe('VALID');

      // Tampering fails
      const tampered = { ...proof, livenessScore: 0.12 };
      const tamperedVerify = verifySecureProof(tampered, { key: hmacSecret });
      expect(tamperedVerify.valid).toBe(false);
    });
  });
});
