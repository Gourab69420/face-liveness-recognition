// Main Entry Point for face-liveness-recognition

export * from './types';
export * from './model';
export * from './challenges';
export * from './auth';
export * from './crypto';
export * from './proof';
export * from './server';
export * from './keystore';

export { FaceLivenessCamera } from './FaceLivenessCamera';
export { FaceLivenessOverlay } from './FaceLivenessOverlay';
export { useFaceLiveness, UseFaceLivenessOptions, UseFaceLivenessReturn } from './useFaceLiveness';
export {
  NativeFaceLivenessModule,
  NativeFaceLivenessView,
  NativeKeyMetadata,
} from './NativeExpoFaceLiveness';

import { NativeFaceLivenessModule } from './NativeExpoFaceLiveness';

export async function requestCameraPermissionsAsync() {
  return NativeFaceLivenessModule.requestCameraPermissionsAsync();
}

export async function getCameraPermissionsAsync() {
  return NativeFaceLivenessModule.getCameraPermissionsAsync();
}

export function isLivenessDetectionAvailable(): boolean {
  return NativeFaceLivenessModule.isAvailable();
}
