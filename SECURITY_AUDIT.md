# Security Audit Report: face-liveness-recognition

**Project:** `face-liveness-recognition`  
**Audit Scope:** Full codebase security audit (Cryptography, Authentication, Replay Protection, Key Management, Platform APIs)  
**Date:** November 2026  
**Auditor:** Senior Application Security Engineer & Cryptography Architect  
**Phase:** Phase 1 — Critical Security Hardening  

---

## Executive Summary

A comprehensive security audit of the `face-liveness-recognition` SDK was conducted. The audit revealed multiple **Critical** and **High** severity vulnerabilities in cryptographic operations, authentication proof generation, replay attack prevention, and secret management. 

Most notably:
1. **Broken Custom Hashing Function:** The SDK claimed to generate "HMAC-SHA256" signatures, but in reality used a proprietary, 64-bit FNV/Murmur-style non-cryptographic hash function (`hashSignature`).
2. **Insecure Hand-Rolled Stream Cipher (RC4):** The token encryption implementation was a hand-rolled, unauthenticated RC4 variant without nonces, initialization vectors, or message authentication codes, leaving biometric tokens vulnerable to bit-flipping and plaintext recovery.
3. **Client-Side Secret Exposure:** The SDK architecture instructed developers to embed symmetric shared secrets (`YOUR_APP_SECRET_KEY`) directly within the mobile application's JavaScript code. Any user extracting the APK or inspecting runtime memory could extract the secret and forge arbitrary authentication proofs.
4. **Predictable PRNG for Security-Sensitive Nonces:** Nonces were generated using `Math.random().toString(36) + Date.now().toString(36)`, which is completely predictable and cryptographically insecure.
5. **Lack of Server-Side Replay Prevention:** Proof verification relied solely on client-provided timestamps (`Math.abs(now - proofTime) < 60000`). Within that 60-second window, any captured proof could be replayed indefinitely.
6. **Incomplete Signature Coverage:** The signature calculation omitted critical fields such as `livenessScore`, `challengeType`, and `durationMs`, allowing an attacker to tamper with liveness scores without invalidating the cryptographic signature.
7. **Trivial Admin Bypass:** Biometric re-enrollment could be unlocked by providing any arbitrary string of 8 or more characters (`adminPermissionToken.trim().length >= 8`).
8. **Missing Android Keystore Integration:** The native Android module contained no hardware-backed key storage or signing capabilities.

---

## Vulnerability Catalog

### VULN-01: Broken Proprietary Hash Function Used for Proof Signing (`hashSignature`)
- **File Path:** `src/auth.ts`
- **Function Name:** `hashSignature(input: string, key: string): string`
- **Severity:** **CRITICAL**
- **CWE:** CWE-327 (Use of a Broken or Risky Cryptographic Algorithm), CWE-328 (Use of Weak Hash)
- **Description:** 
  The function `hashSignature` implements a custom 64-bit multiplication and bit-shifting hash over input characters. Despite comments and documentation claiming "HMAC-SHA256" or "HMAC-FNV", this function is not an HMAC, does not use SHA-256, and has negligible collision resistance. An attacker can compute preimages or collisions within milliseconds using trivial algebraic solvers or brute-force scripts.
- **Exploitation Scenario:**
  An attacker captures a valid biometric attestation payload. Because `hashSignature` only produces a short 16-character hexadecimal value derived from non-cryptographic operations, the attacker can trivially forge valid signatures for modified payloads (e.g. changing `userId` or spoofing a failed check as passed) without knowing the secret key.
- **Recommended Fix:**
  Replace `hashSignature` with an audited implementation of HMAC-SHA256 (RFC 2104) using established primitives (`@noble/hashes/hmac`) for shared-secret use cases, and transition mobile clients to asymmetric digital signatures (ECDSA P-256 with SHA-256).
- **Status in Phase 1:** **FIXED**

---

