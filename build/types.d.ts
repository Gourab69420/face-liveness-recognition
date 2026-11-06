import type { ViewStyle, StyleProp } from 'react-native';
/**
 * Status of the face detected by the camera.
 */
export type FaceStatus = 'no_face' | 'multiple_faces' | 'face_too_far' | 'face_too_close' | 'face_out_of_bounds' | 'face_blurry' | 'face_poor_lighting' | 'face_detected';
/**
 * Classification outcome of the liveness check.
 * - 'live': Genuine real person (confidence/score above threshold and challenges passed).
 * - 'spoof': Presentation attack detected (print photo, digital replay screen, mask).
 * - 'inconclusive': Ambiguous signal, poor lighting, or multiple faces. Low quality inputs never force a pass.
 */
export type ClassificationResult = 'live' | 'spoof' | 'inconclusive';
/**
 * High-level state of the liveness controller.
 */
export type LivenessCheckStatus = 'idle' | 'requesting_permission' | 'detecting' | 'challenging' | 'analyzing' | 'completed' | 'error';
/**
 * Active challenge actions supported.
 */
export type ChallengeType = 'turn_head_left' | 'turn_head_right' | 'nod_head' | 'blink' | 'smile';
/**
 * Bounding box of the detected face in frame coordinates.
 */
export interface FaceBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}
/**
 * Real-time face positioning and orientation details.
 */
export interface FaceStatusEvent {
    status: FaceStatus;
    yaw: number;
    pitch: number;
    bounds?: FaceBounds | null;
}
/**
 * Progress information emitted during the analysis and challenge phases.
 */
export interface LivenessProgress {
    currentSample: number;
    totalSamples: number;
    activeChallenge: ChallengeType | 'none';
    challengeProgress: number;
    faceStatus: FaceStatus;
}
/**
 * Comprehensive liveness check result.
 */
export interface LivenessResult {
    /**
     * Final decision: 'live', 'spoof', or 'inconclusive'.
     */
    status: ClassificationResult;
    /**
     * Aggregated live score between 0.0 and 1.0.
     */
    score: number;
    /**
     * Statistical confidence level of the decision between 0.0 and 1.0.
     */
    confidence: number;
    /**
     * Median passive anti-spoofing score across analyzed frames.
     */
    passiveScore: number;
    /**
     * Whether the active challenge (e.g. head turn, blink) was verified.
     */
    challengePassed: boolean;
    /**
     * Number of valid face frames evaluated.
     */
    samplesCollected: number;
    /**
     * Total analysis duration in milliseconds.
     */
    durationMs: number;
    /**
     * Machine-readable error code if inconclusive or failed.
     */
    errorCode?: string | null;
    /**
     * Timestamp of the completed analysis.
     */
    timestamp: number;
    /**
     * 192-dimensional MobileFaceNet face embedding vector (normalized L2), if extracted.
     */
    embedding?: number[];
    /**
     * Whether the face matched any of the enrolled profiles.
     */
    isMatch?: boolean;
    /**
     * User ID of the matched profile, if matched.
     */
    matchedUserId?: string | null;
    /**
     * User name of the matched profile, if matched.
     */
    matchedUserName?: string | null;
    /**
     * Cosine similarity score between face embedding and matched profile (0.0 to 1.0).
     */
    similarity?: number;
}
/**
 * Enrolled face profile for local on-device face recognition.
 */
export interface EnrolledProfile {
    id: string;
    name: string;
    embedding: number[];
}
/**
 * Operating mode for the camera module.
 * - 'liveness_and_recognition': Requires physical liveness validation and matches face against enrolled profiles.
 * - 'recognition_only': Direct face embedding extraction and recognition.
 * - 'liveness_only': Anti-spoofing only without profile matching.
 */
export type LivenessMode = 'liveness_and_recognition' | 'recognition_only' | 'liveness_only';
/**
 * Error structure returned when camera or inference operations fail.
 */
export interface FaceLivenessError {
    code: string;
    message: string;
}
/**
 * Configuration options for the liveness pipeline.
 */
