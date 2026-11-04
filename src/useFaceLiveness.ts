import { useState, useCallback, useRef } from 'react';
import {
  FaceLivenessConfig,
  FaceStatusEvent,
  FaceStatus,
  LivenessProgress,
  LivenessResult,
  FaceLivenessError,
  LivenessCheckStatus,
} from './types';

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

  // Handlers to wire up directly to <FaceLivenessCamera />
  cameraHandlers: {
    active: boolean;
    config?: FaceLivenessConfig;
    onFaceStatusChanged: (event: FaceStatusEvent) => void;
    onProgress: (progress: LivenessProgress) => void;
    onResult: (result: LivenessResult) => void;
    onError: (error: FaceLivenessError) => void;
  };
}

export function useFaceLiveness(options: UseFaceLivenessOptions = {}): UseFaceLivenessReturn {
  const { config, onResult: externalOnResult, onError: externalOnError } = options;

  const [isActive, setIsActive] = useState<boolean>(false);
  const [status, setStatus] = useState<LivenessCheckStatus>('idle');
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('no_face');
  const [progress, setProgress] = useState<LivenessProgress | null>(null);
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [error, setError] = useState<FaceLivenessError | null>(null);

  const start = useCallback(() => {
    setError(null);
    setResult(null);
    setProgress(null);
    setIsActive(true);
    setStatus('detecting');
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
    setFaceStatus('no_face');
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  const handleFaceStatusChanged = useCallback((event: FaceStatusEvent) => {
    setFaceStatus(event.status);
  }, []);

  const handleProgress = useCallback((prog: LivenessProgress) => {
    setProgress(prog);
    if (prog.activeChallenge !== 'none') {
      setStatus('challenging');
    } else {
      setStatus('analyzing');
    }
  }, []);

  const handleResult = useCallback(
    (res: LivenessResult) => {
      setIsActive(false);
      setResult(res);
      setStatus('completed');
      externalOnResult?.(res);
    },
    [externalOnResult]
  );

  const handleError = useCallback(
    (err: FaceLivenessError) => {
      setIsActive(false);
      setError(err);
      setStatus('error');
      externalOnError?.(err);
    },
    [externalOnError]
  );

  return {
    status,
    faceStatus,
    progress,
    result,
    error,
    isLive: result?.status === 'live',
    isActive,
    start,
    stop,
    reset,
    cameraHandlers: {
      active: isActive,
      config,
      onFaceStatusChanged: handleFaceStatusChanged,
      onProgress: handleProgress,
      onResult: handleResult,
      onError: handleError,
    },
  };
}
