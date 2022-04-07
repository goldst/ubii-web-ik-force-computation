import * as IK from 'ikts';
import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
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
    setTarget(targets: ProtobufLibrary.ubii.dataStructure.IObject3D[], id: string, v: IK.V3): void;
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
