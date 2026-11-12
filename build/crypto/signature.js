"use strict";
/**
 * Cryptographic Signing and Verification (HMAC-SHA256 and ECDSA P-256).
 * Powered by audited @noble/hashes and @noble/curves.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.equalBytes = equalBytes;
exports.toUint8Array = toUint8Array;
exports.computeSha256 = computeSha256;
exports.computeSha256Hex = computeSha256Hex;
exports.toBase64 = toBase64;
exports.fromBase64 = fromBase64;
exports.computeHmacSha256 = computeHmacSha256;
exports.verifyHmacSha256 = verifyHmacSha256;
exports.normalizeP256PublicKey = normalizeP256PublicKey;
exports.signEcdsaP256 = signEcdsaP256;
exports.verifyEcdsaP256 = verifyEcdsaP256;
exports.generateEphemeralP256KeyPair = generateEphemeralP256KeyPair;
const hmac_js_1 = require("@noble/hashes/hmac.js");
const sha2_js_1 = require("@noble/hashes/sha2.js");
const nist_js_1 = require("@noble/curves/nist.js");
const der_js_1 = require("@noble/curves/abstract/der.js");
const random_1 = require("./random");
/**
 * Constant-time byte array comparison to prevent timing side-channel attacks.
 */
function equalBytes(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
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
 * Computes the SHA-256 digest of data.
 */
function computeSha256(data) {
    return (0, sha2_js_1.sha256)(toUint8Array(data));
}
/**
 * Computes the SHA-256 digest formatted as a hex string.
 */
function computeSha256Hex(data) {
    return (0, random_1.bytesToHex)(computeSha256(data));
}
/**
 * Base64 encode helper.
 */
function toBase64(bytes) {
    return (0, random_1.bytesToBase64)(bytes);
}
/**
 * Base64 decode helper.
 */
function fromBase64(base64) {
    return (0, random_1.decodeBase64ToBytes)(base64);
}
// ============================================================================
// HMAC-SHA256
// ============================================================================
/**
 * Computes genuine HMAC-SHA256 over a payload using a secret key.
 *
 * @returns Hex-encoded or Base64-encoded signature (default: hex)
 */
function computeHmacSha256(payload, secretKey, encoding = 'hex') {
    const keyBytes = toUint8Array(secretKey);
    const msgBytes = toUint8Array(payload);
    const mac = (0, hmac_js_1.hmac)(sha2_js_1.sha256, keyBytes, msgBytes);
    return encoding === 'base64' ? toBase64(mac) : (0, random_1.bytesToHex)(mac);
}
/**
 * Verifies an HMAC-SHA256 signature in constant time.
 */
function verifyHmacSha256(payload, signature, secretKey, encoding = 'hex') {
    try {
        const keyBytes = toUint8Array(secretKey);
        const msgBytes = toUint8Array(payload);
        const expectedMac = (0, hmac_js_1.hmac)(sha2_js_1.sha256, keyBytes, msgBytes);
        const receivedMac = encoding === 'base64' ? fromBase64(signature) : (0, random_1.hexToBytes)(signature);
        if (expectedMac.length !== receivedMac.length)
            return false;
        return equalBytes(expectedMac, receivedMac);
    }
    catch {
        return false;
    }
}
// ============================================================================
// ECDSA P-256 (secp256r1)
// ============================================================================
/**
 * Normalizes an EC P-256 public key.
 * Handles:
 * - X.509 SubjectPublicKeyInfo (SPKI) DER bytes (91 bytes standard header + 04... point)
 * - Raw uncompressed point (65 bytes starting with 0x04)
 * - Raw compressed point (33 bytes starting with 0x02 or 0x03)
 * - Base64 or Hex representations
 */
function normalizeP256PublicKey(publicKeyInput) {
    let bytes;
    if (typeof publicKeyInput === 'string') {
        const trimmed = publicKeyInput.trim();
        // Check if PEM format
        if (trimmed.includes('-----BEGIN PUBLIC KEY-----')) {
            const b64 = trimmed
                .replace(/-----BEGIN PUBLIC KEY-----/g, '')
                .replace(/-----END PUBLIC KEY-----/g, '')
                .replace(/\s+/g, '');
            bytes = fromBase64(b64);
        }
        else if (/^[0-9a-fA-F]+$/.test(trimmed)) {
            bytes = (0, random_1.hexToBytes)(trimmed);
        }
        else {
            bytes = fromBase64(trimmed);
        }
    }
    else {
        bytes = publicKeyInput;
    }
    // If standard X.509 SPKI contains the uncompressed 65-byte point at the end
    if (bytes.length > 65 && bytes[bytes.length - 65] === 0x04) {
        return bytes.subarray(bytes.length - 65);
    }
    // Standard uncompressed (65 bytes) or compressed (33 bytes) point
    if (bytes.length === 65 || bytes.length === 33) {
        return bytes;
    }
    return bytes;
}
/**
 * Signs a payload using an ECDSA P-256 private key.
 *
 * @param payload - Data to be signed
 * @param privateKey - Private key (hex string or 32-byte Uint8Array)
 * @param format - Output format ('der_hex' | 'der_base64')
 * @returns Serialized DER-encoded signature
 */
function signEcdsaP256(payload, privateKey, format = 'der_base64') {
    const msgBytes = toUint8Array(payload);
    const privBytes = typeof privateKey === 'string' ? (0, random_1.hexToBytes)(privateKey) : privateKey;
    const compactBytes = nist_js_1.p256.sign(msgBytes, privBytes);
    const sigObj = nist_js_1.p256.Signature.fromBytes(compactBytes);
    const derHex = der_js_1.DER.hexFromSig(sigObj);
    return format === 'der_hex' ? derHex : toBase64((0, random_1.hexToBytes)(derHex));
}
/**
 * Verifies an ECDSA P-256 signature against a public key.
 * Supports both DER-encoded ASN.1 signatures (from Android Keystore / OpenSSL)
 * and compact 64-byte signatures.
 *
 * @param payload - Original data
 * @param signature - Signature in DER format (Hex or Base64) or compact bytes
 * @param publicKey - Public key (SPKI DER Base64, raw uncompressed point, etc.)
 */
function verifyEcdsaP256(payload, signature, publicKey) {
    try {
        const msgBytes = toUint8Array(payload);
        const pubKeyBytes = normalizeP256PublicKey(publicKey);
        let sigBytes;
        if (signature instanceof Uint8Array) {
            sigBytes = signature;
        }
        else if (typeof signature === 'string') {
            const trimmed = signature.trim();
            if (/^[0-9a-fA-F]+$/.test(trimmed)) {
                sigBytes = (0, random_1.hexToBytes)(trimmed);
            }
            else {
                sigBytes = fromBase64(trimmed);
            }
        }
        else {
            return false;
        }
        // Convert DER signature to compact signature if it begins with ASN.1 SEQUENCE (0x30)
        let compactSig;
        if (sigBytes.length !== 64 && sigBytes[0] === 0x30) {
            const parsed = der_js_1.DER.toSig(sigBytes);
            compactSig = new nist_js_1.p256.Signature(parsed.r, parsed.s).toBytes();
        }
        else {
            compactSig = sigBytes;
        }
        // lowS: false is essential for standard Android Keystore / OpenSSL SHA256withECDSA signatures
        return nist_js_1.p256.verify(compactSig, msgBytes, pubKeyBytes, { lowS: false });
    }
    catch {
        return false;
    }
}
/**
 * Generates an ephemeral ECDSA P-256 key pair.
 * Note: Mobile production apps MUST use Android Keystore for hardware-backed keys.
 * This software key generator is intended for server testing, backend simulation, or local mock testing.
 */
function generateEphemeralP256KeyPair() {
    const privBytes = (0, random_1.getRandomBytes)(32);
    const pubBytes = nist_js_1.p256.getPublicKey(privBytes, false); // uncompressed point (65 bytes)
    return {
        privateKeyHex: (0, random_1.bytesToHex)(privBytes),
        publicKeyHex: (0, random_1.bytesToHex)(pubBytes),
        publicKeyBase64: toBase64(pubBytes),
    };
}
//# sourceMappingURL=signature.js.map