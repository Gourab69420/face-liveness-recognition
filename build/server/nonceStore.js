"use strict";
/**
 * Thread-safe, atomic challenge and nonce storage for anti-replay protection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtomicNonceStore = void 0;
const random_1 = require("../crypto/random");
/**
 * In-memory Atomic Nonce Store with Mutex-guarded atomic consumption
 * to guarantee that concurrent verification attempts using the identical nonce
 * cannot both succeed.
 */
class AtomicNonceStore {
    constructor() {
        this.records = new Map();
        // Mutex per nonce to strictly serialize concurrent requests on the same nonce
        this.nonceLocks = new Map();
    }
    /**
     * Generates and stores a new unpredictable server challenge.
     */
    issueChallenge(options) {
        const { sessionId, userId, deviceId, challengeType = 'none', ttlMs = 60000, } = options;
        if (!sessionId || !userId || !deviceId) {
            throw new Error('[face-liveness-recognition] sessionId, userId, and deviceId are required.');
        }
        const nonce = (0, random_1.generateSecureNonce)(32);
        const now = Date.now();
        const record = {
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
    async consumeNonce(nonce, binding) {
        // Acquire per-nonce lock to serialize simultaneous verification calls
        while (this.nonceLocks.has(nonce)) {
            await this.nonceLocks.get(nonce);
        }
        let releaseLock = () => { };
        const lockPromise = new Promise((resolve) => {
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
                    reason: `Replay attack detected: Nonce was already consumed by proof '${record.proofId}' at ${new Date(record.consumedAt || 0).toISOString()}.`,
                    record,
                };
            }
            const now = binding.now ?? Date.now();
            if (now > record.expiresAt) {
                return {
                    success: false,
                    code: 'NONCE_EXPIRED',
                    reason: `Nonce expired at ${new Date(record.expiresAt).toISOString()}. Current time is ${new Date(now).toISOString()}.`,
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
        }
        finally {
            this.nonceLocks.delete(nonce);
            releaseLock();
        }
    }
    /**
     * Retrieves a challenge record by nonce without consuming it (read-only inspection).
     */
    getRecord(nonce) {
        const record = this.records.get(nonce);
        return record ? { ...record } : undefined;
    }
    /**
     * Prunes expired nonces from storage.
     * @returns Number of pruned records
     */
    pruneExpired(now = Date.now()) {
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
    clear() {
        this.records.clear();
        this.nonceLocks.clear();
    }
}
exports.AtomicNonceStore = AtomicNonceStore;
//# sourceMappingURL=nonceStore.js.map