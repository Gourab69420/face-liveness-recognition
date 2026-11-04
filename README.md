# face-liveness-recognition

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com)
[![Expo: SDK 51+](https://img.shields.io/badge/Expo-SDK%2051%2B-black.svg)](https://expo.dev)

**Android-first, 100% on-device face recognition, active & passive liveness detection, and anti-spoofing for React Native apps made with Expo.**

Designed for attendance systems, HRMS, digital onboarding, user verification, and secure app unlock — completely free of costly third-party cloud APIs.

---

## 🌟 Key Capabilities

* **On-Device Face Recognition (MobileFaceNet):** Extracts 192-dimensional $L_2$-normalized facial feature embeddings (`||v|| = 1.0`) with instant on-device cosine similarity matching.
* **OpenCV 4.9.0 Image Processing:** 
  * **CLAHE Illumination Equalization:** Automatically balances harsh room lighting, backlighting, and shadows across the face.
  * **5-Point Landmark Affine Alignment:** Uses eye centers to rotate and crop the face into a canonical 112×112 patch.
  * **Face Quality Assessment (FQA):** Evaluates sharpness via Laplacian variance to reject motion-blurred or underexposed frames.
* **Passive Anti-Spoofing (MiniFASNetV2):** Neural network detection of physical presentation attacks (printed paper photos, cardboard cutouts, digital replay screens).
* **Hardware ISP Smoothing Override (`Camera2Interop`):** Disables aggressive front-camera beauty smoothing and noise reduction to preserve natural skin pore textures.
* **Active Kinetic Challenges:** Prompts users to **Smile 😊**, **Blink 👁️**, **Turn Left 👈**, **Turn Right 👉**, or **Nod** to verify real-time 3D presence.
* **Enterprise Security & Database Ready:**
  * **One-Time Enrollment Guard:** Locks biometric registration once completed; requires admin permission token for re-enrollment.
  * **Portable Binary Face Tokens:** Compresses 192 floats into an encrypted 1,024-character Base64 token (768 bytes) for seamless cross-device login and matching.
  * **Anti-Replay Proof Generator:** Cryptographically signs check-in requests to prevent API tampering via Postman or scripts.

---

## 🔒 Privacy & Compliance

* **Zero Cloud Biometrics:** Raw camera frames and face crops are never uploaded, stored on disk, or transmitted.
* **Ephemeral Processing:** Frames are processed transiently in device RAM and recycled immediately.
* **Irreversible Embeddings:** MobileFaceNet vectors are mathematical abstractions — a 192-number vector cannot be reverse-engineered into a person's photo.

---

## 📦 Installation

In your Expo project:

```bash
npx expo install face-liveness-recognition expo-modules-core
```

> **Note:** Because this module runs native C++ neural runtimes (OpenCV, CameraX, LiteRT/TensorFlow Lite), **it requires an Expo development build (`npx expo run:android` or EAS Build)**. It does not run inside Expo Go.

---

## ⚙️ Expo Configuration (`app.json`)

Add the plugin to your `app.json`:

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "plugins": [
      [
        "face-liveness-recognition",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to use the camera for face recognition and liveness check."
        }
      ]
    ],
    "android": {
      "permissions": ["android.permission.CAMERA"]
    }
  }
}
```

---

## 📱 Frontend Integration (React Native / Expo)

### 1. Daily Check-In / Punch-In Flow

```tsx
import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import {
  FaceLivenessCamera,
  LivenessResult,
  prepareProfileForDevice,
  BiometricProofGenerator,
} from 'face-liveness-recognition';

