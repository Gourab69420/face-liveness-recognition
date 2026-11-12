package expo.modules.faceliveness

import android.Manifest
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoFaceLivenessModule : Module() {

    private val keyStore by lazy { FaceLivenessKeyStore() }

    override fun definition() = ModuleDefinition {
        Name("ExpoFaceLiveness")

        Function("isAvailable") {
            true
        }

        AsyncFunction("getCameraPermissionsAsync") { promise: Promise ->
            Permissions.getPermissionsWithPermissionsManager(
                appContext.permissions,
                promise,
                Manifest.permission.CAMERA
            )
        }

        AsyncFunction("requestCameraPermissionsAsync") { promise: Promise ->
            Permissions.askForPermissionsWithPermissionsManager(
                appContext.permissions,
                promise,
                Manifest.permission.CAMERA
            )
        }

        // ====================================================================
        // Android Keystore Key Management
        // ====================================================================

        Function("generateSigningKey") { alias: String ->
            val metadata = keyStore.generateSigningKey(alias)
            mapOf(
                "alias" to metadata.alias,
                "publicKey" to metadata.publicKey,
                "algorithm" to metadata.algorithm,
                "isHardwareBacked" to metadata.isHardwareBacked,
                "isStrongBoxBacked" to metadata.isStrongBoxBacked
            )
        }

        Function("getSigningPublicKey") { alias: String ->
            val metadata = keyStore.getKeyMetadata(alias) ?: return@Function null
            mapOf(
                "alias" to metadata.alias,
                "publicKey" to metadata.publicKey,
                "algorithm" to metadata.algorithm,
                "isHardwareBacked" to metadata.isHardwareBacked,
                "isStrongBoxBacked" to metadata.isStrongBoxBacked
            )
        }

        Function("signPayload") { alias: String, payload: String ->
            keyStore.signPayload(alias, payload)
        }

        Function("hasSigningKey") { alias: String ->
            keyStore.hasKey(alias)
        }

        Function("deleteSigningKey") { alias: String ->
            keyStore.deleteKey(alias)
        }

        Function("getRandomBytes") { byteLength: Int ->
            val bytes = ByteArray(byteLength)
            java.security.SecureRandom().nextBytes(bytes)
            android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
        }

        Function("getRandomBytesHex") { byteLength: Int ->
            val bytes = ByteArray(byteLength)
            java.security.SecureRandom().nextBytes(bytes)
            bytes.joinToString("") { "%02x".format(it) }
        }

        // ====================================================================
        // Camera View Component
        // ====================================================================

        View(FaceLivenessCameraView::class) {
            Events(
                "onFaceStatusChanged",
                "onLivenessProgress",
                "onLivenessResult",
                "onError"
            )

            Prop("active") { view: FaceLivenessCameraView, active: Boolean ->
                view.setActive(active)
            }

            Prop("liveThreshold") { view: FaceLivenessCameraView, threshold: Double ->
                view.setLiveThreshold(threshold.toFloat())
            }

            Prop("spoofThreshold") { view: FaceLivenessCameraView, threshold: Double ->
                view.setSpoofThreshold(threshold.toFloat())
            }

            Prop("recognitionThreshold") { view: FaceLivenessCameraView, threshold: Double ->
                view.setRecognitionThreshold(threshold.toFloat())
            }

            Prop("securityLevel") { view: FaceLivenessCameraView, level: String ->
                view.setSecurityLevel(level)
            }

            Prop("mode") { view: FaceLivenessCameraView, mode: String ->
                view.setMode(mode)
            }

            Prop("enrolledProfiles") { view: FaceLivenessCameraView, profiles: List<Map<String, Any>> ->
                view.setEnrolledProfiles(profiles)
            }

            Prop("customModelPath") { view: FaceLivenessCameraView, path: String? ->
                view.setCustomModelPath(path)
            }

            Prop("challenges") { view: FaceLivenessCameraView, challenges: List<String> ->
                view.setChallenges(challenges)
            }

            AsyncFunction("startCheck") { view: FaceLivenessCameraView ->
                view.startCheck()
            }

            AsyncFunction("stopCheck") { view: FaceLivenessCameraView ->
                view.stopCheck()
            }

            AsyncFunction("reset") { view: FaceLivenessCameraView ->
                view.reset()
            }
        }
    }
}
