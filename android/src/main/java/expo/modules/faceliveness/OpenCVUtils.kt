package expo.modules.faceliveness

import android.graphics.Bitmap
import android.graphics.PointF
import android.util.Log
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.*
import org.opencv.imgproc.Imgproc
import kotlin.math.atan2

object OpenCVUtils {

    private const val TAG = "OpenCVUtils"
    private var isInitialized = false

    fun init(): Boolean {
        if (isInitialized) return true
        isInitialized = try {
            if (OpenCVLoader.initLocal()) {
                Log.i(TAG, "OpenCV initialized successfully via initLocal()")
                true
            } else {
                Log.w(TAG, "OpenCVLoader.initLocal() returned false")
                false
            }
        } catch (e: Throwable) {
            Log.e(TAG, "Error initializing OpenCV: ${e.message}", e)
            false
        }
        return isInitialized
    }

    /**
     * Applies Contrast-Limited Adaptive Histogram Equalization (CLAHE) on the luminance channel
     * to normalize harsh shadows, low light, and uneven exposure across the face.
     */
    fun enhanceIllumination(srcBitmap: Bitmap): Bitmap {
        if (!init()) return srcBitmap

        return try {
            val srcMat = Mat()
            Utils.bitmapToMat(srcBitmap, srcMat)

            // Convert to YCrCb color space to process luminance (Y) independently of chroma
            val ycrcbMat = Mat()
            Imgproc.cvtColor(srcMat, ycrcbMat, Imgproc.COLOR_RGBA2RGB)
            Imgproc.cvtColor(ycrcbMat, ycrcbMat, Imgproc.COLOR_RGB2YCrCb)

            val channels = ArrayList<Mat>(3)
            Core.split(ycrcbMat, channels)

            // Apply CLAHE on Y (luminance) channel
            val clahe = Imgproc.createCLAHE(2.0, Size(8.0, 8.0))
            val enhancedY = Mat()
            clahe.apply(channels[0], enhancedY)
            channels[0] = enhancedY

            val mergedYcrcb = Mat()
            Core.merge(channels, mergedYcrcb)

            val dstMat = Mat()
            Imgproc.cvtColor(mergedYcrcb, dstMat, Imgproc.COLOR_YCrCb2RGB)
            Imgproc.cvtColor(dstMat, dstMat, Imgproc.COLOR_RGB2RGBA)

            val enhancedBitmap = Bitmap.createBitmap(srcBitmap.width, srcBitmap.height, Bitmap.Config.ARGB_8888)
            Utils.matToBitmap(dstMat, enhancedBitmap)

            // Cleanup Mats
            srcMat.release()
            ycrcbMat.release()
            enhancedY.release()
            mergedYcrcb.release()
            dstMat.release()
            for (ch in channels) ch.release()

            enhancedBitmap
        } catch (e: Exception) {
            Log.w(TAG, "OpenCV illumination enhancement fallback: ${e.message}")
            srcBitmap
        }
    }

