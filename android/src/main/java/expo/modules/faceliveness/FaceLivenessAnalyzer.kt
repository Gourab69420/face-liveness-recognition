package expo.modules.faceliveness

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.PointF
import android.graphics.Rect
import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

class FaceLivenessAnalyzer(
    private val classifier: MiniFASNetClassifier,
    private val recognizer: MobileFaceNetRecognizer? = null,
    var liveThreshold: Float = 0.50f,
    var spoofThreshold: Float = 0.35f,
    private val requiredSamples: Int = 4,
    private val sampleIntervalMs: Long = 150L,
    private val listener: Listener
) : ImageAnalysis.Analyzer {

    interface Listener {
        fun onFaceStatus(status: FaceStatus, bounds: Rect?, yaw: Float, pitch: Float)
        fun onProgress(data: LivenessProgressData)
        fun onResult(result: LivenessResultData)
        fun onError(code: String, message: String)
    }

    private val detector: FaceDetector
    private var isCheckActive = false
    private var checkStartTime = 0L
    private var lastSampleTime = 0L

    private val samples = mutableListOf<Float>()
    private val collectedEmbeddings = mutableListOf<FloatArray>()
    private var challengeDetector = ChallengeDetector()

    // Face Recognition state
    var enrolledProfiles: List<EnrolledProfile> = emptyList()
    var matchThreshold: Float = 0.72f
    var mode: String = "liveness_and_recognition" // "liveness_and_recognition", "recognition_only", "liveness_only"
    private var latestEmbedding: FloatArray? = null

    init {
        // Initialize OpenCV
        OpenCVUtils.init()

        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
            .setContourMode(FaceDetectorOptions.CONTOUR_MODE_NONE)
            .enableTracking()
            .build()
        detector = FaceDetection.getClient(options)
    }

    fun startCheck(challenges: List<ChallengeType> = emptyList()) {
        isCheckActive = true
        checkStartTime = System.currentTimeMillis()
        lastSampleTime = 0L
        samples.clear()
        collectedEmbeddings.clear()
        latestEmbedding = null
        challengeDetector = ChallengeDetector(challenges)
    }

    fun stopCheck() {
        isCheckActive = false
        samples.clear()
        collectedEmbeddings.clear()
        latestEmbedding = null
    }

    fun reset() {
        stopCheck()
        challengeDetector.reset()
    }

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        try {
            val rotationDegrees = imageProxy.imageInfo.rotationDegrees
            val inputImage = InputImage.fromMediaImage(mediaImage, rotationDegrees)

            val task = detector.process(inputImage)
            val faces = Tasks.await(task)

            handleFaces(faces, imageProxy, rotationDegrees)
        } catch (e: Exception) {
            Log.e(TAG, "Frame analysis error: ${e.message}", e)
        } finally {
            imageProxy.close()
        }
    }

    private fun handleFaces(faces: List<Face>, imageProxy: ImageProxy, rotationDegrees: Int) {
        val frameWidth = if (rotationDegrees == 90 || rotationDegrees == 270) imageProxy.height else imageProxy.width

        if (faces.isEmpty()) {
            listener.onFaceStatus(FaceStatus.NO_FACE, null, 0f, 0f)
            return
        }

        if (faces.size > 1) {
            listener.onFaceStatus(FaceStatus.MULTIPLE_FACES, null, 0f, 0f)
            if (isCheckActive) {
                completeWithResult(
                    ClassificationResult.INCONCLUSIVE,
                    score = 0f,
                    confidence = 0f,
                    errorCode = "MULTIPLE_FACES_DETECTED"
                )
            }
            return
        }

        val face = faces[0]
        val bounds = face.boundingBox
        val yaw = face.headEulerAngleY
        val pitch = face.headEulerAngleX

        // Validate face positioning in frame
        val faceWidthRatio = bounds.width().toFloat() / frameWidth.toFloat()

        val status = when {
            faceWidthRatio < 0.14f -> FaceStatus.FACE_TOO_FAR
            faceWidthRatio > 0.88f -> FaceStatus.FACE_TOO_CLOSE
            bounds.centerX() < (frameWidth * 0.10f) || bounds.centerX() > (frameWidth * 0.90f) -> FaceStatus.FACE_OUT_OF_BOUNDS
            else -> FaceStatus.FACE_DETECTED
        }

        listener.onFaceStatus(status, bounds, yaw, pitch)

        if (!isCheckActive) return

        if (status != FaceStatus.FACE_DETECTED) {
            return
        }

        // Active challenge evaluation
        if (!challengeDetector.isAllCompleted()) {
            if (challengeDetector.isTimedOut()) {
                completeWithResult(
                    ClassificationResult.INCONCLUSIVE,
                    score = 0f,
                    confidence = 0f,
                    errorCode = "CHALLENGE_TIMEOUT"
                )
                return
            }

            val progress = challengeDetector.evaluate(
                yaw = yaw,
                pitch = pitch,
                leftEyeOpenProb = face.leftEyeOpenProbability,
                rightEyeOpenProb = face.rightEyeOpenProbability,
                smilingProbability = face.smilingProbability
            )

            listener.onProgress(
                LivenessProgressData(
                    currentSample = samples.size,
                    totalSamples = requiredSamples,
                    activeChallenge = challengeDetector.getCurrentChallenge(),
                    challengeProgress = progress,
                    faceStatus = status
                )
            )

            if (!challengeDetector.isAllCompleted()) {
                return
            }
        }

        // Passive Anti-Spoofing & Face Recognition Feature Extraction Throttle
        val now = System.currentTimeMillis()
        if (now - lastSampleTime >= sampleIntervalMs && samples.size < requiredSamples) {
            lastSampleTime = now

            // Convert CameraX frame to Bitmap safely
            val frameBitmap = imageProxy.toBitmap()
            val rotatedBitmap = BitmapUtils.rotateBitmap(frameBitmap, rotationDegrees, mirror = false)

            // Face Quality Assessment (FQA) - Permissive thresholds suitable for diverse mobile lighting
            val sharpness = OpenCVUtils.calculateSharpness(rotatedBitmap)
            if (sharpness < 18.0) {
                // Reject only severely blurry frames
                listener.onFaceStatus(FaceStatus.FACE_BLURRY, bounds, yaw, pitch)
                if (rotatedBitmap != frameBitmap) rotatedBitmap.recycle()
                frameBitmap.recycle()
                return
            }

            val luminance = OpenCVUtils.calculateLuminance(rotatedBitmap)
            if (luminance < 18.0 || luminance > 248.0) {
                listener.onFaceStatus(FaceStatus.FACE_POOR_LIGHTING, bounds, yaw, pitch)
                if (rotatedBitmap != frameBitmap) rotatedBitmap.recycle()
                frameBitmap.recycle()
                return
            }

            // 1. OpenCV Illumination Enhancement (CLAHE)
            val enhancedBitmap = OpenCVUtils.enhanceIllumination(rotatedBitmap)

            // 2. Passive anti-spoofing inference
            val output = classifier.classify(enhancedBitmap, bounds, scaleFactor = 2.7f)

            // 3. Face Recognition: Align and extract MobileFaceNet 192-D embedding
            if (recognizer != null) {
                try {
                    val leftEye = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
                    val rightEye = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position

                    val alignedFace = OpenCVUtils.alignAndCropFace(
                        srcBitmap = enhancedBitmap,
                        faceRect = bounds,
                        leftEye = leftEye,
                        rightEye = rightEye,
                        targetWidth = 112,
                        targetHeight = 112
                    )

                    val emb = recognizer.extractEmbedding(alignedFace)
                    if (emb != null) {
                        latestEmbedding = emb
                        collectedEmbeddings.add(emb)
                        Log.d(TAG, "Extracted 192-D face embedding successfully (total=${collectedEmbeddings.size})")
                    }
                    if (alignedFace != enhancedBitmap) {
                        alignedFace.recycle()
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Embedding extraction failed: ${e.message}")
                }
            }

            // Recycle temporary bitmaps
            if (enhancedBitmap != rotatedBitmap) {
                enhancedBitmap.recycle()
            }
            if (rotatedBitmap != frameBitmap) {
                rotatedBitmap.recycle()
            }
            frameBitmap.recycle()

            val isRecogOnly = mode == "recognition_only"
            val targetSamples = if (isRecogOnly) 2 else requiredSamples

            if (output != null || isRecogOnly) {
                val score = output?.liveScore ?: 1.0f
                samples.add(score)
                Log.d(TAG, "Sample ${samples.size}/$targetSamples (mode=$mode): score=$score, embeddings=${collectedEmbeddings.size}")
                listener.onProgress(
                    LivenessProgressData(
                        currentSample = samples.size,
                        totalSamples = targetSamples,
                        activeChallenge = ChallengeType.NONE,
                        challengeProgress = 1.0f,
                        faceStatus = status
                    )
                )

                if (samples.size >= targetSamples) {
                    evaluateFinalResult()
                }
            }
        }
    }

    private fun evaluateFinalResult() {
        if (samples.isEmpty()) {
            completeWithResult(ClassificationResult.INCONCLUSIVE, 0f, 0f, "NO_SAMPLES")
            return
        }

        val sorted = samples.sorted()
        val medianScore = sorted[sorted.size / 2]
        val meanScore = samples.average().toFloat()

        // Consistency metric: lower variance means higher confidence
        val variance = samples.map { (it - meanScore) * (it - meanScore) }.average().toFloat()
        val consistency = max(0f, 1.0f - (variance * 4.0f))

        val duration = System.currentTimeMillis() - checkStartTime
        val challengePassed = challengeDetector.isAllCompleted()

        // Multi-Shot Embedding Averaging (Centroid Vector)
        val masterEmbedding: FloatArray? = if (collectedEmbeddings.isNotEmpty()) {
            val size = 192
            val avg = FloatArray(size)
            for (vec in collectedEmbeddings) {
                for (i in 0 until size) {
                    avg[i] = avg[i] + vec[i]
                }
            }
            var sumSq = 0f
            for (i in 0 until size) {
                avg[i] = avg[i] / collectedEmbeddings.size
                sumSq += avg[i] * avg[i]
            }
            val norm = sqrt(sumSq.toDouble()).toFloat()
            if (norm > 0f) {
                for (i in 0 until size) {
                    avg[i] = avg[i] / norm
                }
            }
            avg
        } else {
            latestEmbedding
        }

        // Perform face recognition matching if embedding was extracted
        var recognitionResult: RecognitionResult? = null
        if (masterEmbedding != null && recognizer != null) {
            recognitionResult = recognizer.match(masterEmbedding, enrolledProfiles, matchThreshold)
            Log.i(TAG, "Face match evaluated against ${enrolledProfiles.size} profiles: isMatch=${recognitionResult.isMatch}, similarity=${recognitionResult.similarity}, threshold=$matchThreshold")
        }

        val isRecogOnly = mode == "recognition_only"
        val hasEnrolledProfiles = enrolledProfiles.isNotEmpty()
        val isFaceMatch = recognitionResult?.isMatch == true

        var errorCode: String? = null

        val resultStatus = when {
            isRecogOnly -> {
                if (masterEmbedding != null && masterEmbedding.isNotEmpty()) {
                    ClassificationResult.LIVE
                } else {
                    errorCode = "EMBEDDING_FAILED"
                    ClassificationResult.INCONCLUSIVE
                }
            }

            // In check-in mode: must match enrolled profile if one is provided
            hasEnrolledProfiles && !isFaceMatch -> {
                errorCode = "FACE_MISMATCH"
                Log.w(TAG, "Face recognition MISMATCH: similarity=${recognitionResult?.similarity} < threshold=$matchThreshold")
                ClassificationResult.SPOOF
            }

            // Must pass active kinetic challenge (smile, blink, etc.)
            !challengePassed -> {
                errorCode = "CHALLENGE_INCOMPLETE"
                Log.w(TAG, "Active kinetic challenge was NOT passed")
                ClassificationResult.INCONCLUSIVE
            }

            // Must pass passive anti-spoofing score
            meanScore <= spoofThreshold -> {
                errorCode = "SPOOF_DETECTED"
                Log.w(TAG, "Passive anti-spoofing failed: score=$meanScore <= threshold=$spoofThreshold")
                ClassificationResult.SPOOF
            }

            else -> ClassificationResult.LIVE
        }

        // Confidence estimation
        val distance = if (resultStatus == ClassificationResult.LIVE) {
            abs(meanScore - liveThreshold) / (1.0f - liveThreshold + 0.001f)
        } else if (resultStatus == ClassificationResult.SPOOF) {
            abs(spoofThreshold - meanScore) / (spoofThreshold + 0.001f)
        } else {
            0.5f
        }
        val confidence = min(1.0f, max(0.1f, (distance * 0.6f + consistency * 0.4f)))

        completeWithResult(
            status = resultStatus,
            score = meanScore,
            confidence = confidence,
            errorCode = errorCode,
            passiveScore = medianScore,
            challengePassed = challengePassed,
            duration = duration,
            recognition = recognitionResult,
            finalEmbedding = masterEmbedding
        )
    }

    private fun completeWithResult(
        status: ClassificationResult,
        score: Float,
        confidence: Float,
        errorCode: String? = null,
        passiveScore: Float = score,
        challengePassed: Boolean = false,
        duration: Long = System.currentTimeMillis() - checkStartTime,
        recognition: RecognitionResult? = null,
        finalEmbedding: FloatArray? = latestEmbedding
    ) {
        isCheckActive = false

        val embeddingDoubleList = finalEmbedding?.map { it.toDouble() }

        val result = LivenessResultData(
            status = status,
            score = score,
            confidence = confidence,
            passiveScore = passiveScore,
            challengePassed = challengePassed,
            samplesCollected = samples.size,
            durationMs = duration,
            errorCode = errorCode,
            embedding = embeddingDoubleList,
            isMatch = recognition?.isMatch ?: false,
            matchedUserId = recognition?.matchedUserId,
            matchedUserName = recognition?.matchedUserName,
            similarity = recognition?.similarity ?: 0f
        )
        listener.onResult(result)
    }

    fun close() {
        stopCheck()
        detector.close()
    }

    companion object {
        private const val TAG = "FaceLivenessAnalyzer"
    }
}
