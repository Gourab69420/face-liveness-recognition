"use strict";
/**
 * Secure Biometric Proof Generator (Protocol v2.0).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureProof = generateSecureProof;
const types_1 = require("./types");
const canonical_1 = require("./canonical");
const random_1 = require("../crypto/random");
const signature_1 = require("../crypto/signature");
/**
 * Creates a cryptographically signed biometric authentication proof (Protocol v2.0).
 */
async function generateSecureProof(options) {
    const { userId, sessionId, deviceId, nonce, result, challengeType = 'none', signer, ttlSeconds = 60, modelVersion = 'MiniFASNetV2-80x80', issuedAt = new Date(), } = options;
    if (!userId || !sessionId || !deviceId || !nonce) {
        throw new Error('[face-liveness-recognition] userId, sessionId, deviceId, and nonce are all required.');
    }
    const proofId = (0, random_1.generateSecureId)('prf');
    const issuedAtIso = issuedAt.toISOString();
    const expiresAtIso = new Date(issuedAt.getTime() + ttlSeconds * 1000).toISOString();
    // Determine signature algorithm and signing function
    let signatureAlgorithm;
    let signFn;
    if ('sign' in signer) {
        signatureAlgorithm = signer.algorithm;
        signFn = signer.sign;
    }
    else if (signer.type === 'ecdsa') {
        signatureAlgorithm = 'ECDSA_P256_SHA256';
        signFn = (payload) => (0, signature_1.signEcdsaP256)(payload, signer.privateKey, 'der_base64');
    }
    else if (signer.type === 'hmac') {
        signatureAlgorithm = 'HMAC_SHA256';
        signFn = (payload) => (0, signature_1.computeHmacSha256)(payload, signer.secretKey, 'hex');
    }
    else {
        throw new Error('[face-liveness-recognition] Invalid signer configuration provided.');
    }
    const unsignedPayload = {
        protocolVersion: types_1.CURRENT_PROTOCOL_VERSION,
        proofId,
        sessionId,
        deviceId,
        userId,
        issuedAt: issuedAtIso,
        expiresAt: expiresAtIso,
        nonce,
        livenessScore: Math.max(0.0, Math.min(1.0, result.score)),
        passiveScore: Math.max(0.0, Math.min(1.0, result.passiveScore)),
        recognitionScore: result.similarity != null ? Math.max(0.0, Math.min(1.0, result.similarity)) : null,
        isMatch: result.isMatch != null ? result.isMatch : null,
        challengeType,
        challengeResult: Boolean(result.challengePassed),
        durationMs: Math.max(0, result.durationMs || 0),
        modelVersion,
        signatureAlgorithm,
    };
    const canonicalPayload = (0, canonical_1.serializeCanonicalProofPayload)(unsignedPayload);
    const signature = await signFn(canonicalPayload);
    return {
        ...unsignedPayload,
        signature,
    };
}
//# sourceMappingURL=generator.js.map