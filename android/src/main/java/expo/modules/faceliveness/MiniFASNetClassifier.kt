package expo.modules.faceliveness

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Rect
import android.util.Log
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.exp
import kotlin.math.max

data class ClassifierOutput(
    val liveScore: Float,
    val isArgmaxLive: Boolean,
    val probabilities: FloatArray
)

class MiniFASNetClassifier(
    private val context: Context,
    private val customModelPath: String? = null
) {
    private var interpreter: Interpreter? = null
    private val inputWidth = 80
    private val inputHeight = 80

    // Pre-allocated reusable buffers for zero GC churn during inference
    private val reusableBuffer: ByteBuffer = ByteBuffer.allocateDirect(1 * 3 * inputWidth * inputHeight * 4).apply {
        order(ByteOrder.nativeOrder())
    }
    private val reusablePixels = IntArray(inputWidth * inputHeight)
    private val reusableOutput = Array(1) { FloatArray(3) }

    init {
        getOrInitInterpreter()
    }

    @Synchronized
    private fun getOrInitInterpreter(): Interpreter? {
        if (interpreter == null) {
            try {
                val modelBuffer = loadModelFile()
                val cores = Runtime.getRuntime().availableProcessors()
                val optimalThreads = if (cores <= 4) 2 else 4
                val options = Interpreter.Options().apply {
                    setNumThreads(optimalThreads)
                    setUseXNNPACK(true)
                }
                interpreter = Interpreter(modelBuffer, options)
                Log.d(TAG, "TFLite MiniFASNet interpreter initialized with XNNPACK on $optimalThreads threads")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize TFLite interpreter: ${e.message}", e)
            }
        }
        return interpreter
    }

    private fun loadModelFile(): MappedByteBuffer {
        if (!customModelPath.isNullOrEmpty()) {
            val file = File(customModelPath)
            if (file.exists()) {
                val inputStream = FileInputStream(file)
                val fileChannel = inputStream.channel
                return fileChannel.map(FileChannel.MapMode.READ_ONLY, 0, fileChannel.size())
            } else {
                Log.w(TAG, "Custom model path not found ($customModelPath), falling back to bundled asset")
            }
        }

        // Bundled asset fallback
        val assetFileDescriptor = context.assets.openFd(DEFAULT_MODEL_ASSET)
        val inputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = assetFileDescriptor.startOffset
        val declaredLength = assetFileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    /**
     * Executes inference on the detected face patch.
     * Face crop is expanded by [scaleFactor] (2.7x) and resized to 80x80.
     * CLAHE illumination enhancement is applied directly to the 80x80 crop (sub-millisecond).
     */
    fun classify(bitmap: Bitmap, faceRect: Rect, scaleFactor: Float = 2.7f): ClassifierOutput? {
        val currentInterpreter = getOrInitInterpreter() ?: return null

        val croppedFace = BitmapUtils.cropAndScaleFace(
            bitmap = bitmap,
            faceRect = faceRect,
            scaleFactor = scaleFactor,
            targetWidth = inputWidth,
            targetHeight = inputHeight
        )

        // Apply illumination enhancement on the 80x80 face patch (instant, avoids full frame)
        val enhancedFace = OpenCVUtils.enhanceIllumination(croppedFace)

        val inputBuffer = BitmapUtils.bitmapToBgrNchwBuffer(
            bitmap = enhancedFace,
            targetBuffer = reusableBuffer,
            reusablePixels = reusablePixels
        )

        if (enhancedFace != croppedFace && enhancedFace != bitmap) {
            enhancedFace.recycle()
        }
        if (croppedFace != bitmap) {
            croppedFace.recycle()
        }

        currentInterpreter.run(inputBuffer, reusableOutput)

        val raw = reusableOutput[0]
        // Determine whether model output is already softmax probabilities or raw logits
        val isAlreadySoftmax = (raw.all { it >= 0f } && kotlin.math.abs(raw.sum() - 1.0f) < 0.05f)
        val probs = if (isAlreadySoftmax) raw else softmax(raw)

        // In Silent-Face-Anti-Spoofing (MiniFASNet) 3-class models:
        // Index 0: 2D Paper photo spoof
        // Index 1: 2D Screen replay spoof
        // Index 2: Real / Live 3D face
        val liveIndex = if (probs.size > 2) 2 else 1
        val liveScore = probs[liveIndex]
        val argmaxIndex = argmax(probs)
        val isLive = (argmaxIndex == liveIndex)

        Log.d(TAG, "Inference raw=[${raw.joinToString()}], probs=[${probs.joinToString()}], liveScore=$liveScore, isLive=$isLive")

        return ClassifierOutput(
            liveScore = liveScore,
            isArgmaxLive = isLive,
            probabilities = probs.clone()
        )
    }

    private fun softmax(logits: FloatArray): FloatArray {
        var maxVal = logits[0]
        for (v in logits) {
            if (v > maxVal) maxVal = v
        }

        val exps = FloatArray(logits.size)
        var sum = 0f
        for (i in logits.indices) {
            exps[i] = exp((logits[i] - maxVal).toDouble()).toFloat()
            sum += exps[i]
        }

        for (i in exps.indices) {
            exps[i] = if (sum > 0f) exps[i] / sum else 0f
        }
        return exps
    }

    private fun argmax(array: FloatArray): Int {
        var maxIndex = 0
        var maxValue = array[0]
        for (i in 1 until array.size) {
            if (array[i] > maxValue) {
                maxValue = array[i]
                maxIndex = i
            }
        }
        return maxIndex
    }

    fun close() {
        try {
            interpreter?.close()
            interpreter = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing TFLite interpreter", e)
        }
    }

    companion object {
        private const val TAG = "MiniFASNetClassifier"
        const val DEFAULT_MODEL_ASSET = "silentface.tflite"
    }
}
