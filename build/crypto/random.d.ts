/**
 * Cryptographically Secure Pseudo-Random Number Generation (CSPRNG)
 * Cross-platform support for React Native (Hermes / JSC), Expo, Android Native Keystore/SecureRandom, Browser, and Node.js.
 */
export type EntropyProvider = (byteLength: number) => Uint8Array | null;
/**
 * Allows platform-specific native modules (such as Android SecureRandom) to register
 * a secure entropy provider without coupling this module to React Native.
 */
export declare function registerEntropyProvider(provider: EntropyProvider): void;
export declare function decodeBase64ToBytes(b64: string): Uint8Array;
/**
 * Returns a Uint8Array filled with cryptographically secure random bytes.
 * Throws immediately and securely if a secure entropy source is unavailable.
 */
export declare function getRandomBytes(byteLength: number): Uint8Array;
/**
 * Encodes a Uint8Array to a standard Base64 string.
 */
export declare function bytesToBase64(bytes: Uint8Array): string;
/**
 * Encodes a Uint8Array to a URL-safe Base64 string without padding.
 */
export declare function bytesToBase64Url(bytes: Uint8Array): string;
/**
 * Encodes a Uint8Array to a lowercase hexadecimal string.
 */
export declare function bytesToHex(bytes: Uint8Array): string;
/**
 * Decodes a hexadecimal string to Uint8Array.
 */
export declare function hexToBytes(hex: string): Uint8Array;
/**
 * Generates an unpredictable cryptographic nonce (default 256 bits / 32 bytes)
 * formatted as a URL-safe Base64 string.
 */
export declare function generateSecureNonce(byteLength?: number): string;
/**
 * Generates an unpredictable unique identifier with optional prefix.
 */
export declare function generateSecureId(prefix?: string): string;
/**
 * Generates an unbiased random integer in the range [0, maxExclusive)
 * using rejection sampling to eliminate modulo bias.
 */
export declare function getSecureRandomInt(maxExclusive: number): number;
/**
 * Performs an unbiased Fisher-Yates shuffle on an array using CSPRNG.
 */
export declare function secureShuffle<T>(array: readonly T[]): T[];
//# sourceMappingURL=random.d.ts.map