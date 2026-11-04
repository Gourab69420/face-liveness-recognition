"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeFaceLivenessView = exports.NativeFaceLivenessModule = void 0;
const react_native_1 = require("react-native");
const expo_modules_core_1 = require("expo-modules-core");
let nativeModule = null;
let nativeView = null;
if (react_native_1.Platform.OS === 'android') {
    try {
        nativeModule = (0, expo_modules_core_1.requireNativeModule)('ExpoFaceLiveness');
        nativeView = (0, expo_modules_core_1.requireNativeViewManager)('ExpoFaceLiveness');
    }
    catch (error) {
        console.warn('[expo-face-liveness] Native module is unavailable. Ensure you are running an Android development build (Expo Prebuild / EAS Build), not Expo Go.', error);
    }
}
exports.NativeFaceLivenessModule = nativeModule ?? {
    isAvailable() {
        return false;
    },
    async getCameraPermissionsAsync() {
        return { status: 'undetermined', granted: false, canAskAgain: false };
    },
    async requestCameraPermissionsAsync() {
        console.warn('[expo-face-liveness] Native module is only supported on Android native builds.');
        return { status: 'denied', granted: false, canAskAgain: false };
    },
};
exports.NativeFaceLivenessView = nativeView;
//# sourceMappingURL=NativeExpoFaceLiveness.js.map