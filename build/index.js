"use strict";
// Main Entry Point for face-liveness-recognition
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeFaceLivenessView = exports.NativeFaceLivenessModule = exports.useFaceLiveness = exports.FaceLivenessOverlay = exports.FaceLivenessCamera = void 0;
exports.requestCameraPermissionsAsync = requestCameraPermissionsAsync;
exports.getCameraPermissionsAsync = getCameraPermissionsAsync;
exports.isLivenessDetectionAvailable = isLivenessDetectionAvailable;
__exportStar(require("./types"), exports);
__exportStar(require("./model"), exports);
__exportStar(require("./challenges"), exports);
__exportStar(require("./auth"), exports);
var FaceLivenessCamera_1 = require("./FaceLivenessCamera");
Object.defineProperty(exports, "FaceLivenessCamera", { enumerable: true, get: function () { return FaceLivenessCamera_1.FaceLivenessCamera; } });
var FaceLivenessOverlay_1 = require("./FaceLivenessOverlay");
Object.defineProperty(exports, "FaceLivenessOverlay", { enumerable: true, get: function () { return FaceLivenessOverlay_1.FaceLivenessOverlay; } });
var useFaceLiveness_1 = require("./useFaceLiveness");
Object.defineProperty(exports, "useFaceLiveness", { enumerable: true, get: function () { return useFaceLiveness_1.useFaceLiveness; } });
var NativeExpoFaceLiveness_1 = require("./NativeExpoFaceLiveness");
Object.defineProperty(exports, "NativeFaceLivenessModule", { enumerable: true, get: function () { return NativeExpoFaceLiveness_1.NativeFaceLivenessModule; } });
Object.defineProperty(exports, "NativeFaceLivenessView", { enumerable: true, get: function () { return NativeExpoFaceLiveness_1.NativeFaceLivenessView; } });
const NativeExpoFaceLiveness_2 = require("./NativeExpoFaceLiveness");
async function requestCameraPermissionsAsync() {
    return NativeExpoFaceLiveness_2.NativeFaceLivenessModule.requestCameraPermissionsAsync();
}
async function getCameraPermissionsAsync() {
    return NativeExpoFaceLiveness_2.NativeFaceLivenessModule.getCameraPermissionsAsync();
}
function isLivenessDetectionAvailable() {
    return NativeExpoFaceLiveness_2.NativeFaceLivenessModule.isAvailable();
}
//# sourceMappingURL=index.js.map