import { LivenessResult, EnrolledProfile } from './types';
import {
  encryptAesGcm,
  decryptAesGcm,
  computeHmacSha256,
  verifyHmacSha256,
  computeSha256Hex,
} from './crypto';
import { generateSecureNonce, bytesToBase64, decodeBase64ToBytes } from './crypto/random';

declare const Buffer: any;

const EMBEDDING_DIMENSIONS = 192;
const EXPECTED_EMBEDDING_BYTE_LENGTH = EMBEDDING_DIMENSIONS * 4; // 768 bytes

/**
 * Universal User Biometric Profile stored in the database.
 */
export interface UserBiometricProfile {
  userId: string;
  userName?: string;
  isLocked: boolean; // Once true, user cannot re-record without admin permission
  enrolledAt?: string;
  faceTokenEncrypted?: string;
  deviceFingerprint?: string;
}

// Backward-compatible alias for HRMS attendance projects
export type HRMSEmployeeBiometrics = UserBiometricProfile;

/**
 * Encrypted payload sent to server after a successful one-time enrollment.
 */
export interface EnrollmentSubmissionPayload {
  userId: string;
  userName?: string;
  faceToken: string; // Authenticated AES-256-GCM encrypted Base64 token
  enrolledAt: string;
  signature: string;
}

/**
 * Legacy cryptographic biometric authentication proof (Protocol v1).
 * @deprecated Use SecureBiometricProof (Protocol v2) with asymmetric Android Keystore ECDSA signatures.
 */
export interface BiometricAuthProof {
  userId: string;
  timestamp: string;
  nonce: string;
  similarity: number;
  livenessScore: number;
  challengeType: string;
  challengePassed: boolean;
  durationMs: number;
  signature: string;
}

// Backward-compatible alias
export type PunchInProof = BiometricAuthProof;

/**
 * Packs a 192-dimensional Float array into a compact Base64 binary string.
 * Standard JSON: ~3,500 bytes.
 * Binary packed Base64: exactly 1,024 characters (768 bytes).
 */
export function packEmbedding(embedding: number[]): string {
  if (!Array.isArray(embedding)) {
    throw new Error('[face-liveness-recognition] Embedding must be an array of numbers.');
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `[face-liveness-recognition] Invalid embedding dimension: expected ${EMBEDDING_DIMENSIONS}, received ${embedding.length}.`
    );
  }

  for (let i = 0; i < embedding.length; i++) {
    if (!Number.isFinite(embedding[i])) {
      throw new Error(`[face-liveness-recognition] Embedding contains non-finite value at index ${i}: ${embedding[i]}`);
    }
  }

  const float32Array = new Float32Array(embedding);
  const uint8Array = new Uint8Array(float32Array.buffer);
  return bytesToBase64(uint8Array);
}

/**
 * Unpacks a Base64 binary string back into a 192-dimensional Float array.
 * Strictly validates that decoded length is exactly 768 bytes (192 floats).
 */
export function unpackEmbedding(base64: string): number[] {
  if (typeof base64 !== 'string' || base64.trim().length === 0) {
    throw new Error('[face-liveness-recognition] Invalid Base64 input: string cannot be empty.');
  }

  const uint8Array = decodeBase64ToBytes(base64);

  if (uint8Array.length !== EXPECTED_EMBEDDING_BYTE_LENGTH) {
    throw new Error(
      `[face-liveness-recognition] Invalid embedding binary size: expected ${EXPECTED_EMBEDDING_BYTE_LENGTH} bytes, received ${uint8Array.length} bytes.`
    );
  }

  const float32Array = new Float32Array(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength / 4);
  const result = Array.from(float32Array);

  for (let i = 0; i < result.length; i++) {
    if (!Number.isFinite(result[i])) {
      throw new Error(`[face-liveness-recognition] Unpacked embedding contains non-finite float at index ${i}`);
    }
  }

  return result;
}

/**
 * Computes the cosine similarity between two 192-D face vectors.
 * Returns a value between 0.0 and 1.0 (for L2-normalized vectors).
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  if (!Number.isFinite(similarity)) return 0;

  return Math.max(0, Math.min(1, similarity));
}

/**
 * Legacy hash function signature wrapper.
 * Replaced with genuine HMAC-SHA256.
 *
 * @deprecated Use computeHmacSha256 or asymmetric ECDSA signatures.
 */
export function hashSignature(input: string, key: string): string {
  return computeHmacSha256(input, key, 'hex');
}

/**
 * Authenticated AES-256-GCM encryption for biometric face tokens.
 * Replaces previous unauthenticated hand-rolled RC4 cipher.
 */
export function encryptToken(token: string, secretKey: string): string {
  return encryptAesGcm(token, secretKey);
}

/**
 * Authenticated AES-256-GCM decryption for biometric face tokens.
 * Verifies the 128-bit authentication tag before releasing data.
 */
export function decryptToken(cipherBase64: string, secretKey: string): string {
  return decryptAesGcm(cipherBase64, secretKey);
}

/**
 * Biometric Enrollment Guard:
 * Enforces one-time enrollment. Once enrolled, the profile is locked
 * unless an authorized admin permission token is provided.
 */
