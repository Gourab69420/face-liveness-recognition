import { ChallengeType, FaceStatus, LivenessResult } from './types';

/**
 * User-friendly prompts and instructions for active challenges.
 */
export const CHALLENGE_INSTRUCTIONS: Record<ChallengeType, string> = {
  turn_head_left: 'Turn your head slightly to the left',
  turn_head_right: 'Turn your head slightly to the right',
  nod_head: 'Nod your head gently',
  blink: 'Blink your eyes naturally',
  smile: 'Smile naturally',
};

/**
 * Returns prompt guidance for a specific challenge step.
 */
export function getChallengeInstruction(challenge: ChallengeType | 'none'): string {
  if (challenge === 'none') {
    return 'Hold still while we verify...';
  }
  return CHALLENGE_INSTRUCTIONS[challenge] || 'Follow the on-screen prompt';
}

/**
 * Returns guidance based on real-time face tracking state.
 */
export function getFaceStatusInstruction(status: FaceStatus): string {
  switch (status) {
    case 'no_face':
      return 'Position your face inside the frame';
    case 'multiple_faces':
      return 'Multiple faces detected. Ensure only one person is in view';
    case 'face_too_far':
      return 'Move closer to the camera';
    case 'face_too_close':
      return 'Move slightly back from the camera';
    case 'face_out_of_bounds':
      return 'Center your face within the oval';
    case 'face_blurry':
      return 'Hold still, face is blurry';
    case 'face_poor_lighting':
      return 'Adjust your position for better lighting';
    case 'face_detected':
      return 'Face detected. Ready to begin';
    default:
      return 'Looking for face...';
  }
}

/**
 * Formats a plain-text explanatory summary of a liveness result without overstating security.
 */
export function getLivenessResultSummary(result: LivenessResult): string {
  const percentage = Math.round(result.score * 100);
  const confidencePct = Math.round(result.confidence * 100);

  switch (result.status) {
    case 'live':
      return `Liveness Verified (${percentage}% score, ${confidencePct}% confidence). Genuine face signals matched.`;
    case 'spoof':
      return `Spoof Detected (${percentage}% score, ${confidencePct}% confidence). Presentation attack signals detected.`;
    case 'inconclusive':
      if (result.errorCode === 'MULTIPLE_FACES_DETECTED') {
        return 'Inconclusive: More than one face was visible during the check.';
      }
      if (result.errorCode === 'CHALLENGE_TIMEOUT' || result.errorCode === 'CHALLENGE_FAILED') {
        return 'Inconclusive: Active challenge was not completed within the time limit.';
      }
      return `Inconclusive (${percentage}% score). Signals were ambiguous; please adjust lighting and retry.`;
    default:
      return 'Result unavailable.';
  }
}
