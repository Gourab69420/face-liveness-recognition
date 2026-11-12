import { LivenessResult, EnrolledProfile } from './types';
/**
 * Universal User Biometric Profile stored in the database.
 */
export interface UserBiometricProfile {
    userId: string;
    userName?: string;
    isLocked: boolean;
    enrolledAt?: string;
    faceTokenEncrypted?: string;
    deviceFingerprint?: string;
}
export type HRMSEmployeeBiometrics = UserBiometricProfile;
/**
 * Encrypted payload sent to server after a successful one-time enrollment.
 */
export interface EnrollmentSubmissionPayload {
    userId: string;
    userName?: string;
    faceToken: string;
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
export type PunchInProof = BiometricAuthProof;
/**
 * Packs a 192-dimensional Float array into a compact Base64 binary string.
 * Standard JSON: ~3,500 bytes.
 * Binary packed Base64: exactly 1,024 characters (768 bytes).
 */
export declare function packEmbedding(embedding: number[]): string;
/**
 * Unpacks a Base64 binary string back into a 192-dimensional Float array.
 * Strictly validates that decoded length is exactly 768 bytes (192 floats).
 */
export declare function unpackEmbedding(base64: string): number[];
/**
 * Computes the cosine similarity between two 192-D face vectors.
 * Returns a value between 0.0 and 1.0 (for L2-normalized vectors).
 */
export declare function computeCosineSimilarity(vecA: number[], vecB: number[]): number;
/**
 * Legacy hash function signature wrapper.
 * Replaced with genuine HMAC-SHA256.
 *
 * @deprecated Use computeHmacSha256 or asymmetric ECDSA signatures.
 */
export declare function hashSignature(input: string, key: string): string;
/**
 * Authenticated AES-256-GCM encryption for biometric face tokens.
 * Replaces previous unauthenticated hand-rolled RC4 cipher.
 */
export declare function encryptToken(token: string, secretKey: string): string;
/**
 * Authenticated AES-256-GCM decryption for biometric face tokens.
 * Verifies the 128-bit authentication tag before releasing data.
 */
export declare function decryptToken(cipherBase64: string, secretKey: string): string;
/**
 * Biometric Enrollment Guard:
 * Enforces one-time enrollment. Once enrolled, the profile is locked
 * unless an authorized admin permission token is provided.
 */
export declare class BiometricEnrollmentGuard {
    /**
     * Verifies whether a user is permitted to enroll their face.
     *
     * @param profile - Current user profile
     * @param adminPermissionToken - Signed admin authorization token or authorization grant
     * @param verifyAdminToken - Optional custom verification predicate (e.g. JWT verification)
     */
    static canEnroll(profile: UserBiometricProfile, adminPermissionToken?: string, verifyAdminToken?: (token: string) => boolean): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Prepares the encrypted submission payload using AES-256-GCM and HMAC-SHA256 signature.
     */
    static createEnrollmentPayload(userId: string, userName: string, embedding: number[], encryptionKey: string): EnrollmentSubmissionPayload;
}
/**
 * Biometric Authentication & Punch-In Attestation (Protocol v1).
 *
 * @deprecated For mobile clients, use SecureBiometricProof and Android Keystore ECDSA P-256 keys.
 * Client-side HMAC with shared secrets should NOT be embedded in mobile applications.
 */
export declare class BiometricProofGenerator {
    /**
     * Creates an anti-replay proof when a live face match completes.
     * Uses cryptographically secure random nonce and genuine HMAC-SHA256 covering ALL fields.
     */
    static generateProof(userId: string, result: LivenessResult, sharedSecret: string, challengeType?: string): BiometricAuthProof;
    /**
     * Server-side verification to confirm that the proof is valid and was not replayed.
     */
    static verifyProof(proof: BiometricAuthProof, sharedSecret: string, maxAgeMs?: number): {
        valid: boolean;
        reason?: string;
    };
}
export declare const BiometricPunchInProofGenerator: typeof BiometricProofGenerator;
/**
 * Prepares a profile fetched from the database for on-device 1-to-1 matching.
 */
export declare function prepareProfileForDevice(userId: string, userName: string, encryptedTokenFromDB: string, decryptionKey: string): EnrolledProfile;
//# sourceMappingURL=auth.d.ts.map