export class BiometricEnrollmentGuard {
  /**
   * Verifies whether a user is permitted to enroll their face.
   *
   * @param profile - Current user profile
   * @param adminPermissionToken - Signed admin authorization token or authorization grant
   * @param verifyAdminToken - Optional custom verification predicate (e.g. JWT verification)
   */
  static canEnroll(
    profile: UserBiometricProfile,
    adminPermissionToken?: string,
    verifyAdminToken?: (token: string) => boolean
  ): { allowed: boolean; reason?: string } {
    if (!profile.isLocked) {
      return { allowed: true };
    }

    if (adminPermissionToken && adminPermissionToken.trim().length > 0) {
      if (verifyAdminToken) {
        if (verifyAdminToken(adminPermissionToken)) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'Admin authorization token verification failed. Re-enrollment rejected.',
        };
      }

      // If no custom verifier provided, require non-trivial token
      if (adminPermissionToken.trim().length >= 16) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason:
        'Face is already enrolled and locked. Please contact your administrator to request a biometric re-enrollment permission.',
    };
  }

  /**
   * Prepares the encrypted submission payload using AES-256-GCM and HMAC-SHA256 signature.
   */
  static createEnrollmentPayload(
    userId: string,
    userName: string,
    embedding: number[],
    encryptionKey: string
  ): EnrollmentSubmissionPayload {
    const rawToken = packEmbedding(embedding);
    // Encrypt token with AES-256-GCM binding userId as Authenticated Additional Data (AAD)
    const encryptedToken = encryptAesGcm(rawToken, encryptionKey, { associatedData: userId });
    const enrolledAt = new Date().toISOString();

    // Authenticate entire token by hashing the complete ciphertext
    const tokenHash = computeSha256Hex(encryptedToken);
    const signature = computeHmacSha256(`${userId}:${userName}:${enrolledAt}:${tokenHash}`, encryptionKey, 'hex');

    return {
      userId,
      userName,
      faceToken: encryptedToken,
      enrolledAt,
      signature,
    };
  }
}

/**
 * Biometric Authentication & Punch-In Attestation (Protocol v1).
 *
 * @deprecated For mobile clients, use SecureBiometricProof and Android Keystore ECDSA P-256 keys.
 * Client-side HMAC with shared secrets should NOT be embedded in mobile applications.
 */
export class BiometricProofGenerator {
  /**
   * Creates an anti-replay proof when a live face match completes.
   * Uses cryptographically secure random nonce and genuine HMAC-SHA256 covering ALL fields.
   */
  static generateProof(
    userId: string,
    result: LivenessResult,
    sharedSecret: string,
    challengeType: string = 'smile'
  ): BiometricAuthProof {
    const timestamp = new Date().toISOString();
    const nonce = generateSecureNonce(16);

    // Sign all security-relevant fields: userId, timestamp, nonce, similarity, score, challengeType, challengePassed, durationMs
    const rawData = `${userId}|${timestamp}|${nonce}|${result.similarity ?? 0}|${result.score}|${challengeType}|${result.challengePassed}|${result.durationMs}`;
    const signature = computeHmacSha256(rawData, sharedSecret, 'hex');

    return {
      userId,
      timestamp,
      nonce,
      similarity: result.similarity ?? 0,
      livenessScore: result.score,
      challengeType,
      challengePassed: result.challengePassed,
      durationMs: result.durationMs,
      signature,
    };
  }

  /**
   * Server-side verification to confirm that the proof is valid and was not replayed.
   */
  static verifyProof(
    proof: BiometricAuthProof,
    sharedSecret: string,
    maxAgeMs: number = 60000 // 1 minute max age
  ): { valid: boolean; reason?: string } {
    const proofTime = new Date(proof.timestamp).getTime();
    const now = Date.now();

    if (Math.abs(now - proofTime) > maxAgeMs) {
      return { valid: false, reason: 'Authentication proof has expired or device clock is skewed' };
    }

    if (!proof.challengePassed) {
      return { valid: false, reason: 'Liveness kinetic challenge was not passed' };
    }

    const rawData = `${proof.userId}|${proof.timestamp}|${proof.nonce}|${proof.similarity}|${proof.livenessScore}|${proof.challengeType}|${proof.challengePassed}|${proof.durationMs}`;
    const isValid = verifyHmacSha256(rawData, proof.signature, sharedSecret, 'hex');

    if (!isValid) {
      return { valid: false, reason: 'Signature mismatch: tampering detected' };
    }

    return { valid: true };
  }
}

// Backward-compatible alias
export const BiometricPunchInProofGenerator = BiometricProofGenerator;

/**
 * Prepares a profile fetched from the database for on-device 1-to-1 matching.
 */
export function prepareProfileForDevice(
  userId: string,
  userName: string,
  encryptedTokenFromDB: string,
  decryptionKey: string
): EnrolledProfile {
  // Attempt AES-256-GCM with userId as AAD; fall back to no-AAD for legacy tokens
  let rawBase64: string;
  try {
    rawBase64 = decryptAesGcm(encryptedTokenFromDB, decryptionKey, { associatedData: userId });
  } catch {
    rawBase64 = decryptAesGcm(encryptedTokenFromDB, decryptionKey);
  }

  const embedding = unpackEmbedding(rawBase64);

  return {
    id: userId,
    name: userName,
    embedding,
  };
}
