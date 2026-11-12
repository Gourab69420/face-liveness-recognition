/**
 * Reference Backend Verification Service (Protocol v2.0).
 * Orchestrates nonce consumption, key registry lookup, cryptographic signature verification,
 * and biometric score thresholds.
 */

import { SecureBiometricProof } from '../proof/types';
import { verifySecureProof } from '../proof/verifier';
import { AtomicNonceStore, ChallengeRecord } from './nonceStore';
import { DeviceKeyRegistry, RegisteredDeviceKey } from './keyRegistry';

export interface BackendVerifierPolicy {
  minLivenessScore: number;     // e.g. 0.85
  minPassiveScore: number;      // e.g. 0.85
  minRecognitionScore?: number; // e.g. 0.72
  requireChallengePassed: boolean;
  rateLimitMaxRequestsPerMinute?: number;
}

export const DEFAULT_VERIFIER_POLICY: BackendVerifierPolicy = {
  minLivenessScore: 0.85,
  minPassiveScore: 0.80,
  minRecognitionScore: 0.72,
  requireChallengePassed: true,
  rateLimitMaxRequestsPerMinute: 30,
};

export interface ServerVerificationResult {
  success: boolean;
  code:
    | 'VERIFIED'
    | 'INVALID_STRUCTURE'
    | 'UNSUPPORTED_PROTOCOL_VERSION'
    | 'DEVICE_KEY_NOT_REGISTERED'
    | 'DEVICE_KEY_REVOKED'
    | 'NONCE_REPLAY_ATTACK'
    | 'NONCE_EXPIRED'
    | 'NONCE_BINDING_MISMATCH'
    | 'NONCE_NOT_FOUND'
    | 'PROOF_EXPIRED'
    | 'PROOF_FUTURE_DATED'
    | 'SIGNATURE_INVALID'
    | 'LIVENESS_FAILED'
    | 'CHALLENGE_FAILED'
    | 'SIMILARITY_BELOW_THRESHOLD'
    | 'RATE_LIMIT_EXCEEDED';
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
export class ServerVerificationService {
  constructor(
    public readonly nonceStore: AtomicNonceStore = new AtomicNonceStore(),
    public readonly keyRegistry: DeviceKeyRegistry = new DeviceKeyRegistry(),
    public readonly policy: BackendVerifierPolicy = DEFAULT_VERIFIER_POLICY
  ) {}

  // Simple in-memory rate limiting per user/device
  private rateLimitCounts = new Map<string, { count: number; windowStart: number }>();

