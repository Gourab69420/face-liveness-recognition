import { ClassificationResult, LivenessResult } from './types';

/**
 * Specification and metadata for the bundled MiniFASNet model.
 */
export const MINIFASNET_MODEL_SPEC = {
  modelName: 'MiniFASNetV2 (2.7_80x80_MiniFASNetV2)',
  inputDimensions: {
    batchSize: 1,
    channels: 3,
    height: 80,
    width: 80,
    layout: 'NCHW' as const,
  },
  colorOrder: 'BGR' as const,
  normalization: {
    divideBy: 255.0,
    mean: 0.0,
    std: 1.0,
  },
  cropScaleFactor: 2.7,
  outputClasses: {
    0: 'spoof_print',
    1: 'spoof_screen_or_mask',
    2: 'live_genuine',
  },
  liveClassIndex: 2,
  defaultLiveThreshold: 0.85,
  defaultSpoofThreshold: 0.40,
  upstreamLicense: 'Apache-2.0',
  upstreamSource: 'https://github.com/minivision-ai/Silent-Face-Anti-Spoofing',
};

/**
 * Pure evaluation function for calculating final liveness classification from sampled frame scores.
 * Computes median, mean, consistency, distance from threshold, and bounded confidence.
 */
export function evaluateClassification(
  samples: number[],
  options: {
    liveThreshold?: number;
    spoofThreshold?: number;
    challengePassed?: boolean;
    durationMs?: number;
  } = {}
): LivenessResult {
  const {
    liveThreshold = MINIFASNET_MODEL_SPEC.defaultLiveThreshold,
    spoofThreshold = MINIFASNET_MODEL_SPEC.defaultSpoofThreshold,
    challengePassed = true,
    durationMs = 0,
  } = options;

  if (!samples || samples.length === 0) {
    return {
      status: 'inconclusive',
      score: 0,
      confidence: 0,
      passiveScore: 0,
      challengePassed,
      samplesCollected: 0,
      durationMs,
      errorCode: 'NO_VALID_SAMPLES',
      timestamp: Date.now(),
    };
  }

  // Calculate sorted median and mean
  const sorted = [...samples].sort((a, b) => a - b);
  const medianScore = sorted[Math.floor(sorted.length / 2)];
  const sum = samples.reduce((acc, v) => acc + v, 0);
  const meanScore = sum / samples.length;

  // Calculate variance for consistency metric
  const variance =
    samples.reduce((acc, v) => acc + Math.pow(v - meanScore, 2), 0) /
    samples.length;
  const consistency = Math.max(0, 1.0 - variance * 4.0);

  let status: ClassificationResult = 'inconclusive';

  if (meanScore >= liveThreshold && challengePassed) {
    status = 'live';
  } else if (meanScore <= spoofThreshold) {
    status = 'spoof';
  } else {
    // Score is in ambiguous zone (between spoofThreshold and liveThreshold) or challenge failed
    status = 'inconclusive';
  }

  // Calculate confidence score based on margin and frame consistency
  let distance = 0.5;
  if (status === 'live') {
    distance = Math.abs(meanScore - liveThreshold) / (1.0 - liveThreshold + 0.001);
  } else if (status === 'spoof') {
    distance = Math.abs(spoofThreshold - meanScore) / (spoofThreshold + 0.001);
  }

  const confidence = Math.min(
    1.0,
    Math.max(0.1, Number((distance * 0.6 + consistency * 0.4).toFixed(3)))
  );

  return {
    status,
    score: Number(meanScore.toFixed(4)),
    confidence,
    passiveScore: Number(medianScore.toFixed(4)),
    challengePassed,
    samplesCollected: samples.length,
    durationMs,
    errorCode: status === 'inconclusive' && !challengePassed ? 'CHALLENGE_FAILED' : null,
    timestamp: Date.now(),
  };
}
