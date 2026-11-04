import { ChallengeType, FaceStatus, LivenessResult } from './types';
/**
 * User-friendly prompts and instructions for active challenges.
 */
export declare const CHALLENGE_INSTRUCTIONS: Record<ChallengeType, string>;
/**
 * Returns prompt guidance for a specific challenge step.
 */
export declare function getChallengeInstruction(challenge: ChallengeType | 'none'): string;
/**
 * Returns guidance based on real-time face tracking state.
 */
export declare function getFaceStatusInstruction(status: FaceStatus): string;
/**
 * Formats a plain-text explanatory summary of a liveness result without overstating security.
 */
export declare function getLivenessResultSummary(result: LivenessResult): string;
//# sourceMappingURL=challenges.d.ts.map