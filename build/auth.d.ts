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
 * Cryptographic biometric authentication / punch-in attestation proof.
 * Validated by your backend to guarantee the user actually passed a live camera scan.
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
 */
export declare function unpackEmbedding(base64: string): number[];
/**
 * Computes the cosine similarity between two 192-D face vectors.
 * Returns a value between 0.0 and 1.0 (for L2-normalized vectors).
 */
export declare function computeCosineSimilarity(vecA: number[], vecB: number[]): number;
/**
 * Symmetric stream cipher encryption for protecting face tokens with an enterprise secret key.
 */
export declare function encryptToken(token: string, secretKey: string): string;
/**
 * Decrypts an encrypted face token back into the Base64 binary representation.
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
     */
    static canEnroll(profile: UserBiometricProfile, adminPermissionToken?: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Prepares the encrypted submission payload to save in your database.
     */
    static createEnrollmentPayload(userId: string, userName: string, embedding: number[], encryptionKey: string): EnrollmentSubmissionPayload;
}
/**
 * Biometric Authentication & Punch-In Attestation:
 * Generates and validates cryptographic proofs to prevent API replay attacks.
 */
export declare class BiometricProofGenerator {
    /**
     * Creates an anti-replay proof when a live face match completes.
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