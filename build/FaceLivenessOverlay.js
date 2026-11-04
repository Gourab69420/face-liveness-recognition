"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceLivenessOverlay = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const challenges_1 = require("./challenges");
const FaceLivenessOverlay = ({ faceStatus = 'no_face', progress, activeChallenge = 'none', instructionText, isAnalyzing = false, }) => {
    const getBorderColor = () => {
        if (faceStatus === 'face_detected') {
            return '#10B981'; // Green
        }
        if (faceStatus === 'multiple_faces' || faceStatus === 'face_out_of_bounds') {
            return '#EF4444'; // Red
        }
        if (faceStatus === 'face_too_far' || faceStatus === 'face_too_close') {
            return '#F59E0B'; // Amber
        }
        return 'rgba(255, 255, 255, 0.4)'; // Neutral
    };
    const currentInstruction = instructionText ||
        (faceStatus !== 'face_detected'
            ? (0, challenges_1.getFaceStatusInstruction)(faceStatus)
            : isAnalyzing
                ? activeChallenge !== 'none'
                    ? (0, challenges_1.getChallengeInstruction)(activeChallenge)
                    : 'Hold still, analyzing liveness...'
                : 'Ready');
    const progressPercent = progress
        ? Math.min(100, Math.round(progress.activeChallenge !== 'none'
            ? progress.challengeProgress * 50 + (progress.currentSample / (progress.totalSamples || 5)) * 50
            : (progress.currentSample / (progress.totalSamples || 5)) * 100))
        : 0;
    return (react_1.default.createElement(react_native_1.View, { style: styles.container, pointerEvents: "box-none" },
        react_1.default.createElement(react_native_1.View, { style: styles.topContainer, pointerEvents: "none" },
            react_1.default.createElement(react_native_1.View, { style: styles.privacyBadge },
                react_1.default.createElement(react_native_1.View, { style: styles.secureDot }),
                react_1.default.createElement(react_native_1.Text, { style: styles.privacyText }, "On-Device \u2022 Private & Ephemeral"))),
        react_1.default.createElement(react_native_1.View, { style: styles.centerContainer, pointerEvents: "none" },
            react_1.default.createElement(react_native_1.View, { style: [styles.faceOval, { borderColor: getBorderColor() }] })),
        react_1.default.createElement(react_native_1.View, { style: styles.bottomContainer, pointerEvents: "none" },
            react_1.default.createElement(react_native_1.View, { style: styles.card },
                react_1.default.createElement(react_native_1.Text, { style: styles.instructionText }, currentInstruction),
                isAnalyzing && (react_1.default.createElement(react_native_1.View, { style: styles.progressBarBackground },
                    react_1.default.createElement(react_native_1.View, { style: [styles.progressBarFill, { width: `${progressPercent}%` }] }))),
                isAnalyzing && (react_1.default.createElement(react_native_1.Text, { style: styles.progressPercentText },
                    progressPercent,
                    "% analyzed"))))));
};
exports.FaceLivenessOverlay = FaceLivenessOverlay;
const { width } = react_native_1.Dimensions.get('window');
const ovalWidth = Math.min(width * 0.72, 280);
const ovalHeight = ovalWidth * 1.35;
const styles = react_native_1.StyleSheet.create({
    container: {
        ...react_native_1.StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    topContainer: {
        alignItems: 'center',
        width: '100%',
    },
    privacyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    secureDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    privacyText: {
        color: '#E2E8F0',
        fontSize: 12,
        fontWeight: '500',
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceOval: {
        width: ovalWidth,
        height: ovalHeight,
        borderRadius: ovalWidth / 2,
        borderWidth: 3,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
    },
    bottomContainer: {
        width: '100%',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    instructionText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    progressBarBackground: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    progressPercentText: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
});
//# sourceMappingURL=FaceLivenessOverlay.js.map