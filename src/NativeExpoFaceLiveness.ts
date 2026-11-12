import { Platform } from 'react-native';
import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import type { CameraPermissionResponse } from './types';
import { registerEntropyProvider, hexToBytes, decodeBase64ToBytes } from './crypto/random';

export interface NativeKeyMetadata {
  alias: string;
  publicKey: string;
  algorithm: 'ECDSA_P256_SHA256';
  isHardwareBacked: boolean;
  isStrongBoxBacked: boolean;
}

export interface ExpoFaceLivenessNativeModule {
  isAvailable(): boolean;
  getCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
  requestCameraPermissionsAsync(): Promise<CameraPermissionResponse>;

  // Android Keystore Key Management
  generateSigningKey(alias: string): NativeKeyMetadata;
  getSigningPublicKey(alias: string): NativeKeyMetadata | null;
  signPayload(alias: string, payload: string): string;
  hasSigningKey(alias: string): boolean;
  deleteSigningKey(alias: string): boolean;
  getRandomBytes?(byteLength: number): string;
  getRandomBytesHex?(byteLength: number): string;
}

let nativeModule: ExpoFaceLivenessNativeModule | null = null;
let nativeView: any = null;

if (Platform.OS === 'android') {
  try {
    nativeModule = requireNativeModule<ExpoFaceLivenessNativeModule>('ExpoFaceLiveness');
    nativeView = requireNativeViewManager('ExpoFaceLiveness');

    if (nativeModule) {
      registerEntropyProvider((byteLength: number) => {
        try {
          if (typeof nativeModule?.getRandomBytesHex === 'function') {
            const hex = nativeModule.getRandomBytesHex(byteLength);
            if (hex && typeof hex === 'string') {
              return hexToBytes(hex);
            }
          }
          if (typeof nativeModule?.getRandomBytes === 'function') {
            const b64 = nativeModule.getRandomBytes(byteLength);
            if (b64 && typeof b64 === 'string') {
              const decoded = decodeBase64ToBytes(b64);
              if (decoded.length === byteLength) {
                return decoded;
              }
            }
          }
        } catch {
          return null;
        }
        return null;
      });
    }
  } catch (error) {
    console.warn(
      '[expo-face-liveness] Native module is unavailable. Ensure you are running an Android development build (Expo Prebuild / EAS Build), not Expo Go.',
      error
    );
  }
}

export const NativeFaceLivenessModule: ExpoFaceLivenessNativeModule = nativeModule ?? {
  isAvailable() {
    return false;
  },
  async getCameraPermissionsAsync(): Promise<CameraPermissionResponse> {
    return { status: 'undetermined', granted: false, canAskAgain: false };
  },
  async requestCameraPermissionsAsync(): Promise<CameraPermissionResponse> {
    console.warn('[expo-face-liveness] Native module is only supported on Android native builds.');
    return { status: 'denied', granted: false, canAskAgain: false };
  },
  generateSigningKey(_alias: string): NativeKeyMetadata {
    throw new Error('[face-liveness-recognition] Android Keystore is only available on native Android builds.');
  },
  getSigningPublicKey(_alias: string): NativeKeyMetadata | null {
    return null;
  },
  signPayload(_alias: string, _payload: string): string {
    throw new Error('[face-liveness-recognition] Android Keystore is only available on native Android builds.');
  },
  hasSigningKey(_alias: string): boolean {
    return false;
  },
  deleteSigningKey(_alias: string): boolean {
    return false;
  },
};

export const NativeFaceLivenessView = nativeView;
