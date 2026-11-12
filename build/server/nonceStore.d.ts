/**
 * Thread-safe, atomic challenge and nonce storage for anti-replay protection.
 */
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
export type ConsumeNonceErrorCode = 'NONCE_NOT_FOUND' | 'NONCE_ALREADY_CONSUMED' | 'NONCE_EXPIRED' | 'SESSION_MISMATCH' | 'USER_MISMATCH' | 'DEVICE_MISMATCH';
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
    ttlMs?: number;
}
/**
 * In-memory Atomic Nonce Store with Mutex-guarded atomic consumption
 * to guarantee that concurrent verification attempts using the identical nonce
 * cannot both succeed.
 */
export declare class AtomicNonceStore {
    private records;
    private nonceLocks;
    /**
     * Generates and stores a new unpredictable server challenge.
     */
    issueChallenge(options: IssueChallengeOptions): ChallengeRecord;
    /**
     * Atomically consumes a nonce, enforcing single-use and verifying all security bindings.
     * Concurrent requests for the same nonce are serialized to prevent race conditions.
     */
    consumeNonce(nonce: string, binding: {
        sessionId: string;
        userId: string;
        deviceId: string;
        proofId?: string;
        now?: number;
    }): Promise<ConsumeNonceResult>;
    /**
     * Retrieves a challenge record by nonce without consuming it (read-only inspection).
     */
    getRecord(nonce: string): ChallengeRecord | undefined;
    /**
     * Prunes expired nonces from storage.
     * @returns Number of pruned records
     */
    pruneExpired(now?: number): number;
    /**
     * Clears all stored records (for testing).
     */
    clear(): void;
}
//# sourceMappingURL=nonceStore.d.ts.map