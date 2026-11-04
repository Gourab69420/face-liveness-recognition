import {
  packEmbedding,
  unpackEmbedding,
  encryptToken,
  decryptToken,
  computeCosineSimilarity,
  BiometricEnrollmentGuard,
  BiometricProofGenerator,
  prepareProfileForDevice,
  UserBiometricProfile,
} from '../auth';
import { LivenessResult } from '../types';

describe('Biometric Auth & Recognition Suite', () => {
  const secretKey = 'super_secure_enterprise_key_2026';

  // Sample 192-D float array (normalized)
  const sampleEmbedding = new Array(192).fill(0).map((_, i) => Math.sin(i + 1) / 10);

  test('packEmbedding and unpackEmbedding preserves 192 float dimensions', () => {
    const packed = packEmbedding(sampleEmbedding);
    expect(typeof packed).toBe('string');
    expect(packed.length).toBeGreaterThan(500);

    const unpacked = unpackEmbedding(packed);
    expect(unpacked.length).toBe(192);

    for (let i = 0; i < 192; i++) {
      expect(unpacked[i]).toBeCloseTo(sampleEmbedding[i], 5);
    }
  });

  test('encryptToken and decryptToken securely round-trips face token', () => {
    const packed = packEmbedding(sampleEmbedding);
    const encrypted = encryptToken(packed, secretKey);

    expect(encrypted).not.toEqual(packed);

    const decrypted = decryptToken(encrypted, secretKey);
    expect(decrypted).toEqual(packed);

    const restoredEmbedding = unpackEmbedding(decrypted);
    expect(restoredEmbedding.length).toBe(192);
    expect(restoredEmbedding[0]).toBeCloseTo(sampleEmbedding[0], 5);
  });

  test('computeCosineSimilarity evaluates 1.0 for identical vectors', () => {
    const sim = computeCosineSimilarity(sampleEmbedding, sampleEmbedding);
    expect(sim).toBeCloseTo(1.0, 4);
  });

  test('computeCosineSimilarity evaluates lower similarity for different vectors', () => {
    const otherEmbedding = new Array(192).fill(0).map((_, i) => Math.cos(i + 5) / 10);
    const sim = computeCosineSimilarity(sampleEmbedding, otherEmbedding);
    expect(sim).toBeLessThan(0.85);
  });

  test('BiometricEnrollmentGuard enforces one-time enrollment and admin unlocks', () => {
    const freshUser: UserBiometricProfile = {
      userId: 'USER_001',
      userName: 'Ghost',
      isLocked: false,
    };

    // First time enrollment is allowed
    const canEnrollFirst = BiometricEnrollmentGuard.canEnroll(freshUser);
    expect(canEnrollFirst.allowed).toBe(true);

    // After enrollment, profile is locked
    const lockedUser: UserBiometricProfile = {
      ...freshUser,
      isLocked: true,
      enrolledAt: new Date().toISOString(),
    };

    // Re-enrollment without admin token is rejected
    const canReEnroll = BiometricEnrollmentGuard.canEnroll(lockedUser);
    expect(canReEnroll.allowed).toBe(false);
    expect(canReEnroll.reason).toContain('already enrolled and locked');

    // Re-enrollment WITH admin permission token is approved
    const canReEnrollWithAdmin = BiometricEnrollmentGuard.canEnroll(lockedUser, 'ADMIN_OVERRIDE_TOKEN_123');
    expect(canReEnrollWithAdmin.allowed).toBe(true);
  });

  test('BiometricProofGenerator generates and verifies tamper-proof proof', () => {
    const mockResult: LivenessResult = {
      status: 'live',
      score: 0.92,
      confidence: 0.95,
      passiveScore: 0.88,
      challengePassed: true,
      samplesCollected: 4,
      durationMs: 1400,
      timestamp: Date.now(),
      similarity: 0.91,
      isMatch: true,
      matchedUserId: 'USER_001',
    };

    const proof = BiometricProofGenerator.generateProof('USER_001', mockResult, secretKey, 'smile');
    expect(proof.userId).toBe('USER_001');
    expect(proof.similarity).toBe(0.91);
    expect(proof.challengePassed).toBe(true);
    expect(typeof proof.signature).toBe('string');

    // Verification succeeds with matching key
    const verification = BiometricProofGenerator.verifyProof(proof, secretKey);
    expect(verification.valid).toBe(true);

    // Tampering with payload fails verification
    const tamperedProof = { ...proof, similarity: 0.99 };
    const tamperedVerification = BiometricProofGenerator.verifyProof(tamperedProof, secretKey);
    expect(tamperedVerification.valid).toBe(false);
    expect(tamperedVerification.reason).toContain('tampering detected');
  });

  test('prepareProfileForDevice restores encrypted DB token for cross-device match', () => {
    const payload = BiometricEnrollmentGuard.createEnrollmentPayload(
      'USER_102',
      'Alex Smith',
      sampleEmbedding,
      secretKey
    );

    // User logs in on new device and downloads profile
    const deviceProfile = prepareProfileForDevice(
      payload.userId,
      payload.userName || 'Alex Smith',
      payload.faceToken,
      secretKey
    );

    expect(deviceProfile.id).toBe('USER_102');
    expect(deviceProfile.name).toBe('Alex Smith');
    expect(deviceProfile.embedding.length).toBe(192);
    expect(deviceProfile.embedding[0]).toBeCloseTo(sampleEmbedding[0], 5);
  });
});
