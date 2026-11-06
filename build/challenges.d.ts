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
 * Returns a randomized challenge from the pool.
 * Guarantees unpredictable prompts on every verification session.
 */
export declare function getRandomChallenge(pool?: ChallengeType[]): ChallengeType;
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