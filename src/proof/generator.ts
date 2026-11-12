/**
 * Secure Biometric Proof Generator (Protocol v2.0).
 */

import { LivenessResult, ChallengeType } from '../types';
import {
  SecureBiometricProof,
  UnsignedBiometricProof,
  CURRENT_PROTOCOL_VERSION,
} from './types';
import { serializeCanonicalProofPayload } from './canonical';
import { generateSecureId } from '../crypto/random';
import { signEcdsaP256, computeHmacSha256, SignatureAlgorithm } from '../crypto/signature';

export interface ProofSignerConfig {
  algorithm: SignatureAlgorithm;
  sign: (canonicalPayload: string) => Promise<string> | string;
}

export type ProofSigner =
  | ProofSignerConfig
  | { type: 'ecdsa'; privateKey: string | Uint8Array }
  | { type: 'hmac'; secretKey: string | Uint8Array };

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
export async function generateSecureProof(
  options: GenerateProofOptions
): Promise<SecureBiometricProof> {
  const {
    userId,
    sessionId,
    deviceId,
    nonce,
    result,
    challengeType = 'none',
    signer,
    ttlSeconds = 60,
    modelVersion = 'MiniFASNetV2-80x80',
    issuedAt = new Date(),
  } = options;

  if (!userId || !sessionId || !deviceId || !nonce) {
    throw new Error('[face-liveness-recognition] userId, sessionId, deviceId, and nonce are all required.');
  }

  const proofId = generateSecureId('prf');
  const issuedAtIso = issuedAt.toISOString();
  const expiresAtIso = new Date(issuedAt.getTime() + ttlSeconds * 1000).toISOString();

  // Determine signature algorithm and signing function
  let signatureAlgorithm: SignatureAlgorithm;
  let signFn: (payload: string) => Promise<string> | string;

  if ('sign' in signer) {
    signatureAlgorithm = signer.algorithm;
    signFn = signer.sign;
  } else if (signer.type === 'ecdsa') {
    signatureAlgorithm = 'ECDSA_P256_SHA256';
    signFn = (payload) => signEcdsaP256(payload, signer.privateKey, 'der_base64');
  } else if (signer.type === 'hmac') {
    signatureAlgorithm = 'HMAC_SHA256';
    signFn = (payload) => computeHmacSha256(payload, signer.secretKey, 'hex');
  } else {
    throw new Error('[face-liveness-recognition] Invalid signer configuration provided.');
  }

  const unsignedPayload: UnsignedBiometricProof = {
    protocolVersion: CURRENT_PROTOCOL_VERSION,
    proofId,
    sessionId,
    deviceId,
    userId,
    issuedAt: issuedAtIso,
    expiresAt: expiresAtIso,
    nonce,
    livenessScore: Math.max(0.0, Math.min(1.0, result.score)),
    passiveScore: Math.max(0.0, Math.min(1.0, result.passiveScore)),
    recognitionScore: result.similarity != null ? Math.max(0.0, Math.min(1.0, result.similarity)) : null,
    isMatch: result.isMatch != null ? result.isMatch : null,
    challengeType,
    challengeResult: Boolean(result.challengePassed),
    durationMs: Math.max(0, result.durationMs || 0),
    modelVersion,
    signatureAlgorithm,
  };

  const canonicalPayload = serializeCanonicalProofPayload(unsignedPayload);
  const signature = await signFn(canonicalPayload);

  return {
    ...unsignedPayload,
    signature,
  };
}
