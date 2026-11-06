# Proguard / R8 consumer rules for face-liveness-recognition
# Protects native JNI entry points and reflection during production release builds.

# TensorFlow Lite
-keep class org.tensorflow.lite.** { *; }
-dontwarn org.tensorflow.lite.**

# OpenCV Android SDK
-keep class org.opencv.** { *; }
-dontwarn org.opencv.**

# Google ML Kit Face Detection
-keep class com.google.mlkit.vision.face.** { *; }
-keep class com.google.android.gms.vision.** { *; }
-dontwarn com.google.mlkit.**

# AndroidX CameraX
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# Expo Face Liveness module classes and JNI bridges
-keep class expo.modules.faceliveness.** { *; }
-dontwarn expo.modules.faceliveness.**
