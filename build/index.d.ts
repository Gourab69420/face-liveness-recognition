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
export { NativeFaceLivenessModule, NativeFaceLivenessView, NativeKeyMetadata, } from './NativeExpoFaceLiveness';
export declare function requestCameraPermissionsAsync(): Promise<import("./types").CameraPermissionResponse>;
export declare function getCameraPermissionsAsync(): Promise<import("./types").CameraPermissionResponse>;
export declare function isLivenessDetectionAvailable(): boolean;
//# sourceMappingURL=index.d.ts.map