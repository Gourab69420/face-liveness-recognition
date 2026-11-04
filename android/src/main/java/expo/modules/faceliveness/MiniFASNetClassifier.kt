package expo.modules.faceliveness

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Rect
import android.util.Log
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
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

    init {
        initInterpreter()
    }

    private fun initInterpreter() {
        try {
            val modelBuffer = loadModelFile()
            val options = Interpreter.Options().apply {
                setNumThreads(4)
                useNNAPI = false
            }
            interpreter = Interpreter(modelBuffer, options)
            Log.d(TAG, "TFLite MiniFASNet interpreter initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize TFLite interpreter: ${e.message}", e)
        }
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
     */
    fun classify(bitmap: Bitmap, faceRect: Rect, scaleFactor: Float = 2.7f): ClassifierOutput? {
        val currentInterpreter = interpreter ?: return null

        val croppedFace = BitmapUtils.cropAndScaleFace(
            bitmap = bitmap,
            faceRect = faceRect,
            scaleFactor = scaleFactor,
            targetWidth = 80,
            targetHeight = 80
        )

        val inputBuffer = BitmapUtils.bitmapToBgrNchwBuffer(croppedFace)
        if (croppedFace != bitmap) {
            croppedFace.recycle()
        }

        // Output tensor shape: [1, 3]
        val outputArray = Array(1) { FloatArray(3) }
        currentInterpreter.run(inputBuffer, outputArray)

        val raw = outputArray[0]
        // Determine whether model output is already softmax probabilities or raw logits
        val isAlreadySoftmax = (raw.all { it >= 0f } && kotlin.math.abs(raw.sum() - 1.0f) < 0.05f)
        val probs = if (isAlreadySoftmax) raw else softmax(raw)

        // MiniFASNet class 1 is Live/Real face. Classes 0 and 2 are Presentation Attack / Spoof.
        val liveScore = probs[1]
        val argmaxIndex = argmax(probs)

        Log.d(TAG, "Inference raw=[${raw[0]}, ${raw[1]}, ${raw[2]}], probs=[${probs[0]}, ${probs[1]}, ${probs[2]}], liveScore=$liveScore, isLive=${argmaxIndex == 1}")

        return ClassifierOutput(
            liveScore = liveScore,
            isArgmaxLive = (argmaxIndex == 1),
            probabilities = probs
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
