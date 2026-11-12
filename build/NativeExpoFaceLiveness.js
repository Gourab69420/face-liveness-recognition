"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeFaceLivenessView = exports.NativeFaceLivenessModule = void 0;
const react_native_1 = require("react-native");
const expo_modules_core_1 = require("expo-modules-core");
const random_1 = require("./crypto/random");
let nativeModule = null;
let nativeView = null;
if (react_native_1.Platform.OS === 'android') {
    try {
        nativeModule = (0, expo_modules_core_1.requireNativeModule)('ExpoFaceLiveness');
        nativeView = (0, expo_modules_core_1.requireNativeViewManager)('ExpoFaceLiveness');
        if (nativeModule) {
            (0, random_1.registerEntropyProvider)((byteLength) => {
                try {
                    if (typeof nativeModule?.getRandomBytesHex === 'function') {
                        const hex = nativeModule.getRandomBytesHex(byteLength);
                        if (hex && typeof hex === 'string') {
                            return (0, random_1.hexToBytes)(hex);
                        }
                    }
                    if (typeof nativeModule?.getRandomBytes === 'function') {
                        const b64 = nativeModule.getRandomBytes(byteLength);
                        if (b64 && typeof b64 === 'string') {
                            const decoded = (0, random_1.decodeBase64ToBytes)(b64);
                            if (decoded.length === byteLength) {
                                return decoded;
                            }
                        }
                    }
                }
                catch {
                    return null;
                }
                return null;
            });
        }
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
    generateSigningKey(_alias) {
        throw new Error('[face-liveness-recognition] Android Keystore is only available on native Android builds.');
    },
    getSigningPublicKey(_alias) {
        return null;
    },
    signPayload(_alias, _payload) {
        throw new Error('[face-liveness-recognition] Android Keystore is only available on native Android builds.');
    },
    hasSigningKey(_alias) {
        return false;
    },
    deleteSigningKey(_alias) {
        return false;
    },
};
exports.NativeFaceLivenessView = nativeView;
//# sourceMappingURL=NativeExpoFaceLiveness.js.map