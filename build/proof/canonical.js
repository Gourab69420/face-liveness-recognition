"use strict";
/**
 * Canonical deterministic serialization and structural validation for Biometric Proofs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeCanonicalProofPayload = serializeCanonicalProofPayload;
exports.validateProofStructure = validateProofStructure;
const types_1 = require("./types");
/**
 * Escapes delimiters to avoid field boundary injection attacks.
 */
function escapeField(value) {
    if (value === null || value === undefined)
        return 'null';
    const str = String(value);
    return encodeURIComponent(str);
}
/**
 * Deterministically serializes all security-relevant fields into a canonical string.
 * Uses fixed-point precision for float scores to prevent floating-point serialization discrepancies across JS runtimes.
 */
function serializeCanonicalProofPayload(payload) {
    const parts = [
        `v=${types_1.CURRENT_PROTOCOL_VERSION}`,
        `pid=${escapeField(payload.proofId)}`,
        `sid=${escapeField(payload.sessionId)}`,
        `did=${escapeField(payload.deviceId)}`,
        `uid=${escapeField(payload.userId)}`,
        `iat=${escapeField(payload.issuedAt)}`,
        `exp=${escapeField(payload.expiresAt)}`,
        `nonce=${escapeField(payload.nonce)}`,
        `ls=${Number(payload.livenessScore).toFixed(4)}`,
        `ps=${Number(payload.passiveScore).toFixed(4)}`,
        `rs=${payload.recognitionScore != null ? Number(payload.recognitionScore).toFixed(4) : 'null'}`,
        `match=${payload.isMatch === true ? 'true' : payload.isMatch === false ? 'false' : 'null'}`,
        `ctype=${escapeField(payload.challengeType)}`,
        `cres=${payload.challengeResult ? 'true' : 'false'}`,
        `dur=${Math.round(payload.durationMs)}`,
        `model=${escapeField(payload.modelVersion)}`,
        `alg=${escapeField(payload.signatureAlgorithm)}`,
    ];
    return parts.join('&');
}
/**
 * Validates the strict structure, data types, and bounds of a SecureBiometricProof.
 */
function validateProofStructure(proof) {
    if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
        return {
            valid: false,
            code: 'INVALID_STRUCTURE',
            reason: 'Proof payload must be a non-null JSON object.',
        };
    }
    // Protocol version check
    if (proof.protocolVersion !== types_1.CURRENT_PROTOCOL_VERSION) {
        return {
            valid: false,
            code: 'UNSUPPORTED_VERSION',
            reason: `Unsupported protocol version '${proof.protocolVersion}'. Expected '${types_1.CURRENT_PROTOCOL_VERSION}'.`,
        };
    }
    // Non-empty string fields
    const stringFields = [
        'proofId',
        'sessionId',
        'deviceId',
        'userId',
        'issuedAt',
        'expiresAt',
        'nonce',
        'modelVersion',
        'signature',
    ];
    for (const field of stringFields) {
        if (typeof proof[field] !== 'string' || proof[field].trim().length === 0) {
            return {
                valid: false,
                code: 'INVALID_DATA_TYPE',
                reason: `Field '${field}' must be a non-empty string.`,
            };
        }
    }
    // Signature algorithm
    if (proof.signatureAlgorithm !== 'ECDSA_P256_SHA256' &&
        proof.signatureAlgorithm !== 'HMAC_SHA256') {
        return {
            valid: false,
            code: 'INVALID_DATA_TYPE',
            reason: `Unsupported signature algorithm '${proof.signatureAlgorithm}'.`,
        };
    }
    // Numeric score bounds checks
    if (typeof proof.livenessScore !== 'number' ||
        !Number.isFinite(proof.livenessScore) ||
        proof.livenessScore < 0.0 ||
        proof.livenessScore > 1.0) {
        return {
            valid: false,
            code: 'SCORE_OUT_OF_BOUNDS',
            reason: `livenessScore must be a finite number between 0.0 and 1.0. Received: ${proof.livenessScore}`,
        };
    }
    if (typeof proof.passiveScore !== 'number' ||
        !Number.isFinite(proof.passiveScore) ||
        proof.passiveScore < 0.0 ||
        proof.passiveScore > 1.0) {
        return {
            valid: false,
            code: 'SCORE_OUT_OF_BOUNDS',
            reason: `passiveScore must be a finite number between 0.0 and 1.0. Received: ${proof.passiveScore}`,
        };
    }
    if (proof.recognitionScore != null &&
        (typeof proof.recognitionScore !== 'number' ||
            !Number.isFinite(proof.recognitionScore) ||
            proof.recognitionScore < 0.0 ||
            proof.recognitionScore > 1.0)) {
        return {
            valid: false,
            code: 'SCORE_OUT_OF_BOUNDS',
            reason: `recognitionScore must be a finite number between 0.0 and 1.0. Received: ${proof.recognitionScore}`,
        };
    }
    // Boolean fields
    if (typeof proof.challengeResult !== 'boolean') {
        return {
            valid: false,
            code: 'INVALID_DATA_TYPE',
            reason: "Field 'challengeResult' must be a boolean.",
        };
    }
    if (proof.isMatch != null && typeof proof.isMatch !== 'boolean') {
        return {
            valid: false,
            code: 'INVALID_DATA_TYPE',
            reason: "Field 'isMatch' must be a boolean or null.",
        };
    }
    // Duration
    if (typeof proof.durationMs !== 'number' ||
        !Number.isFinite(proof.durationMs) ||
        proof.durationMs < 0) {
        return {
            valid: false,
            code: 'INVALID_DATA_TYPE',
            reason: "Field 'durationMs' must be a non-negative finite number.",
        };
    }
    // Date parsing
    const issuedTime = Date.parse(proof.issuedAt);
    const expiresTime = Date.parse(proof.expiresAt);
    if (isNaN(issuedTime) || isNaN(expiresTime)) {
        return {
            valid: false,
            code: 'INVALID_DATA_TYPE',
            reason: "Fields 'issuedAt' and 'expiresAt' must be valid ISO 8601 timestamps.",
        };
    }
    if (expiresTime <= issuedTime) {
        return {
            valid: false,
            code: 'INVALID_DATA_TYPE',
            reason: `'expiresAt' (${proof.expiresAt}) must be strictly after 'issuedAt' (${proof.issuedAt}).`,
        };
    }
    return { valid: true };
}
//# sourceMappingURL=canonical.js.map