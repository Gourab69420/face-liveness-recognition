"use strict";
/**
 * Secure Biometric Proof Verifier (Protocol v2.0).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySecureProof = verifySecureProof;
const canonical_1 = require("./canonical");
const signature_1 = require("../crypto/signature");
/**
 * Validates the cryptographic integrity, structure, expiration, and score bounds of a SecureBiometricProof.
 */
function verifySecureProof(proof, options) {
    const { key, expectedSessionId, expectedUserId, expectedDeviceId, expectedNonce, requireChallengePassed = true, minLivenessScore, clockSkewToleranceMs = 30000, now = new Date(), } = options;
    // 1. Strict structural & type validation
    const structureCheck = (0, canonical_1.validateProofStructure)(proof);
    if (!structureCheck.valid) {
        return {
            valid: false,
            code: structureCheck.code,
            reason: structureCheck.reason,
            proof,
        };
    }
    // 2. Expected field bindings (Session, User, Device, Nonce)
    if (expectedSessionId && proof.sessionId !== expectedSessionId) {
        return {
            valid: false,
            code: 'SESSION_MISMATCH',
            reason: `Proof sessionId '${proof.sessionId}' does not match expected '${expectedSessionId}'.`,
            proof,
        };
    }
    if (expectedUserId && proof.userId !== expectedUserId) {
        return {
            valid: false,
            code: 'INVALID_DATA_TYPE',
            reason: `Proof userId '${proof.userId}' does not match expected '${expectedUserId}'.`,
            proof,
        };
    }
    if (expectedDeviceId && proof.deviceId !== expectedDeviceId) {
        return {
            valid: false,
            code: 'DEVICE_KEY_MISMATCH',
            reason: `Proof deviceId '${proof.deviceId}' does not match expected '${expectedDeviceId}'.`,
            proof,
        };
    }
    if (expectedNonce && proof.nonce !== expectedNonce) {
        return {
            valid: false,
            code: 'NONCE_UNKNOWN',
            reason: `Proof nonce does not match expected challenge nonce.`,
            proof,
        };
    }
    // 3. Expiration and clock-skew validation
    const nowMs = now.getTime();
    const issuedMs = Date.parse(proof.issuedAt);
    const expiresMs = Date.parse(proof.expiresAt);
    if (nowMs > expiresMs) {
        return {
            valid: false,
            code: 'PROOF_EXPIRED',
            reason: `Proof expired at ${proof.expiresAt}. Current time is ${now.toISOString()}.`,
            proof,
        };
    }
    if (issuedMs > nowMs + clockSkewToleranceMs) {
        return {
            valid: false,
            code: 'PROOF_FUTURE_DATED',
            reason: `Proof issued in the future (${proof.issuedAt}) beyond tolerance (${clockSkewToleranceMs}ms).`,
            proof,
        };
    }
    // 4. Kinetic challenge requirement
    if (requireChallengePassed && !proof.challengeResult) {
        return {
            valid: false,
            code: 'CHALLENGE_FAILED',
            reason: `Liveness kinetic challenge was not passed.`,
            proof,
        };
    }
    // 5. Liveness score threshold
    if (minLivenessScore != null && proof.livenessScore < minLivenessScore) {
        return {
            valid: false,
            code: 'SCORE_OUT_OF_BOUNDS',
            reason: `Liveness score (${proof.livenessScore}) is below required threshold (${minLivenessScore}).`,
            proof,
        };
    }
    // 6. Cryptographic signature verification over canonical serialization
    const canonicalPayload = (0, canonical_1.serializeCanonicalProofPayload)(proof);
    let signatureValid = false;
    if (proof.signatureAlgorithm === 'ECDSA_P256_SHA256') {
        signatureValid = (0, signature_1.verifyEcdsaP256)(canonicalPayload, proof.signature, key);
    }
    else if (proof.signatureAlgorithm === 'HMAC_SHA256') {
        signatureValid = (0, signature_1.verifyHmacSha256)(canonicalPayload, proof.signature, key, 'hex');
        if (!signatureValid) {
            // Fallback check for Base64 formatted HMAC signatures
            signatureValid = (0, signature_1.verifyHmacSha256)(canonicalPayload, proof.signature, key, 'base64');
        }
    }
    if (!signatureValid) {
        return {
            valid: false,
            code: 'SIGNATURE_INVALID',
            reason: 'Cryptographic signature verification failed: payload has been tampered with or key is invalid.',
            proof,
        };
    }
    return {
        valid: true,
        code: 'VALID',
        proof,
    };
}
//# sourceMappingURL=verifier.js.map