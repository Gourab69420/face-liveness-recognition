"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceLivenessCamera = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const NativeExpoFaceLiveness_1 = require("./NativeExpoFaceLiveness");
const FaceLivenessOverlay_1 = require("./FaceLivenessOverlay");
const FaceLivenessCamera = ({ active = true, config = {}, enrolledProfiles: directProfiles, mode: directMode, recognitionThreshold: directRecThreshold, securityLevel: directSecLevel, onFaceStatusChanged, onProgress, onResult, onError, onPermissionDenied, showOverlay = true, children, style, }) => {
    const [permission, setPermission] = (0, react_1.useState)(null);
    const [currentFaceStatus, setCurrentFaceStatus] = (0, react_1.useState)({
        status: 'no_face',
        yaw: 0,
        pitch: 0,
    });
    const [currentProgress, setCurrentProgress] = (0, react_1.useState)(null);
    const requestPermission = (0, react_1.useCallback)(async () => {
        try {
            const res = await NativeExpoFaceLiveness_1.NativeFaceLivenessModule.requestCameraPermissionsAsync();
            setPermission(res);
            if (!res.granted && onPermissionDenied) {
                onPermissionDenied();
            }
        }
        catch (err) {
            console.error('[expo-face-liveness] Failed to request camera permission:', err);
            onError?.({
                code: 'PERMISSION_REQUEST_FAILED',
                message: 'Could not request camera permission',
            });
        }
    }, [onError, onPermissionDenied]);
    (0, react_1.useEffect)(() => {
        (async () => {
            try {
                const current = await NativeExpoFaceLiveness_1.NativeFaceLivenessModule.getCameraPermissionsAsync();
                setPermission(current);
                if (!current.granted && current.canAskAgain) {
                    await requestPermission();
                }
            }
            catch (e) {
                console.warn('[expo-face-liveness] Error checking permission:', e);
            }
        })();
    }, [requestPermission]);
    const handleFaceStatusChanged = (0, react_1.useCallback)((event) => {
        const data = event.nativeEvent;
        setCurrentFaceStatus(data);
        onFaceStatusChanged?.(data);
    }, [onFaceStatusChanged]);
    const handleProgress = (0, react_1.useCallback)((event) => {
        const data = event.nativeEvent;
        setCurrentProgress(data);
        onProgress?.(data);
    }, [onProgress]);
    const handleResult = (0, react_1.useCallback)((event) => {
        const data = event.nativeEvent;
        onResult?.(data);
    }, [onResult]);
    const handleError = (0, react_1.useCallback)((event) => {
        const data = event.nativeEvent;
        onError?.(data);
    }, [onError]);
    if (react_native_1.Platform.OS !== 'android') {
        return (react_1.default.createElement(react_native_1.View, { style: [styles.fallbackContainer, style] },
            react_1.default.createElement(react_native_1.Text, { style: styles.fallbackTitle }, "Platform Unsupported"),
            react_1.default.createElement(react_native_1.Text, { style: styles.fallbackSubtitle }, "The MVP version of expo-face-liveness currently targets Android on-device execution.")));
    }
    if (!NativeExpoFaceLiveness_1.NativeFaceLivenessView) {
        return (react_1.default.createElement(react_native_1.View, { style: [styles.fallbackContainer, style] },
            react_1.default.createElement(react_native_1.Text, { style: styles.fallbackTitle }, "Native Module Missing"),
            react_1.default.createElement(react_native_1.Text, { style: styles.fallbackSubtitle }, "expo-face-liveness requires an Android development build with CameraX and TFLite linked. It does not run inside Expo Go.")));
    }
    if (permission === null) {
        return (react_1.default.createElement(react_native_1.View, { style: [styles.fallbackContainer, style] },
            react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#3B82F6" }),
            react_1.default.createElement(react_native_1.Text, { style: [styles.fallbackSubtitle, { marginTop: 16 }] }, "Preparing camera...")));
    }
    if (!permission.granted) {
        return (react_1.default.createElement(react_native_1.View, { style: [styles.fallbackContainer, style] },
            react_1.default.createElement(react_native_1.Text, { style: styles.fallbackTitle }, "Camera Permission Required"),
            react_1.default.createElement(react_native_1.Text, { style: styles.fallbackSubtitle }, "Camera access is needed on-device to perform face liveness detection."),
            react_1.default.createElement(react_native_1.TouchableOpacity, { style: styles.permissionButton, onPress: requestPermission },
                react_1.default.createElement(react_native_1.Text, { style: styles.permissionButtonText }, "Grant Permission"))));
    }
    const { liveThreshold = 0.50, spoofThreshold = 0.35, challenges = [], customModelPath, mode = directMode ?? 'liveness_and_recognition', recognitionThreshold = directRecThreshold ?? 0.72, enrolledProfiles = directProfiles ?? [], securityLevel = directSecLevel ?? 'balanced', } = config;
    return (react_1.default.createElement(react_native_1.View, { style: [styles.container, style] },
        react_1.default.createElement(NativeExpoFaceLiveness_1.NativeFaceLivenessView, { style: react_native_1.StyleSheet.absoluteFill, active: active, liveThreshold: liveThreshold, spoofThreshold: spoofThreshold, recognitionThreshold: recognitionThreshold, securityLevel: securityLevel, mode: mode, enrolledProfiles: enrolledProfiles, challenges: challenges, customModelPath: customModelPath, onFaceStatusChanged: handleFaceStatusChanged, onLivenessProgress: handleProgress, onLivenessResult: handleResult, onError: handleError }),
        showOverlay && (react_1.default.createElement(FaceLivenessOverlay_1.FaceLivenessOverlay, { faceStatus: currentFaceStatus.status, progress: currentProgress, activeChallenge: currentProgress?.activeChallenge ?? 'none', isAnalyzing: active })),
        children));
};
exports.FaceLivenessCamera = FaceLivenessCamera;
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        overflow: 'hidden',
    },
    fallbackContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    fallbackTitle: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    fallbackSubtitle: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    permissionButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});
//# sourceMappingURL=FaceLivenessCamera.js.map