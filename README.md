# face-liveness-recognition

[![npm version](https://img.shields.io/npm/v/face-liveness-recognition.svg?color=cb3837)](https://www.npmjs.com/package/face-liveness-recognition)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com)
[![Expo: SDK 51+](https://img.shields.io/badge/Expo-SDK%2051%2B-000000.svg)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6.svg)](https://www.typescriptlang.org)

**Production-grade, 100% on-device face recognition, anti-spoofing, and biometric liveness detection for React Native and Expo applications.**

Built with native C++ runtimes (OpenCV 4.9.0, CameraX, and LiteRT/TensorFlow Lite) and hardened with **Android Keystore (TEE/StrongBox)** hardware-backed cryptographic signing and **Protocol v2.0** server-side anti-replay protection.

> **Zero Cloud Dependencies • Zero Recurring API Fees • Biometrics Never Leave the Device**

---

## Key Highlights

* **100% On-Device Neural Processing**:
  * **Face Recognition (MobileFaceNet)**: Computes 192-dimensional $L_2$-normalized facial feature vectors for sub-millisecond 1-to-1 cosine similarity matching.
  * **Passive Anti-Spoofing (MiniFASNetV2)**: Convolutional neural network detecting 2D printed photographs, digital screen replays, and cutouts.
* **OpenCV 4.9.0 Image Pipeline**:
  * Automated Contrast Limited Adaptive Histogram Equalization (CLAHE) for illumination invariant scanning.
  * Landmark-guided 5-point affine transformation for face alignment and Laplacian blur rejection.
* **Active Kinetic Challenges**:
  * Real-time 3D presence verification via randomized micro-gestures: smile, blink, head turn left, head turn right.
* **Hardware-Backed Cryptography (Android Keystore)**:
  * Signs authentication proofs using non-exportable **ECDSA P-256 (`secp256r1`)** keys sealed inside hardware **TEE** (Trusted Execution Environment) or **StrongBox Keymaster**.
  * Private keys are physically impossible to extract from JavaScript or filesystem memory.
* **Protocol v2.0 Anti-Replay Architecture**:
  * Canonical signed payloads bound to atomic, single-use, server-issued nonces. Prevents eavesdropping and replay attacks.
* **Authenticated Biometric Storage**:
  * Embeddings are encrypted using **AES-256-GCM** with unique 96-bit nonces and employee `userId` bound as Authenticated Additional Data (AAD).
* **Enterprise Multi-Device Ready**:
  * Seamless support for employees logging in across multiple devices or re-logging into existing accounts.

---

## Installation

### 1. Install Dependencies

In your Expo or React Native project:

```bash
npx expo install face-liveness-recognition expo-modules-core
```

> **Requirement**: This library utilizes native C++ and CameraX optimizations. It requires an Android Development Build (`npx expo run:android` or EAS Build). It does not run inside standard Expo Go.

### 2. Configure Expo Plugin (`app.json`)

Add the config plugin to your `app.json`:

```json
{
  "expo": {
    "name": "My Attendance App",
    "slug": "my-attendance-app",
    "plugins": [
      [
        "face-liveness-recognition",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access the camera for biometric attendance and liveness verification."
        }
      ]
    ],
    "android": {
      "permissions": ["android.permission.CAMERA"]
    }
  }
}
```

Prebuild or run your development build:

```bash
npx expo run:android
```

---

## Quickstart (Liveness Camera)

Here is a minimal working screen that presents the biometric camera scanner and validates face presence:

```tsx
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FaceLivenessCamera, LivenessResult } from 'face-liveness-recognition';

export default function LivenessScreen() {
  const handleResult = (result: LivenessResult) => {
    if (result.status === 'live' && result.challengePassed) {
      Alert.alert('Verification Succeeded', `Live face confirmed (Score: ${result.livenessScore.toFixed(2)})`);
    } else {
      Alert.alert('Verification Failed', `Spoof or incomplete scan detected.`);
    }
  };

  return (
    <View style={styles.container}>
      <FaceLivenessCamera
        mode="liveness_only"
        randomizeChallenges={true}
        onResult={handleResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});
```

---

## Complete Enterprise Attendance Workflow

### Step 1: Initial Face Registration (Device 1)

When an employee enrolls for the first time:

```tsx
import {
  BiometricEnrollmentGuard,
  getOrCreateSigningKey,
  LivenessResult,
} from 'face-liveness-recognition';

async function onEnrollmentScanComplete(result: LivenessResult, userId: string, userName: string) {
  if (!result.embedding || result.embedding.length !== 192) {
    throw new Error('Could not extract 192-D face embedding vector');
  }

  // 1. Pack and encrypt embedding via AES-256-GCM (binding userId as Authenticated Additional Data)
  const payload = BiometricEnrollmentGuard.createEnrollmentPayload(
    userId,
    userName,
    result.embedding,
    SERVER_ENCRYPTION_SECRET
  );

  // 2. Generate or retrieve hardware-backed ECDSA P-256 key from Android Keystore
  const deviceKey = getOrCreateSigningKey('biometric_auth_key');

  // 3. Send payload and device public key to your database / API
  await api.post('/api/enroll', {
    userId,
    userName,
    faceTokenEncrypted: payload.faceToken,
    devicePublicKey: deviceKey.publicKey, // SPKI Base64
    isHardwareBacked: deviceKey.isHardwareBacked,
  });
}
```

---

### Step 2: Employee Re-Login (Same or New Device)

When the employee logs in again (or logs in on a new device):

```tsx
import {
  prepareProfileForDevice,
  getOrCreateSigningKey,
} from 'face-liveness-recognition';

// 1. Fetch user record from your backend
const userProfile = await api.get('/api/user/profile');

// If already registered, userProfile.isLocked === true
// 2. Prepare the face vector for on-device 1-to-1 camera comparison
const enrolledProfile = prepareProfileForDevice(
  userProfile.userId,
  userProfile.userName,
  userProfile.faceTokenEncrypted,
  SERVER_ENCRYPTION_SECRET
);

// 3. If on a new device, register the new phone's hardware key with the backend
const currentDeviceKey = getOrCreateSigningKey('biometric_auth_key');
await api.post('/api/device/register', {
  userId: userProfile.userId,
  publicKey: currentDeviceKey.publicKey,
  isHardwareBacked: currentDeviceKey.isHardwareBacked,
});
```

---

### Step 3: Punch In / Attestation with Protocol v2.0

During punch in/out, the device requests an atomic server challenge and signs the proof inside the Keystore:

```tsx
import {
  generateSecureProof,
  createKeystoreProofSigner,
  LivenessResult,
} from 'face-liveness-recognition';

async function performPunchIn(result: LivenessResult, userId: string) {
  // 1. Request single-use unpredictable challenge nonce from server
  const { sessionId, nonce } = await api.post('/api/auth/challenge', { userId });

  // 2. Generate Protocol v2.0 cryptographic proof signed by Android Keystore
  const proof = await generateSecureProof({
    userId,
    sessionId,
    deviceId: 'biometric_auth_key',
    nonce,
    result,
    challengeType: 'smile',
    signer: createKeystoreProofSigner('biometric_auth_key'),
  });

  // 3. Submit proof to backend for atomic verification
  const verification = await api.post('/api/attendance/punch', { proof });
  if (verification.data.success) {
    alert(`Punch Verified! Recorded at: ${verification.data.verifiedAt}`);
  }
}
```

---

## Server-Side Verification (Node.js / Express / Fastify / Supabase)

`face-liveness-recognition` exports ready-to-use reference backend verifiers that run on Node.js without any React Native dependencies:

```ts
import {
  ServerVerificationService,
  AtomicNonceStore,
  DeviceKeyRegistry,
  SecureBiometricProof,
} from 'face-liveness-recognition';

// Persistent or shared singleton instances
const nonceStore = new AtomicNonceStore();
const keyRegistry = new DeviceKeyRegistry();
const verifier = new ServerVerificationService(nonceStore, keyRegistry, {
  minLivenessScore: 0.85,
  minPassiveScore: 0.80,
  minRecognitionScore: 0.72,
  requireChallengePassed: true,
  rateLimitMaxRequestsPerMinute: 30,
});

// Endpoint 1: Issue Challenge
app.post('/api/auth/challenge', (req, res) => {
  const { sessionId, userId, deviceId } = req.body;
  const challenge = verifier.issueChallenge({ sessionId, userId, deviceId });
  res.json({ sessionId: challenge.sessionId, nonce: challenge.nonce });
});

// Endpoint 2: Verify Punch Proof
app.post('/api/attendance/punch', async (req, res) => {
  const proof: SecureBiometricProof = req.body.proof;
  const result = await verifier.verifyProof(proof);

  if (!result.success) {
    return res.status(403).json({ success: false, reason: result.reason, code: result.code });
  }

  // Record verified attendance in database
  await db.attendance.create({
    userId: proof.userId,
    proofId: proof.proofId,
    verifiedAt: result.verifiedAt,
    similarity: result.livenessVerification.similarity,
    hardwareSecured: result.cryptographicVerification.deviceKeyHardwareBacked,
  });

  res.json({ success: true, verifiedAt: result.verifiedAt });
});
```

---

## Security Architecture

All cryptographic algorithms comply with established, audited standards:

| Security Domain | Standard / Primitive | Implementation | Guarantees |
| :--- | :--- | :--- | :--- |
| **Hardware Signing** | ECDSA P-256 (`secp256r1`) | Android Keystore / `@noble/curves` | Private keys are non-exportable and sealed inside TEE / StrongBox. |
| **Symmetric Signing** | HMAC-SHA256 (RFC 2104) | `@noble/hashes` | Constant-time comparison for backend or kiosk integrations. |
| **Vector Encryption** | AES-256-GCM (128-bit Tag) | `@noble/ciphers` | Unique 96-bit nonce per encryption + `userId` Authenticated Additional Data (AAD). |
| **Entropy Source** | Hardware CSPRNG | Native `SecureRandom` + `getRandomValues` | Zero bias rejection sampling for nonces and challenge shuffling. |
| **Replay Defense** | Protocol v2.0 | `AtomicNonceStore` | Single-use nonces guarded by memory/mutex concurrency locks. |

---

## UI Customization

### Built-in Holographic HUD
The camera view includes a built-in futuristic translucent hologram that guides face alignment and turns emerald green upon authentication:

```tsx
<FaceLivenessCamera
  showOverlay={true}
  showHologram={true}
  hologramOpacity={0.25} // 0.1 (faint) to 1.0 (opaque)
  isVerified={isSuccess}
  instructionText={isSuccess ? 'ACCESS GRANTED' : undefined}
  onResult={handleResult}
/>
```

### Headless / Custom UI Mode
To use your own company branding, set `showOverlay={false}` and place your own React Native components inside `<FaceLivenessCamera>`:

```tsx
<FaceLivenessCamera
  showOverlay={false}
  onFaceStatusChanged={(event) => setStatusHint(event.status)}
  onResult={handleResult}
>
  <View style={styles.myCustomHud}>
    <Text style={styles.hudText}>{statusHint}</Text>
  </View>
</FaceLivenessCamera>
```

---

## Camera Props & Configuration

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `'liveness_only' \| 'recognition_only' \| 'both'` | `'both'` | Operational scanning mode. |
| `securityLevel` | `'relaxed' \| 'balanced' \| 'strict'` | `'balanced'` | Pre-configured sensitivity profile. |
| `recognitionThreshold` | `number` | `0.72` | Minimum cosine similarity ($0.0 - 1.0$) to match face. |
| `liveThreshold` | `number` | `0.58` | Anti-spoof neural network confidence threshold. |
| `enrolledProfiles` | `EnrolledProfile[]` | `[]` | List of target face profiles to match against. |
| `randomizeChallenges` | `boolean` | `true` | Randomizes micro-gestures to prevent prerecorded video spoofs. |
| `showOverlay` | `boolean` | `true` | Renders built-in biometric reticle. Set `false` for headless UI. |
| `onResult` | `(result: LivenessResult) => void` | `undefined` | Callback fired on terminal scan completion. |
| `onFaceStatusChanged` | `(event: FaceStatusEvent) => void` | `undefined` | Real-time tracking events (`face_too_far`, `occluded`, etc.). |

---

## License & Attribution

This library is distributed under the **MIT License**.

### Neural Network Models
* **MiniFASNetV2**: Anti-spoofing model derived from [MiniFASNet](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing) (Apache 2.0).
* **MobileFaceNet**: Facial feature extractor derived from [MobileFaceNet](https://github.com/sirius-ai/MobileFaceNet_TF) (Apache 2.0).
* OpenCV 4.9.0 is licensed under Apache 2.0.

See [MODEL_LICENSE.md](MODEL_LICENSE.md) and [LICENSE](LICENSE) for full legal notices.
