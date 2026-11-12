"use strict";
/**
 * High-Level Android Keystore Client Integration.
 * Manages device-bound non-exportable signing keys and provides
 * a hardware-backed ProofSigner for SecureBiometricProof generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isKeystoreAvailable = isKeystoreAvailable;
exports.getOrCreateSigningKey = getOrCreateSigningKey;
exports.getSigningPublicKey = getSigningPublicKey;
exports.signWithDeviceKey = signWithDeviceKey;
exports.rotateDeviceKey = rotateDeviceKey;
exports.deleteDeviceKey = deleteDeviceKey;
exports.createKeystoreProofSigner = createKeystoreProofSigner;
const NativeExpoFaceLiveness_1 = require("./NativeExpoFaceLiveness");
/**
 * Checks whether Android Keystore hardware key management is available on this device.
 */
function isKeystoreAvailable() {
    try {
        return NativeExpoFaceLiveness_1.NativeFaceLivenessModule.isAvailable();
    }
    catch {
        return false;
    }
}
/**
 * Retrieves an existing signing key or generates a new non-exportable ECDSA P-256 key pair.
 */
function getOrCreateSigningKey(alias = 'face_liveness_device_key') {
    const existing = NativeExpoFaceLiveness_1.NativeFaceLivenessModule.getSigningPublicKey(alias);
    if (existing) {
        return existing;
    }
    return NativeExpoFaceLiveness_1.NativeFaceLivenessModule.generateSigningKey(alias);
}
/**
 * Retrieves the public key and metadata for an existing key, or null if not found.
 */
function getSigningPublicKey(alias = 'face_liveness_device_key') {
    return NativeExpoFaceLiveness_1.NativeFaceLivenessModule.getSigningPublicKey(alias);
}
/**
 * Signs a canonical payload string using the Keystore private key.
 * Private key material never leaves hardware storage.
 */
function signWithDeviceKey(alias, payload) {
    return NativeExpoFaceLiveness_1.NativeFaceLivenessModule.signPayload(alias, payload);
}
/**
 * Generates a new key pair for the alias, invalidating and replacing the previous key (Key Rotation).
 */
function rotateDeviceKey(alias = 'face_liveness_device_key') {
    return NativeExpoFaceLiveness_1.NativeFaceLivenessModule.generateSigningKey(alias);
}
/**
 * Deletes a signing key from Android Keystore.
 */
function deleteDeviceKey(alias = 'face_liveness_device_key') {
    return NativeExpoFaceLiveness_1.NativeFaceLivenessModule.deleteSigningKey(alias);
}
/**
 * Returns a ProofSignerConfig that delegates signing to the hardware-backed Android Keystore.
 * The private key remains securely sealed inside the device's TEE or StrongBox.
 */
function createKeystoreProofSigner(alias = 'face_liveness_device_key') {
    return {
        algorithm: 'ECDSA_P256_SHA256',
        sign: (canonicalPayload) => {
            return signWithDeviceKey(alias, canonicalPayload);
        },
    };
}
//# sourceMappingURL=keystore.js.map