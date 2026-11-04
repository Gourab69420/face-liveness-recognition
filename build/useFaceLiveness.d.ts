import { FaceLivenessConfig, FaceStatusEvent, FaceStatus, LivenessProgress, LivenessResult, FaceLivenessError, LivenessCheckStatus } from './types';
export interface UseFaceLivenessOptions {
    config?: FaceLivenessConfig;
    onResult?: (result: LivenessResult) => void;
    onError?: (error: FaceLivenessError) => void;
}
export interface UseFaceLivenessReturn {
    status: LivenessCheckStatus;
    faceStatus: FaceStatus;
    progress: LivenessProgress | null;
    result: LivenessResult | null;
    error: FaceLivenessError | null;
    isLive: boolean;
    isActive: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    cameraHandlers: {
        active: boolean;
        config?: FaceLivenessConfig;
        onFaceStatusChanged: (event: FaceStatusEvent) => void;
        onProgress: (progress: LivenessProgress) => void;
        onResult: (result: LivenessResult) => void;
        onError: (error: FaceLivenessError) => void;
    };
}
export declare function useFaceLiveness(options?: UseFaceLivenessOptions): UseFaceLivenessReturn;
//# sourceMappingURL=useFaceLiveness.d.ts.map