/**
 * Secure Biometric Proof Verifier (Protocol v2.0).
 */
import { SecureBiometricProof, ProofVerificationResult } from './types';
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
export declare function verifySecureProof(proof: SecureBiometricProof, options: VerifyProofOptions): ProofVerificationResult;
//# sourceMappingURL=verifier.d.ts.map