export default function CheckInScreen({ user, userAuthToken }) {
  // 1. Prepare user's profile fetched from your database
  const enrolledProfiles = [
    prepareProfileForDevice(
      user.id,
      user.name,
      user.encryptedFaceTokenFromDB,
      'YOUR_ENTERPRISE_SECRET_KEY'
    ),
  ];

  const handleResult = async (result: LivenessResult) => {
    // 2. Check if face matched the enrolled user and physical liveness passed
    if (result.isMatch && result.status === 'live' && result.challengePassed) {
      // 3. Generate cryptographic attestation proof (prevents API spoofing)
      const proof = BiometricProofGenerator.generateProof(
        user.id,
        result,
        'YOUR_ENTERPRISE_SECRET_KEY',
        'smile'
      );

      // 4. Send verified check-in to your backend API
      const res = await fetch('https://api.yourbackend.com/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAuthToken}`,
        },
        body: JSON.stringify(proof),
      });

      if (res.ok) {
        Alert.alert('Verified!', `Welcome, ${result.matchedUserName || user.name}!`);
      }
    } else {
      Alert.alert('Verification Failed', 'Face did not match or motion challenge failed.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FaceLivenessCamera
        mode="liveness_and_recognition"
        securityLevel="balanced"
        enrolledProfiles={enrolledProfiles}
        recognitionThreshold={0.72}
        config={{
          challenges: ['smile'], // Fast and natural for check-in
        }}
        onResult={handleResult}
      />
    </View>
  );
}
```

---

### 2. One-Time Enrollment Flow (with Admin Lock)

```tsx
import React from 'react';
import { View, Alert } from 'react-native';
import {
  FaceLivenessCamera,
  LivenessResult,
  BiometricEnrollmentGuard,
} from 'face-liveness-recognition';

