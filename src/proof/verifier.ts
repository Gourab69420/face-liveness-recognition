/**
 * Secure Biometric Proof Verifier (Protocol v2.0).
 */

import { SecureBiometricProof, ProofVerificationResult } from './types';
import {
  serializeCanonicalProofPayload,
  validateProofStructure,
} from './canonical';
import {
  verifyEcdsaP256,
  verifyHmacSha256,
} from '../crypto/signature';

export interface VerifyProofOptions {
  /**
   * The verification key.
   * - For ECDSA_P256_SHA256: The client device's registered public key.
   * - For HMAC_SHA256: The shared symmetric secret key.
   */
  key: string | Uint8Array;

  /**
   * Expected session ID if verifying within a session context.
   */
  expectedSessionId?: string;

  /**
   * Expected user ID if verifying for a specific user.
   */
  expectedUserId?: string;

  /**
   * Expected device ID or key alias.
   */
  expectedDeviceId?: string;

  /**
   * Expected challenge nonce.
   */
  expectedNonce?: string;

  /**
   * Whether to require that challengeResult is true (default: true).
   */
  requireChallengePassed?: boolean;

  /**
   * Minimum liveness score threshold (default: 0.85).
   */
  minLivenessScore?: number;

  /**
   * Allowed clock skew in milliseconds for future-dated timestamps (default: 30,000 ms).
   */
  clockSkewToleranceMs?: number;

  /**
   * Current time override (for deterministic testing).
   */
  now?: Date;
}

/**
 * Validates the cryptographic integrity, structure, expiration, and score bounds of a SecureBiometricProof.
 */
export function verifySecureProof(
  proof: SecureBiometricProof,
  options: VerifyProofOptions
): ProofVerificationResult {
  const {
    key,
    expectedSessionId,
    expectedUserId,
    expectedDeviceId,
    expectedNonce,
    requireChallengePassed = true,
    minLivenessScore,
    clockSkewToleranceMs = 30000,
    now = new Date(),
  } = options;

  // 1. Strict structural & type validation
  const structureCheck = validateProofStructure(proof);
  if (!structureCheck.valid) {
    return {
      valid: false,
      code: structureCheck.code as any,
      reason: structureCheck.reason,
      proof,
    };
  }

  // 2. Expected field bindings (Session, User, Device, Nonce)
  if (expectedSessionId && proof.sessionId !== expectedSessionId) {
    return {
      valid: false,
      code: 'SESSION_MISMATCH',
      reason: `Proof sessionId '${proof.sessionId}' does not match expected '${expectedSessionId}'.`,
      proof,
    };
  }

  if (expectedUserId && proof.userId !== expectedUserId) {
    return {
      valid: false,
      code: 'INVALID_DATA_TYPE',
      reason: `Proof userId '${proof.userId}' does not match expected '${expectedUserId}'.`,
      proof,
    };
  }

  if (expectedDeviceId && proof.deviceId !== expectedDeviceId) {
    return {
      valid: false,
      code: 'DEVICE_KEY_MISMATCH',
      reason: `Proof deviceId '${proof.deviceId}' does not match expected '${expectedDeviceId}'.`,
      proof,
    };
  }

  if (expectedNonce && proof.nonce !== expectedNonce) {
    return {
      valid: false,
      code: 'NONCE_UNKNOWN',
      reason: `Proof nonce does not match expected challenge nonce.`,
      proof,
    };
  }

  // 3. Expiration and clock-skew validation
  const nowMs = now.getTime();
  const issuedMs = Date.parse(proof.issuedAt);
  const expiresMs = Date.parse(proof.expiresAt);

  if (nowMs > expiresMs) {
    return {
      valid: false,
      code: 'PROOF_EXPIRED',
      reason: `Proof expired at ${proof.expiresAt}. Current time is ${now.toISOString()}.`,
      proof,
    };
  }

  if (issuedMs > nowMs + clockSkewToleranceMs) {
    return {
      valid: false,
      code: 'PROOF_FUTURE_DATED',
      reason: `Proof issued in the future (${proof.issuedAt}) beyond tolerance (${clockSkewToleranceMs}ms).`,
      proof,
    };
  }

  // 4. Kinetic challenge requirement
  if (requireChallengePassed && !proof.challengeResult) {
    return {
      valid: false,
      code: 'CHALLENGE_FAILED',
      reason: `Liveness kinetic challenge was not passed.`,
      proof,
    };
  }

  // 5. Liveness score threshold
  if (minLivenessScore != null && proof.livenessScore < minLivenessScore) {
    return {
      valid: false,
      code: 'SCORE_OUT_OF_BOUNDS',
      reason: `Liveness score (${proof.livenessScore}) is below required threshold (${minLivenessScore}).`,
      proof,
    };
  }

  // 6. Cryptographic signature verification over canonical serialization
  const canonicalPayload = serializeCanonicalProofPayload(proof);

  let signatureValid = false;
  if (proof.signatureAlgorithm === 'ECDSA_P256_SHA256') {
    signatureValid = verifyEcdsaP256(canonicalPayload, proof.signature, key);
  } else if (proof.signatureAlgorithm === 'HMAC_SHA256') {
    signatureValid = verifyHmacSha256(canonicalPayload, proof.signature, key, 'hex');
    if (!signatureValid) {
      // Fallback check for Base64 formatted HMAC signatures
      signatureValid = verifyHmacSha256(canonicalPayload, proof.signature, key, 'base64');
    }
  }

  if (!signatureValid) {
    return {
      valid: false,
      code: 'SIGNATURE_INVALID',
      reason: 'Cryptographic signature verification failed: payload has been tampered with or key is invalid.',
      proof,
    };
  }

  return {
    valid: true,
    code: 'VALID',
    proof,
  };
}