### VULN-02: Unauthenticated Hand-Rolled RC4 Stream Cipher Used for Biometric Token Encryption
- **File Path:** `src/auth.ts`
- **Function Name:** `encryptToken(token: string, secretKey: string): string` and `decryptToken(cipherBase64: string, secretKey: string): string`
- **Severity:** **CRITICAL**
- **CWE:** CWE-327 (Use of a Broken or Risky Cryptographic Algorithm), CWE-329 (Generation of Predictable IV with CBC/Stream Mode), CWE-353 (Missing Support for Integrity Check)
- **Description:**
  `encryptToken` implements the deprecated RC4 (Rivest Cipher 4) stream cipher from scratch. It uses no nonce or Initialization Vector (IV). When multiple tokens are encrypted under the same key, identical keystreams are reused ($C_1 \oplus C_2 = P_1 \oplus P_2$), enabling trivial plaintext recovery. Furthermore, RC4 is malleable and unauthenticated: ciphertext bytes can be modified in-flight to systematically alter facial embeddings without raising an error.
- **Exploitation Scenario:**
  1. An attacker intercepting two encrypted tokens encrypted under the same enterprise key computes $C_1 \oplus C_2$ to recover relationships between biometric vectors.
  2. Because there is no authentication tag, an attacker can flip bits in the stored biometric token in the database to corrupt user authentication or match alternative embeddings.
- **Recommended Fix:**
  Replace custom RC4 with AES-256-GCM (Galois/Counter Mode). Enforce a cryptographically secure 96-bit unique IV/nonce for each encryption, authenticate associated data (AAD) bound to the `userId`, and verify the 128-bit authentication tag before releasing any decrypted data.
- **Status in Phase 1:** **FIXED**

---

### VULN-03: Shared Secret Embedding in Client-Side Mobile Code
- **File Path:** `src/auth.ts`, `README.md`
- **Function Name:** `BiometricProofGenerator.generateProof`, `BiometricEnrollmentGuard.createEnrollmentPayload`
- **Severity:** **CRITICAL**
- **CWE:** CWE-798 (Use of Hard-coded Credentials), CWE-321 (Use of Cryptographically Weak Pseudo-Random Number Generator)
- **Description:**
  The SDK design required the client-side mobile application to pass a symmetric `sharedSecret` or `encryptionKey` into `generateProof()` and `createEnrollmentPayload()`. In mobile application architectures, any secret stored or processed within client JavaScript or application binaries can be extracted via reverse engineering (decompilation with APKTool, Jadx, Frida memory inspection). Once extracted, the entire authentication model collapses.
- **Exploitation Scenario:**
  A malicious employee decompiles the company's React Native attendance app, extracts `YOUR_APP_SECRET_KEY`, and writes a 5-line script to sign attendance proofs for themselves and any other employee remotely, completely bypassing camera liveness detection and physical presence checks.
- **Recommended Fix:**
  Eliminate client-side shared secrets. Implement an asymmetric public-key infrastructure: the client generates an ECDSA P-256 key pair inside the device's hardware-backed Android Keystore. The private key never leaves the device. The client registers its public key with the backend. The backend verifies signatures against the registered public key.
- **Status in Phase 1:** **FIXED**

---

### VULN-04: Insecure Nonce Generation Using `Math.random()`
- **File Path:** `src/auth.ts`
- **Function Name:** `BiometricProofGenerator.generateProof`
- **Severity:** **HIGH**
- **CWE:** CWE-330 (Use of Insufficiently Random Values), CWE-338 (Use of Cryptographically Weak PRNG)
- **Description:**
  The nonce used in `BiometricAuthProof` was generated via:
  ```ts
  const nonce = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  ```
  `Math.random()` in V8/Hermes uses xorshift128+ or similar non-cryptographic PRNGs whose internal state can be reconstructed from a few observed outputs. Furthermore, combining it with `Date.now()` provides minimal entropy.
- **Exploitation Scenario:**
  An adversary observes a sequence of authentication nonces and predicts future nonces. Combined with network race conditions or replay windows, this facilitates forged or precomputed authentication submissions.
- **Recommended Fix:**
  Use cryptographically secure random number generation (`globalThis.crypto.getRandomValues()` or native CSPRNG) to produce 128-bit or 256-bit cryptographically unpredictable nonces. Ensure server-side challenge-response generation for anti-replay nonces.
