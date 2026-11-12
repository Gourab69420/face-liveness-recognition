# Security Policy & Architecture Guide

## Security Policy

### Reporting Vulnerabilities

If you discover a security vulnerability in `face-liveness-recognition`, please report it responsibly by contacting the maintainers directly via email at `gourabsamanta35@gmail.com` or creating a private security advisory on GitHub. Please **do not** open public issues for suspected vulnerabilities.

We aim to acknowledge receipt of reports within 48 hours and provide security patches or mitigations promptly.

---

## Security Architecture Overview (Phase 1: Hardened)

`face-liveness-recognition` is an on-device biometric SDK designed for React Native and Expo applications. 

### Core Cryptographic Primitives

All proprietary and custom cryptographic algorithms have been eliminated in favor of established, audited cryptographic standards:

| Capability | Standard / Algorithm | Implementation | Notes |
|---|---|---|---|
| **Asymmetric Signing** | ECDSA P-256 (`secp256r1`) + SHA-256 | Android Keystore (Native) / `@noble/curves` | Private keys are non-exportable and sealed in hardware. |
| **Symmetric Signing** | HMAC-SHA256 (RFC 2104) | `@noble/hashes` | For server-to-server or controlled kiosk use only. |
| **Biometric Encryption** | AES-256-GCM (128-bit Auth Tag) | `@noble/ciphers` | Unique 96-bit nonce per encryption + AAD binding. |
| **Random Number Gen** | CSPRNG | `crypto.getRandomValues` / `node:crypto` | Unbiased rejection sampling for nonces and challenges. |

---

## Key Lifecycle & Android Keystore

Mobile clients generate an asymmetric key pair inside the **Android Keystore** provider (`"AndroidKeyStore"`):

1. **Key Generation:**
   - Generated using `KeyGenParameterSpec` configured for `PURPOSE_SIGN`.
   - Algorithm: `EC` (`secp256r1`) with `DIGEST_SHA256`.
   - On Android 9+ (API 28+), StrongBox Keymaster is automatically preferred when hardware chips are present.
2. **Key Storage:**
   - The private key is **non-exportable**. It never leaves hardware storage (TEE or StrongBox) and is never exposed to JavaScript memory.
3. **Key Registration:**
   - The device exports its public key in standard X.509 SubjectPublicKeyInfo (SPKI) DER Base64 format.
   - The application registers this public key with the backend server upon initial enrollment or device provisioning.
4. **Key Rotation & Revocation:**
   - The SDK supports key rotation (`rotateDeviceKey()`), generating a new key pair while preserving the alias or creating versioned aliases.
   - Compromised or decommissioned devices can have their public keys revoked on the backend (`revokeKey()`).

---

## Anti-Replay Architecture

Anti-replay protection cannot be achieved securely inside client-side code alone. A trusted backend authority must mediate challenges:

```
Mobile Client                                              Backend Server
     |                                                           |
     | ----- 1. Request Authentication Challenge ------------->  |
     |                                                           | (Generates 256-bit nonce)
     | <---- 2. Returns Challenge (nonce, sessionId, exp) ------ | (Stores in Atomic Nonce Store)
     |                                                           |
  [Live Face Scan]                                               |
  [MiniFASNet Check]                                             |
  [Hardware Sign Proof]                                          |
     |                                                           |
     | ----- 3. Submit SecureBiometricProof -------------------> |
     |                                                           | (Atomically consumes nonce)
     |                                                           | (Verifies ECDSA signature)
     |                                                           | (Evaluates liveness scores)
     | <---- 4. Verification Result (Success / Fail) ----------- |
```

### Server Nonce Guarantees:
- **Unpredictable:** 256-bit cryptographically secure random entropy.
- **Bound:** Nonces are bound to `sessionId`, `userId`, and `deviceId`.
- **Single-Use:** Nonces are atomically transitioned (`ISSUED` $\to$ `CONSUMED`). Concurrent requests for the same nonce are strictly blocked via atomic test-and-set locks.
- **Time-Bounded:** Nonces expire after a configurable TTL (default: 60 seconds).

---

## Crucial Distinction: Cryptographic Validity vs. Physical Liveness

> [!WARNING]
> A valid cryptographic signature guarantees only that the **registered device signed the payload**. It does not guarantee that the camera feed or underlying OS has not been manipulated.

The backend verification engine (`ServerVerificationService`) strictly separates these two evaluations:

1. **Cryptographic Verification (`cryptographicVerification`):**
   - Signature is mathematically valid for the registered device public key.
   - Nonce was atomically consumed and was not replayed.
   - Payload structure and protocol version are authentic and untampered.
2. **Liveness Decision (`livenessVerification`):**
   - Liveness score meets or exceeds the required threshold (e.g. $\ge 0.85$).
   - Passive anti-spoofing score meets the threshold.
   - Active kinetic challenge was passed.

A proof can be cryptographically authentic while failing the liveness check (e.g. when an attacker presents a photo to a genuine registered device).

---

## Known Security Limitations & Threat Boundaries

1. **Rooted Devices & OS Compromise:**
   - On rooted or jailbroken devices, attackers with kernel or root privileges can use dynamic instrumentation frameworks (e.g. Frida, Xposed, Magisk modules) to intercept camera frames at the driver layer or patch neural network inference scores in application memory.
   - While Android Keystore hardware keys protect the private key from extraction, they cannot protect client application memory on an untrusted operating system.
   - For high-risk applications, combine this SDK with Google Play Integrity API or enterprise device attestation.
2. **Client-Side Secrets:**
   - Never embed symmetric shared secrets (`sharedSecret`, enterprise master keys) inside mobile client JavaScript code or application bundles.
   - Use asymmetric public-key cryptography (Android Keystore ECDSA P-256) on mobile devices.
3. **Virtual Cameras & Injected Video Feeds:**
   - Virtual camera drivers running on modified Android operating systems can feed pre-recorded videos to the camera stack. Active kinetic challenges (e.g. randomized head turns, smiles, blinks) mitigate static injection, but real-time interactive challenges driven by the server are recommended for high-assurance scenarios.
