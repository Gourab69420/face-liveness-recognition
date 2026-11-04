"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFaceLiveness = useFaceLiveness;
const react_1 = require("react");
function useFaceLiveness(options = {}) {
    const { config, onResult: externalOnResult, onError: externalOnError } = options;
    const [isActive, setIsActive] = (0, react_1.useState)(false);
    const [status, setStatus] = (0, react_1.useState)('idle');
    const [faceStatus, setFaceStatus] = (0, react_1.useState)('no_face');
    const [progress, setProgress] = (0, react_1.useState)(null);
    const [result, setResult] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const start = (0, react_1.useCallback)(() => {
        setError(null);
        setResult(null);
        setProgress(null);
        setIsActive(true);
        setStatus('detecting');
    }, []);
    const stop = (0, react_1.useCallback)(() => {
        setIsActive(false);
        setStatus('idle');
    }, []);
    const reset = (0, react_1.useCallback)(() => {
        setIsActive(false);
        setStatus('idle');
        setFaceStatus('no_face');
        setProgress(null);
        setResult(null);
        setError(null);
    }, []);
    const handleFaceStatusChanged = (0, react_1.useCallback)((event) => {
        setFaceStatus(event.status);
    }, []);
    const handleProgress = (0, react_1.useCallback)((prog) => {
        setProgress(prog);
        if (prog.activeChallenge !== 'none') {
            setStatus('challenging');
        }
        else {
            setStatus('analyzing');
        }
    }, []);
    const handleResult = (0, react_1.useCallback)((res) => {
        setIsActive(false);
        setResult(res);
        setStatus('completed');
        externalOnResult?.(res);
    }, [externalOnResult]);
    const handleError = (0, react_1.useCallback)((err) => {
        setIsActive(false);
        setError(err);
        setStatus('error');
        externalOnError?.(err);
    }, [externalOnError]);
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
//# sourceMappingURL=useFaceLiveness.js.map