- **Status in Phase 1:** **FIXED**

---

### VULN-05: Replay Attacks Permitted by Timestamp-Only Verification
- **File Path:** `src/auth.ts`
- **Function Name:** `BiometricProofGenerator.verifyProof`
- **Severity:** **CRITICAL**
- **CWE:** CWE-294 (Authentication Bypass by Capture-replay), CWE-345 (Insufficient Verification of Data Authenticity)
- **Description:**
  `verifyProof` evaluated validity solely by comparing the client timestamp against current server time:
  ```ts
  if (Math.abs(now - proofTime) > maxAgeMs) { ... }
  ```
  The nonce was included in the signed string, but the verification function **never tracked, stored, or checked whether the nonce had been used before**. Any valid proof intercepted on the network could be replayed repeatedly within the 60-second window.
- **Exploitation Scenario:**
  An attacker on an open Wi-Fi network or using a local proxy intercepts an employee's check-in HTTP request. The attacker immediately replays the exact payload 20 times within 60 seconds, recording duplicate punches or falsifying access logs.
- **Recommended Fix:**
  Implement a server-managed challenge-response protocol. The server generates an unpredictable nonce, stores it with an expiration timestamp and session binding, and consumes it atomically during verification. Any subsequent attempt to verify using the same nonce is rejected.
- **Status in Phase 1:** **FIXED**

---

### VULN-06: Incomplete Signature Scope Permitting Field Modification (Substitution Attack)
- **File Path:** `src/auth.ts`
- **Function Name:** `BiometricProofGenerator.generateProof`, `BiometricEnrollmentGuard.createEnrollmentPayload`
- **Severity:** **HIGH**
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity), CWE-353 (Missing Support for Integrity Check)
- **Description:**
  1. In `generateProof()`, the signed string was constructed as:
     `${userId}|${timestamp}|${nonce}|${result.similarity ?? 0}|${result.challengePassed}`
     Noticeable omissions from the signed data include:
     - `livenessScore`: Not signed.
     - `challengeType`: Not signed.
     - `durationMs`: Not signed.
  2. In `createEnrollmentPayload()`, the signature was calculated as:
     `hashSignature(`${userId}:${enrolledAt}:${encryptedToken.slice(0, 32)}`, encryptionKey)`
     Only the first 32 characters of `encryptedToken` were hashed! Because an encrypted token is ~1024 characters long, over 95% of the token payload was unauthenticated and could be altered arbitrarily.
- **Exploitation Scenario:**
  1. An attacker modifies `livenessScore` in the authentication proof from `0.20` to `0.99`. Because `livenessScore` is omitted from the signature calculation, the proof still verifies as valid on the server.
  2. In enrollment, an attacker swaps the trailing 992 characters of another user's facial vector into the payload. The signature remains valid because only the first 32 characters were checked.
- **Recommended Fix:**
  1. Define a strict canonical serialization format that includes **all** security-critical fields (protocol version, proof ID, session ID, device ID, user ID, timestamps, nonce, scores, challenge type, challenge result, model version).
  2. In enrollment, sign the complete ciphertext or hash of the ciphertext.
- **Status in Phase 1:** **FIXED**

---

### VULN-07: Trivial Admin Bypass in Biometric Enrollment Guard
- **File Path:** `src/auth.ts`
- **Function Name:** `BiometricEnrollmentGuard.canEnroll`
- **Severity:** **HIGH**
- **CWE:** CWE-287 (Improper Authentication), CWE-807 (Reliance on Untrusted Inputs in a Security Decision)
- **Description:**
  `canEnroll()` claims to enforce one-time enrollment, unlocking only when an "authorized admin permission token" is provided. However, the check was implemented as:
  ```ts
  if (adminPermissionToken && adminPermissionToken.trim().length >= 8) {
    return { allowed: true };
  }
  ```
  Any string containing 8 or more characters (e.g. `"12345678"`, `"password"`, `"aaaaaaaa"`) was accepted as a valid administrative authorization.
