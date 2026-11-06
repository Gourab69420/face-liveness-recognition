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
exports.FaceLivenessOverlay = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const challenges_1 = require("./challenges");
/**
 * High-tech animated white biometric cartoon/silhouette guide.
 * Animates head turning, smiling, and blinking based on current challenge,
 * and turns emerald green upon successful verification.
 */
const BiometricPromptAvatar = ({ challenge, isVerified = false, faceStatus = 'face_detected' }) => {
    // Animation values
    const headRotateAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const headTranslateX = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const mouthCurveAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const eyeBlinkAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    const arrowPulseAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const scanLineAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    // Head turn animation loop
    (0, react_1.useEffect)(() => {
        let animLoop = null;
        if (challenge === 'turn_head_left') {
            headRotateAnim.setValue(0);
            headTranslateX.setValue(0);
            animLoop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.timing(headRotateAnim, {
                    toValue: -1,
                    duration: 800,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(headRotateAnim, {
                    toValue: 0,
                    duration: 600,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.delay(400),
            ]));
            animLoop.start();
        }
        else if (challenge === 'turn_head_right') {
            headRotateAnim.setValue(0);
            headTranslateX.setValue(0);
            animLoop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.timing(headRotateAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(headRotateAnim, {
                    toValue: 0,
                    duration: 600,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.delay(400),
            ]));
            animLoop.start();
        }
        else {
            react_native_1.Animated.timing(headRotateAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
        return () => {
            animLoop?.stop();
        };
    }, [challenge, headRotateAnim, headTranslateX]);
    // Arrow pulse loop for turning challenges
    (0, react_1.useEffect)(() => {
        let loop = null;
        if (challenge === 'turn_head_left' || challenge === 'turn_head_right') {
            loop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.timing(arrowPulseAnim, {
                    toValue: 1,
                    duration: 600,
                    easing: react_native_1.Easing.out(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(arrowPulseAnim, {
                    toValue: 0,
                    duration: 600,
                    easing: react_native_1.Easing.in(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
            ]));
            loop.start();
        }
        else {
            arrowPulseAnim.setValue(0);
        }
        return () => loop?.stop();
    }, [challenge, arrowPulseAnim]);
    // Smile animation loop
    (0, react_1.useEffect)(() => {
        let loop = null;
        if (challenge === 'smile') {
            loop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.timing(mouthCurveAnim, {
                    toValue: 1,
                    duration: 900,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(mouthCurveAnim, {
                    toValue: 0,
                    duration: 700,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.ease),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.delay(300),
            ]));
            loop.start();
        }
        else {
            mouthCurveAnim.setValue(0);
        }
        return () => loop?.stop();
    }, [challenge, mouthCurveAnim]);
    // Eye blink animation loop
    (0, react_1.useEffect)(() => {
        let loop = null;
        if (challenge === 'blink') {
            loop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.delay(900),
                react_native_1.Animated.timing(eyeBlinkAnim, {
                    toValue: 0.1,
                    duration: 150,
                    easing: react_native_1.Easing.ease,
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(eyeBlinkAnim, {
                    toValue: 1,
                    duration: 180,
                    easing: react_native_1.Easing.ease,
                    useNativeDriver: true,
                }),
            ]));
            loop.start();
        }
        else {
            eyeBlinkAnim.setValue(1);
        }
        return () => loop?.stop();
    }, [challenge, eyeBlinkAnim]);
    // Scanning radar line loop
    (0, react_1.useEffect)(() => {
        const loop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
            react_native_1.Animated.timing(scanLineAnim, {
                toValue: 1,
                duration: 1400,
                easing: react_native_1.Easing.inOut(react_native_1.Easing.sin),
                useNativeDriver: true,
            }),
            react_native_1.Animated.timing(scanLineAnim, {
                toValue: 0,
                duration: 1400,
                easing: react_native_1.Easing.inOut(react_native_1.Easing.sin),
                useNativeDriver: true,
            }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [scanLineAnim]);
    // Dynamic colors
    const primaryColor = isVerified ? '#10B981' : '#FFFFFF';
    const glowBorderColor = isVerified
        ? 'rgba(16, 185, 129, 0.45)'
        : 'rgba(255, 255, 255, 0.25)';
    const headRotation = headRotateAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-22deg', '0deg', '22deg'],
    });
    const headOffset = headRotateAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-14, 0, 14],
    });
    const arrowOpacity = arrowPulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1.0],
    });
    const arrowTranslateXLeft = arrowPulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6],
    });
    const arrowTranslateXRight = arrowPulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 6],
    });
    return (react_1.default.createElement(react_native_1.View, { style: styles.avatarContainer, pointerEvents: "none" },
        react_1.default.createElement(react_native_1.View, { style: [styles.avatarGlowBackdrop, { borderColor: glowBorderColor }] },
            challenge === 'turn_head_left' && (react_1.default.createElement(react_native_1.Animated.View, { style: [
                    styles.chevronGroup,
                    styles.chevronLeft,
                    {
                        opacity: arrowOpacity,
                        transform: [{ translateX: arrowTranslateXLeft }],
                    },
                ] },
                react_1.default.createElement(react_native_1.View, { style: [styles.chevronArrowLeft, { borderRightColor: primaryColor }] }),
                react_1.default.createElement(react_native_1.View, { style: [styles.chevronArrowLeft, { borderRightColor: primaryColor, marginLeft: 2 }] }))),
            react_1.default.createElement(react_native_1.Animated.View, { style: [
                    styles.headOutline,
                    {
                        borderColor: primaryColor,
                        transform: [{ rotateZ: headRotation }, { translateX: headOffset }],
                    },
                ] },
                react_1.default.createElement(react_native_1.View, { style: [styles.foreheadSensor, { backgroundColor: primaryColor }] }),
                react_1.default.createElement(react_native_1.View, { style: styles.eyesRow },
                    react_1.default.createElement(react_native_1.Animated.View, { style: [
                            styles.eyePill,
                            {
                                backgroundColor: primaryColor,
                                transform: [{ scaleY: eyeBlinkAnim }],
                            },
                        ] }),
                    react_1.default.createElement(react_native_1.Animated.View, { style: [
                            styles.eyePill,
                            {
                                backgroundColor: primaryColor,
                                transform: [{ scaleY: eyeBlinkAnim }],
                            },
                        ] })),
                react_1.default.createElement(react_native_1.View, { style: [styles.noseLine, { backgroundColor: primaryColor }] }),
                challenge === 'smile' ? (react_1.default.createElement(react_native_1.Animated.View, { style: [
                        styles.mouthSmile,
                        {
                            borderColor: primaryColor,
                            transform: [
                                {
                                    scaleY: mouthCurveAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.3, 1.3],
                                    }),
                                },
                                {
                                    scaleX: mouthCurveAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1.2],
                                    }),
                                },
                            ],
                        },
                    ] })) : (react_1.default.createElement(react_native_1.View, { style: [styles.mouthNeutral, { backgroundColor: primaryColor }] })),
                isVerified && (react_1.default.createElement(react_native_1.View, { style: styles.verifiedBadge },
                    react_1.default.createElement(react_native_1.View, { style: styles.verifiedStemShort }),
                    react_1.default.createElement(react_native_1.View, { style: styles.verifiedStemLong })))),
            challenge === 'turn_head_right' && (react_1.default.createElement(react_native_1.Animated.View, { style: [
                    styles.chevronGroup,
                    styles.chevronRight,
                    {
                        opacity: arrowOpacity,
                        transform: [{ translateX: arrowTranslateXRight }],
                    },
                ] },
                react_1.default.createElement(react_native_1.View, { style: [styles.chevronArrowRight, { borderLeftColor: primaryColor }] }),
                react_1.default.createElement(react_native_1.View, { style: [styles.chevronArrowRight, { borderLeftColor: primaryColor, marginLeft: 2 }] }))))));
};
const FaceLivenessOverlay = ({ faceStatus = 'no_face', progress, activeChallenge = 'none', instructionText, isAnalyzing = false, isVerified = false, }) => {
    const scanLineAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    // Radar beam sweep animation
    (0, react_1.useEffect)(() => {
        let loop = null;
        if (isAnalyzing && !isVerified) {
            loop = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 1800,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.quad),
                    useNativeDriver: true,
                }),
                react_native_1.Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 1800,
                    easing: react_native_1.Easing.inOut(react_native_1.Easing.quad),
                    useNativeDriver: true,
                }),
            ]));
            loop.start();
        }
        else {
            scanLineAnim.setValue(0);
        }
        return () => loop?.stop();
    }, [isAnalyzing, isVerified, scanLineAnim]);
    const getReticleBorderColor = () => {
        if (isVerified)
            return '#10B981';
        if (faceStatus === 'face_detected')
            return '#FFFFFF';
        if (faceStatus === 'multiple_faces' || faceStatus === 'face_out_of_bounds')
            return '#EF4444';
        if (faceStatus === 'face_too_far' || faceStatus === 'face_too_close')
            return '#F59E0B';
        return 'rgba(255, 255, 255, 0.35)';
    };
    const currentInstruction = instructionText ||
        (isVerified
            ? 'IDENTITY VERIFIED'
            : faceStatus !== 'face_detected'
                ? (0, challenges_1.getFaceStatusInstruction)(faceStatus)
                : isAnalyzing
                    ? activeChallenge !== 'none'
                        ? (0, challenges_1.getChallengeInstruction)(activeChallenge)
                        : 'HOLD STILL • VERIFYING'
                    : 'POSITION FACE INSIDE GUIDE');
    const progressPercent = progress
        ? Math.min(100, Math.round(progress.activeChallenge !== 'none'
            ? progress.challengeProgress * 50 + (progress.currentSample / (progress.totalSamples || 4)) * 50
            : (progress.currentSample / (progress.totalSamples || 4)) * 100))
        : isVerified
            ? 100
            : 0;
    const reticleColor = getReticleBorderColor();
    const scanBeamTranslateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-ovalHeight / 2 + 10, ovalHeight / 2 - 10],
    });
    return (react_1.default.createElement(react_native_1.View, { style: styles.container, pointerEvents: "box-none" },
        react_1.default.createElement(react_native_1.View, { style: styles.topContainer, pointerEvents: "none" },
            react_1.default.createElement(react_native_1.View, { style: styles.topHudBadge },
                react_1.default.createElement(react_native_1.View, { style: [styles.statusDot, { backgroundColor: isVerified ? '#10B981' : isAnalyzing ? '#3B82F6' : '#94A3B8' }] }),
                react_1.default.createElement(react_native_1.Text, { style: styles.topHudTitle }, isVerified ? 'BIOMETRIC MATCH CONFIRMED' : isAnalyzing ? 'LIVE INFERENCE ENGINE' : 'READY TO SCAN')),
            react_1.default.createElement(BiometricPromptAvatar, { challenge: activeChallenge, isVerified: isVerified, faceStatus: faceStatus })),
        react_1.default.createElement(react_native_1.View, { style: styles.centerContainer, pointerEvents: "none" },
            react_1.default.createElement(react_native_1.View, { style: [styles.faceOval, { borderColor: reticleColor }] },
                isAnalyzing && !isVerified && (react_1.default.createElement(react_native_1.Animated.View, { style: [
                        styles.scanLaserBeam,
                        {
                            transform: [{ translateY: scanBeamTranslateY }],
                            backgroundColor: isVerified ? '#10B981' : '#60A5FA',
                        },
                    ] })),
                react_1.default.createElement(react_native_1.View, { style: [styles.cornerBracket, styles.bracketTopLeft, { borderColor: reticleColor }] }),
                react_1.default.createElement(react_native_1.View, { style: [styles.cornerBracket, styles.bracketTopRight, { borderColor: reticleColor }] }),
                react_1.default.createElement(react_native_1.View, { style: [styles.cornerBracket, styles.bracketBottomLeft, { borderColor: reticleColor }] }),
                react_1.default.createElement(react_native_1.View, { style: [styles.cornerBracket, styles.bracketBottomRight, { borderColor: reticleColor }] }))),
        react_1.default.createElement(react_native_1.View, { style: styles.bottomContainer, pointerEvents: "none" },
            react_1.default.createElement(react_native_1.View, { style: [styles.instructionCard, isVerified && styles.instructionCardVerified] },
                react_1.default.createElement(react_native_1.Text, { style: [styles.instructionTitle, isVerified && styles.instructionTitleVerified] }, currentInstruction.toUpperCase()),
                isAnalyzing && (react_1.default.createElement(react_native_1.View, { style: styles.progressContainer },
                    react_1.default.createElement(react_native_1.View, { style: styles.progressTrack },
                        react_1.default.createElement(react_native_1.View, { style: [
                                styles.progressBarFill,
                                {
                                    width: `${progressPercent}%`,
                                    backgroundColor: isVerified ? '#10B981' : '#3B82F6',
                                },
                            ] })),
                    react_1.default.createElement(react_native_1.Text, { style: styles.progressPercentText },
                        progressPercent,
                        "%"))),
                react_1.default.createElement(react_native_1.View, { style: styles.securityFooterRow },
                    react_1.default.createElement(react_native_1.View, { style: styles.securePill },
                        react_1.default.createElement(react_native_1.View, { style: [styles.secureIndicator, { backgroundColor: isVerified ? '#10B981' : '#38BDF8' }] }),
                        react_1.default.createElement(react_native_1.Text, { style: styles.secureText }, "ON-DEVICE BIOMETRIC ENGINE")))))));
};
exports.FaceLivenessOverlay = FaceLivenessOverlay;
const { width } = react_native_1.Dimensions.get('window');
const ovalWidth = Math.min(width * 0.74, 290);
const ovalHeight = ovalWidth * 1.34;
const styles = react_native_1.StyleSheet.create({
    container: {
        ...react_native_1.StyleSheet.absoluteFill,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    topContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    topHudBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 12,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginRight: 8,
    },
    topHudTitle: {
        color: '#F8FAFC',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    // Avatar Component Styles
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarGlowBackdrop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 14, 23, 0.85)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 28,
        borderWidth: 1.5,
    },
    headOutline: {
        width: 60,
        height: 74,
        borderRadius: 30,
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    foreheadSensor: {
        position: 'absolute',
        top: 7,
        width: 8,
        height: 3,
        borderRadius: 1.5,
    },
    eyesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 28,
        marginTop: 4,
    },
    eyePill: {
        width: 6,
        height: 9,
        borderRadius: 3,
    },
    noseLine: {
        width: 2,
        height: 7,
        borderRadius: 1,
        marginVertical: 4,
        opacity: 0.7,
    },
    mouthNeutral: {
        width: 14,
        height: 2.5,
        borderRadius: 1.5,
    },
    mouthSmile: {
        width: 18,
        height: 9,
        borderBottomWidth: 3,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderRadius: 9,
    },
    chevronGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
    },
    chevronLeft: {
        left: 2,
    },
    chevronRight: {
        right: 2,
    },
    chevronArrowLeft: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderTopWidth: 6,
        borderRightWidth: 8,
        borderBottomWidth: 6,
        borderLeftWidth: 0,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    chevronArrowRight: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderTopWidth: 6,
        borderRightWidth: 0,
        borderBottomWidth: 6,
        borderLeftWidth: 8,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    verifiedBadge: {
        position: 'absolute',
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedStemShort: {
        position: 'absolute',
        left: 8,
        top: 13,
        width: 4,
        height: 2.5,
        backgroundColor: '#FFFFFF',
        transform: [{ rotate: '45deg' }],
    },
    verifiedStemLong: {
        position: 'absolute',
        left: 10,
        top: 10,
        width: 2.5,
        height: 10,
        backgroundColor: '#FFFFFF',
        transform: [{ rotate: '45deg' }],
    },
    // Center Reticle
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceOval: {
        width: ovalWidth,
        height: ovalHeight,
        borderRadius: ovalWidth / 2,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    scanLaserBeam: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 3,
        opacity: 0.85,
        shadowColor: '#60A5FA',
        shadowOpacity: 0.9,
        shadowRadius: 8,
    },
    cornerBracket: {
        position: 'absolute',
        width: 24,
        height: 24,
    },
    bracketTopLeft: {
        top: -2,
        left: 16,
        borderTopWidth: 3.5,
        borderLeftWidth: 3.5,
    },
    bracketTopRight: {
        top: -2,
        right: 16,
        borderTopWidth: 3.5,
        borderRightWidth: 3.5,
    },
    bracketBottomLeft: {
        bottom: -2,
        left: 16,
        borderBottomWidth: 3.5,
        borderLeftWidth: 3.5,
    },
    bracketBottomRight: {
        bottom: -2,
        right: 16,
        borderBottomWidth: 3.5,
        borderRightWidth: 3.5,
    },
    // Bottom Floating Instruction Card
    bottomContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 8,
    },
    instructionCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
    },
    instructionCardVerified: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(6, 78, 59, 0.92)',
    },
    instructionTitle: {
        color: '#F8FAFC',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 1.1,
        textAlign: 'center',
        marginBottom: 10,
    },
    instructionTitleVerified: {
        color: '#34D399',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginVertical: 4,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#1E293B',
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 10,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressPercentText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        width: 36,
        textAlign: 'right',
    },
    securityFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    securePill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    secureIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    secureText: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.9,
    },
});
//# sourceMappingURL=FaceLivenessOverlay.js.map