/**
 * High-Level Android Keystore Client Integration.
 * Manages device-bound non-exportable signing keys and provides
 * a hardware-backed ProofSigner for SecureBiometricProof generation.
 */
import { NativeKeyMetadata } from './NativeExpoFaceLiveness';
import { ProofSignerConfig } from './proof/generator';
export { NativeKeyMetadata };
/**
 * Checks whether Android Keystore hardware key management is available on this device.
 */
export declare function isKeystoreAvailable(): boolean;
/**
 * Retrieves an existing signing key or generates a new non-exportable ECDSA P-256 key pair.
 */
export declare function getOrCreateSigningKey(alias?: string): NativeKeyMetadata;
/**
 * Retrieves the public key and metadata for an existing key, or null if not found.
 */
export declare function getSigningPublicKey(alias?: string): NativeKeyMetadata | null;
/**
 * Signs a canonical payload string using the Keystore private key.
 * Private key material never leaves hardware storage.
 */
export declare function signWithDeviceKey(alias: string, payload: string): string;
/**
 * Generates a new key pair for the alias, invalidating and replacing the previous key (Key Rotation).
 */
export declare function rotateDeviceKey(alias?: string): NativeKeyMetadata;
/**
 * Deletes a signing key from Android Keystore.
 */
export declare function deleteDeviceKey(alias?: string): boolean;
/**
 * Returns a ProofSignerConfig that delegates signing to the hardware-backed Android Keystore.
 * The private key remains securely sealed inside the device's TEE or StrongBox.
 */
export declare function createKeystoreProofSigner(alias?: string): ProofSignerConfig;
//# sourceMappingURL=keystore.d.ts.map