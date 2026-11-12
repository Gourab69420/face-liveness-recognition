/**
 * Reference Backend Verification Service (Protocol v2.0).
 * Orchestrates nonce consumption, key registry lookup, cryptographic signature verification,
 * and biometric score thresholds.
 */
import { SecureBiometricProof } from '../proof/types';
import { AtomicNonceStore, ChallengeRecord } from './nonceStore';
import { DeviceKeyRegistry } from './keyRegistry';
export interface BackendVerifierPolicy {
    minLivenessScore: number;
    minPassiveScore: number;
    minRecognitionScore?: number;
    requireChallengePassed: boolean;
    rateLimitMaxRequestsPerMinute?: number;
}
export declare const DEFAULT_VERIFIER_POLICY: BackendVerifierPolicy;
export interface ServerVerificationResult {
    success: boolean;
    code: 'VERIFIED' | 'INVALID_STRUCTURE' | 'UNSUPPORTED_PROTOCOL_VERSION' | 'DEVICE_KEY_NOT_REGISTERED' | 'DEVICE_KEY_REVOKED' | 'NONCE_REPLAY_ATTACK' | 'NONCE_EXPIRED' | 'NONCE_BINDING_MISMATCH' | 'NONCE_NOT_FOUND' | 'PROOF_EXPIRED' | 'PROOF_FUTURE_DATED' | 'SIGNATURE_INVALID' | 'LIVENESS_FAILED' | 'CHALLENGE_FAILED' | 'SIMILARITY_BELOW_THRESHOLD' | 'RATE_LIMIT_EXCEEDED';
    reason?: string;
    cryptographicVerification: {
        signatureValid: boolean;
        nonceConsumed: boolean;
        deviceKeyHardwareBacked?: boolean;
        algorithm?: string;
    };
    livenessVerification: {
        livenessScore: number;
        passiveScore: number;
        challengePassed: boolean;
        similarity?: number | null;
        isLive: boolean;
    };
    proofId?: string;
    verifiedAt?: string;
}
/**
 * Reference Server Verification Service.
 */
export declare class ServerVerificationService {
    readonly nonceStore: AtomicNonceStore;
    readonly keyRegistry: DeviceKeyRegistry;
    readonly policy: BackendVerifierPolicy;
    constructor(nonceStore?: AtomicNonceStore, keyRegistry?: DeviceKeyRegistry, policy?: BackendVerifierPolicy);
    private rateLimitCounts;
    private checkRateLimit;
    /**
     * Generates a new unpredictable server challenge.
     */
    issueChallenge(options: {
        sessionId: string;
        userId: string;
        deviceId: string;
        ttlMs?: number;
    }): ChallengeRecord;
    /**
     * Verifies an incoming biometric attestation proof.
     *
     * Enforces:
     * 1. Rate limiting.
     * 2. Device key registration lookup.
     * 3. Atomic single-use nonce consumption (anti-replay).
     * 4. Cryptographic signature verification over canonical payload.
     * 5. Biometric score and challenge policy checks.
     */
    verifyProof(proof: SecureBiometricProof, options?: {
        now?: Date;
        allowHmacWithSecret?: string;
    }): Promise<ServerVerificationResult>;
}
//# sourceMappingURL=backendVerifier.d.ts.map