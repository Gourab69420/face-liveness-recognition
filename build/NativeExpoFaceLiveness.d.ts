import type { CameraPermissionResponse } from './types';
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
    generateSigningKey(alias: string): NativeKeyMetadata;
    getSigningPublicKey(alias: string): NativeKeyMetadata | null;
    signPayload(alias: string, payload: string): string;
    hasSigningKey(alias: string): boolean;
    deleteSigningKey(alias: string): boolean;
    getRandomBytes?(byteLength: number): string;
    getRandomBytesHex?(byteLength: number): string;
}
export declare const NativeFaceLivenessModule: ExpoFaceLivenessNativeModule;
export declare const NativeFaceLivenessView: any;
//# sourceMappingURL=NativeExpoFaceLiveness.d.ts.map