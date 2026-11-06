import React from 'react';
import { FaceStatus, ChallengeType, LivenessProgress } from './types';
export interface FaceLivenessOverlayProps {
    faceStatus?: FaceStatus;
    progress?: LivenessProgress | null;
    activeChallenge?: ChallengeType | 'none';
    instructionText?: string;
    isAnalyzing?: boolean;
    isVerified?: boolean;
    showHologram?: boolean;
    hologramOpacity?: number;
}
export declare const FaceLivenessOverlay: React.FC<FaceLivenessOverlayProps>;
//# sourceMappingURL=FaceLivenessOverlay.d.ts.map