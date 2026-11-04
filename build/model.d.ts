import { LivenessResult } from './types';
/**
 * Specification and metadata for the bundled MiniFASNet model.
 */
export declare const MINIFASNET_MODEL_SPEC: {
    modelName: string;
    inputDimensions: {
        batchSize: number;
        channels: number;
        height: number;
        width: number;
        layout: "NCHW";
    };
    colorOrder: "BGR";
    normalization: {
        divideBy: number;
        mean: number;
        std: number;
    };
    cropScaleFactor: number;
    outputClasses: {
        0: string;
        1: string;
        2: string;
    };
    liveClassIndex: number;
    defaultLiveThreshold: number;
    defaultSpoofThreshold: number;
    upstreamLicense: string;
    upstreamSource: string;
};
/**
 * Pure evaluation function for calculating final liveness classification from sampled frame scores.
 * Computes median, mean, consistency, distance from threshold, and bounded confidence.
 */
export declare function evaluateClassification(samples: number[], options?: {
    liveThreshold?: number;
    spoofThreshold?: number;
    challengePassed?: boolean;
    durationMs?: number;
}): LivenessResult;
//# sourceMappingURL=model.d.ts.map