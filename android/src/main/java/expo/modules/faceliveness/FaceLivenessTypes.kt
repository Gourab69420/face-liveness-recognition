package expo.modules.faceliveness

import android.graphics.Rect

enum class FaceStatus(val value: String) {
    NO_FACE("no_face"),
    MULTIPLE_FACES("multiple_faces"),
    FACE_TOO_FAR("face_too_far"),
    FACE_TOO_CLOSE("face_too_close"),
    FACE_OUT_OF_BOUNDS("face_out_of_bounds"),
    FACE_BLURRY("face_blurry"),
    FACE_POOR_LIGHTING("face_poor_lighting"),
    FACE_OCCLUDED("face_occluded"),
    FACE_DETECTED("face_detected")
}

enum class LivenessStatus(val value: String) {
    IDLE("idle"),
    DETECTING("detecting"),
    CHALLENGE("challenge"),
    ANALYZING("analyzing"),
    COMPLETED("completed"),
    ERROR("error")
}

enum class ClassificationResult(val value: String) {
    LIVE("live"),
    SPOOF("spoof"),
    INCONCLUSIVE("inconclusive")
}

enum class ChallengeType(val value: String) {
    NONE("none"),
    TURN_HEAD_LEFT("turn_head_left"),
    TURN_HEAD_RIGHT("turn_head_right"),
    NOD_HEAD("nod_head"),
    BLINK("blink"),
    SMILE("smile")
}

data class FaceDetectionData(
    val status: FaceStatus,
    val bounds: Rect?,
    val yaw: Float,
    val pitch: Float,
    val roll: Float,
    val leftEyeOpenProbability: Float?,
    val rightEyeOpenProbability: Float?,
    val smilingProbability: Float?
)

data class LivenessProgressData(
    val currentSample: Int,
    val totalSamples: Int,
    val activeChallenge: ChallengeType,
    val challengeProgress: Float,
    val faceStatus: FaceStatus
)

data class LivenessResultData(
    val status: ClassificationResult,
    val score: Float,
    val confidence: Float,
    val passiveScore: Float,
    val challengePassed: Boolean,
    val samplesCollected: Int,
    val durationMs: Long,
    val errorCode: String? = null,
    // Face Recognition (MobileFaceNet 192-D)
    val embedding: List<Double>? = null,
    val isMatch: Boolean = false,
    val matchedUserId: String? = null,
    val matchedUserName: String? = null,
    val similarity: Float = 0f
)
