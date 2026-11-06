import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { FaceStatus, ChallengeType, LivenessProgress } from './types';
import { getChallengeInstruction, getFaceStatusInstruction } from './challenges';

export interface FaceLivenessOverlayProps {
  faceStatus?: FaceStatus;
  progress?: LivenessProgress | null;
  activeChallenge?: ChallengeType | 'none';
  instructionText?: string;
  isAnalyzing?: boolean;
  isVerified?: boolean;
  showHologram?: boolean;
  hologramOpacity?: number;
}

/**
 * High-tech animated white biometric cartoon / hologram silhouette.
 * Positioned in the middle of the screen directly on top of the face display,
 * with subtle translucent opacity. When verified, smoothly turns emerald green
 * (no check or tick required).
 */
const BiometricPromptAvatar: React.FC<{
  challenge: ChallengeType | 'none';
  isVerified?: boolean;
  faceStatus?: FaceStatus;
  hologramOpacity?: number;
}> = ({
  challenge,
  isVerified = false,
  faceStatus = 'face_detected',
  hologramOpacity = 0.38,
}) => {
  // Animation values
  const headRotateAnim = useRef(new Animated.Value(0)).current;
  const headTranslateX = useRef(new Animated.Value(0)).current;
  const mouthCurveAnim = useRef(new Animated.Value(0)).current;
  const eyeBlinkAnim = useRef(new Animated.Value(1)).current;
  const arrowPulseAnim = useRef(new Animated.Value(0)).current;

  // Head turn animation loop
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (challenge === 'turn_head_left') {
      headRotateAnim.setValue(0);
      headTranslateX.setValue(0);
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(headRotateAnim, {
            toValue: -1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(headRotateAnim, {
            toValue: 0,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(350),
        ])
      );
      animLoop.start();
    } else if (challenge === 'turn_head_right') {
      headRotateAnim.setValue(0);
      headTranslateX.setValue(0);
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(headRotateAnim, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(headRotateAnim, {
            toValue: 0,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(350),
        ])
      );
      animLoop.start();
    } else {
      Animated.timing(headRotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      animLoop?.stop();
    };
  }, [challenge, headRotateAnim, headTranslateX]);

  // Arrow pulse loop for turning challenges
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (challenge === 'turn_head_left' || challenge === 'turn_head_right') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(arrowPulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(arrowPulseAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      arrowPulseAnim.setValue(0);
    }
    return () => loop?.stop();
  }, [challenge, arrowPulseAnim]);

  // Smile animation loop
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (challenge === 'smile') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthCurveAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(mouthCurveAnim, {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(300),
        ])
      );
      loop.start();
    } else {
      mouthCurveAnim.setValue(0);
    }
    return () => loop?.stop();
  }, [challenge, mouthCurveAnim]);

  // Eye blink animation loop
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (challenge === 'blink') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(eyeBlinkAnim, {
            toValue: 0.1,
            duration: 150,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(eyeBlinkAnim, {
            toValue: 1,
            duration: 180,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      eyeBlinkAnim.setValue(1);
    }
    return () => loop?.stop();
  }, [challenge, eyeBlinkAnim]);

  // Dynamic colors & translucent opacity
  const primaryColor = isVerified ? '#10B981' : '#FFFFFF';
  const effectiveOpacity = isVerified ? 0.85 : hologramOpacity;

  const headRotation = headRotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  const headOffset = headRotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-16, 0, 16],
  });

  const arrowOpacity = arrowPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.9],
  });

  const arrowTranslateXLeft = arrowPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const arrowTranslateXRight = arrowPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  return (
    <View style={[styles.avatarHologramContainer, { opacity: effectiveOpacity }]} pointerEvents="none">
      {/* Left Chevron Guide (When turning left) */}
      {challenge === 'turn_head_left' && (
        <Animated.View
          style={[
            styles.chevronGroup,
            styles.chevronLeft,
            {
              opacity: arrowOpacity,
              transform: [{ translateX: arrowTranslateXLeft }],
            },
          ]}>
          <View style={[styles.chevronArrowLeft, { borderRightColor: primaryColor }]} />
          <View style={[styles.chevronArrowLeft, { borderRightColor: primaryColor, marginLeft: 4 }]} />
        </Animated.View>
      )}

      {/* The Translucent Animated White Silhouette / Cartoon Head */}
      <Animated.View
        style={[
          styles.headOutline,
          {
            borderColor: primaryColor,
            transform: [{ rotateZ: headRotation }, { translateX: headOffset }],
          },
        ]}>
        {/* Forehead biometric scan bar */}
        <View style={[styles.foreheadSensor, { backgroundColor: primaryColor }]} />

        {/* Eyes Row */}
        <View style={styles.eyesRow}>
          <Animated.View
            style={[
              styles.eyePill,
              {
                backgroundColor: primaryColor,
                transform: [{ scaleY: eyeBlinkAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.eyePill,
              {
                backgroundColor: primaryColor,
                transform: [{ scaleY: eyeBlinkAnim }],
              },
            ]}
          />
        </View>

        {/* Nose Bridge */}
        <View style={[styles.noseLine, { backgroundColor: primaryColor }]} />

        {/* Mouth Shape (Neutral or Animated Upward Curve for Smile) */}
        {challenge === 'smile' ? (
          <Animated.View
            style={[
              styles.mouthSmile,
              {
                borderColor: primaryColor,
                transform: [
                  {
                    scaleY: mouthCurveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1.3],
                    }),
                  },
                  {
                    scaleX: mouthCurveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.25],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : (
          <View style={[styles.mouthNeutral, { backgroundColor: primaryColor }]} />
        )}
      </Animated.View>

      {/* Right Chevron Guide (When turning right) */}
      {challenge === 'turn_head_right' && (
        <Animated.View
          style={[
            styles.chevronGroup,
            styles.chevronRight,
            {
              opacity: arrowOpacity,
              transform: [{ translateX: arrowTranslateXRight }],
            },
          ]}>
          <View style={[styles.chevronArrowRight, { borderLeftColor: primaryColor }]} />
          <View style={[styles.chevronArrowRight, { borderLeftColor: primaryColor, marginLeft: 4 }]} />
        </Animated.View>
      )}
    </View>
  );
};

export const FaceLivenessOverlay: React.FC<FaceLivenessOverlayProps> = ({
  faceStatus = 'no_face',
  progress,
  activeChallenge = 'none',
  instructionText,
  isAnalyzing = false,
  isVerified = false,
  showHologram = true,
  hologramOpacity = 0.38,
}) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Radar beam sweep animation
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isAnalyzing && !isVerified) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      scanLineAnim.setValue(0);
    }
    return () => loop?.stop();
  }, [isAnalyzing, isVerified, scanLineAnim]);

  const getReticleBorderColor = () => {
    if (isVerified) return '#10B981';
    if (faceStatus === 'face_detected') return '#FFFFFF';
    if (faceStatus === 'multiple_faces' || faceStatus === 'face_out_of_bounds') return '#EF4444';
    if (faceStatus === 'face_too_far' || faceStatus === 'face_too_close') return '#F59E0B';
    return 'rgba(255, 255, 255, 0.35)';
  };

  const currentInstruction =
    instructionText ||
    (isVerified
      ? 'IDENTITY VERIFIED'
      : faceStatus !== 'face_detected'
      ? getFaceStatusInstruction(faceStatus as FaceStatus)
      : isAnalyzing
      ? activeChallenge !== 'none'
        ? getChallengeInstruction(activeChallenge as ChallengeType)
        : 'HOLD STILL • VERIFYING'
      : 'POSITION FACE INSIDE GUIDE');

  const progressPercent = progress
    ? Math.min(
        100,
        Math.round(
          progress.activeChallenge !== 'none'
            ? progress.challengeProgress * 50 + (progress.currentSample / (progress.totalSamples || 4)) * 50
            : (progress.currentSample / (progress.totalSamples || 4)) * 100
        )
      )
    : isVerified
    ? 100
    : 0;

  const reticleColor = getReticleBorderColor();

  const scanBeamTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-ovalHeight / 2 + 10, ovalHeight / 2 - 10],
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Floating Status Capsule */}
      <View style={styles.topContainer} pointerEvents="none">
        <View style={styles.topHudBadge}>
          <View style={[styles.statusDot, { backgroundColor: isVerified ? '#10B981' : isAnalyzing ? '#3B82F6' : '#94A3B8' }]} />
          <Text style={styles.topHudTitle}>
            {isVerified ? 'BIOMETRIC MATCH CONFIRMED' : isAnalyzing ? 'LIVE INFERENCE ENGINE' : 'READY TO SCAN'}
          </Text>
        </View>
      </View>

      {/* Center Biometric Reticle: Oval Aperture + Translucent Animated Hologram Overlay */}
      <View style={styles.centerContainer} pointerEvents="none">
        <View style={[styles.faceOval, { borderColor: reticleColor }]}>
          {/* Sweeping Laser Scan Beam */}
          {isAnalyzing && !isVerified && (
            <Animated.View
              style={[
                styles.scanLaserBeam,
                {
                  transform: [{ translateY: scanBeamTranslateY }],
                  backgroundColor: isVerified ? '#10B981' : '#60A5FA',
                },
              ]}
            />
          )}

          {/* 4 High-Tech Corner Target Brackets */}
          <View style={[styles.cornerBracket, styles.bracketTopLeft, { borderColor: reticleColor }]} />
          <View style={[styles.cornerBracket, styles.bracketTopRight, { borderColor: reticleColor }]} />
          <View style={[styles.cornerBracket, styles.bracketBottomLeft, { borderColor: reticleColor }]} />
          <View style={[styles.cornerBracket, styles.bracketBottomRight, { borderColor: reticleColor }]} />

          {/* Translucent Animated White Silhouette / Cartoon Head OVERLAID IN THE MIDDLE */}
          {showHologram && (
            <BiometricPromptAvatar
              challenge={activeChallenge}
              isVerified={isVerified}
              faceStatus={faceStatus}
              hologramOpacity={hologramOpacity}
            />
          )}
        </View>
      </View>

      {/* Bottom Floating Glassmorphic Instruction Card */}
      <View style={styles.bottomContainer} pointerEvents="none">
        <View style={[styles.instructionCard, isVerified && styles.instructionCardVerified]}>
          <Text style={[styles.instructionTitle, isVerified && styles.instructionTitleVerified]}>
            {currentInstruction.toUpperCase()}
          </Text>

          {isAnalyzing && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: isVerified ? '#10B981' : '#3B82F6',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentText}>{progressPercent}%</Text>
            </View>
          )}

          <View style={styles.securityFooterRow}>
            <View style={styles.securePill}>
              <View style={[styles.secureIndicator, { backgroundColor: isVerified ? '#10B981' : '#38BDF8' }]} />
              <Text style={styles.secureText}>ON-DEVICE BIOMETRIC ENGINE</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const ovalWidth = Math.min(width * 0.74, 290);
