package expo.modules.faceliveness

import kotlin.math.abs
import kotlin.math.min

class ChallengeDetector(
    private val challenges: List<ChallengeType> = emptyList(),
    private val timeoutMs: Long = 15000L
) {
    private var currentIndex = 0
    private var stepStartTime = System.currentTimeMillis()
    private var isBlinkClosingDetected = false

    fun getCurrentChallenge(): ChallengeType {
        if (challenges.isEmpty() || currentIndex >= challenges.size) {
            return ChallengeType.NONE
        }
        return challenges[currentIndex]
    }

    fun isAllCompleted(): Boolean {
        if (challenges.isEmpty()) return true
        return currentIndex >= challenges.size
    }

    fun isTimedOut(): Boolean {
        if (isAllCompleted()) return false
        return (System.currentTimeMillis() - stepStartTime) > timeoutMs
    }

    fun reset() {
        currentIndex = 0
        stepStartTime = System.currentTimeMillis()
        isBlinkClosingDetected = false
    }

    /**
     * Evaluates current face orientation, eye states, and smile against the active challenge step.
     * Returns a float progress between 0.0f and 1.0f.
     */
    fun evaluate(
        yaw: Float,
        pitch: Float,
        leftEyeOpenProb: Float?,
        rightEyeOpenProb: Float?,
        smilingProbability: Float? = null
    ): Float {
        val current = getCurrentChallenge()
        if (current == ChallengeType.NONE) return 1.0f

        var progress = 0.0f

        when (current) {
            ChallengeType.TURN_HEAD_LEFT -> {
                // In front-facing camera mirror view, turning head towards user's left produces positive yaw (> 0)
                val targetYaw = 11.0f
                if (yaw > 0) {
                    progress = min(1.0f, yaw / targetYaw)
                    if (yaw >= targetYaw) {
                        advanceStep()
                        return 1.0f
                    }
                }
            }

            ChallengeType.TURN_HEAD_RIGHT -> {
                // In front-facing camera mirror view, turning head towards user's right produces negative yaw (< 0)
                val targetYaw = -11.0f
                if (yaw < 0) {
                    progress = min(1.0f, abs(yaw) / abs(targetYaw))
                    if (yaw <= targetYaw) {
                        advanceStep()
                        return 1.0f
                    }
                }
            }

            ChallengeType.NOD_HEAD -> {
                val currentPitch = abs(pitch)
                val targetPitch = 10.0f
                progress = min(1.0f, currentPitch / targetPitch)
                if (currentPitch >= targetPitch) {
                    advanceStep()
                    return 1.0f
                }
            }

            ChallengeType.BLINK -> {
                val left = leftEyeOpenProb ?: 1.0f
                val right = rightEyeOpenProb ?: 1.0f

                // Phase 1: Either eye significantly closed
                if (left < 0.40f || right < 0.40f) {
                    isBlinkClosingDetected = true
                    progress = 0.6f
                }

                // Phase 2: Eyes opened back up
                if (isBlinkClosingDetected && (left > 0.65f || right > 0.65f)) {
                    isBlinkClosingDetected = false
                    advanceStep()
                    return 1.0f
                }
            }

            ChallengeType.SMILE -> {
                val smile = smilingProbability ?: 0f
                val targetSmile = 0.35f
                progress = min(1.0f, smile / targetSmile)
                if (smile >= targetSmile) {
                    advanceStep()
                    return 1.0f
                }
            }

            ChallengeType.NONE -> {
                return 1.0f
            }
        }

        return progress
    }

    private fun advanceStep() {
        currentIndex++
        stepStartTime = System.currentTimeMillis()
        isBlinkClosingDetected = false
    }
}
