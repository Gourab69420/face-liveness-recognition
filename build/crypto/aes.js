"use strict";
/**
 * Authenticated Symmetric Encryption using AES-256-GCM (Galois/Counter Mode).
 * Powered by audited @noble/ciphers/aes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationTagMismatchError = exports.CryptographyError = void 0;
exports.normalizeKey = normalizeKey;
exports.encryptAesGcm = encryptAesGcm;
exports.decryptAesGcm = decryptAesGcm;
exports.decryptAesGcmBytes = decryptAesGcmBytes;
const aes_js_1 = require("@noble/ciphers/aes.js");
const sha2_js_1 = require("@noble/hashes/sha2.js");
const random_1 = require("./random");
const ENVELOPE_VERSION_AES_256_GCM = 0x01;
const NONCE_LENGTH_BYTES = 12; // 96-bit nonce for GCM
const TAG_LENGTH_BYTES = 16; // 128-bit authentication tag
class CryptographyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CryptographyError';
    }
}
exports.CryptographyError = CryptographyError;
class AuthenticationTagMismatchError extends CryptographyError {
    constructor(message = 'AES-GCM authentication tag verification failed: ciphertext or AAD has been tampered with.') {
        super(message);
        this.name = 'AuthenticationTagMismatchError';
    }
}
exports.AuthenticationTagMismatchError = AuthenticationTagMismatchError;
/**
 * Normalizes an encryption key into an exact 32-byte (256-bit) Uint8Array.
 * If provided a 32-byte Uint8Array, it is used directly.
 * If provided a string, it is hashed with SHA-256 to produce a uniform 256-bit key.
 */
function normalizeKey(key) {
    if (key instanceof Uint8Array) {
        if (key.length !== 32) {
            throw new CryptographyError(`[face-liveness-recognition] Key must be exactly 32 bytes (256 bits). Received ${key.length} bytes.`);
        }
        return key;
    }
    if (typeof key === 'string') {
        if (key.trim().length === 0) {
            throw new CryptographyError('[face-liveness-recognition] Encryption key string cannot be empty.');
        }
        // Deterministically hash the key string to derive a uniform 256-bit key
        const textEncoder = new TextEncoder();
        return (0, sha2_js_1.sha256)(textEncoder.encode(key));
    }
    throw new CryptographyError('[face-liveness-recognition] Invalid key type. Expected string or 32-byte Uint8Array.');
}
/**
 * Converts a UTF-8 string or Uint8Array into a Uint8Array.
 */
function toUint8Array(data) {
    if (data instanceof Uint8Array)
        return data;
    return new TextEncoder().encode(data);
}
/**
 * Converts bytes to Base64.
 */
function uint8ArrayToBase64(bytes) {
    return (0, random_1.bytesToBase64)(bytes);
}
function base64ToUint8Array(base64) {
    return (0, random_1.decodeBase64ToBytes)(base64);
}
/**
 * Encrypts data using AES-256-GCM with a unique, cryptographically secure 96-bit nonce.
 *
 * Wire Format Envelope:
 * [1 byte Version (0x01)] | [12 bytes Nonce] | [Ciphertext + 16 bytes Auth Tag]
 *
 * @returns Base64 encoded binary string
 */
function encryptAesGcm(plaintext, key, options = {}) {
    const normalizedKey = normalizeKey(key);
    const plaintextBytes = toUint8Array(plaintext);
    const nonce = (0, random_1.getRandomBytes)(NONCE_LENGTH_BYTES);
    const aad = options.associatedData ? toUint8Array(options.associatedData) : undefined;
    const cipher = (0, aes_js_1.gcm)(normalizedKey, nonce, aad);
    const ciphertextAndTag = cipher.encrypt(plaintextBytes);
    // Construct envelope: [Version (1) | Nonce (12) | Ciphertext + Tag]
    const envelope = new Uint8Array(1 + NONCE_LENGTH_BYTES + ciphertextAndTag.length);
    envelope[0] = ENVELOPE_VERSION_AES_256_GCM;
    envelope.set(nonce, 1);
    envelope.set(ciphertextAndTag, 1 + NONCE_LENGTH_BYTES);
    return uint8ArrayToBase64(envelope);
}
/**
 * Decrypts and authenticates an AES-256-GCM envelope.
 *
 * Strictly verifies the 128-bit authentication tag before releasing any data.
 * Throws AuthenticationTagMismatchError without returning partially decrypted data upon failure.
 */
function decryptAesGcm(cipherEnvelopeBase64, key, options = {}) {
    const bytes = decryptAesGcmBytes(cipherEnvelopeBase64, key, options);
    return new TextDecoder().decode(bytes);
}
/**
 * Decrypts and authenticates an AES-256-GCM envelope, returning raw bytes.
 */
function decryptAesGcmBytes(cipherEnvelopeBase64, key, options = {}) {
    if (!cipherEnvelopeBase64 || typeof cipherEnvelopeBase64 !== 'string') {
        throw new CryptographyError('[face-liveness-recognition] Ciphertext envelope must be a non-empty Base64 string.');
    }
    const normalizedKey = normalizeKey(key);
    const envelope = base64ToUint8Array(cipherEnvelopeBase64);
    const minLength = 1 + NONCE_LENGTH_BYTES + TAG_LENGTH_BYTES;
    if (envelope.length < minLength) {
        throw new CryptographyError(`[face-liveness-recognition] Ciphertext envelope too short (${envelope.length} bytes). Minimum required is ${minLength} bytes.`);
    }
    const version = envelope[0];
    if (version !== ENVELOPE_VERSION_AES_256_GCM) {
        throw new CryptographyError(`[face-liveness-recognition] Unsupported envelope version: 0x${version.toString(16)}. Expected 0x01.`);
    }
    const nonce = envelope.subarray(1, 1 + NONCE_LENGTH_BYTES);
    const ciphertextAndTag = envelope.subarray(1 + NONCE_LENGTH_BYTES);
    const aad = options.associatedData ? toUint8Array(options.associatedData) : undefined;
    try {
        const cipher = (0, aes_js_1.gcm)(normalizedKey, nonce, aad);
        return cipher.decrypt(ciphertextAndTag);
    }
    catch (err) {
        throw new AuthenticationTagMismatchError(`[face-liveness-recognition] AES-GCM verification failed: ${err?.message || 'invalid tag or corrupted payload'}`);
    }
}
//# sourceMappingURL=aes.js.map