  private checkRateLimit(key: string): boolean {
    const maxPerMin = this.policy.rateLimitMaxRequestsPerMinute ?? 30;
    const now = Date.now();
    const entry = this.rateLimitCounts.get(key);

    if (!entry || now - entry.windowStart > 60000) {
      this.rateLimitCounts.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= maxPerMin) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Generates a new unpredictable server challenge.
   */
  issueChallenge(options: {
    sessionId: string;
    userId: string;
    deviceId: string;
    ttlMs?: number;
  }): ChallengeRecord {
    return this.nonceStore.issueChallenge({
      sessionId: options.sessionId,
      userId: options.userId,
      deviceId: options.deviceId,
      ttlMs: options.ttlMs,
    });
  }

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
  async verifyProof(
    proof: SecureBiometricProof,
    options: {
      now?: Date;
      allowHmacWithSecret?: string;
    } = {}
  ): Promise<ServerVerificationResult> {
    const now = options.now ?? new Date();

    // 1. Rate limiting
    const rateLimitKey = `${proof?.userId || 'unknown'}:${proof?.deviceId || 'unknown'}`;
    if (!this.checkRateLimit(rateLimitKey)) {
      return {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        reason: 'Too many verification attempts. Please wait before retrying.',
        cryptographicVerification: { signatureValid: false, nonceConsumed: false },
        livenessVerification: {
          livenessScore: proof?.livenessScore ?? 0,
          passiveScore: proof?.passiveScore ?? 0,
          challengePassed: false,
          isLive: false,
        },
      };
    }

    // 2. Lookup registered device public key (or HMAC shared secret if in test/server mode)
    let verificationKey: string | Uint8Array;
    let isHardwareBacked = false;

    if (proof?.signatureAlgorithm === 'HMAC_SHA256') {
      if (!options.allowHmacWithSecret) {
        return {
          success: false,
          code: 'UNSUPPORTED_PROTOCOL_VERSION',
          reason: 'HMAC_SHA256 signature algorithm is not permitted for client mobile proofs without server authorization.',
          cryptographicVerification: { signatureValid: false, nonceConsumed: false },
          livenessVerification: {
            livenessScore: proof?.livenessScore ?? 0,
            passiveScore: proof?.passiveScore ?? 0,
            challengePassed: false,
            isLive: false,
          },
        };
      }
      verificationKey = options.allowHmacWithSecret;
    } else {
      const registeredKey = this.keyRegistry.getActiveKey(proof.deviceId, proof.userId);
      if (!registeredKey) {
        return {
          success: false,
          code: 'DEVICE_KEY_NOT_REGISTERED',
          reason: `No registered active public key found for deviceId '${proof.deviceId}' and userId '${proof.userId}'.`,
          cryptographicVerification: { signatureValid: false, nonceConsumed: false },
          livenessVerification: {
            livenessScore: proof?.livenessScore ?? 0,
            passiveScore: proof?.passiveScore ?? 0,
            challengePassed: false,
            isLive: false,
          },
        };
      }
      verificationKey = registeredKey.publicKey;
      isHardwareBacked = registeredKey.isHardwareBacked;
    }

    // 3. Atomically consume the nonce to protect against replay attacks
    const nonceResult = await this.nonceStore.consumeNonce(proof.nonce, {
      sessionId: proof.sessionId,
      userId: proof.userId,
      deviceId: proof.deviceId,
      proofId: proof.proofId,
      now: now.getTime(),
    });

    if (!nonceResult.success) {
      let code: ServerVerificationResult['code'] = 'NONCE_NOT_FOUND';
      if (nonceResult.code === 'NONCE_ALREADY_CONSUMED') {
        code = 'NONCE_REPLAY_ATTACK';
      } else if (nonceResult.code === 'NONCE_EXPIRED') {
        code = 'NONCE_EXPIRED';
      } else if (
        nonceResult.code === 'SESSION_MISMATCH' ||
        nonceResult.code === 'USER_MISMATCH' ||
        nonceResult.code === 'DEVICE_MISMATCH'
      ) {
        code = 'NONCE_BINDING_MISMATCH';
      }

      return {
        success: false,
        code,
        reason: nonceResult.reason,
        cryptographicVerification: { signatureValid: false, nonceConsumed: false },
        livenessVerification: {
          livenessScore: proof?.livenessScore ?? 0,
          passiveScore: proof?.passiveScore ?? 0,
          challengePassed: Boolean(proof?.challengeResult),
          isLive: false,
        },
      };
    }

    // 4. Cryptographic Proof Verification
    const cryptoVerification = verifySecureProof(proof, {
      key: verificationKey,
      expectedSessionId: proof.sessionId,
      expectedUserId: proof.userId,
      expectedDeviceId: proof.deviceId,
      expectedNonce: proof.nonce,
      requireChallengePassed: this.policy.requireChallengePassed,
      now,
    });

    if (!cryptoVerification.valid) {
      let code: ServerVerificationResult['code'] = 'SIGNATURE_INVALID';
      if (cryptoVerification.code === 'INVALID_STRUCTURE') code = 'INVALID_STRUCTURE';
      else if (cryptoVerification.code === 'UNSUPPORTED_VERSION') code = 'UNSUPPORTED_PROTOCOL_VERSION';
      else if (cryptoVerification.code === 'PROOF_EXPIRED') code = 'PROOF_EXPIRED';
      else if (cryptoVerification.code === 'PROOF_FUTURE_DATED') code = 'PROOF_FUTURE_DATED';
      else if (cryptoVerification.code === 'CHALLENGE_FAILED') code = 'CHALLENGE_FAILED';

      return {
        success: false,
        code,
        reason: cryptoVerification.reason,
        cryptographicVerification: {
          signatureValid: false,
          nonceConsumed: true,
          deviceKeyHardwareBacked: isHardwareBacked,
          algorithm: proof.signatureAlgorithm,
        },
        livenessVerification: {
          livenessScore: proof.livenessScore,
          passiveScore: proof.passiveScore,
          challengePassed: proof.challengeResult,
          similarity: proof.recognitionScore,
          isLive: false,
        },
      };
    }

    // 5. Biometric Policy Evaluation (Independent from Cryptographic Validity)
    const isLivenessPass =
      proof.livenessScore >= this.policy.minLivenessScore &&
      proof.passiveScore >= this.policy.minPassiveScore;

    if (!isLivenessPass) {
      return {
        success: false,
        code: 'LIVENESS_FAILED',
        reason: `Biometric liveness score (${proof.livenessScore}) or passive score (${proof.passiveScore}) below required thresholds.`,
        cryptographicVerification: {
          signatureValid: true,
          nonceConsumed: true,
          deviceKeyHardwareBacked: isHardwareBacked,
          algorithm: proof.signatureAlgorithm,
        },
        livenessVerification: {
          livenessScore: proof.livenessScore,
          passiveScore: proof.passiveScore,
          challengePassed: proof.challengeResult,
          similarity: proof.recognitionScore,
          isLive: false,
        },
      };
    }

    // 6. Facial Recognition Policy Check (if applicable)
    if (this.policy.minRecognitionScore != null && proof.recognitionScore != null) {
      if (proof.recognitionScore < this.policy.minRecognitionScore) {
        return {
          success: false,
          code: 'SIMILARITY_BELOW_THRESHOLD',
          reason: `Face similarity (${proof.recognitionScore}) is below required matching threshold (${this.policy.minRecognitionScore}).`,
          cryptographicVerification: {
            signatureValid: true,
            nonceConsumed: true,
            deviceKeyHardwareBacked: isHardwareBacked,
            algorithm: proof.signatureAlgorithm,
          },
          livenessVerification: {
            livenessScore: proof.livenessScore,
            passiveScore: proof.passiveScore,
            challengePassed: proof.challengeResult,
            similarity: proof.recognitionScore,
            isLive: true,
          },
        };
      }
    }

    return {
      success: true,
      code: 'VERIFIED',
      proofId: proof.proofId,
      verifiedAt: now.toISOString(),
      cryptographicVerification: {
        signatureValid: true,
        nonceConsumed: true,
        deviceKeyHardwareBacked: isHardwareBacked,
        algorithm: proof.signatureAlgorithm,
      },
      livenessVerification: {
        livenessScore: proof.livenessScore,
        passiveScore: proof.passiveScore,
        challengePassed: proof.challengeResult,
        similarity: proof.recognitionScore,
        isLive: true,
      },
    };
  }
}
