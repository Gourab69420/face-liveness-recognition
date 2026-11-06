# face-liveness-recognition

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com)
[![Expo: SDK 51+](https://img.shields.io/badge/Expo-SDK%2051%2B-black.svg)](https://expo.dev)

Android-first, 100% on-device face recognition, active and passive anti-spoofing, and liveness detection for React Native and Expo applications.

Zero cloud dependencies. Zero recurring API fees. Raw biometric data never leaves the user device.

---

## Architecture Overview

* **On-Device Face Recognition (MobileFaceNet):** Computes 192-dimensional L2-normalized facial embeddings with instant cosine similarity matching.
* **Passive Anti-Spoofing (MiniFASNetV2):** Deep neural network analysis detecting 2D printed photos, cardboard cutouts, and digital screen replay attacks.
* **OpenCV 4.9.0 Image Processing:** Automated CLAHE illumination normalization, landmark-guided affine face alignment, and Laplacian blur detection.
* **Active Kinetic Challenges:** Dynamic prompts (smile, blink, head turn left, head turn right) confirming real-time 3D presence.
* **Production UI Overlay:** Centered translucent biometric silhouette hologram over the face preview with dynamic color transitions and zero cartoonish emojis.
* **Tamper-Proof Biometric Proofs:** Cryptographically signed attestation tokens (HMAC-SHA256) with anti-replay timestamps.

---

## Installation

### 1. Install the Package

In your Expo or React Native project:

```bash
npx expo install face-liveness-recognition expo-modules-core
```

> **Important:** This library uses native C++ runtimes (OpenCV, CameraX, LiteRT/TensorFlow Lite). It requires an Android Development Build (`npx expo run:android` or EAS Build). It does not run inside standard Expo Go.

### 2. Configure Expo Plugin (`app.json`)

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
          "cameraPermission": "Allow $(PRODUCT_NAME) to access the camera for biometric verification."
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

## 5-Minute Quickstart

Here is the minimal working implementation to scan a face and check liveness:

```tsx
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FaceLivenessCamera, LivenessResult } from 'face-liveness-recognition';

export default function LivenessScreen() {
  const handleResult = (result: LivenessResult) => {
    if (result.status === 'live' && result.challengePassed) {
      Alert.alert('Verification Succeeded', 'Genuine live face confirmed.');
    } else {
      Alert.alert('Verification Failed', `Status: ${result.status}`);
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
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
```

---

## Customizing the Frontend UI

### Option A: Using the Built-In Production Overlay

The built-in overlay includes:
1. Centered biometric oval reticle aligned to front camera framing.
2. Animated translucent silhouette hologram in the center that guides user movement.
3. Smooth color transition to emerald green (`#10B981`) upon verification with no checkmark or tick badge.
4. Laser scan beam and corner target brackets.

You can customize its appearance via props:

```tsx
<FaceLivenessCamera
  showOverlay={true}
  showHologram={true}
  hologramOpacity={0.25} // Adjust transparency: 0.1 (faint) to 1.0 (solid)
  isVerified={isSuccess} // Turns reticle and hologram green
  instructionText={isSuccess ? 'ACCESS GRANTED' : undefined}
  onResult={handleResult}
/>
```

### Option B: Building a Completely Custom UI

To replace the stock UI with your company branding, set `showOverlay={false}` and place your own React Native components inside `<FaceLivenessCamera>`:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FaceLivenessCamera, FaceStatusEvent, LivenessResult } from 'face-liveness-recognition';

export default function CustomUIScreen() {
  const [hint, setHint] = useState('Center your face');

  const handleFaceStatus = (event: FaceStatusEvent) => {
    switch (event.status) {
      case 'face_too_far':
        setHint('Move closer to the camera');
        break;
      case 'face_too_close':
        setHint('Move slightly back');
        break;
      case 'multiple_faces':
        setHint('Only one person permitted');
        break;
      case 'face_detected':
        setHint('Face detected. Hold still...');
        break;
      default:
        setHint('Position your face in view');
    }
  };

  return (
    <View style={styles.container}>
      <FaceLivenessCamera
        showOverlay={false}
        onFaceStatusChanged={handleFaceStatus}
        onResult={(result: LivenessResult) => console.log('Result:', result)}
      >
        {/* Your custom UI elements rendered on top of camera stream */}
        <View style={styles.customHud}>
          <Text style={styles.customText}>{hint}</Text>
        </View>
      </FaceLivenessCamera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  customHud: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  customText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Configuring Thresholds and Options

### 1. Recognition Sensitivity Threshold (`recognitionThreshold`)

Controls the minimum cosine similarity ($0.0$ to $1.0$) required to declare a biometric match against an enrolled profile:

```tsx
<FaceLivenessCamera
  recognitionThreshold={0.72} // Recommended default
/>
```

* `0.68`: Forgiving. Suitable for outdoor conditions, varying lighting, or users wearing hats/glasses.
* `0.74`: Balanced. Recommended standard corporate attendance and workplace check-in default.
* `0.80+`: High security. Recommended for financial transactions or privileged access control.

### 2. Preset Security Levels (`securityLevel`)

Select preset combinations for convenience:

```tsx
<FaceLivenessCamera securityLevel="balanced" />
```

* `relaxed`: Recognition threshold 0.68, anti-spoof threshold 0.35. Forgiving match.
* `balanced`: Recognition threshold 0.74, anti-spoof threshold 0.40. Standard production default.
* `strict`: Recognition threshold 0.80, anti-spoof threshold 0.55. Enhanced biometric security.

---

## Biometric Occlusion & Facial Feature Protection

To prevent spoofing or corrupted registrations, the on-device engine continuously validates full facial landmark completeness across every frame:
* **Mouth & Lips:** `MOUTH_BOTTOM`, `MOUTH_LEFT`, and `MOUTH_RIGHT` must be clearly visible and uncovered.
* **Cheeks:** `LEFT_CHEEK` and `RIGHT_CHEEK` must be visible when facing forward.
* **Eyes & Nose:** `LEFT_EYE`, `RIGHT_EYE`, and `NOSE_BASE` must be unobscured.
* **Geometric Validation:** Enforces natural anatomical proportions ($y_{\text{mouth}} > y_{\text{nose}} > y_{\text{eyes}}$).

If a user covers their mouth, chin, cheeks, or eyes with a hand, phone, or mask:
1. The engine triggers status `'face_occluded'`.
2. The reticle turns warning red (`#EF4444`).
3. The prompt displays: `"Face is covered. Remove hand or mask"`.
4. The system blocks both registration and verification until the obstruction is removed.

### 3. Fine-Grained Pipeline Options (`config`)

Fine-tune native engine parameters directly:

```tsx
<FaceLivenessCamera
  config={{
    liveThreshold: 0.58,    // Anti-spoof network threshold
    spoofThreshold: 0.58,   // Replay / fake surface rejection threshold
    sampleIntervalMs: 200,  // Milliseconds between processed video frames
    requiredSamples: 4,     // Consecutive verified frames required for consensus
  }}
/>
```

---

## Randomizing Kinetic Challenge Prompts

To prevent presentation attacks recorded on video screens, you can randomize kinetic presence challenges.

### Automatic Randomization

Pass `randomizeChallenges={true}`. The component picks a challenge at random from the pool for each session:

```tsx
<FaceLivenessCamera
  mode="liveness_and_recognition"
  randomizeChallenges={true}
  onResult={handleResult}
/>
```

### Manual / Pool Selection

You can also specify challenge pools manually or use helper utilities:

```tsx
import {
  FaceLivenessCamera,
  getRandomChallenge,
  getRandomChallenges,
} from 'face-liveness-recognition';

// Option 1: Pick 1 random challenge on mount
const singleChallenge = [getRandomChallenge()];

// Option 2: Pick 2 random challenges in sequence
const multiChallenges = getRandomChallenges(2);

// Option 3: Explicit challenge list
const explicitChallenges = ['turn_head_left', 'smile'];

<FaceLivenessCamera challenges={explicitChallenges} />
```

Available challenge types:
* `'smile'`: Verifies natural mouth arc expansion.
* `'blink'`: Verifies eye aspect ratio contraction.
* `'turn_head_left'`: Verifies yaw rotation to user's left.
* `'turn_head_right'`: Verifies yaw rotation to user's right.
* `'nod'`: Verifies pitch elevation up and down.

---

## Complete Production Workflows

### 1. One-Time Face Enrollment Flow

Capture a user's face, extract the 192-dimensional vector, pack it into an encrypted token, and store it in your database:

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  FaceLivenessCamera,
  LivenessResult,
  BiometricEnrollmentGuard,
} from 'face-liveness-recognition';

export default function EnrollmentScreen({ user, adminUnlockToken }) {
  const [isDone, setIsDone] = useState(false);

  // Check enrollment permission
  const check = BiometricEnrollmentGuard.canEnroll(user, adminUnlockToken);
  if (!check.allowed) {
    Alert.alert('Enrollment Locked', check.reason);
    return null;
  }

  const handleEnrollResult = async (result: LivenessResult) => {
    if (result.embedding && result.embedding.length === 192) {
      setIsDone(true);

      // Pack and encrypt the 192-float array into a compact Base64 token
      const payload = BiometricEnrollmentGuard.createEnrollmentPayload(
        user.id,
        user.name,
        result.embedding,
        'YOUR_APP_SECRET_KEY'
      );

      // Send to your backend API to store in SQL or MongoDB
      await fetch('https://api.yourapp.com/biometrics/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      Alert.alert('Success', 'Biometric profile registered.');
    }
  };

  return (
    <View style={styles.container}>
      <FaceLivenessCamera
        mode="recognition_only"
        isVerified={isDone}
        instructionText={isDone ? 'PROFILE ENROLLED' : undefined}
        onResult={handleEnrollResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
```

### 2. Daily Verification / Attendance Punch-In Flow

Match the live camera feed against the enrolled user token stored in your backend:

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  FaceLivenessCamera,
  LivenessResult,
  prepareProfileForDevice,
  BiometricProofGenerator,
} from 'face-liveness-recognition';

export default function CheckInScreen({ currentUser, userAuthToken }) {
  const [verified, setVerified] = useState(false);

  // Prepare profile containing decrypted 192-D embedding
  const enrolledProfiles = [
    prepareProfileForDevice(
      currentUser.id,
      currentUser.name,
      currentUser.faceTokenFromDB,
      'YOUR_APP_SECRET_KEY'
    ),
  ];

  const handleResult = async (result: LivenessResult) => {
    if (result.isMatch && result.status === 'live' && result.challengePassed) {
      setVerified(true);

      // Generate signed tamper-proof cryptographic payload
      const proof = BiometricProofGenerator.generateProof(
        currentUser.id,
        result,
        'YOUR_APP_SECRET_KEY',
        'smile'
      );

      // Post check-in to your backend
      const res = await fetch('https://api.yourapp.com/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAuthToken}`,
        },
        body: JSON.stringify(proof),
      });

      if (res.ok) {
        Alert.alert('Verified', `Welcome, ${result.matchedUserName || currentUser.name}!`);
      }
    } else {
      Alert.alert('Verification Failed', 'Identity mismatch or spoof detected.');
    }
  };

  return (
    <View style={styles.container}>
      <FaceLivenessCamera
        mode="liveness_and_recognition"
        randomizeChallenges={true}
        enrolledProfiles={enrolledProfiles}
        recognitionThreshold={0.72}
        isVerified={verified}
        instructionText={verified ? 'VERIFIED' : undefined}
        onResult={handleResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
```

---

## Backend Verification Endpoint

On your server (Node.js, Express, Next.js), verify incoming biometric check-in proofs:

```ts
import express from 'express';
import { BiometricProofGenerator } from 'face-liveness-recognition';

const app = express();
app.use(express.json());

const SECRET = process.env.BIOMETRIC_SECRET || 'YOUR_APP_SECRET_KEY';

app.post('/attendance/check-in', async (req, res) => {
  const proof = req.body;

  // Validate cryptographic signature, timestamp age (max 60 seconds), and replay nonce
  const verification = BiometricProofGenerator.verifyProof(proof, SECRET, 60000);

  if (!verification.valid) {
    return res.status(403).json({ error: verification.reason });
  }

  // Record attendance in your database
  await db.attendance.create({
    userId: proof.userId,
    similarity: proof.similarity,
    challenge: proof.challengeType,
    timestamp: new Date(proof.timestamp),
  });

  return res.json({ success: true, message: 'Check-in confirmed.' });
});
```

---

## API Reference

### `<FaceLivenessCamera />` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` | `true` | Starts or pauses camera analysis and neural inference. |
| `mode` | `'liveness_and_recognition' \| 'recognition_only' \| 'liveness_only'` | `'liveness_and_recognition'` | Operating mode. |
| `securityLevel` | `'relaxed' \| 'balanced' \| 'strict'` | `'balanced'` | Preset threshold configurations. |
| `recognitionThreshold` | `number` | `0.72` | Minimum cosine similarity ($0.0$ to $1.0$) for a positive match. |
| `randomizeChallenges` | `boolean` | `false` | Automatically randomizes kinetic challenge prompts on session start. |
| `challenges` | `ChallengeType[]` | `['smile']` | Explicit list of kinetic challenges to verify. |
| `enrolledProfiles` | `EnrolledProfile[]` | `[]` | User profiles with 192-D embeddings for 1-to-1 or 1-to-N matching. |
| `showOverlay` | `boolean` | `true` | Renders the built-in biometric overlay. Set to `false` for custom UI. |
| `showHologram` | `boolean` | `true` | Renders the animated biometric silhouette in the middle of the screen. |
| `hologramOpacity` | `number` | `0.38` | Opacity of the animated biometric silhouette ($0.1$ to $1.0$). |
| `isVerified` | `boolean` | `false` | When `true`, transitions the reticle and silhouette to green (`#10B981`). |
| `instructionText` | `string` | `undefined` | Custom text prompt displayed in the bottom HUD card. |
| `config` | `FaceLivenessConfig` | `{}` | Low-level native controls (`liveThreshold`, `sampleIntervalMs`, etc.). |
| `onResult` | `(result: LivenessResult) => void` | `undefined` | Fires when liveness and/or recognition completes. |
| `onFaceStatusChanged` | `(event: FaceStatusEvent) => void` | `undefined` | Real-time face tracking updates (`face_detected`, `face_too_far`, etc.). |
| `onProgress` | `(progress: LivenessProgress) => void` | `undefined` | Fires as sample frames are processed. |
| `onError` | `(error: FaceLivenessError) => void` | `undefined` | Fires when an operational error occurs. |

---

### `LivenessResult` Object

```ts
interface LivenessResult {
  status: 'live' | 'spoof' | 'inconclusive';
  score: number;             // Anti-spoofing confidence score (0.0 to 1.0)
  confidence: number;        // Statistical consistency metric
  isMatch?: boolean;         // True if face matched an enrolled profile
  matchedUserId?: string;    // ID of the matched profile
  matchedUserName?: string;  // Name of the matched profile
  similarity?: number;       // Cosine similarity score (e.g. 0.94 = 94%)
  embedding?: number[];      // 192-D Float array (normalized master vector)
  challengePassed: boolean;  // True if kinetic motion challenge passed
  durationMs: number;        // Processing duration in milliseconds
  timestamp: number;         // Epoch timestamp
}
```

---

## Troubleshooting & FAQ

* **Does it work on iOS?**  
  The current engine is optimized for Android on-device neural runtimes using CameraX, OpenCV 4.9.0, and LiteRT. iOS support is planned for a future release.
* **Why does Expo Go crash or show Native Module Missing?**  
  Expo Go does not include custom native C++ libraries. Run `npx expo run:android` to create a development build.
* **Camera permission denied?**  
  Ensure `app.json` contains the plugin configuration and camera permission declaration. The component automatically requests camera permission on mount if not yet granted.
* **False spoof rejections?**  
  Ensure adequate frontal room lighting and avoid strong backlights behind the user. If testing in low-light environments, use `securityLevel="relaxed"` or adjust `config={{ liveThreshold: 0.50 }}`.

---

## Author & Credits

Developed and maintained by **Gourab Samanta** ([@Gourab69420](https://github.com/Gourab69420)).

* **GitHub:** [https://github.com/Gourab69420/face-liveness-recognition](https://github.com/Gourab69420/face-liveness-recognition)
* **npm:** [https://www.npmjs.com/package/face-liveness-recognition](https://www.npmjs.com/package/face-liveness-recognition)
* **Issues & Feedback:** [GitHub Issue Tracker](https://github.com/Gourab69420/face-liveness-recognition/issues)

---

## License

MIT License © 2026 **Gourab Samanta**. Free and open for personal and commercial use.  
MiniFASNet and MobileFaceNet neural model weights are licensed under Apache License 2.0 (see [MODEL_LICENSE.md](MODEL_LICENSE.md)).
