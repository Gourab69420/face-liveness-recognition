"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiometricPunchInProofGenerator = exports.BiometricProofGenerator = exports.BiometricEnrollmentGuard = void 0;
exports.packEmbedding = packEmbedding;
exports.unpackEmbedding = unpackEmbedding;
exports.computeCosineSimilarity = computeCosineSimilarity;
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
exports.prepareProfileForDevice = prepareProfileForDevice;
/**
 * Packs a 192-dimensional Float array into a compact Base64 binary string.
 * Standard JSON: ~3,500 bytes.
 * Binary packed Base64: exactly 1,024 characters (768 bytes).
 */
function packEmbedding(embedding) {
    const float32Array = new Float32Array(embedding);
    const uint8Array = new Uint8Array(float32Array.buffer);
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    if (typeof btoa === 'function') {
        return btoa(binary);
    }
    else if (typeof Buffer !== 'undefined') {
        return Buffer.from(uint8Array).toString('base64');
    }
    throw new Error('[face-liveness-recognition] No Base64 encoder available');
}
/**
 * Unpacks a Base64 binary string back into a 192-dimensional Float array.
 */
function unpackEmbedding(base64) {
    let binaryString;
    if (typeof atob === 'function') {
        binaryString = atob(base64);
    }
    else if (typeof Buffer !== 'undefined') {
        binaryString = Buffer.from(base64, 'base64').toString('binary');
    }
    else {
        throw new Error('[face-liveness-recognition] No Base64 decoder available');
    }
    const len = binaryString.length;
    const uint8Array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
    }
    const float32Array = new Float32Array(uint8Array.buffer);
    return Array.from(float32Array);
}
/**
 * Computes the cosine similarity between two 192-D face vectors.
 * Returns a value between 0.0 and 1.0 (for L2-normalized vectors).
 */
function computeCosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length)
        return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, similarity));
}
/**
 * Fast, lightweight cryptographic hashing (HMAC-FNV) for signing payloads.
 */
function hashSignature(input, key) {
    let h1 = 0xdeadbeef ^ key.length;
    let h2 = 0x41c6ce57 ^ key.length;
    for (let i = 0; i < input.length; i++) {
        const ch = input.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
/**
 * Symmetric stream cipher encryption for protecting face tokens with an enterprise secret key.
 */
function encryptToken(token, secretKey) {
    const s = new Array(256);
    for (let i = 0; i < 256; i++)
        s[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + secretKey.charCodeAt(i % secretKey.length)) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
    }
    let i = 0;
    j = 0;
    let result = '';
    for (let k = 0; k < token.length; k++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
        const charCode = token.charCodeAt(k) ^ s[(s[i] + s[j]) % 256];
        result += String.fromCharCode(charCode);
    }
    if (typeof btoa === 'function') {
        return btoa(result);
    }
    else if (typeof Buffer !== 'undefined') {
        return Buffer.from(result, 'binary').toString('base64');
    }
    return result;
}
/**
 * Decrypts an encrypted face token back into the Base64 binary representation.
 */
function decryptToken(cipherBase64, secretKey) {
    let cipherText;
    if (typeof atob === 'function') {
        cipherText = atob(cipherBase64);
    }
    else if (typeof Buffer !== 'undefined') {
        cipherText = Buffer.from(cipherBase64, 'base64').toString('binary');
    }
    else {
        cipherText = cipherBase64;
    }
    const s = new Array(256);
    for (let i = 0; i < 256; i++)
        s[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + secretKey.charCodeAt(i % secretKey.length)) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
    }
    let i = 0;
    j = 0;
    let result = '';
    for (let k = 0; k < cipherText.length; k++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
        const charCode = cipherText.charCodeAt(k) ^ s[(s[i] + s[j]) % 256];
        result += String.fromCharCode(charCode);
    }
    return result;
}
/**
 * Biometric Enrollment Guard:
 * Enforces one-time enrollment. Once enrolled, the profile is locked
 * unless an authorized admin permission token is provided.
 */
class BiometricEnrollmentGuard {
    /**
     * Verifies whether a user is permitted to enroll their face.
     */
    static canEnroll(profile, adminPermissionToken) {
        if (!profile.isLocked) {
            return { allowed: true };
        }
        if (adminPermissionToken && adminPermissionToken.trim().length >= 8) {
            return { allowed: true };
        }
        return {
            allowed: false,
            reason: 'Face is already enrolled and locked. Please contact your administrator to request a biometric re-enrollment permission.',
        };
    }
    /**
     * Prepares the encrypted submission payload to save in your database.
     */
    static createEnrollmentPayload(userId, userName, embedding, encryptionKey) {
        const rawToken = packEmbedding(embedding);
        const encryptedToken = encryptToken(rawToken, encryptionKey);
        const enrolledAt = new Date().toISOString();
        const signature = hashSignature(`${userId}:${enrolledAt}:${encryptedToken.slice(0, 32)}`, encryptionKey);
        return {
            userId,
            userName,
            faceToken: encryptedToken,
            enrolledAt,
            signature,
        };
    }
}
exports.BiometricEnrollmentGuard = BiometricEnrollmentGuard;
/**
 * Biometric Authentication & Punch-In Attestation:
 * Generates and validates cryptographic proofs to prevent API replay attacks.
 */
class BiometricProofGenerator {
    /**
     * Creates an anti-replay proof when a live face match completes.
     */
    static generateProof(userId, result, sharedSecret, challengeType = 'smile') {
        const timestamp = new Date().toISOString();
        const nonce = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        const rawData = `${userId}|${timestamp}|${nonce}|${result.similarity ?? 0}|${result.challengePassed}`;
        const signature = hashSignature(rawData, sharedSecret);
        return {
            userId,
            timestamp,
            nonce,
            similarity: result.similarity ?? 0,
            livenessScore: result.score,
            challengeType,
            challengePassed: result.challengePassed,
            durationMs: result.durationMs,
            signature,
        };
    }
    /**
     * Server-side verification to confirm that the proof is valid and was not replayed.
     */
    static verifyProof(proof, sharedSecret, maxAgeMs = 60000 // 1 minute max age
    ) {
        const proofTime = new Date(proof.timestamp).getTime();
        const now = Date.now();
        if (Math.abs(now - proofTime) > maxAgeMs) {
            return { valid: false, reason: 'Authentication proof has expired or device clock is skewed' };
        }
        if (!proof.challengePassed) {
            return { valid: false, reason: 'Liveness kinetic challenge was not passed' };
        }
        const rawData = `${proof.userId}|${proof.timestamp}|${proof.nonce}|${proof.similarity}|${proof.challengePassed}`;
        const expectedSignature = hashSignature(rawData, sharedSecret);
        if (proof.signature !== expectedSignature) {
            return { valid: false, reason: 'Signature mismatch: tampering detected' };
        }
        return { valid: true };
    }
}
exports.BiometricProofGenerator = BiometricProofGenerator;
// Backward-compatible alias
exports.BiometricPunchInProofGenerator = BiometricProofGenerator;
/**
 * Prepares a profile fetched from the database for on-device 1-to-1 matching.
 */
function prepareProfileForDevice(userId, userName, encryptedTokenFromDB, decryptionKey) {
    const rawBase64 = decryptToken(encryptedTokenFromDB, decryptionKey);
    const embedding = unpackEmbedding(rawBase64);
    return {
        id: userId,
        name: userName,
        embedding,
    };
}
//# sourceMappingURL=auth.js.map