export interface FaceLivenessConfig {
    /**
     * Score threshold (0.0 - 1.0) required to consider a face genuine.
     * Default: 0.85
     */
    liveThreshold?: number;
    /**
     * Score threshold (0.0 - 1.0) below which a face is classified as spoof.
     * Default: 0.40
     */
    spoofThreshold?: number;
    /**
     * Number of frames to sample and aggregate for passive anti-spoofing.
     * Default: 5
     */
    requiredSamples?: number;
    /**
     * Minimum interval between sampled frames in milliseconds.
     * Default: 200
     */
    sampleIntervalMs?: number;
    /**
     * Optional active challenges to perform (e.g. ['turn_head_left', 'blink']).
     * If empty or omitted, passive anti-spoofing is run.
     */
    challenges?: ChallengeType[];
    /**
     * Absolute path or URI to a custom TFLite model file on device.
     * If omitted, the bundled MiniFASNet model is used.
     */
    customModelPath?: string;
    /**
     * Operating mode: 'liveness_and_recognition' | 'recognition_only' | 'liveness_only'.
     * Default: 'liveness_and_recognition'
     */
    mode?: LivenessMode;
    /**
     * Minimum cosine similarity threshold (0.0 to 1.0) required to authenticate a recognized face.
     * Default: 0.72
     */
    recognitionThreshold?: number;
    /**
     * List of enrolled user profiles containing 192-D MobileFaceNet embeddings.
     */
    enrolledProfiles?: EnrolledProfile[];
    /**
     * Security preset level:
     * - 'relaxed': Faster evaluation, lower threshold (0.68)
     * - 'balanced': Recommended production default (0.72)
     * - 'strict': High threshold (0.78), rigorous checks
     */
    securityLevel?: 'relaxed' | 'balanced' | 'strict';
}
/**
 * Props for the FaceLivenessCamera React component.
 */
export interface FaceLivenessCameraProps {
    /**
     * Whether the liveness check is currently active.
     */
    active?: boolean;
    /**
     * Pipeline configuration.
     */
    config?: FaceLivenessConfig;
    /**
     * Security preset level: 'relaxed' | 'balanced' | 'strict'.
     */
    securityLevel?: 'relaxed' | 'balanced' | 'strict';
    /**
     * Enrolled profiles for face recognition.
     */
    enrolledProfiles?: EnrolledProfile[];
    /**
     * Mode: 'liveness_and_recognition', 'recognition_only', or 'liveness_only'.
     */
    mode?: LivenessMode;
    /**
     * Kinetic presence challenges to perform.
     */
    challenges?: ChallengeType[];
    /**
     * Recognition threshold (cosine similarity).
     */
    recognitionThreshold?: number;
    /**
     * Callback fired when face position or orientation changes.
     */
    onFaceStatusChanged?: (event: FaceStatusEvent) => void;
    /**
     * Callback fired as frames are analyzed or challenge steps progress.
     */
    onProgress?: (progress: LivenessProgress) => void;
    /**
     * Callback fired when the check concludes with a final result.
     */
    onResult?: (result: LivenessResult) => void;
    /**
     * Callback fired if a pipeline or camera error occurs.
     */
    onError?: (error: FaceLivenessError) => void;
    /**
     * Callback fired when camera permission is denied.
     */
    onPermissionDenied?: () => void;
    /**
     * Whether to display the default UI guide overlay (oval and instructions).
     * Default: true
     */
    showOverlay?: boolean;
    /**
     * Whether identity / liveness has been verified (triggers emerald green success state).
     */
    isVerified?: boolean;
    /**
     * Optional custom instruction prompt override.
     */
    instructionText?: string;
    /**
     * Whether to randomize challenges automatically on each session.
     * Default: false (or true if challenges is omitted in challenge mode)
     */
    randomizeChallenges?: boolean;
    /**
     * Opacity of the animated biometric hologram silhouette overlaid on the face display (0.1 to 1.0).
     * Default: 0.40
     */
    hologramOpacity?: number;
    /**
     * Whether to render the animated biometric hologram silhouette on top of the face display.
     * Default: true
     */
    showHologram?: boolean;
    /**
     * Whether to display the top floating status capsule ("LIVE INFERENCE ENGINE").
     * Default: false (avoids colliding with app navigation bars)
     */
    showTopStatus?: boolean;
    /**
     * Optional custom overlay to render on top of the camera preview.
     */
    children?: React.ReactNode;
    /**
     * Style for the camera container.
     */
    style?: StyleProp<ViewStyle>;
}
/**
 * Camera permission response from Expo / Android.
 */
export interface CameraPermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    granted: boolean;
    canAskAgain: boolean;
}
//# sourceMappingURL=types.d.ts.map