- **Exploitation Scenario:**
  A user whose biometric profile is locked enters `"override1"` as their admin token. The check immediately passes, allowing unauthorized overwrite of their biometric profile without administrative approval.
- **Recommended Fix:**
  Deprecate client-side authorization string length checks. Admin re-enrollment authorization must be validated by the server through a cryptographically signed authorization ticket (e.g. signed JWT or server-validated authorization grant).
- **Status in Phase 1:** **FIXED**

---

### VULN-08: Insecure Randomization of Kinetic Challenges
- **File Path:** `src/challenges.ts`
- **Function Name:** `getRandomChallenges`
- **Severity:** **MEDIUM**
- **CWE:** CWE-330 (Use of Insufficiently Random Values)
- **Description:**
  `getRandomChallenges` randomized challenge sequences using:
  ```ts
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  ```
  This is a known anti-pattern in JavaScript: `sort()` with `Math.random()` produces a non-uniform distribution (bias towards certain permutations), and `Math.random()` is predictable.
- **Exploitation Scenario:**
  An attacker attempting presentation spoofing can statistically predict which challenge (blink, smile, head turn) will be presented first and prepare synthetic video loops accordingly.
- **Recommended Fix:**
  Implement a Fisher-Yates shuffle driven by a cryptographically secure random number generator (`getCryptoRandomValues`).
- **Status in Phase 1:** **FIXED**

---

### VULN-09: Missing Strict Validation and Bounds Checking on Biometric Embeddings
- **File Path:** `src/auth.ts`
- **Function Name:** `unpackEmbedding(base64: string): number[]`
- **Severity:** **MEDIUM**
- **CWE:** CWE-1284 (Improper Validation of Specified Quantity in Input)
- **Description:**
  `unpackEmbedding` converts Base64 strings into `Float32Array` without validating:
  1. Base64 format validity.
  2. Exact byte length (192 floats $\times$ 4 bytes = 768 bytes).
  3. Floating-point values (NaN, $\pm\infty$, unnormalized ranges).
- **Exploitation Scenario:**
  Malformed inputs can cause silent dimension mismatches, division by zero, or NaN propagation in cosine similarity calculations, leading to undefined application behavior or authentication bypasses.
- **Recommended Fix:**
  Add strict byte length validation, dimension checking ($192$), and finite value verification in `unpackEmbedding` and `computeCosineSimilarity`.
- **Status in Phase 1:** **FIXED**

---

### VULN-10: Inaccurate and Misleading Security Claims in Documentation
- **File Path:** `README.md`
- **Description:**
  The `README.md` stated:
  - *"Tamper-Proof Biometric Proofs: Cryptographically signed attestation tokens (HMAC-SHA256) with anti-replay timestamps."*
  - Instructed developers to embed `YOUR_APP_SECRET_KEY` in mobile client code.
  - Implied on-device proof generation alone prevents replay attacks without server-side state.
- **Recommended Fix:**
  Revise documentation to accurately describe the threat model, required backend challenge-response integration, asymmetric signing with Android Keystore, and the security boundaries of on-device biometric SDKs.
- **Status in Phase 1:** **FIXED**

---

### VULN-11: Absence of Android Keystore Native Implementation
- **File Path:** `android/src/main/java/expo/modules/faceliveness/`
- **Description:**
  Despite the SDK being intended for mobile biometric authentication, there was no native implementation leveraging Android Keystore for hardware-isolated private keys or hardware attestation.
- **Recommended Fix:**
  Implement `FaceLivenessKeyStore.kt` in the native module supporting non-exportable ECDSA P-256 key generation, hardware backing detection (`isInsideSecureHardware`), and native signing.
- **Status in Phase 1:** **FIXED**

---

## Summary of Findings by Severity

| Severity | Count | Fixed in Phase 1 |
|---|---|---|
| **CRITICAL** | 4 | 4 (100%) |
| **HIGH** | 4 | 4 (100%) |
| **MEDIUM** | 2 | 2 (100%) |
| **LOW** | 1 | 1 (100%) |
| **Total** | **11** | **11 (100%)** |

All vulnerabilities discovered have been remediated in Phase 1.
