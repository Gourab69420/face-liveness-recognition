/**
 * High-Level Android Keystore Client Integration.
 * Manages device-bound non-exportable signing keys and provides
 * a hardware-backed ProofSigner for SecureBiometricProof generation.
 */

import { NativeFaceLivenessModule, NativeKeyMetadata } from './NativeExpoFaceLiveness';
import { ProofSignerConfig } from './proof/generator';

export { NativeKeyMetadata };

/**
 * Checks whether Android Keystore hardware key management is available on this device.
 */
export function isKeystoreAvailable(): boolean {
  try {
    return NativeFaceLivenessModule.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Retrieves an existing signing key or generates a new non-exportable ECDSA P-256 key pair.
 */
export function getOrCreateSigningKey(alias: string = 'face_liveness_device_key'): NativeKeyMetadata {
  const existing = NativeFaceLivenessModule.getSigningPublicKey(alias);
  if (existing) {
    return existing;
  }
  return NativeFaceLivenessModule.generateSigningKey(alias);
}

/**
 * Retrieves the public key and metadata for an existing key, or null if not found.
 */
export function getSigningPublicKey(alias: string = 'face_liveness_device_key'): NativeKeyMetadata | null {
  return NativeFaceLivenessModule.getSigningPublicKey(alias);
}

/**
 * Signs a canonical payload string using the Keystore private key.
 * Private key material never leaves hardware storage.
 */
export function signWithDeviceKey(alias: string, payload: string): string {
  return NativeFaceLivenessModule.signPayload(alias, payload);
}

/**
 * Generates a new key pair for the alias, invalidating and replacing the previous key (Key Rotation).
 */
export function rotateDeviceKey(alias: string = 'face_liveness_device_key'): NativeKeyMetadata {
  return NativeFaceLivenessModule.generateSigningKey(alias);
}

/**
 * Deletes a signing key from Android Keystore.
 */
export function deleteDeviceKey(alias: string = 'face_liveness_device_key'): boolean {
  return NativeFaceLivenessModule.deleteSigningKey(alias);
}

/**
 * Returns a ProofSignerConfig that delegates signing to the hardware-backed Android Keystore.
 * The private key remains securely sealed inside the device's TEE or StrongBox.
 */
export function createKeystoreProofSigner(alias: string = 'face_liveness_device_key'): ProofSignerConfig {
  return {
    algorithm: 'ECDSA_P256_SHA256',
    sign: (canonicalPayload: string) => {
      return signWithDeviceKey(alias, canonicalPayload);
    },
  };
}
