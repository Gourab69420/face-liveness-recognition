/**
 * Cryptographically Secure Pseudo-Random Number Generation (CSPRNG)
 * Cross-platform support for React Native (Hermes / JSC), Expo, Android Native Keystore/SecureRandom, Browser, and Node.js.
 */

declare const globalThis: any;
declare const window: any;
declare const Buffer: any;

export type EntropyProvider = (byteLength: number) => Uint8Array | null;

let registeredEntropyProvider: EntropyProvider | null = null;

/**
 * Allows platform-specific native modules (such as Android SecureRandom) to register
 * a secure entropy provider without coupling this module to React Native.
 */
export function registerEntropyProvider(provider: EntropyProvider): void {
  registeredEntropyProvider = provider;
}

// Capture genuine native system getRandomValues if present (e.g. browser WebCrypto)
// before any polyfills are installed.
const originalGetRandomValues: ((array: ArrayBufferView) => ArrayBufferView) | null =
  typeof globalThis !== 'undefined' &&
  globalThis.crypto &&
  typeof globalThis.crypto.getRandomValues === 'function'
    ? globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    : typeof window !== 'undefined' &&
      window.crypto &&
      typeof window.crypto.getRandomValues === 'function'
    ? window.crypto.getRandomValues.bind(window.crypto)
    : null;

function getNodeCrypto(): any {
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Dynamic require avoids static resolution by React Native Metro bundler
      const req = typeof eval !== 'undefined' ? eval('require') : null;
      if (typeof req === 'function') {
        return req('crypto');
      }
    }
  } catch {
    // Non-Node environment
  }
  return null;
}

export function decodeBase64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const b0 = chars.indexOf(clean[i]);
    const b1 = chars.indexOf(clean[i + 1]);
    const b2 = chars.indexOf(clean[i + 2]);
    const b3 = chars.indexOf(clean[i + 3]);
    bytes.push((b0 << 2) | (b1 >> 4));
    if (b2 !== -1) bytes.push(((b1 & 15) << 4) | (b2 >> 2));
    if (b3 !== -1) bytes.push(((b2 & 3) << 6) | b3);
  }
  return new Uint8Array(bytes);
}

/**
 * Internal entropy retrieval that guarantees NO recursive calls to globalThis.crypto.
 */
function getRawEntropy(byteLength: number): Uint8Array {
  // 1. Platform registered native provider (e.g. Android SecureRandom via ExpoFaceLiveness)
  if (registeredEntropyProvider) {
    try {
      const bytes = registeredEntropyProvider(byteLength);
      if (bytes && bytes.length === byteLength) {
        return bytes;
      }
    } catch {
      // Continue to next source if native provider encounters an issue
    }
  }

  // 2. Genuine native system Web Crypto API (if present before polyfill)
  if (originalGetRandomValues) {
    const buffer = new Uint8Array(byteLength);
    originalGetRandomValues(buffer);
    return buffer;
  }

  // 3. Node.js crypto module fallback (for server-side, Jest, or CLI environments)
  const nodeCrypto = getNodeCrypto();
  if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
    const nodeBuf = nodeCrypto.randomBytes(byteLength);
    return new Uint8Array(nodeBuf.buffer, nodeBuf.byteOffset, nodeBuf.byteLength);
  }

  // Fail securely: NEVER fall back to Math.random()
  throw new Error(
    '[face-liveness-recognition] Cryptographically secure random source (native SecureRandom / crypto.getRandomValues / node:crypto) is unavailable. ' +
      'Execution halted to prevent insecure cryptographic operations.'
  );
}

/**
 * Returns a Uint8Array filled with cryptographically secure random bytes.
 * Throws immediately and securely if a secure entropy source is unavailable.
 */
export function getRandomBytes(byteLength: number): Uint8Array {
  if (!Number.isInteger(byteLength) || byteLength <= 0) {
    throw new Error(`[face-liveness-recognition] Invalid byte length: ${byteLength}`);
  }
  return getRawEntropy(byteLength);
}

// Polyfill globalThis.crypto.getRandomValues ONLY if native WebCrypto was missing,
// directly referencing getRawEntropy to prevent recursion.
if (typeof globalThis !== 'undefined' && !originalGetRandomValues) {
  try {
    if (!globalThis.crypto) {
      (globalThis as any).crypto = {};
    }
    if (typeof globalThis.crypto.getRandomValues !== 'function') {
      globalThis.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
        if (!array) return array;
        const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        const rand = getRawEntropy(u8.byteLength);
        u8.set(rand);
        return array;
      };
    }
  } catch {
    // Non-fatal if globalThis is sealed
  }
}

/**
 * Encodes a Uint8Array to a standard Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    output += chars[b0 >> 2];
    output += chars[((b0 & 3) << 4) | (b1 >> 4)];
    output += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    output += i + 2 < bytes.length ? chars[b2 & 63] : '=';
  }
  return output;
}

/**
 * Encodes a Uint8Array to a URL-safe Base64 string without padding.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  let base64: string;
  if (typeof btoa === 'function') {
    base64 = btoa(binary);
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  } else {
    // Standalone base64 encoder
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
      output += chars[b0 >> 2];
      output += chars[((b0 & 3) << 4) | (b1 >> 4)];
      output += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '';
      output += i + 2 < bytes.length ? chars[b2 & 63] : '';
    }
    base64 = output;
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Encodes a Uint8Array to a lowercase hexadecimal string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Decodes a hexadecimal string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('[face-liveness-recognition] Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`[face-liveness-recognition] Invalid hex character at index ${i * 2}`);
    }
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Generates an unpredictable cryptographic nonce (default 256 bits / 32 bytes)
 * formatted as a URL-safe Base64 string.
 */
export function generateSecureNonce(byteLength: number = 32): string {
  const bytes = getRandomBytes(byteLength);
  return bytesToBase64Url(bytes);
}

/**
 * Generates an unpredictable unique identifier with optional prefix.
 */
export function generateSecureId(prefix: string = ''): string {
  const bytes = getRandomBytes(16);
  const hex = bytesToHex(bytes);
  return prefix ? `${prefix}_${hex}` : hex;
}

/**
 * Generates an unbiased random integer in the range [0, maxExclusive)
 * using rejection sampling to eliminate modulo bias.
 */
export function getSecureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  if (maxExclusive > 0x100000000) {
    throw new Error('[face-liveness-recognition] Range too large for single word rejection sampling');
  }

  const maxValid = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const uint32Buf = new Uint32Array(1);
  const uint8Buf = new Uint8Array(uint32Buf.buffer);

  while (true) {
    const random = getRandomBytes(4);
    uint8Buf.set(random);
    const value = uint32Buf[0];
    if (value < maxValid) {
      return value % maxExclusive;
    }
  }
}

/**
 * Performs an unbiased Fisher-Yates shuffle on an array using CSPRNG.
 */
export function secureShuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
