/**
 * Cryptographic Signing and Verification (HMAC-SHA256 and ECDSA P-256).
 * Powered by audited @noble/hashes and @noble/curves.
 */

import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { p256 } from '@noble/curves/nist.js';
import { DER } from '@noble/curves/abstract/der.js';
import { CryptographyError } from './aes';
import { bytesToHex, hexToBytes, getRandomBytes, bytesToBase64, decodeBase64ToBytes } from './random';

export type SignatureAlgorithm = 'ECDSA_P256_SHA256' | 'HMAC_SHA256';

/**
 * Constant-time byte array comparison to prevent timing side-channel attacks.
 */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Converts a UTF-8 string or Uint8Array into a Uint8Array.
 */
export function toUint8Array(data: string | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) return data;
  return new TextEncoder().encode(data);
}

/**
 * Computes the SHA-256 digest of data.
 */
export function computeSha256(data: string | Uint8Array): Uint8Array {
  return sha256(toUint8Array(data));
}

/**
 * Computes the SHA-256 digest formatted as a hex string.
 */
export function computeSha256Hex(data: string | Uint8Array): string {
  return bytesToHex(computeSha256(data));
}

/**
 * Base64 encode helper.
 */
export function toBase64(bytes: Uint8Array): string {
  return bytesToBase64(bytes);
}

/**
 * Base64 decode helper.
 */
export function fromBase64(base64: string): Uint8Array {
  return decodeBase64ToBytes(base64);
}

// ============================================================================
// HMAC-SHA256
// ============================================================================

/**
 * Computes genuine HMAC-SHA256 over a payload using a secret key.
 *
 * @returns Hex-encoded or Base64-encoded signature (default: hex)
 */
export function computeHmacSha256(
  payload: string | Uint8Array,
  secretKey: string | Uint8Array,
  encoding: 'hex' | 'base64' = 'hex'
): string {
  const keyBytes = toUint8Array(secretKey);
  const msgBytes = toUint8Array(payload);
  const mac = hmac(sha256, keyBytes, msgBytes);
  return encoding === 'base64' ? toBase64(mac) : bytesToHex(mac);
}

/**
 * Verifies an HMAC-SHA256 signature in constant time.
 */
export function verifyHmacSha256(
  payload: string | Uint8Array,
  signature: string,
  secretKey: string | Uint8Array,
  encoding: 'hex' | 'base64' = 'hex'
): boolean {
  try {
    const keyBytes = toUint8Array(secretKey);
    const msgBytes = toUint8Array(payload);
    const expectedMac = hmac(sha256, keyBytes, msgBytes);

    const receivedMac = encoding === 'base64' ? fromBase64(signature) : hexToBytes(signature);
    if (expectedMac.length !== receivedMac.length) return false;

    return equalBytes(expectedMac, receivedMac);
  } catch {
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
export function normalizeP256PublicKey(publicKeyInput: string | Uint8Array): Uint8Array {
  let bytes: Uint8Array;
  if (typeof publicKeyInput === 'string') {
    const trimmed = publicKeyInput.trim();
    // Check if PEM format
    if (trimmed.includes('-----BEGIN PUBLIC KEY-----')) {
      const b64 = trimmed
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '');
      bytes = fromBase64(b64);
    } else if (/^[0-9a-fA-F]+$/.test(trimmed)) {
      bytes = hexToBytes(trimmed);
    } else {
      bytes = fromBase64(trimmed);
    }
  } else {
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
export function signEcdsaP256(
  payload: string | Uint8Array,
  privateKey: string | Uint8Array,
  format: 'der_hex' | 'der_base64' = 'der_base64'
): string {
  const msgBytes = toUint8Array(payload);
  const privBytes = typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey;

  const compactBytes = p256.sign(msgBytes, privBytes);
  const sigObj = p256.Signature.fromBytes(compactBytes);
  const derHex = DER.hexFromSig(sigObj);

  return format === 'der_hex' ? derHex : toBase64(hexToBytes(derHex));
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
export function verifyEcdsaP256(
  payload: string | Uint8Array,
  signature: string | Uint8Array,
  publicKey: string | Uint8Array
): boolean {
  try {
    const msgBytes = toUint8Array(payload);
    const pubKeyBytes = normalizeP256PublicKey(publicKey);

    let sigBytes: Uint8Array;
    if (signature instanceof Uint8Array) {
      sigBytes = signature;
    } else if (typeof signature === 'string') {
      const trimmed = signature.trim();
      if (/^[0-9a-fA-F]+$/.test(trimmed)) {
        sigBytes = hexToBytes(trimmed);
      } else {
        sigBytes = fromBase64(trimmed);
      }
    } else {
      return false;
    }

    // Convert DER signature to compact signature if it begins with ASN.1 SEQUENCE (0x30)
    let compactSig: Uint8Array;
    if (sigBytes.length !== 64 && sigBytes[0] === 0x30) {
      const parsed = DER.toSig(sigBytes);
      compactSig = new p256.Signature(parsed.r, parsed.s).toBytes();
    } else {
      compactSig = sigBytes;
    }

    // lowS: false is essential for standard Android Keystore / OpenSSL SHA256withECDSA signatures
    return p256.verify(compactSig, msgBytes, pubKeyBytes, { lowS: false });
  } catch {
    return false;
  }
}

/**
 * Generates an ephemeral ECDSA P-256 key pair.
 * Note: Mobile production apps MUST use Android Keystore for hardware-backed keys.
 * This software key generator is intended for server testing, backend simulation, or local mock testing.
 */
export function generateEphemeralP256KeyPair(): {
  privateKeyHex: string;
  publicKeyHex: string;
  publicKeyBase64: string;
} {
  const privBytes = getRandomBytes(32);
  const pubBytes = p256.getPublicKey(privBytes, false); // uncompressed point (65 bytes)

  return {
    privateKeyHex: bytesToHex(privBytes),
    publicKeyHex: bytesToHex(pubBytes),
    publicKeyBase64: toBase64(pubBytes),
  };
}
