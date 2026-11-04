import { Platform } from 'react-native';
import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import type { CameraPermissionResponse } from './types';

export interface ExpoFaceLivenessNativeModule {
  isAvailable(): boolean;
  getCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
  requestCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
}

let nativeModule: ExpoFaceLivenessNativeModule | null = null;
let nativeView: any = null;

if (Platform.OS === 'android') {
  try {
    nativeModule = requireNativeModule<ExpoFaceLivenessNativeModule>('ExpoFaceLiveness');
    nativeView = requireNativeViewManager('ExpoFaceLiveness');
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
};

export const NativeFaceLivenessView = nativeView;