export default function EnrollmentScreen({ user, adminUnlockToken }) {
  // Verify user is permitted to enroll (not locked without admin token)
  const eligibility = BiometricEnrollmentGuard.canEnroll(user, adminUnlockToken);
  if (!eligibility.allowed) {
    Alert.alert('Enrollment Locked', eligibility.reason);
    return null;
  }

  const handleEnrollResult = async (result: LivenessResult) => {
    if (result.embedding && result.embedding.length === 192) {
      // 1. Pack and encrypt the 192-D embedding
      const payload = BiometricEnrollmentGuard.createEnrollmentPayload(
        user.id,
        user.name,
        result.embedding,
        'YOUR_ENTERPRISE_SECRET_KEY'
      );

      // 2. Save encrypted face token to your backend database
      await fetch('https://api.yourbackend.com/api/biometrics/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      Alert.alert('Success', 'Face profile enrolled and locked successfully!');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FaceLivenessCamera
        mode="recognition_only"
        onResult={handleEnrollResult}
      />
    </View>
  );
}
```

---

## 🗄️ Backend & Database Integration

### 1. Database Schema

#### PostgreSQL
```sql
CREATE TABLE user_biometrics (
    user_id VARCHAR(64) PRIMARY KEY,
    user_name VARCHAR(128) NOT NULL,
    face_token VARCHAR(1024) NOT NULL, -- Encrypted compact binary Base64 (768 bytes)
    is_locked BOOLEAN DEFAULT TRUE,    -- Prevents re-recording without admin unlock
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE attendance_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES user_biometrics(user_id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    similarity NUMERIC(5, 4) NOT NULL,
    challenge_type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### MySQL
```sql
CREATE TABLE user_biometrics (
    user_id VARCHAR(64) PRIMARY KEY,
    user_name VARCHAR(128) NOT NULL,
    face_token VARCHAR(1024) NOT NULL,
    is_locked TINYINT(1) DEFAULT 1,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### MongoDB
```javascript
const UserBiometricSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  faceToken: { type: String, required: true }, // Encrypted compact base64
  isLocked: { type: Boolean, default: true },
  enrolledAt: { type: Date, default: Date.now },
});
```

---

### 2. Backend Verification Endpoint (Node.js / Express / Next.js)

```ts
import express from 'express';
import { BiometricProofGenerator } from 'face-liveness-recognition';

const app = express();
app.use(express.json());

const SHARED_SECRET = process.env.BIOMETRIC_HMAC_SECRET || 'YOUR_ENTERPRISE_SECRET_KEY';

// Punch-In / Authentication Endpoint
app.post('/api/attendance/check-in', async (req, res) => {
  const proof = req.body; // BiometricAuthProof

  // 1. Verify proof authenticity (checks signature, anti-replay nonce, and max age)
  const verification = BiometricProofGenerator.verifyProof(proof, SHARED_SECRET, 60000); // 60s max age

  if (!verification.valid) {
    return res.status(403).json({ error: verification.reason });
  }

  // 2. Record attendance in database
  await db.attendance.create({
    userId: proof.userId,
    timestamp: new Date(proof.timestamp),
    similarity: proof.similarity,
    challengeType: proof.challengeType,
    status: 'PRESENT',
  });

  return res.json({ success: true, message: 'Check-in recorded' });
});
```

---

## 🧩 API Reference

### `<FaceLivenessCamera />`

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` | `true` | When true, analysis and inference run. When false, shows camera preview only. |
| `mode` | `'liveness_and_recognition' \| 'recognition_only' \| 'liveness_only'` | `'liveness_and_recognition'` | Operating mode. |
| `securityLevel` | `'relaxed' \| 'balanced' \| 'strict'` | `'balanced'` | Preset threshold configurations. |
| `enrolledProfiles` | `EnrolledProfile[]` | `[]` | List of profiles containing 192-D embeddings to match against. |
| `recognitionThreshold`| `number` | `0.72` | Minimum cosine similarity (0.0 – 1.0) required for a positive identity match. |
| `config` | `FaceLivenessConfig` | `{}` | Fine-grained controls (`challenges`, `sampleIntervalMs`, `requiredSamples`). |
| `onResult` | `(result: LivenessResult) => void` | `undefined` | Callback fired when analysis concludes. |
| `onFaceStatusChanged` | `(event: FaceStatusEvent) => void` | `undefined` | Real-time face tracking event (`face_detected`, `face_blurry`, `face_too_far`, etc.). |
| `showOverlay` | `boolean` | `true` | Renders the default UI overlay (face oval guide, prompts, and progress indicator). |

---

### `LivenessResult` Object

```ts
interface LivenessResult {
  status: 'live' | 'spoof' | 'inconclusive';
  score: number;             // Anti-spoofing score (0.0 - 1.0)
  confidence: number;        // Statistical consistency metric
  isMatch?: boolean;         // True if face matched an enrolled profile
  matchedUserId?: string;    // ID of the matched profile
  matchedUserName?: string;  // Name of the matched profile
  similarity?: number;       // Cosine similarity score (e.g. 0.94 = 94%)
  embedding?: number[];      // 192-D Float array (normalized master vector)
  challengePassed: boolean;  // True if the active motion challenge passed
  durationMs: number;        // Duration in milliseconds
}
```

---

### Security Helpers

* **`packEmbedding(embedding: number[]): string`**  
  Packs a 192-float array into a 1,024-character Base64 binary string.
* **`unpackEmbedding(base64: string): number[]`**  
  Restores a 192-float array from binary Base64.
* **`encryptToken(token: string, secretKey: string): string`**  
  Encrypts the face token with your secret key before database persistence.
* **`decryptToken(cipherText: string, secretKey: string): string`**  
  Decrypts an encrypted face token.
* **`prepareProfileForDevice(id, name, encryptedToken, key): EnrolledProfile`**  
  Prepares a profile fetched from the database for on-device 1-to-1 matching on any device.
* **`BiometricProofGenerator.generateProof(...)`**  
  Generates an anti-replay, signed attestation proof for backend verification.
* **`BiometricProofGenerator.verifyProof(proof, secretKey, maxAgeMs)`**  
  Validates attestation signatures on the server side.

---

## 📄 License & Attribution

* **Package:** MIT License.
* **Models:** MiniFASNetV2 & MobileFaceNet (Apache License 2.0).
* **Native Dependencies:** OpenCV (Apache-2.0), Google ML Kit, Android CameraX, TensorFlow Lite / LiteRT.
