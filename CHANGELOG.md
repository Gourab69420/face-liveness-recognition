# Changelog

All notable changes to the `face-liveness-recognition` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - Phase 1: Critical Security Hardening

### Added
- **Audited Cryptographic Primitives:**
  - Integrated `@noble/ciphers` for authenticated symmetric encryption via AES-256-GCM.
  - Integrated `@noble/hashes` for genuine HMAC-SHA256 signing and SHA-256 digest computation.
  - Integrated `@noble/curves` for asymmetric ECDSA P-256 (`secp256r1`) signature generation and verification.
- **Cross-Platform CSPRNG (`src/crypto/random.ts`):**
  - Cryptographically secure pseudo-random number generator utilizing `crypto.getRandomValues` and `node:crypto`.
  - Unbiased rejection-sampling Fisher-Yates array shuffle for randomized kinetic presence challenges.
  - Secure 256-bit nonce and unique identifier generation.
- **Hardware-Backed Android Keystore Integration (`src/keystore.ts` & native Kotlin `FaceLivenessKeyStore.kt`):**
  - Native Android Keystore integration for generating non-exportable ECDSA P-256 key pairs.
  - Hardware backing detection (`isInsideSecureHardware`, StrongBox support on Android 9+).
  - Private keys never leave hardware security modules and are never exposed to JavaScript.
  - Key lifecycle management: key generation, public key export (X.509 SPKI), payload signing, key rotation, and deletion.
- **Protocol v2.0 Secure Biometric Proofs (`src/proof/`):**
  - Deterministic canonical serialization format binding every security-relevant field (`protocolVersion`, `proofId`, `sessionId`, `deviceId`, `userId`, `issuedAt`, `expiresAt`, `nonce`, `livenessScore`, `passiveScore`, `recognitionScore`, `challengeType`, `challengeResult`, `durationMs`, `modelVersion`, `signatureAlgorithm`).
  - Strict type and bounds checking rejecting out-of-range scores, future-dated proofs, and expired proofs.
  - Elimination of field substitution and truncation attacks.
- **Reference Anti-Replay Backend Architecture (`src/server/`):**
  - `AtomicNonceStore`: Thread-safe, atomic challenge nonce management preventing race conditions and concurrent replay submissions.
  - `DeviceKeyRegistry`: Server-side registry for client public keys with support for key rotation and revocation.
  - `ServerVerificationService`: End-to-end verification service enforcing rate limiting, atomic nonce consumption, asymmetric signature verification, and clear separation of cryptographic validity from biometric liveness scoring.
- **Automated Security Test Suites:**
  - 7 test suites with 70 passing unit and adversarial tests covering valid/invalid signatures, payload tampering, score manipulation, AES-GCM tag verification, CSPRNG randomness, concurrent replay races, and key lifecycle.
- **Security Documentation:**
  - Added comprehensive `SECURITY.md`, `SECURITY_AUDIT.md`, and updated `README.md`.

### Changed
- **Replaced Custom `hashSignature`:** Deprecated proprietary 64-bit multiplication hash in favor of standard HMAC-SHA256 and ECDSA P-256.
- **Replaced Hand-Rolled RC4:** Deprecated unauthenticated RC4 stream cipher in favor of authenticated AES-256-GCM with unique 96-bit nonces and AAD binding.
- **Hardened Embedding Serialization:** Added strict byte length (768 bytes) and dimension (192 floats) validation with non-finite float rejection in `packEmbedding` and `unpackEmbedding`.
- **Hardened Kinetic Challenge Randomization:** Replaced biased `sort(() => 0.5 - Math.random())` with cryptographically secure Fisher-Yates shuffle.

### Deprecated
- `BiometricProofGenerator` / `BiometricAuthProof` (Protocol v1): Deprecated in favor of `generateSecureProof` and `SecureBiometricProof` (Protocol v2).
- Client-side symmetric shared secret signing: Deprecated in mobile applications to prevent credential extraction from application packages.