    /**
     * Aligns a face horizontally using eye landmark coordinates via Affine transformation
     * and crops to [targetWidth] x [targetHeight] (e.g. 112x112 for MobileFaceNet).
     * Optionally applies CLAHE illumination enhancement directly to the 112x112 crop.
     */
    fun alignAndCropFace(
        srcBitmap: Bitmap,
        faceRect: android.graphics.Rect? = null,
        leftEye: PointF? = null,
        rightEye: PointF? = null,
        targetWidth: Int = 112,
        targetHeight: Int = 112,
        enhanceCropIllumination: Boolean = true
    ): Bitmap {
        val baseCropped = if (!init() || leftEye == null || rightEye == null || faceRect == null) {
            if (faceRect != null && faceRect.width() > 0 && faceRect.height() > 0) {
                BitmapUtils.cropAndScaleFace(
                    bitmap = srcBitmap,
                    faceRect = faceRect,
                    scaleFactor = 1.25f,
                    targetWidth = targetWidth,
                    targetHeight = targetHeight
                )
            } else {
                Bitmap.createScaledBitmap(srcBitmap, targetWidth, targetHeight, true)
            }
        } else {
            try {
                val dX = (rightEye.x - leftEye.x).toDouble()
                val dY = (rightEye.y - leftEye.y).toDouble()
                val angle = Math.toDegrees(Math.atan2(dY, dX))

                // Only rotate if eye tilt is moderate (-45 to +45 deg)
                if (kotlin.math.abs(angle) < 45.0 && kotlin.math.abs(angle) > 1.5) {
                    val eyeCenter = org.opencv.core.Point(
                        ((leftEye.x + rightEye.x) / 2.0),
                        ((leftEye.y + rightEye.y) / 2.0)
                    )

                    val srcMat = Mat()
                    Utils.bitmapToMat(srcBitmap, srcMat)

                    val rotMat = Imgproc.getRotationMatrix2D(eyeCenter, angle, 1.0)
                    val rotatedMat = Mat()
                    Imgproc.warpAffine(srcMat, rotatedMat, rotMat, srcMat.size())

                    val rotatedBitmap = Bitmap.createBitmap(srcBitmap.width, srcBitmap.height, Bitmap.Config.ARGB_8888)
                    Utils.matToBitmap(rotatedMat, rotatedBitmap)

                    srcMat.release()
                    rotMat.release()
                    rotatedMat.release()

                    val cropped = BitmapUtils.cropAndScaleFace(
                        bitmap = rotatedBitmap,
                        faceRect = faceRect,
                        scaleFactor = 1.25f,
                        targetWidth = targetWidth,
                        targetHeight = targetHeight
                    )
                    if (rotatedBitmap != srcBitmap) {
                        rotatedBitmap.recycle()
                    }
                    cropped
                } else {
                    BitmapUtils.cropAndScaleFace(srcBitmap, faceRect, 1.25f, targetWidth, targetHeight)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Eye alignment failed, falling back to standard crop: ${e.message}")
                BitmapUtils.cropAndScaleFace(srcBitmap, faceRect, 1.25f, targetWidth, targetHeight)
            }
        }

        return if (enhanceCropIllumination) {
            val enhanced = enhanceIllumination(baseCropped)
            if (enhanced != baseCropped && baseCropped != srcBitmap) {
                baseCropped.recycle()
            }
            enhanced
        } else {
            baseCropped
        }
    }

    /**
     * Computes the Laplacian variance to evaluate image blur/sharpness.
     * Evaluates directly on the face region of interest (ROI) if provided for maximum speed.
     */
    fun calculateSharpness(bitmap: Bitmap, roi: android.graphics.Rect? = null): Double {
        if (!init()) return 100.0
        return try {
            val srcMat = Mat()
            Utils.bitmapToMat(bitmap, srcMat)

            val targetMat = if (roi != null && roi.width() > 0 && roi.height() > 0) {
                val clampedX = kotlin.math.max(0, roi.left)
                val clampedY = kotlin.math.max(0, roi.top)
                val clampedW = kotlin.math.min(srcMat.cols() - clampedX, kotlin.math.max(1, roi.width()))
                val clampedH = kotlin.math.min(srcMat.rows() - clampedY, kotlin.math.max(1, roi.height()))
                Mat(srcMat, Rect(clampedX, clampedY, clampedW, clampedH))
            } else {
                srcMat
            }

            val grayMat = Mat()
            Imgproc.cvtColor(targetMat, grayMat, Imgproc.COLOR_RGBA2GRAY)

            val laplacianMat = Mat()
            Imgproc.Laplacian(grayMat, laplacianMat, CvType.CV_64F)

            val mean = MatOfDouble()
            val stddev = MatOfDouble()
            Core.meanStdDev(laplacianMat, mean, stddev)
            val std = stddev.toArray().getOrNull(0) ?: 0.0
            val variance = std * std

            if (targetMat != srcMat) {
                targetMat.release()
            }
            srcMat.release()
            grayMat.release()
            laplacianMat.release()

            variance
        } catch (e: Exception) {
            Log.w(TAG, "Error calculating sharpness: ${e.message}")
            100.0
        }
    }

    /**
     * Calculates the mean grayscale luminance across the bitmap or face ROI (0.0 to 255.0).
     */
    fun calculateLuminance(bitmap: Bitmap, roi: android.graphics.Rect? = null): Double {
        if (!init()) return 128.0
        return try {
            val srcMat = Mat()
            Utils.bitmapToMat(bitmap, srcMat)

            val targetMat = if (roi != null && roi.width() > 0 && roi.height() > 0) {
                val clampedX = kotlin.math.max(0, roi.left)
                val clampedY = kotlin.math.max(0, roi.top)
                val clampedW = kotlin.math.min(srcMat.cols() - clampedX, kotlin.math.max(1, roi.width()))
                val clampedH = kotlin.math.min(srcMat.rows() - clampedY, kotlin.math.max(1, roi.height()))
                Mat(srcMat, Rect(clampedX, clampedY, clampedW, clampedH))
            } else {
                srcMat
            }

            val grayMat = Mat()
            Imgproc.cvtColor(targetMat, grayMat, Imgproc.COLOR_RGBA2GRAY)

            val mean = Core.mean(grayMat)

            if (targetMat != srcMat) {
                targetMat.release()
            }
            srcMat.release()
            grayMat.release()

            mean.`val`[0]
        } catch (e: Exception) {
            Log.w(TAG, "Error calculating luminance: ${e.message}")
            128.0
        }
    }
}
