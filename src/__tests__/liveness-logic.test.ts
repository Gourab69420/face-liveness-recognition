import { evaluateClassification } from '../model';

describe('Advanced Liveness Logic & Thresholding', () => {
  it('strictly handles erratic frames where scores fluctuate heavily', () => {
    // Erratic frames: average might be 0.70 but variance is high
    const erraticScores = [0.99, 0.20, 0.85, 0.30, 0.75];
    const result = evaluateClassification(erraticScores, {
      liveThreshold: 0.85,
      spoofThreshold: 0.40,
      challengePassed: true,
    });

    expect(result.status).toBe('inconclusive');
    expect(result.confidence).toBeLessThan(0.65);
  });

  it('supports configurable strict security thresholds', () => {
    // Ultra high security configuration: 0.95 live threshold, 0.50 spoof threshold
    const scores = [0.90, 0.91, 0.89, 0.92, 0.90];
    const result = evaluateClassification(scores, {
      liveThreshold: 0.95,
      spoofThreshold: 0.50,
      challengePassed: true,
    });

    // 0.90 is below 0.95, so it is inconclusive under strict policy
    expect(result.status).toBe('inconclusive');
  });

  it('supports configurable lenient thresholds for low-end camera sensors', () => {
    // Lenient configuration: 0.75 live threshold
    const scores = [0.78, 0.80, 0.76, 0.79, 0.81];
    const result = evaluateClassification(scores, {
      liveThreshold: 0.75,
      spoofThreshold: 0.35,
      challengePassed: true,
    });

    expect(result.status).toBe('live');
    // Margin is close to threshold so confidence is moderately cautious (~0.49)
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it('preserves duration and timestamps in result payload', () => {
    const scores = [0.95, 0.96, 0.94];
    const result = evaluateClassification(scores, {
      durationMs: 1450,
    });

    expect(result.durationMs).toBe(1450);
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.samplesCollected).toBe(3);
  });
});
