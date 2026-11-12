/**
 * End-to-End Verification Demo
 * Demonstrates:
 * 1. Device key registration
 * 2. Server challenge issuance (unpredictable 256-bit nonce)
 * 3. Client attestation proof generation (ECDSA P-256)
 * 4. Server verification and single-use atomic nonce consumption
 * 5. Replay attack detection on resubmission
 * 6. Tampering detection on modified liveness score
 */

import {
  ServerVerificationService,
  AtomicNonceStore,
  DeviceKeyRegistry,
} from '../src/server';
import { generateSecureProof } from '../src/proof';
import { generateEphemeralP256KeyPair } from '../src/crypto/signature';
import { LivenessResult } from '../src/types';

async function runDemo() {
  console.log('====================================================');
  console.log('   Face Liveness Recognition - Security Demo v2.0   ');
  console.log('====================================================\n');

  // 1. Initialize Server Infrastructure
  const nonceStore = new AtomicNonceStore();
  const keyRegistry = new DeviceKeyRegistry();
  const server = new ServerVerificationService(nonceStore, keyRegistry);

  const userId = 'EMP_1024';
  const deviceId = 'android_pixel_keystore_alias';

  // Simulate device generating a key pair in Keystore (in production: done natively in TEE)
  const clientDeviceKey = generateEphemeralP256KeyPair();

  console.log('[1] Device Public Key Registration:');
  const regKey = server.keyRegistry.registerKey({
    deviceId,
    userId,
    publicKey: clientDeviceKey.publicKeyBase64,
    isHardwareBacked: true,
  });
  console.log(`    Registered deviceId="${regKey.deviceId}" for userId="${regKey.userId}" (Hardware-Backed: ${regKey.isHardwareBacked})`);
  console.log(`    SPKI Public Key (truncated): ${regKey.publicKey.substring(0, 32)}...\n`);

  // 2. Server Issues Challenge
  console.log('[2] Requesting Challenge Nonce from Server:');
  const challenge = server.issueChallenge({
    sessionId: 'sess_attendance_morning_01',
    userId,
    deviceId,
    ttlMs: 60000,
  });
  console.log(`    Session ID: ${challenge.sessionId}`);
  console.log(`    Nonce (256-bit): ${challenge.nonce}`);
  console.log(`    Expires at: ${new Date(challenge.expiresAt).toISOString()}\n`);

  // 3. Client Performs Live Face Scan & Generates Proof
  console.log('[3] Mobile Client Evaluates Camera Frame & Signs Proof:');
  const mockScanResult: LivenessResult = {
    status: 'live',
    score: 0.94,
    confidence: 0.97,
    passiveScore: 0.91,
    challengePassed: true,
    samplesCollected: 5,
    durationMs: 1350,
    timestamp: Date.now(),
    similarity: 0.89,
    isMatch: true,
    matchedUserId: userId,
  };

  const proof = await generateSecureProof({
    userId,
    sessionId: challenge.sessionId,
    deviceId,
    nonce: challenge.nonce,
    result: mockScanResult,
    challengeType: 'smile',
    signer: { type: 'ecdsa', privateKey: clientDeviceKey.privateKeyHex },
  });

  console.log(`    Proof ID: ${proof.proofId}`);
  console.log(`    Protocol Version: ${proof.protocolVersion}`);
  console.log(`    Liveness Score: ${proof.livenessScore}`);
  console.log(`    Signature Algorithm: ${proof.signatureAlgorithm}`);
  console.log(`    DER Signature (truncated): ${proof.signature.substring(0, 32)}...\n`);

  // 4. Server Verifies Proof
  console.log('[4] Server Verification (Initial Submission):');
  const result = await server.verifyProof(proof);
  console.log(`    Status: ${result.success ? 'SUCCESS (VERIFIED)' : 'REJECTED'}`);
  console.log(`    Code: ${result.code}`);
  console.log(`    Signature Valid: ${result.cryptographicVerification.signatureValid}`);
  console.log(`    Nonce Consumed: ${result.cryptographicVerification.nonceConsumed}`);
  console.log(`    Biometric Genuine: ${result.livenessVerification.isLive}\n`);

  // 5. Adversarial Scenario A: Replay Attack (resubmitting identical payload)
  console.log('[5] Adversarial Attack Simulation A: Replay Attack');
  console.log('    An attacker captured the network request and replays it:');
  const replayResult = await server.verifyProof(proof);
  console.log(`    Result: ${replayResult.success ? 'VULNERABLE (Accepted)' : 'BLOCKED (Rejected)'}`);
  console.log(`    Rejection Code: ${replayResult.code}`);
  console.log(`    Reason: "${replayResult.reason}"\n`);

  // 6. Adversarial Scenario B: Score Tampering
  console.log('[6] Adversarial Attack Simulation B: Payload Score Tampering');
  console.log('    An attacker intercepts a failed scan (score=0.25) and changes it to 0.99:');
  const freshChallenge = server.issueChallenge({
    sessionId: 'sess_attendance_morning_02',
    userId,
    deviceId,
  });

  const lowScoreProof = await generateSecureProof({
    userId,
    sessionId: freshChallenge.sessionId,
    deviceId,
    nonce: freshChallenge.nonce,
    result: { ...mockScanResult, score: 0.25 },
    signer: { type: 'ecdsa', privateKey: clientDeviceKey.privateKeyHex },
  });

  // Tamper with score after signing
  const tamperedProof = { ...lowScoreProof, livenessScore: 0.99 };
  const tamperedResult = await server.verifyProof(tamperedProof);
  console.log(`    Result: ${tamperedResult.success ? 'VULNERABLE (Accepted)' : 'BLOCKED (Rejected)'}`);
  console.log(`    Rejection Code: ${tamperedResult.code}`);
  console.log(`    Reason: "${tamperedResult.reason}"\n`);

  console.log('====================================================');
  console.log('       Security Hardening Verification Complete     ');
  console.log('====================================================');
}

runDemo().catch(console.error);
