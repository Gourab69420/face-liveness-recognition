package expo.modules.faceliveness

import android.Manifest
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.graphics.Rect
import android.util.Log
import android.widget.FrameLayout
import androidx.camera.camera2.interop.Camera2Interop
import android.hardware.camera2.CaptureRequest
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class FaceLivenessCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext), FaceLivenessAnalyzer.Listener {

    private val previewView: PreviewView = PreviewView(context).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        scaleType = PreviewView.ScaleType.FILL_CENTER
        // Use COMPATIBLE (TextureView) for reliable rendering within React Native view hierarchy
        implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    }

    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private var cameraProvider: ProcessCameraProvider? = null
    private var analyzer: FaceLivenessAnalyzer? = null
    private var classifier: MiniFASNetClassifier? = null
    private var recognizer: MobileFaceNetRecognizer? = null
    private var isCameraBound = false

    // Event dispatchers for Expo Modules
    val onFaceStatusChanged by EventDispatcher()
    val onLivenessProgress by EventDispatcher()
    val onLivenessResult by EventDispatcher()
    val onError by EventDispatcher()

    private var active: Boolean = false
    private var liveThreshold: Float = 0.50f
    private var spoofThreshold: Float = 0.35f
    private var recognitionThreshold: Float = 0.72f
    private var mode: String = "liveness_and_recognition"
    private var customModelPath: String? = null
    private var challenges: List<ChallengeType> = emptyList()
    private var enrolledProfiles: List<EnrolledProfile> = emptyList()

    init {
        addView(previewView)
        startCamera()
    }

    private fun getOrCreateExecutor(): ExecutorService {
        if (cameraExecutor.isShutdown || cameraExecutor.isTerminated) {
            cameraExecutor = Executors.newSingleThreadExecutor()
        }
        return cameraExecutor
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun findLifecycleOwner(): LifecycleOwner? {
        (appContext.currentActivity as? LifecycleOwner)?.let { return it }

        var ctx: Context? = context
        while (ctx is ContextWrapper) {
            if (ctx is LifecycleOwner) return ctx
            ctx = ctx.baseContext
        }

        try {
            val viewTreeClass = Class.forName("androidx.lifecycle.ViewTreeLifecycleOwner")
            val getMethod = viewTreeClass.getMethod("get", android.view.View::class.java)
            val owner = getMethod.invoke(null, this) as? LifecycleOwner
            if (owner != null) return owner
        } catch (_: Throwable) {}

        return null
    }

    fun setActive(isActive: Boolean) {
        this.active = isActive
        if (isActive) {
            analyzer?.startCheck(challenges)
        } else {
            analyzer?.stopCheck()
        }
    }

    fun setLiveThreshold(threshold: Float) {
        this.liveThreshold = threshold
    }

    fun setSpoofThreshold(threshold: Float) {
        this.spoofThreshold = threshold
    }

    fun setRecognitionThreshold(threshold: Float) {
        this.recognitionThreshold = threshold
        analyzer?.matchThreshold = threshold
    }

    fun setMode(mode: String) {
        this.mode = mode
        analyzer?.mode = mode
    }

    fun setEnrolledProfiles(profiles: List<Map<String, Any>>) {
        this.enrolledProfiles = profiles.mapNotNull { map ->
            try {
                val id = map["id"] as? String ?: return@mapNotNull null
                val name = map["name"] as? String ?: id
                val rawEmb = map["embedding"] as? List<*> ?: return@mapNotNull null
                val floatArray = FloatArray(rawEmb.size) { i ->
                    (rawEmb[i] as? Number)?.toFloat() ?: 0f
                }
                EnrolledProfile(id, name, floatArray)
            } catch (e: Exception) {
                Log.w(TAG, "Error parsing enrolled profile: ${e.message}")
                null
            }
        }
        analyzer?.enrolledProfiles = this.enrolledProfiles
    }

    fun setCustomModelPath(path: String?) {
        this.customModelPath = path
        classifier?.close()
        classifier = MiniFASNetClassifier(context, customModelPath)
    }

    fun setSecurityLevel(level: String) {
        when (level.lowercase()) {
            "relaxed" -> {
                this.liveThreshold = 0.40f
                this.recognitionThreshold = 0.68f
            }
            "strict" -> {
                this.liveThreshold = 0.65f
                this.recognitionThreshold = 0.78f
            }
            else -> {
                this.liveThreshold = 0.50f
                this.recognitionThreshold = 0.72f
            }
        }
        analyzer?.matchThreshold = this.recognitionThreshold
    }

    fun setChallenges(challengeNames: List<String>) {
        this.challenges = challengeNames.mapNotNull { name ->
            when (name.lowercase()) {
                "turn_head_left", "turn_left" -> ChallengeType.TURN_HEAD_LEFT
                "turn_head_right", "turn_right" -> ChallengeType.TURN_HEAD_RIGHT
                "nod_head", "nod" -> ChallengeType.NOD_HEAD
                "blink" -> ChallengeType.BLINK
                "smile" -> ChallengeType.SMILE
                else -> null
            }
        }
    }

    fun startCheck() {
        setActive(true)
    }

    fun stopCheck() {
        setActive(false)
    }

    fun reset() {
        analyzer?.reset()
    }

    private fun startCamera() {
        if (!hasCameraPermission()) {
            Log.w(TAG, "Camera permission not yet granted; deferring CameraX binding")
            return
        }

        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize ProcessCameraProvider: ${e.message}", e)
                onError(mapOf("code" to "CAMERA_INIT_FAILED", "message" to (e.message ?: "Camera initialization failed")))
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: run {
            startCamera()
            return
        }

        if (!hasCameraPermission()) {
            Log.w(TAG, "Cannot bind camera use cases: CAMERA permission missing")
            return
        }

        val lifecycleOwner = findLifecycleOwner()
        if (lifecycleOwner == null) {
            Log.w(TAG, "LifecycleOwner not yet available; retrying when attached")
            post {
                if (!isCameraBound) {
                    bindCameraUseCases()
                }
            }
            return
        }

        if (classifier == null) {
            classifier = MiniFASNetClassifier(context, customModelPath)
        }

        if (recognizer == null) {
            recognizer = MobileFaceNetRecognizer(context)
        }

        if (analyzer == null) {
            analyzer = FaceLivenessAnalyzer(
                classifier = classifier!!,
                recognizer = recognizer,
                liveThreshold = liveThreshold,
                spoofThreshold = spoofThreshold,
                listener = this
            ).apply {
                this.enrolledProfiles = this@FaceLivenessCameraView.enrolledProfiles
                this.matchThreshold = this@FaceLivenessCameraView.recognitionThreshold
                this.mode = this@FaceLivenessCameraView.mode
            }
        }

        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(previewView.surfaceProvider)
        }

        val imageAnalysisBuilder = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)

        try {
            val extender = Camera2Interop.Extender(imageAnalysisBuilder)
            extender.setCaptureRequestOption(CaptureRequest.NOISE_REDUCTION_MODE, CaptureRequest.NOISE_REDUCTION_MODE_FAST)
            extender.setCaptureRequestOption(CaptureRequest.EDGE_MODE, CaptureRequest.EDGE_MODE_FAST)
            extender.setCaptureRequestOption(CaptureRequest.CONTROL_SCENE_MODE, CaptureRequest.CONTROL_SCENE_MODE_DISABLED)
        } catch (e: Throwable) {
            Log.w(TAG, "Camera2Interop options not supported on this device: ${e.message}")
        }

        val imageAnalysis = imageAnalysisBuilder.build().also {
            it.setAnalyzer(getOrCreateExecutor(), analyzer!!)
        }

        // Prefer front-facing camera for face liveness, fallback to default camera
        val cameraSelector = if (provider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)) {
            CameraSelector.DEFAULT_FRONT_CAMERA
        } else if (provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)) {
            Log.w(TAG, "Front camera not found; falling back to back camera")
            CameraSelector.DEFAULT_BACK_CAMERA
        } else {
            CameraSelector.DEFAULT_FRONT_CAMERA
        }

        try {
            provider.unbindAll()
            provider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageAnalysis)
            isCameraBound = true
            Log.d(TAG, "CameraX successfully bound to lifecycle")

            // If check was requested before camera finished binding, start it now
            if (this.active) {
                analyzer?.startCheck(challenges)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Camera use case binding failed: ${e.message}", e)
            isCameraBound = false
            onError(mapOf("code" to "CAMERA_BIND_FAILED", "message" to (e.message ?: "Failed to bind camera use cases")))
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        getOrCreateExecutor()
        if (!isCameraBound) {
            post {
                bindCameraUseCases()
            }
        }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        val width = right - left
        val height = bottom - top
        previewView.measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        previewView.layout(0, 0, width, height)
    }

    override fun requestLayout() {
        super.requestLayout()
        post(measureAndLayout)
    }

    private val measureAndLayout = Runnable {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        try {
            analyzer?.stopCheck()
            cameraProvider?.unbindAll()
            isCameraBound = false
            recognizer?.close()
            recognizer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error unbinding camera use cases on detach", e)
        }
    }

    override fun onFaceStatus(status: FaceStatus, bounds: Rect?, yaw: Float, pitch: Float) {
        val payload = mutableMapOf<String, Any>(
            "status" to status.value,
            "yaw" to yaw,
            "pitch" to pitch
        )
        if (bounds != null) {
            payload["bounds"] = mapOf<String, Any>(
                "left" to bounds.left,
                "top" to bounds.top,
                "right" to bounds.right,
                "bottom" to bounds.bottom,
                "width" to bounds.width(),
                "height" to bounds.height()
            )
        }
        onFaceStatusChanged(payload)
    }

    override fun onProgress(data: LivenessProgressData) {
        onLivenessProgress(
            mapOf<String, Any>(
                "currentSample" to data.currentSample,
                "totalSamples" to data.totalSamples,
                "activeChallenge" to data.activeChallenge.value,
                "challengeProgress" to data.challengeProgress,
                "faceStatus" to data.faceStatus.value
            )
        )
    }

    override fun onResult(result: LivenessResultData) {
        val payload = mutableMapOf<String, Any>(
            "status" to result.status.value,
            "score" to result.score,
            "confidence" to result.confidence,
            "passiveScore" to result.passiveScore,
            "challengePassed" to result.challengePassed,
            "samplesCollected" to result.samplesCollected,
            "durationMs" to result.durationMs,
            "isMatch" to result.isMatch,
            "similarity" to result.similarity
        )
        if (result.errorCode != null) {
            payload["errorCode"] = result.errorCode
        }
        if (result.embedding != null) {
            payload["embedding"] = result.embedding
        }
        if (result.matchedUserId != null) {
            payload["matchedUserId"] = result.matchedUserId
        }
        if (result.matchedUserName != null) {
            payload["matchedUserName"] = result.matchedUserName
        }
        onLivenessResult(payload)
    }

    override fun onError(code: String, message: String) {
        onError(
            mapOf(
                "code" to code,
                "message" to message
            )
        )
    }

    companion object {
        private const val TAG = "FaceLivenessCameraView"
    }
}
