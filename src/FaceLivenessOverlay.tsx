import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { FaceStatus, ChallengeType, LivenessProgress } from './types';
import { getChallengeInstruction, getFaceStatusInstruction } from './challenges';

export interface FaceLivenessOverlayProps {
  faceStatus?: FaceStatus;
  progress?: LivenessProgress | null;
  activeChallenge?: ChallengeType | 'none';
  instructionText?: string;
  isAnalyzing?: boolean;
}

export const FaceLivenessOverlay: React.FC<FaceLivenessOverlayProps> = ({
  faceStatus = 'no_face',
  progress,
  activeChallenge = 'none',
  instructionText,
  isAnalyzing = false,
}) => {
  const getBorderColor = () => {
    if (faceStatus === 'face_detected') {
      return '#10B981'; // Green
    }
    if (faceStatus === 'multiple_faces' || faceStatus === 'face_out_of_bounds') {
      return '#EF4444'; // Red
    }
    if (faceStatus === 'face_too_far' || faceStatus === 'face_too_close') {
      return '#F59E0B'; // Amber
    }
    return 'rgba(255, 255, 255, 0.4)'; // Neutral
  };

  const currentInstruction =
    instructionText ||
    (faceStatus !== 'face_detected'
      ? getFaceStatusInstruction(faceStatus)
      : isAnalyzing
      ? activeChallenge !== 'none'
        ? getChallengeInstruction(activeChallenge)
        : 'Hold still, analyzing liveness...'
      : 'Ready');

  const progressPercent = progress
    ? Math.min(
        100,
        Math.round(
          progress.activeChallenge !== 'none'
            ? progress.challengeProgress * 50 + (progress.currentSample / (progress.totalSamples || 5)) * 50
            : (progress.currentSample / (progress.totalSamples || 5)) * 100
        )
      )
    : 0;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Banner / Privacy Badge */}
      <View style={styles.topContainer} pointerEvents="none">
        <View style={styles.privacyBadge}>
          <View style={styles.secureDot} />
          <Text style={styles.privacyText}>On-Device • Private & Ephemeral</Text>
        </View>
      </View>

      {/* Center Oval Face Guide */}
      <View style={styles.centerContainer} pointerEvents="none">
        <View style={[styles.faceOval, { borderColor: getBorderColor() }]} />
      </View>

      {/* Bottom Guidance and Progress Card */}
      <View style={styles.bottomContainer} pointerEvents="none">
        <View style={styles.card}>
          <Text style={styles.instructionText}>{currentInstruction}</Text>

          {isAnalyzing && (
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          )}

          {isAnalyzing && (
            <Text style={styles.progressPercentText}>{progressPercent}% analyzed</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const ovalWidth = Math.min(width * 0.72, 280);
const ovalHeight = ovalWidth * 1.35;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  topContainer: {
    alignItems: 'center',
    width: '100%',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  privacyText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: ovalWidth,
    height: ovalHeight,
    borderRadius: ovalWidth / 2,
    borderWidth: 3,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressPercentText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});
