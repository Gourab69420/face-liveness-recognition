import { ChallengeType } from '../types';
import { SignatureAlgorithm } from '../crypto/signature';
export declare const CURRENT_PROTOCOL_VERSION: "2.0";
/**
 * Protocol v2.0 Cryptographic Biometric Attestation Proof.
 * Generated on-device and signed either via hardware-backed Android Keystore ECDSA P-256
 * or a trusted cryptographic signer.
 */
export interface SecureBiometricProof {
    /**
     * Explicit protocol version identifier (e.g. '2.0').
     */
    protocolVersion: typeof CURRENT_PROTOCOL_VERSION;
    /**
     * Globally unique identifier for this proof attestation.
     */
    proofId: string;
    /**
     * Unique session ID bound to this verification attempt.
     */
    sessionId: string;
    /**
     * Unique hardware-backed device ID or registered public key identifier.
     */
    deviceId: string;
    /**
     * User identifier being authenticated.
     */
    userId: string;
    /**
     * ISO 8601 UTC timestamp of proof issuance.
     */
    issuedAt: string;
    /**
     * ISO 8601 UTC timestamp of proof expiration.
     */
    expiresAt: string;
    /**
     * Cryptographically secure, server-issued single-use challenge nonce.
     */
    nonce: string;
    /**
     * Liveness score between 0.0 and 1.0 evaluated across samples.
     */
    livenessScore: number;
    /**
     * Passive anti-spoofing score between 0.0 and 1.0 (MiniFASNet).
     */
    passiveScore: number;
    /**
     * Face recognition similarity score between 0.0 and 1.0, if recognition was performed.
     */
    recognitionScore?: number | null;
    /**
     * Whether facial vector matched enrolled profile.
     */
    isMatch?: boolean | null;
    /**
     * Active challenge performed ('turn_head_left', 'blink', 'smile', etc. or 'none').
     */
    challengeType: ChallengeType | 'none';
    /**
     * Whether the active kinetic challenge was successfully verified.
     */
    challengeResult: boolean;
    /**
     * Duration of the scan in milliseconds.
     */
    durationMs: number;
    /**
     * Model specification and version string (e.g. 'MiniFASNetV2-80x80').
     */
    modelVersion: string;
    /**
     * Cryptographic signature algorithm used.
     */
    signatureAlgorithm: SignatureAlgorithm;
    /**
     * Cryptographic signature over canonical payload serialization.
     */
    signature: string;
}
/**
 * Unsigned proof payload containing all data to be signed.
 */
export type UnsignedBiometricProof = Omit<SecureBiometricProof, 'signature'>;
/**
 * Verification outcome details returned by proof verifier.
 */
export interface ProofVerificationResult {
    valid: boolean;
    code: 'VALID' | 'INVALID_STRUCTURE' | 'UNSUPPORTED_VERSION' | 'INVALID_DATA_TYPE' | 'SCORE_OUT_OF_BOUNDS' | 'PROOF_EXPIRED' | 'PROOF_FUTURE_DATED' | 'CHALLENGE_FAILED' | 'SIGNATURE_INVALID' | 'NONCE_REUSED' | 'NONCE_UNKNOWN' | 'SESSION_MISMATCH' | 'DEVICE_KEY_MISMATCH' | 'INTERNAL_ERROR';
    reason?: string;
    proof?: SecureBiometricProof;
}
//# sourceMappingURL=types.d.ts.map