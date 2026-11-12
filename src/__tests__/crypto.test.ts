import {
  getRandomBytes,
  generateSecureNonce,
  generateSecureId,
  getSecureRandomInt,
  secureShuffle,
} from '../crypto/random';
import {
  encryptAesGcm,
  decryptAesGcm,
  decryptAesGcmBytes,
  normalizeKey,
  AuthenticationTagMismatchError,
  CryptographyError,
} from '../crypto/aes';
import {
  computeHmacSha256,
  verifyHmacSha256,
  signEcdsaP256,
  verifyEcdsaP256,
  generateEphemeralP256KeyPair,
  equalBytes,
} from '../crypto/signature';

describe('Cross-Platform Cryptography Primitives Suite', () => {
  describe('CSPRNG & Random Generation', () => {
    test('getRandomBytes returns Uint8Array with exact requested length', () => {
      const bytes16 = getRandomBytes(16);
      const bytes32 = getRandomBytes(32);
      expect(bytes16).toBeInstanceOf(Uint8Array);
      expect(bytes16.length).toBe(16);
      expect(bytes32.length).toBe(32);
    });

    test('getRandomBytes rejects invalid lengths', () => {
      expect(() => getRandomBytes(0)).toThrow();
      expect(() => getRandomBytes(-5)).toThrow();
      expect(() => getRandomBytes(1.5)).toThrow();
    });

    test('generateSecureNonce returns unique, unpredictable strings', () => {
      const nonce1 = generateSecureNonce();
      const nonce2 = generateSecureNonce();
      expect(typeof nonce1).toBe('string');
      expect(nonce1.length).toBeGreaterThanOrEqual(40);
      expect(nonce1).not.toEqual(nonce2);
    });

    test('generateSecureId prefixes and generates unique hex IDs', () => {
      const id1 = generateSecureId('prf');
      const id2 = generateSecureId('prf');
      expect(id1.startsWith('prf_')).toBe(true);
      expect(id1).not.toEqual(id2);
    });

    test('getSecureRandomInt produces values strictly within [0, maxExclusive)', () => {
      for (let i = 0; i < 50; i++) {
        const val = getSecureRandomInt(5);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(5);
      }
    });

    test('secureShuffle produces an unbiased permutation containing all original items', () => {
      const original = ['turn_head_left', 'turn_head_right', 'smile', 'blink'] as const;
      const shuffled = secureShuffle(original);
      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort()).toEqual([...original].sort());
    });
  });

  describe('AES-256-GCM Authenticated Encryption', () => {
    const key = 'secure_enterprise_master_key_2026';
    const plaintext = '192-dimensional-biometric-face-token-payload-data';

    test('successful encryption and decryption round-trip', () => {
      const encrypted = encryptAesGcm(plaintext, key);
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toEqual(plaintext);

      const decrypted = decryptAesGcm(encrypted, key);
      expect(decrypted).toEqual(plaintext);
    });

    test('unique nonces produce semantic indistinguishability under the same key', () => {
      const enc1 = encryptAesGcm(plaintext, key);
      const enc2 = encryptAesGcm(plaintext, key);
      // Even with the identical plaintext and key, outputs MUST differ due to random 96-bit nonces
      expect(enc1).not.toEqual(enc2);

      expect(decryptAesGcm(enc1, key)).toEqual(plaintext);
      expect(decryptAesGcm(enc2, key)).toEqual(plaintext);
    });

    test('supports Authenticated Additional Data (AAD) bound to user identity', () => {
      const aad = 'user_account_98765';
      const encrypted = encryptAesGcm(plaintext, key, { associatedData: aad });

      // Decryption with matching AAD succeeds
      const decrypted = decryptAesGcm(encrypted, key, { associatedData: aad });
      expect(decrypted).toEqual(plaintext);

      // Decryption with wrong AAD fails authentication
      expect(() => {
        decryptAesGcm(encrypted, key, { associatedData: 'wrong_user_account' });
      }).toThrow(AuthenticationTagMismatchError);

      // Decryption with missing AAD fails authentication
      expect(() => {
        decryptAesGcm(encrypted, key);
      }).toThrow(AuthenticationTagMismatchError);
    });

    test('tampering with ciphertext bytes causes AuthenticationTagMismatchError', () => {
      const encrypted = encryptAesGcm(plaintext, key);
      const buffer = Buffer.from(encrypted, 'base64');
      // Flip a bit in the ciphertext region
      buffer[buffer.length - 5] ^= 0x01;
      const tampered = buffer.toString('base64');

      expect(() => {
        decryptAesGcm(tampered, key);
      }).toThrow(AuthenticationTagMismatchError);
    });

    test('tampering with nonce causes AuthenticationTagMismatchError', () => {
      const encrypted = encryptAesGcm(plaintext, key);
      const buffer = Buffer.from(encrypted, 'base64');
      // Flip a bit in the nonce region (bytes 1 to 12)
      buffer[3] ^= 0xff;
      const tampered = buffer.toString('base64');

      expect(() => {
        decryptAesGcm(tampered, key);
      }).toThrow(AuthenticationTagMismatchError);
    });

    test('rejects truncated envelope or corrupted base64', () => {
      expect(() => decryptAesGcm('', key)).toThrow(CryptographyError);
      expect(() => decryptAesGcm('AAAA', key)).toThrow(CryptographyError);
    });

    test('rejects invalid key lengths', () => {
      expect(() => normalizeKey(new Uint8Array(16))).toThrow(CryptographyError);
      expect(() => normalizeKey('')).toThrow(CryptographyError);
    });
  });

  describe('HMAC-SHA256 Signing', () => {
    const secret = 'shared_server_secret_key_abc_123';
    const message = 'user_123|session_456|nonce_789|0.92|true';

    test('signs and verifies valid HMAC-SHA256 signatures', () => {
      const sigHex = computeHmacSha256(message, secret, 'hex');
      expect(typeof sigHex).toBe('string');
      expect(sigHex.length).toBe(64); // 256 bits = 64 hex chars

      const isValid = verifyHmacSha256(message, sigHex, secret, 'hex');
      expect(isValid).toBe(true);
    });

    test('rejects HMAC signatures with wrong secret key', () => {
      const sigHex = computeHmacSha256(message, secret, 'hex');
      const isValid = verifyHmacSha256(message, sigHex, 'different_secret', 'hex');
      expect(isValid).toBe(false);
    });

    test('rejects HMAC signatures when message is modified', () => {
      const sigHex = computeHmacSha256(message, secret, 'hex');
      const isValid = verifyHmacSha256(message + '_tampered', sigHex, secret, 'hex');
      expect(isValid).toBe(false);
    });

    test('equalBytes compares byte arrays in constant time', () => {
      const a = new Uint8Array([1, 2, 3, 4]);
      const b = new Uint8Array([1, 2, 3, 4]);
      const c = new Uint8Array([1, 2, 3, 5]);
      expect(equalBytes(a, b)).toBe(true);
      expect(equalBytes(a, c)).toBe(false);
      expect(equalBytes(a, new Uint8Array([1, 2]))).toBe(false);
    });
  });

  describe('ECDSA P-256 Asymmetric Signing', () => {
    const keyPair = generateEphemeralP256KeyPair();
    const payload = 'canonical_biometric_proof_string_version_2';

    test('signs and verifies payload using ECDSA P-256', () => {
      const sig = signEcdsaP256(payload, keyPair.privateKeyHex);
      expect(typeof sig).toBe('string');

      const verified = verifyEcdsaP256(payload, sig, keyPair.publicKeyBase64);
      expect(verified).toBe(true);
    });

    test('verifies payload using hex representation of public key', () => {
      const sig = signEcdsaP256(payload, keyPair.privateKeyHex);
      const verified = verifyEcdsaP256(payload, sig, keyPair.publicKeyHex);
      expect(verified).toBe(true);
    });

    test('rejects ECDSA signature when payload is modified', () => {
      const sig = signEcdsaP256(payload, keyPair.privateKeyHex);
      const verified = verifyEcdsaP256(payload + '_tampered', sig, keyPair.publicKeyBase64);
      expect(verified).toBe(false);
    });

    test('rejects ECDSA signature with different public key', () => {
      const otherKeyPair = generateEphemeralP256KeyPair();
      const sig = signEcdsaP256(payload, keyPair.privateKeyHex);
      const verified = verifyEcdsaP256(payload, sig, otherKeyPair.publicKeyBase64);
      expect(verified).toBe(false);
    });

    test('handles corrupted signature bytes gracefully without crashing', () => {
      const corruptedSig = 'not_a_valid_der_signature_string';
      const verified = verifyEcdsaP256(payload, corruptedSig, keyPair.publicKeyBase64);
      expect(verified).toBe(false);
    });
  });
});
