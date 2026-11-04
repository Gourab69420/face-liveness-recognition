import type { CameraPermissionResponse } from './types';
export interface ExpoFaceLivenessNativeModule {
    isAvailable(): boolean;
    getCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
    requestCameraPermissionsAsync(): Promise<CameraPermissionResponse>;
}
export declare const NativeFaceLivenessModule: ExpoFaceLivenessNativeModule;
export declare const NativeFaceLivenessView: any;
//# sourceMappingURL=NativeExpoFaceLiveness.d.ts.map