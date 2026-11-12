/**
 * Secure Biometric Proof Generator (Protocol v2.0).
 */
import { LivenessResult, ChallengeType } from '../types';
import { SecureBiometricProof } from './types';
import { SignatureAlgorithm } from '../crypto/signature';
export interface ProofSignerConfig {
    algorithm: SignatureAlgorithm;
    sign: (canonicalPayload: string) => Promise<string> | string;
}
export type ProofSigner = ProofSignerConfig | {
    type: 'ecdsa';
    privateKey: string | Uint8Array;
} | {
    type: 'hmac';
    secretKey: string | Uint8Array;
};
export interface GenerateProofOptions {
    userId: string;
    sessionId: string;
    deviceId: string;
    nonce: string;
    result: LivenessResult;
    challengeType?: ChallengeType | 'none';
    signer: ProofSigner;
    ttlSeconds?: number;
    modelVersion?: string;
    issuedAt?: Date;
}
/**
 * Creates a cryptographically signed biometric authentication proof (Protocol v2.0).
 */
export declare function generateSecureProof(options: GenerateProofOptions): Promise<SecureBiometricProof>;
//# sourceMappingURL=generator.d.ts.map