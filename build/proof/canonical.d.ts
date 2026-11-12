/**
 * Canonical deterministic serialization and structural validation for Biometric Proofs.
 */
import { UnsignedBiometricProof } from './types';
/**
 * Deterministically serializes all security-relevant fields into a canonical string.
 * Uses fixed-point precision for float scores to prevent floating-point serialization discrepancies across JS runtimes.
 */
export declare function serializeCanonicalProofPayload(payload: UnsignedBiometricProof): string;
/**
 * Validates the strict structure, data types, and bounds of a SecureBiometricProof.
 */
export declare function validateProofStructure(proof: any): {
    valid: boolean;
    code?: 'INVALID_STRUCTURE' | 'UNSUPPORTED_VERSION' | 'INVALID_DATA_TYPE' | 'SCORE_OUT_OF_BOUNDS';
    reason?: string;
};
//# sourceMappingURL=canonical.d.ts.map