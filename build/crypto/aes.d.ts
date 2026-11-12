/**
 * Authenticated Symmetric Encryption using AES-256-GCM (Galois/Counter Mode).
 * Powered by audited @noble/ciphers/aes.
 */
export declare class CryptographyError extends Error {
    constructor(message: string);
}
export declare class AuthenticationTagMismatchError extends CryptographyError {
    constructor(message?: string);
}
/**
 * Normalizes an encryption key into an exact 32-byte (256-bit) Uint8Array.
 * If provided a 32-byte Uint8Array, it is used directly.
 * If provided a string, it is hashed with SHA-256 to produce a uniform 256-bit key.
 */
export declare function normalizeKey(key: string | Uint8Array): Uint8Array;
export interface AesGcmEncryptOptions {
    /**
     * Optional Authenticated Additional Data (AAD) bound to the ciphertext.
     * Modifying AAD causes authentication tag verification to fail.
     */
    associatedData?: string | Uint8Array;
}
export interface AesGcmDecryptOptions {
    /**
     * The Authenticated Additional Data (AAD) that was used during encryption.
     */
    associatedData?: string | Uint8Array;
}
/**
 * Encrypts data using AES-256-GCM with a unique, cryptographically secure 96-bit nonce.
 *
 * Wire Format Envelope:
 * [1 byte Version (0x01)] | [12 bytes Nonce] | [Ciphertext + 16 bytes Auth Tag]
 *
 * @returns Base64 encoded binary string
 */
export declare function encryptAesGcm(plaintext: string | Uint8Array, key: string | Uint8Array, options?: AesGcmEncryptOptions): string;
/**
 * Decrypts and authenticates an AES-256-GCM envelope.
 *
 * Strictly verifies the 128-bit authentication tag before releasing any data.
 * Throws AuthenticationTagMismatchError without returning partially decrypted data upon failure.
 */
export declare function decryptAesGcm(cipherEnvelopeBase64: string, key: string | Uint8Array, options?: AesGcmDecryptOptions): string;
/**
 * Decrypts and authenticates an AES-256-GCM envelope, returning raw bytes.
 */
export declare function decryptAesGcmBytes(cipherEnvelopeBase64: string, key: string | Uint8Array, options?: AesGcmDecryptOptions): Uint8Array;
//# sourceMappingURL=aes.d.ts.map