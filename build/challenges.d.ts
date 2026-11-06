import { ChallengeType, FaceStatus, LivenessResult } from './types';
/**
 * User-friendly prompts and instructions for active challenges.
 */
export declare const CHALLENGE_INSTRUCTIONS: Record<ChallengeType, string>;
/**
 * Standard pool of kinetic challenges for anti-spoof verification.
 */
export declare const DEFAULT_CHALLENGE_POOL: ChallengeType[];
/**
 * Returns a challenge from the pool.
 * Cycles sequentially through the pool (turn_head_left -> turn_head_right -> smile -> blink)
 * so that ALL challenges, especially turning head right and left, are guaranteed to appear
 * on subsequent scans and never skipped or starved.
 */
export declare function getRandomChallenge(pool?: ChallengeType[]): ChallengeType;
/**
 * Resets the rotation sequence index back to 0.
 */
export declare function resetChallengeRotation(): void;
/**
 * Returns an array of N unique randomized challenges.
 */
export declare function getRandomChallenges(count?: number, pool?: ChallengeType[]): ChallengeType[];
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