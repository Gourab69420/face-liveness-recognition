import { evaluateClassification, MINIFASNET_MODEL_SPEC } from '../model';

describe('MiniFASNet Model & Classification Logic', () => {
  it('should have correct input specifications matching MiniFASNetV2 standard', () => {
    expect(MINIFASNET_MODEL_SPEC.inputDimensions.height).toBe(80);
    expect(MINIFASNET_MODEL_SPEC.inputDimensions.width).toBe(80);
    expect(MINIFASNET_MODEL_SPEC.inputDimensions.channels).toBe(3);
    expect(MINIFASNET_MODEL_SPEC.colorOrder).toBe('BGR');
    expect(MINIFASNET_MODEL_SPEC.cropScaleFactor).toBe(2.7);
    expect(MINIFASNET_MODEL_SPEC.liveClassIndex).toBe(2);
  });

  it('classifies high consistent scores as live when challenge passes', () => {
    const samples = [0.92, 0.94, 0.91, 0.95, 0.93];
    const result = evaluateClassification(samples, {
      liveThreshold: 0.85,
      spoofThreshold: 0.40,
      challengePassed: true,
    });

    expect(result.status).toBe('live');
    expect(result.score).toBeGreaterThanOrEqual(0.85);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.challengePassed).toBe(true);
    expect(result.errorCode).toBeNull();
  });

  it('classifies low scores as spoof presentation attacks', () => {
    const samples = [0.12, 0.15, 0.08, 0.18, 0.14];
    const result = evaluateClassification(samples, {
      liveThreshold: 0.85,
      spoofThreshold: 0.40,
      challengePassed: true,
    });

    expect(result.status).toBe('spoof');
    expect(result.score).toBeLessThanOrEqual(0.40);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('classifies intermediate scores as inconclusive', () => {
    const samples = [0.55, 0.62, 0.58, 0.60, 0.52];
    const result = evaluateClassification(samples, {
      liveThreshold: 0.85,
      spoofThreshold: 0.40,
      challengePassed: true,
    });

    expect(result.status).toBe('inconclusive');
    expect(result.score).toBeGreaterThan(0.40);
    expect(result.score).toBeLessThan(0.85);
  });

  it('marks high scores as inconclusive if active challenge failed', () => {
    const samples = [0.93, 0.95, 0.92, 0.94, 0.96];
    const result = evaluateClassification(samples, {
      liveThreshold: 0.85,
      spoofThreshold: 0.40,
      challengePassed: false,
    });

    expect(result.status).toBe('inconclusive');
    expect(result.challengePassed).toBe(false);
    expect(result.errorCode).toBe('CHALLENGE_FAILED');
  });

  it('handles empty sample arrays gracefully', () => {
    const result = evaluateClassification([], {
      liveThreshold: 0.85,
      spoofThreshold: 0.40,
    });

    expect(result.status).toBe('inconclusive');
    expect(result.score).toBe(0);
    expect(result.samplesCollected).toBe(0);
    expect(result.errorCode).toBe('NO_VALID_SAMPLES');
  });
});
