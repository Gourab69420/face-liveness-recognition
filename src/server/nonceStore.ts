/**
 * Thread-safe, atomic challenge and nonce storage for anti-replay protection.
 */

import { generateSecureNonce } from '../crypto/random';
import { ChallengeType } from '../types';

export interface ChallengeRecord {
  nonce: string;
  sessionId: string;
  userId: string;
  deviceId: string;
  challengeType: ChallengeType | 'none';
  issuedAt: number;
  expiresAt: number;
  status: 'ISSUED' | 'CONSUMED';
  consumedAt?: number;
  proofId?: string;
}

export type ConsumeNonceErrorCode =
  | 'NONCE_NOT_FOUND'
  | 'NONCE_ALREADY_CONSUMED'
  | 'NONCE_EXPIRED'
  | 'SESSION_MISMATCH'
  | 'USER_MISMATCH'
  | 'DEVICE_MISMATCH';

export interface ConsumeNonceResult {
  success: boolean;
  code?: ConsumeNonceErrorCode;
  reason?: string;
  record?: ChallengeRecord;
}

export interface IssueChallengeOptions {
  sessionId: string;
  userId: string;
  deviceId: string;
  challengeType?: ChallengeType | 'none';
  ttlMs?: number; // default: 60,000 ms (1 minute)
}

/**
 * In-memory Atomic Nonce Store with Mutex-guarded atomic consumption
 * to guarantee that concurrent verification attempts using the identical nonce
 * cannot both succeed.
 */
export class AtomicNonceStore {
  private records = new Map<string, ChallengeRecord>();
  // Mutex per nonce to strictly serialize concurrent requests on the same nonce
  private nonceLocks = new Map<string, Promise<void>>();

  /**
   * Generates and stores a new unpredictable server challenge.
   */
  issueChallenge(options: IssueChallengeOptions): ChallengeRecord {
    const {
      sessionId,
      userId,
      deviceId,
      challengeType = 'none',
      ttlMs = 60000,
    } = options;

    if (!sessionId || !userId || !deviceId) {
      throw new Error('[face-liveness-recognition] sessionId, userId, and deviceId are required.');
    }

    const nonce = generateSecureNonce(32);
    const now = Date.now();

    const record: ChallengeRecord = {
      nonce,
      sessionId,
      userId,
      deviceId,
      challengeType,
      issuedAt: now,
      expiresAt: now + ttlMs,
      status: 'ISSUED',
    };

    this.records.set(nonce, record);
    return { ...record };
  }

  /**
   * Atomically consumes a nonce, enforcing single-use and verifying all security bindings.
   * Concurrent requests for the same nonce are serialized to prevent race conditions.
   */
  async consumeNonce(
    nonce: string,
    binding: {
      sessionId: string;
      userId: string;
      deviceId: string;
      proofId?: string;
      now?: number;
    }
  ): Promise<ConsumeNonceResult> {
    // Acquire per-nonce lock to serialize simultaneous verification calls
    while (this.nonceLocks.has(nonce)) {
      await this.nonceLocks.get(nonce);
    }

    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.nonceLocks.set(nonce, lockPromise);

    try {
      const record = this.records.get(nonce);
      if (!record) {
        return {
          success: false,
          code: 'NONCE_NOT_FOUND',
          reason: 'Challenge nonce does not exist or has expired and been cleaned up.',
        };
      }

      // Check single-use consumption
      if (record.status === 'CONSUMED') {
        return {
          success: false,
          code: 'NONCE_ALREADY_CONSUMED',
          reason: `Replay attack detected: Nonce was already consumed by proof '${record.proofId}' at ${new Date(
            record.consumedAt || 0
          ).toISOString()}.`,
          record,
        };
      }

      const now = binding.now ?? Date.now();
      if (now > record.expiresAt) {
        return {
          success: false,
          code: 'NONCE_EXPIRED',
          reason: `Nonce expired at ${new Date(record.expiresAt).toISOString()}. Current time is ${new Date(
            now
          ).toISOString()}.`,
          record,
        };
      }

      // Binding verification
      if (record.sessionId !== binding.sessionId) {
        return {
          success: false,
          code: 'SESSION_MISMATCH',
          reason: `Nonce session binding mismatch. Expected '${record.sessionId}', got '${binding.sessionId}'.`,
          record,
        };
      }

      if (record.userId !== binding.userId) {
        return {
          success: false,
          code: 'USER_MISMATCH',
          reason: `Nonce user binding mismatch. Expected '${record.userId}', got '${binding.userId}'.`,
          record,
        };
      }

      if (record.deviceId !== binding.deviceId) {
        return {
          success: false,
          code: 'DEVICE_MISMATCH',
          reason: `Nonce device binding mismatch. Expected '${record.deviceId}', got '${binding.deviceId}'.`,
          record,
        };
      }

      // Atomic transition: ISSUED -> CONSUMED
      record.status = 'CONSUMED';
      record.consumedAt = now;
      record.proofId = binding.proofId;

      return {
        success: true,
        record: { ...record },
      };
    } finally {
      this.nonceLocks.delete(nonce);
      releaseLock();
    }
  }

  /**
   * Retrieves a challenge record by nonce without consuming it (read-only inspection).
   */
  getRecord(nonce: string): ChallengeRecord | undefined {
    const record = this.records.get(nonce);
    return record ? { ...record } : undefined;
  }

  /**
   * Prunes expired nonces from storage.
   * @returns Number of pruned records
   */
  pruneExpired(now: number = Date.now()): number {
    let count = 0;
    for (const [nonce, record] of this.records.entries()) {
      if (now > record.expiresAt) {
        this.records.delete(nonce);
        count++;
      }
    }
    return count;
  }

  /**
   * Clears all stored records (for testing).
   */
  clear(): void {
    this.records.clear();
    this.nonceLocks.clear();
  }
}