const ovalHeight = ovalWidth * 1.34;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  topContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  topHudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
  },
  topHudTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Center Reticle & Hologram Overlay
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: ovalWidth,
    height: ovalHeight,
    borderRadius: ovalWidth / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarHologramContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headOutline: {
    width: ovalWidth * 0.54,
    height: ovalHeight * 0.58,
    borderRadius: (ovalWidth * 0.54) / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  foreheadSensor: {
    position: 'absolute',
    top: 10,
    width: 14,
    height: 3,
    borderRadius: 1.5,
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 44,
    marginTop: 10,
  },
  eyePill: {
    width: 9,
    height: 12,
    borderRadius: 5,
  },
  noseLine: {
    width: 2.5,
    height: 12,
    borderRadius: 1.5,
    marginVertical: 8,
    opacity: 0.7,
  },
  mouthNeutral: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
  mouthSmile: {
    width: 32,
    height: 14,
    borderBottomWidth: 3.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderRadius: 16,
  },
  chevronGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: '46%',
  },
  chevronLeft: {
    left: 14,
  },
  chevronRight: {
    right: 14,
  },
  chevronArrowLeft: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderRightWidth: 11,
    borderBottomWidth: 8,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  chevronArrowRight: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderRightWidth: 0,
    borderBottomWidth: 8,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  scanLaserBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
    shadowColor: '#60A5FA',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  bracketTopLeft: {
    top: -2,
    left: 16,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  bracketTopRight: {
    top: -2,
    right: 16,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
  },
  bracketBottomLeft: {
    bottom: -2,
    left: 16,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  bracketBottomRight: {
    bottom: -2,
    right: 16,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },

  // Bottom Floating Instruction Card
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  instructionCardVerified: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(6, 78, 59, 0.92)',
  },
  instructionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginBottom: 10,
  },
  instructionTitleVerified: {
    color: '#34D399',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 4,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  securityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  secureText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
});
