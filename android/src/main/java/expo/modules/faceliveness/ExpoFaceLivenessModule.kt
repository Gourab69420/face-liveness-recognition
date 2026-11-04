package expo.modules.faceliveness

import android.Manifest
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoFaceLivenessModule : Module() {

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
