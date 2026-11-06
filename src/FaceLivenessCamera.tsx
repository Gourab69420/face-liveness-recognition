import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  FaceLivenessCameraProps,
  FaceStatusEvent,
  LivenessProgress,
  LivenessResult,
  FaceLivenessError,
  CameraPermissionResponse,
  ChallengeType,
} from './types';
import {
  NativeFaceLivenessModule,
  NativeFaceLivenessView,
} from './NativeExpoFaceLiveness';
import { FaceLivenessOverlay } from './FaceLivenessOverlay';
import { getRandomChallenge } from './challenges';

export const FaceLivenessCamera: React.FC<FaceLivenessCameraProps> = ({
  active = true,
  config = {},
  challenges: directChallenges,
  enrolledProfiles: directProfiles,
  mode: directMode,
  recognitionThreshold: directRecThreshold,
  securityLevel: directSecLevel,
  onFaceStatusChanged,
  onProgress,
  onResult,
  onError,
  onPermissionDenied,
  showOverlay = true,
  isVerified = false,
  instructionText,
  randomizeChallenges = false,
  hologramOpacity = 0.38,
  showHologram = true,
  showTopStatus = false,
  children,
  style,
}) => {
  const [permission, setPermission] = useState<CameraPermissionResponse | null>(null);
  const [currentFaceStatus, setCurrentFaceStatus] = useState<FaceStatusEvent>({
    status: 'no_face',
    yaw: 0,
    pitch: 0,
  });
  const [currentProgress, setCurrentProgress] = useState<LivenessProgress | null>(null);
  const randomChallengeRef = useRef<ChallengeType>(getRandomChallenge());

  const requestPermission = useCallback(async () => {
    try {
      const res = await NativeFaceLivenessModule.requestCameraPermissionsAsync();
      setPermission(res);
      if (!res.granted && onPermissionDenied) {
        onPermissionDenied();
      }
    } catch (err) {
      console.error('[expo-face-liveness] Failed to request camera permission:', err);
      onError?.({
        code: 'PERMISSION_REQUEST_FAILED',
        message: 'Could not request camera permission',
      });
    }
  }, [onError, onPermissionDenied]);

  useEffect(() => {
    (async () => {
      try {
        const current = await NativeFaceLivenessModule.getCameraPermissionsAsync();
        setPermission(current);
        if (!current.granted && current.canAskAgain) {
          await requestPermission();
        }
      } catch (e) {
        console.warn('[expo-face-liveness] Error checking permission:', e);
      }
    })();
  }, [requestPermission]);

  const handleFaceStatusChanged = useCallback(
    (event: { nativeEvent: FaceStatusEvent }) => {
      const data = event.nativeEvent;
      setCurrentFaceStatus(data);
      onFaceStatusChanged?.(data);
    },
    [onFaceStatusChanged]
  );

  const handleProgress = useCallback(
    (event: { nativeEvent: LivenessProgress }) => {
      const data = event.nativeEvent;
      setCurrentProgress(data);
      onProgress?.(data);
    },
    [onProgress]
  );

  const handleResult = useCallback(
    (event: { nativeEvent: LivenessResult }) => {
      const data = event.nativeEvent;
      onResult?.(data);
    },
    [onResult]
  );

  const handleError = useCallback(
    (event: { nativeEvent: FaceLivenessError }) => {
      const data = event.nativeEvent;
      onError?.(data);
    },
    [onError]
  );

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackTitle}>Platform Unsupported</Text>
        <Text style={styles.fallbackSubtitle}>
          The MVP version of expo-face-liveness currently targets Android on-device execution.
        </Text>
      </View>
    );
  }

  if (!NativeFaceLivenessView) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackTitle}>Native Module Missing</Text>
        <Text style={styles.fallbackSubtitle}>
          expo-face-liveness requires an Android development build with CameraX and TFLite linked.
          It does not run inside Expo Go.
        </Text>
      </View>
    );
  }

  if (permission === null) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[styles.fallbackSubtitle, { marginTop: 16 }]}>
          Preparing camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackTitle}>Camera Permission Required</Text>
        <Text style={styles.fallbackSubtitle}>
          Camera access is needed on-device to perform face liveness detection.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg = (config || {}) as any;
  const mode = directMode ?? cfg.mode ?? 'liveness_and_recognition';
  const challenges =
    directChallenges ??
    cfg.challenges ??
    (randomizeChallenges
      ? [randomChallengeRef.current]
      : mode === 'liveness_and_recognition'
      ? ['smile']
      : []);
  const enrolledProfiles = directProfiles ?? cfg.enrolledProfiles ?? [];
  const securityLevel = directSecLevel ?? cfg.securityLevel ?? 'balanced';
  const recognitionThreshold =
    directRecThreshold ??
    cfg.recognitionThreshold ??
    (securityLevel === 'strict' ? 0.68 : securityLevel === 'relaxed' ? 0.50 : 0.58);
  const liveThreshold = cfg.liveThreshold ?? (securityLevel === 'relaxed' ? 0.35 : 0.40);
  const spoofThreshold = cfg.spoofThreshold ?? (securityLevel === 'relaxed' ? 0.25 : 0.30);
  const customModelPath = cfg.customModelPath;

  return (
    <View style={[styles.container, style]}>
      <NativeFaceLivenessView
        style={StyleSheet.absoluteFill}
        active={active}
        liveThreshold={liveThreshold}
        spoofThreshold={spoofThreshold}
        recognitionThreshold={recognitionThreshold}
        securityLevel={securityLevel}
        mode={mode}
        enrolledProfiles={enrolledProfiles}
        challenges={challenges}
        customModelPath={customModelPath}
        onFaceStatusChanged={handleFaceStatusChanged}
        onLivenessProgress={handleProgress}
        onLivenessResult={handleResult}
        onError={handleError}
      />

      {showOverlay && (
        <FaceLivenessOverlay
          faceStatus={currentFaceStatus.status}
          progress={currentProgress}
          activeChallenge={
            currentProgress?.activeChallenge && currentProgress.activeChallenge !== 'none'
              ? currentProgress.activeChallenge
              : challenges.length > 0
              ? challenges[0]
              : 'none'
          }
          isAnalyzing={active}
          isVerified={isVerified}
          instructionText={instructionText}
          showHologram={showHologram}
          hologramOpacity={hologramOpacity}
          showTopStatus={showTopStatus}
        />
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
