package expo.modules.faceliveness

import android.graphics.Bitmap
import android.graphics.Matrix
import android.graphics.Rect
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min

object BitmapUtils {

    /**
     * Crops a face patch from a bitmap expanded by [scaleFactor] (default 2.7x as required by MiniFASNet)
     * and resizes it to [targetWidth] x [targetHeight] (80x80), keeping a square 1:1 aspect ratio.
     */
    fun cropAndScaleFace(
        bitmap: Bitmap,
        faceRect: Rect,
        scaleFactor: Float = 2.7f,
        targetWidth: Int = 80,
        targetHeight: Int = 80
    ): Bitmap {
        val centerX = faceRect.centerX().toFloat()
        val centerY = faceRect.centerY().toFloat()

        val width = faceRect.width().toFloat()
        val height = faceRect.height().toFloat()

        val boxSize = max(width, height) * scaleFactor
        val halfBox = boxSize / 2f

        var left = (centerX - halfBox).toInt()
        var top = (centerY - halfBox).toInt()
        var right = (centerX + halfBox).toInt()
        var bottom = (centerY + halfBox).toInt()

        // Shift box within frame boundaries to preserve square face area
        if (left < 0) {
            right = min(bitmap.width, right - left)
            left = 0
        }
        if (top < 0) {
            bottom = min(bitmap.height, bottom - top)
            top = 0
        }
        if (right > bitmap.width) {
            left = max(0, left - (right - bitmap.width))
            right = bitmap.width
        }
        if (bottom > bitmap.height) {
            top = max(0, top - (bottom - bitmap.height))
            bottom = bitmap.height
        }

        val cropWidth = max(1, right - left)
        val cropHeight = max(1, bottom - top)
        val squareSize = min(cropWidth, cropHeight)

        val cropped = Bitmap.createBitmap(bitmap, left, top, squareSize, squareSize)
        val scaled = Bitmap.createScaledBitmap(cropped, targetWidth, targetHeight, true)

        if (cropped != scaled && cropped != bitmap) {
            cropped.recycle()
        }

        return scaled
    }

    /**
     * Converts an 80x80 bitmap into an NCHW [1, 3, 80, 80] Float32 ByteBuffer
     * with BGR color order and pixel / 255.0 normalization as required by MiniFASNet.
     */
    fun bitmapToBgrNchwBuffer(bitmap: Bitmap): ByteBuffer {
        val width = bitmap.width
        val height = bitmap.height

        // 1 * 3 * width * height * 4 bytes per float
        val byteBuffer = ByteBuffer.allocateDirect(1 * 3 * width * height * 4).apply {
            order(ByteOrder.nativeOrder())
            rewind()
        }

        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        // MiniFASNet NCHW layout:
        // Channel 0: Blue
        // Channel 1: Green
        // Channel 2: Red
        val numPixels = width * height
        val blueChannel = FloatArray(numPixels)
        val greenChannel = FloatArray(numPixels)
        val redChannel = FloatArray(numPixels)

        for (i in 0 until numPixels) {
            val pixel = pixels[i]
            val r = ((pixel shr 16) and 0xFF) / 255.0f
            val g = ((pixel shr 8) and 0xFF) / 255.0f
            val b = (pixel and 0xFF) / 255.0f

            blueChannel[i] = b
            greenChannel[i] = g
            redChannel[i] = r
        }

        // Write Channel 0 (Blue)
        for (i in 0 until numPixels) {
            byteBuffer.putFloat(blueChannel[i])
        }
        // Write Channel 1 (Green)
        for (i in 0 until numPixels) {
            byteBuffer.putFloat(greenChannel[i])
        }
        // Write Channel 2 (Red)
        for (i in 0 until numPixels) {
            byteBuffer.putFloat(redChannel[i])
        }

        byteBuffer.rewind()
        return byteBuffer
    }

    /**
     * Rotates and optionally mirrors a bitmap.
     */
    fun rotateBitmap(bitmap: Bitmap, rotationDegrees: Int, mirror: Boolean = false): Bitmap {
        if (rotationDegrees == 0 && !mirror) return bitmap

        val matrix = Matrix()
        if (mirror) {
            matrix.postScale(-1f, 1f)
        }
        if (rotationDegrees != 0) {
            matrix.postRotate(rotationDegrees.toFloat())
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }
}
