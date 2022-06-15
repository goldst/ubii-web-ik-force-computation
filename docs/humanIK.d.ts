import * as IK from 'ikts';
import * as ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
/**
 * Inlined file originally from PoseConfig.json.
 */
declare const poseConfig: {
    Hips: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    LeftUpperLeg: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    RightUpperLeg: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    LeftLowerLeg: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    RightLowerLeg: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    LeftFoot: {
        boneName: string;
        joints: never[];
    };
    RightFoot: {
        boneName: string;
        joints: never[];
    };
    Spine: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    Chest: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    Neck: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    Head: {
        boneName: string;
        joints: never[];
    };
    LeftShoulder: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    RightShoulder: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    LeftUpperArm: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    RightUpperArm: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
    LeftLowerArm: {
        boneName: string;
        joints: never[];
    };
    RightLowerArm: {
        boneName: string;
        joints: never[];
    };
    LeftHand: {
        boneName: string;
        joints: never[];
    };
    RightHand: {
        boneName: string;
        joints: never[];
    };
    LeftToes: {
        boneName: string;
        joints: never[];
    };
    RightToes: {
        boneName: string;
        joints: never[];
    };
    LeftThumbProximal: {
        boneName: string;
        joints: never[];
    };
    LeftThumbIntermediate: {
        boneName: string;
        joints: never[];
    };
    LeftThumbDistal: {
        boneName: string;
        joints: never[];
    };
    LeftIndexProximal: {
        boneName: string;
        joints: never[];
    };
    LeftIndexIntermediate: {
        boneName: string;
        joints: never[];
    };
    LeftIndexDistal: {
        boneName: string;
        joints: never[];
    };
    LeftMiddleProximal: {
        boneName: string;
        joints: never[];
    };
    LeftMiddleIntermediate: {
        boneName: string;
        joints: never[];
    };
    LeftMiddleDistal: {
        boneName: string;
        joints: never[];
    };
    LeftRingProximal: {
        boneName: string;
        joints: never[];
    };
    LeftRingIntermediate: {
        boneName: string;
        joints: never[];
    };
    LeftRingDistal: {
        boneName: string;
        joints: never[];
    };
    LeftLittleProximal: {
        boneName: string;
        joints: never[];
    };
    LeftLittleIntermediate: {
        boneName: string;
        joints: never[];
    };
    LeftLittleDistal: {
        boneName: string;
        joints: never[];
    };
    RightThumbProximal: {
        boneName: string;
        joints: never[];
    };
    RightThumbIntermediate: {
        boneName: string;
        joints: never[];
    };
    RightThumbDistal: {
        boneName: string;
        joints: never[];
    };
    RightIndexProximal: {
        boneName: string;
        joints: never[];
    };
    RightIndexIntermediate: {
        boneName: string;
        joints: never[];
    };
    RightIndexDistal: {
        boneName: string;
        joints: never[];
    };
    RightMiddleProximal: {
        boneName: string;
        joints: never[];
    };
    RightMiddleIntermediate: {
        boneName: string;
        joints: never[];
    };
    RightMiddleDistal: {
        boneName: string;
        joints: never[];
    };
    RightRingProximal: {
        boneName: string;
        joints: never[];
    };
    RightRingIntermediate: {
        boneName: string;
        joints: never[];
    };
    RightRingDistal: {
        boneName: string;
        joints: never[];
    };
    RightLittleProximal: {
        boneName: string;
        joints: never[];
    };
    RightLittleIntermediate: {
        boneName: string;
        joints: never[];
    };
    RightLittleDistal: {
        boneName: string;
        joints: never[];
    };
    UpperChest: {
        boneName: string;
        joints: {
            to: string;
            length: number;
        }[];
    };
};
/**
 * For calculation of a full human pose from a set of targets. Input and
 * output are given in meters.
 */
export default class HumanIK {
    solver: IK.Structure3D;
    baseBone: IK.Bone3D;
    chainLeftFoot: IK.Chain3D;
    targetLeftFoot: IK.V3;
    chainRightFoot: IK.Chain3D;
    targetRightFoot: IK.V3;
    chainLeftArm: IK.Chain3D;
    targetLeftArm: IK.V3;
    chainRightArm: IK.Chain3D;
    targetRightArm: IK.V3;
    chainHead: IK.Chain3D;
    targetHead: IK.V3;
    constructor();
    solve(targets: ProtobufLibrary.ubii.dataStructure.IObject3D[]): ({
        id: string;
        pose: {
            position: IK.V3;
            quaternion: {
                x: number;
                y: number;
                z: number;
                w: number;
            };
        };
    } | {
        id: string;
        pose: {
            position: {
                x: number;
                y: number;
                z: number;
            };
            quaternion: {
                x: number;
                y: number;
                z: number;
                w: number;
            };
        };
    })[];
    /**
     * Sets a vector to the position of a specific ID
     */
    setTarget(targets: ProtobufLibrary.ubii.dataStructure.IObject3D[], id: string, v: IK.V3): void;
    /**
     * returns the distance between the starting points of distinct bones
     */
    distanceBones(boneNameA: keyof typeof poseConfig, boneNameB: keyof typeof poseConfig): number;
    crossProduct(p1: IK.V3, p2: IK.V3): IK.V3;
    /**
     * Calculates the rotation quaternion for a bone from start point p1 to end point p2
     * @param p1
     * @param p2
     * @returns
     */
    quaternion(p1: IK.V3, p2: IK.V3, direction?: IK.V3): {
        x: number;
        y: number;
        z: number;
        w: number;
    };
}
export {};
