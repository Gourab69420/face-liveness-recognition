import {
  getChallengeInstruction,
  getFaceStatusInstruction,
  getLivenessResultSummary,
} from '../challenges';
import { LivenessResult } from '../types';

describe('Challenges and User Instructions', () => {
  it('returns distinct and clear instructions for each challenge', () => {
    expect(getChallengeInstruction('turn_head_left')).toMatch(/left/i);
    expect(getChallengeInstruction('turn_head_right')).toMatch(/right/i);
    expect(getChallengeInstruction('nod_head')).toMatch(/nod/i);
    expect(getChallengeInstruction('blink')).toMatch(/blink/i);
    expect(getChallengeInstruction('none')).toMatch(/hold still/i);
  });

  it('returns distinct positioning cues for face statuses', () => {
    expect(getFaceStatusInstruction('no_face')).toMatch(/position/i);
    expect(getFaceStatusInstruction('multiple_faces')).toMatch(/multiple/i);
    expect(getFaceStatusInstruction('face_too_far')).toMatch(/closer/i);
    expect(getFaceStatusInstruction('face_too_close')).toMatch(/back/i);
    expect(getFaceStatusInstruction('face_out_of_bounds')).toMatch(/center/i);
    expect(getFaceStatusInstruction('face_detected')).toMatch(/detected/i);
  });

  it('formats summaries for live, spoof, and inconclusive results', () => {
    const liveResult: LivenessResult = {
      status: 'live',
      score: 0.94,
      confidence: 0.88,
      passiveScore: 0.93,
      challengePassed: true,
      samplesCollected: 5,
      durationMs: 1200,
      timestamp: Date.now(),
    };
    expect(getLivenessResultSummary(liveResult)).toContain('Liveness Verified');

    const spoofResult: LivenessResult = {
      status: 'spoof',
      score: 0.15,
      confidence: 0.85,
      passiveScore: 0.14,
      challengePassed: true,
      samplesCollected: 5,
      durationMs: 1100,
      timestamp: Date.now(),
    };
    expect(getLivenessResultSummary(spoofResult)).toContain('Spoof Detected');

    const timeoutResult: LivenessResult = {
      status: 'inconclusive',
      score: 0.70,
      confidence: 0.40,
      passiveScore: 0.70,
      challengePassed: false,
      samplesCollected: 3,
      durationMs: 10000,
      errorCode: 'CHALLENGE_TIMEOUT',
      timestamp: Date.now(),
    };
    expect(getLivenessResultSummary(timeoutResult)).toContain('Inconclusive');
    expect(getLivenessResultSummary(timeoutResult)).toContain('Active challenge');
  });
});
