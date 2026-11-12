package expo.modules.faceliveness

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

data class RecognitionResult(
    val embedding: FloatArray,
    val isMatch: Boolean,
    val matchedUserId: String?,
    val matchedUserName: String?,
    val similarity: Float // 0.0f to 1.0f
)

data class EnrolledProfile(
    val id: String,
    val name: String,
    val embedding: FloatArray
)

class MobileFaceNetRecognizer(private val context: Context) : AutoCloseable {

    private var interpreter: Interpreter? = null
    private val embeddingSize = 192
    private val inputSize = 112

    // Pre-allocated reusable buffers for zero GC churn during inference
    private val reusableBuffer: ByteBuffer = ByteBuffer.allocateDirect(1 * inputSize * inputSize * 3 * 4).apply {
        order(ByteOrder.nativeOrder())
    }
    private val reusablePixels = IntArray(inputSize * inputSize)
    private val reusableOutput = Array(1) { FloatArray(embeddingSize) }

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
                Log.i(TAG, "MobileFaceNet 192-D face recognition interpreter initialized with XNNPACK on $optimalThreads threads")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize MobileFaceNet interpreter: ${e.message}", e)
            }
        }
        return interpreter
    }

    private fun loadModelFile(): ByteBuffer {
        val assetFileDescriptor = context.assets.openFd("mobilefacenet.tflite")
        val inputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = assetFileDescriptor.startOffset
        val declaredLength = assetFileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    /**
     * Extracts a 192-dimensional L2-normalized face embedding from a 112x112 aligned face bitmap.
     * Uses pre-allocated direct buffers for zero memory churn.
     */
    fun extractEmbedding(alignedFace: Bitmap): FloatArray? {
        val currentInterpreter = getOrInitInterpreter() ?: return null

        val scaled = if (alignedFace.width != inputSize || alignedFace.height != inputSize) {
            Bitmap.createScaledBitmap(alignedFace, inputSize, inputSize, true)
        } else {
            alignedFace
        }

        reusableBuffer.rewind()
        scaled.getPixels(reusablePixels, 0, inputSize, 0, 0, inputSize, inputSize)

        for (i in 0 until (inputSize * inputSize)) {
            val pixel = reusablePixels[i]
            val r = (((pixel shr 16) and 0xFF) - 127.5f) / 128.0f
            val g = (((pixel shr 8) and 0xFF) - 127.5f) / 128.0f
            val b = ((pixel and 0xFF) - 127.5f) / 128.0f

            reusableBuffer.putFloat(r)
            reusableBuffer.putFloat(g)
            reusableBuffer.putFloat(b)
        }

        if (scaled != alignedFace) {
            scaled.recycle()
        }

        currentInterpreter.run(reusableBuffer, reusableOutput)

        // Perform L2 Normalization so dot product == cosine similarity
        val rawEmbedding = reusableOutput[0]
        var normSum = 0f
        for (v in rawEmbedding) {
            normSum += v * v
        }
        val norm = sqrt(normSum.toDouble()).toFloat()

        val normalizedEmbedding = FloatArray(embeddingSize)
        if (norm > 0f) {
            for (i in 0 until embeddingSize) {
                normalizedEmbedding[i] = rawEmbedding[i] / norm
            }
        }

        return normalizedEmbedding
    }

    /**
     * Compares a query face embedding with a list of enrolled profiles using Cosine Similarity.
     * Matches the profile with the highest similarity exceeding [matchThreshold] (default 0.72f).
     */
    fun match(
        queryEmbedding: FloatArray,
        enrolledProfiles: List<EnrolledProfile>,
        matchThreshold: Float = 0.72f
    ): RecognitionResult {
        var bestSimilarity = -1.0f
        var bestProfile: EnrolledProfile? = null

        for (profile in enrolledProfiles) {
            val sim = cosineSimilarity(queryEmbedding, profile.embedding)
            if (sim > bestSimilarity) {
                bestSimilarity = sim
                bestProfile = profile
            }
        }

        val isMatch = bestProfile != null && bestSimilarity >= matchThreshold

        return RecognitionResult(
            embedding = queryEmbedding,
            isMatch = isMatch,
            matchedUserId = if (isMatch) bestProfile?.id else null,
            matchedUserName = if (isMatch) bestProfile?.name else null,
            similarity = if (bestProfile != null) bestSimilarity else 0f
        )
    }

    /**
     * Dot product of two L2-normalized vectors equals cosine similarity.
     */
    fun cosineSimilarity(vecA: FloatArray, vecB: FloatArray): Float {
        if (vecA.size != vecB.size) return 0f
        var dot = 0f
        for (i in vecA.indices) {
            dot += vecA[i] * vecB[i]
        }
        return dot
    }

    override fun close() {
        try {
            interpreter?.close()
            interpreter = null
        } catch (_: Exception) {}
    }

    companion object {
        private const val TAG = "MobileFaceNetRecognizer"
    }
}
