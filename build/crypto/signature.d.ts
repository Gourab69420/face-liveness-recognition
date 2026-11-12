/**
 * Cryptographic Signing and Verification (HMAC-SHA256 and ECDSA P-256).
 * Powered by audited @noble/hashes and @noble/curves.
 */
export type SignatureAlgorithm = 'ECDSA_P256_SHA256' | 'HMAC_SHA256';
/**
 * Constant-time byte array comparison to prevent timing side-channel attacks.
 */
export declare function equalBytes(a: Uint8Array, b: Uint8Array): boolean;
/**
 * Converts a UTF-8 string or Uint8Array into a Uint8Array.
 */
export declare function toUint8Array(data: string | Uint8Array): Uint8Array;
/**
 * Computes the SHA-256 digest of data.
 */
export declare function computeSha256(data: string | Uint8Array): Uint8Array;
/**
 * Computes the SHA-256 digest formatted as a hex string.
 */
export declare function computeSha256Hex(data: string | Uint8Array): string;
/**
 * Base64 encode helper.
 */
export declare function toBase64(bytes: Uint8Array): string;
/**
 * Base64 decode helper.
 */
export declare function fromBase64(base64: string): Uint8Array;
/**
 * Computes genuine HMAC-SHA256 over a payload using a secret key.
 *
 * @returns Hex-encoded or Base64-encoded signature (default: hex)
 */
export declare function computeHmacSha256(payload: string | Uint8Array, secretKey: string | Uint8Array, encoding?: 'hex' | 'base64'): string;
/**
 * Verifies an HMAC-SHA256 signature in constant time.
 */
export declare function verifyHmacSha256(payload: string | Uint8Array, signature: string, secretKey: string | Uint8Array, encoding?: 'hex' | 'base64'): boolean;
/**
 * Normalizes an EC P-256 public key.
 * Handles:
 * - X.509 SubjectPublicKeyInfo (SPKI) DER bytes (91 bytes standard header + 04... point)
 * - Raw uncompressed point (65 bytes starting with 0x04)
 * - Raw compressed point (33 bytes starting with 0x02 or 0x03)
 * - Base64 or Hex representations
 */
export declare function normalizeP256PublicKey(publicKeyInput: string | Uint8Array): Uint8Array;
/**
 * Signs a payload using an ECDSA P-256 private key.
 *
 * @param payload - Data to be signed
 * @param privateKey - Private key (hex string or 32-byte Uint8Array)
 * @param format - Output format ('der_hex' | 'der_base64')
 * @returns Serialized DER-encoded signature
 */
export declare function signEcdsaP256(payload: string | Uint8Array, privateKey: string | Uint8Array, format?: 'der_hex' | 'der_base64'): string;
/**
 * Verifies an ECDSA P-256 signature against a public key.
 * Supports both DER-encoded ASN.1 signatures (from Android Keystore / OpenSSL)
 * and compact 64-byte signatures.
 *
 * @param payload - Original data
 * @param signature - Signature in DER format (Hex or Base64) or compact bytes
 * @param publicKey - Public key (SPKI DER Base64, raw uncompressed point, etc.)
 */
export declare function verifyEcdsaP256(payload: string | Uint8Array, signature: string | Uint8Array, publicKey: string | Uint8Array): boolean;
/**
 * Generates an ephemeral ECDSA P-256 key pair.
 * Note: Mobile production apps MUST use Android Keystore for hardware-backed keys.
 * This software key generator is intended for server testing, backend simulation, or local mock testing.
 */
export declare function generateEphemeralP256KeyPair(): {
    privateKeyHex: string;
    publicKeyHex: string;
    publicKeyBase64: string;
};
//# sourceMappingURL=signature.d.ts.map