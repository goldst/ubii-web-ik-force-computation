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

    constructor() {
        this.solver = new IK.Structure3D();

        this.baseBone = new IK.Bone3D(
            new IK.V3(0, 1, 0),
            new IK.V3(0, 1, 0)
        );

        // ==========
        // == Head ==
        // ==========
        this.chainHead = new IK.Chain3D();
        this.chainHead.addBone(this.baseBone); // Hips
        this.chainHead.addConsecutiveBone(IK.X_AXE, 0.1); // Spine
        this.chainHead.addConsecutiveBone(IK.X_AXE, 0.12); // Spine1
        this.chainHead.addConsecutiveBone(IK.X_AXE, 0.1); // Spine2
        this.chainHead.addConsecutiveBone(IK.X_AXE, 0.1); // Neck
        this.chainHead.addConsecutiveBone(IK.X_AXE, 0.1); // Head
        this.targetHead = new IK.V3(0, 2, 0);
        this.solver.add(this.chainHead, this.targetHead);

        // ===============
        // == Left Foot ==
        // ===============
        const chainLeftFoot = new IK.Chain3D();
        chainLeftFoot.addBone(
            new IK.Bone3D(
                new IK.V3(0, 0, 0), 
                new IK.V3(-0.13, 0, 0)
            )
        ); // Hips
        chainLeftFoot.addConsecutiveHingedBone(
            IK.Y_NEG, 0.5, 'global', IK.X_NEG,
            120, 20, IK.Z_AXE
        ); // Upper leg
        chainLeftFoot.addConsecutiveHingedBone(
            IK.Y_NEG, 0.5, 'global', IK.X_NEG,
            1, 120, IK.X_AXE
        ); // Lower leg
        chainLeftFoot.setRotorBaseboneConstraint(
            'local', IK.X_NEG, 10
        );
        this.targetLeftFoot = new IK.V3();
        this.solver.connectChain(
            chainLeftFoot, 0, 0, 'start',
            this.targetLeftFoot
        );
        this.chainLeftFoot = this.solver.chains[1];

        // ================
        // == Right Foot ==
        // ================
        const chainRightFoot = new IK.Chain3D();
        chainRightFoot.addBone(
            new IK.Bone3D(
                new IK.V3(0, 0, 0), 
                new IK.V3(0.13, 0, 0)
            )
        ); // Hips
        chainRightFoot.addConsecutiveHingedBone(
            IK.Y_NEG, 0.5, 'global', IK.X_NEG,
            120, 20, IK.Z_AXE
        ); // Upper leg
        chainRightFoot.addConsecutiveHingedBone(
            IK.Y_NEG, 0.5, 'global', IK.X_NEG,
            1, 120, IK.X_AXE
        ); // Lower leg
        chainRightFoot.setRotorBaseboneConstraint(
            'local', IK.X_AXE, 10
        );
        this.targetRightFoot = new IK.V3();
        this.solver.connectChain(
            chainRightFoot, 0, 0, 'start',
            this.targetRightFoot
        );
        this.chainRightFoot = this.solver.chains[2];

        // ==============
        // == Left Arm ==
        // ==============
        const chainLeftArm = new IK.Chain3D();
        chainLeftArm.addBone(
            new IK.Bone3D(
                new IK.V3(0, 0, 0),
                new IK.V3(-0.13, 0, 0)
            )
        ); // Shoulder
        chainLeftArm.addConsecutiveBone(IK.X_NEG, 0.25);
        chainLeftArm.addConsecutiveBone(IK.X_NEG, 0.25);
        chainLeftArm.setRotorBaseboneConstraint(
            'local', IK.X_NEG, 10
        );
        this.targetLeftArm = new IK.V3();
        this.solver.connectChain(
            chainLeftArm, 0, 5, 'start',
            this.targetLeftArm
        );
        this.chainLeftArm = this.solver.chains[3];

        // ===============
        // == Right Arm ==
        // ===============
        const chainRightArm = new IK.Chain3D();
        chainRightArm.addBone(
            new IK.Bone3D(
                new IK.V3(0, 0, 0),
                new IK.V3(0.13, 0, 0)
            )
        ); // Shoulder
        chainRightArm.addConsecutiveBone(IK.Y_NEG, 0.25);
        chainRightArm.addConsecutiveBone(IK.Y_NEG, 0.25);
        chainRightArm.setRotorBaseboneConstraint(
            'local', IK.X_AXE, 10
        );
        this.targetRightArm = new IK.V3();
        this.solver.connectChain(
            chainRightArm, 0, 5, 'start',
            this.targetRightArm
        );
        this.chainRightArm = this.solver.chains[4];
    }

    solve(targets: ProtobufLibrary.ubii.dataStructure.IObject3D[]) {
        this.setTarget(targets, 'HIP', this.baseBone.start);
        this.setTarget(targets, 'HIP', this.baseBone.end);
        this.setTarget(targets, 'FOOT_LEFT', this.targetLeftFoot);
        this.setTarget(targets, 'FOOT_RIGHT', this.targetRightFoot);
        this.setTarget(targets, 'HAND_LEFT', this.targetLeftArm);
        this.setTarget(targets, 'HAND_RIGHT', this.targetRightArm);
        this.setTarget(targets, 'HEAD', this.targetHead);

        this.solver.update();

        const headPos = targets.find(t => t.id === 'HEAD')?.pose?.position;

        if(
            !headPos ||
            isNaN(headPos.x!) ||
            isNaN(headPos.y!) ||
            isNaN(headPos.z!)
        ) {
            return [];
        }

        return [
            {
                id: 'Hips',
                pose: {
                    position: this.baseBone.start,
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftUpperLeg',
                pose: {
                    position: this.chainLeftFoot.bones[1].start,
                    quaternion: this.quaternion(
                        this.chainLeftFoot.bones[1].start,
                        this.chainLeftFoot.bones[1].end
                    )
                }
            },
            {
                id: 'RightUpperLeg',
                pose: {
                    position: this.chainRightFoot.bones[1].start,
                    quaternion: this.quaternion(
                        this.chainRightFoot.bones[1].start,
                        this.chainRightFoot.bones[1].end
                    )
                }
            },
            {
                id: 'LeftLowerLeg',
                pose: {
                    position: this.chainLeftFoot.bones[2].start,
                    quaternion: this.quaternion(
                        this.chainLeftFoot.bones[2].start,
                        this.chainLeftFoot.bones[2].end
                    )
                }
            },
            {
                id: 'RightLowerLeg',
                pose: {
                    position: this.chainRightFoot.bones[2].start,
                    quaternion: this.quaternion(
                        this.chainRightFoot.bones[2].start,
                        this.chainRightFoot.bones[2].end
                    )
                }
            },
            {
                id: 'LeftFoot',
                pose: {
                    position: this.chainLeftFoot.bones[2].end,
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightFoot',
                pose: {
                    position: this.chainRightFoot.bones[2].end,
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'Spine',
                pose: {
                    position: this.chainHead.bones[1].start,
                    quaternion: this.quaternion(
                        this.chainHead.bones[1].start,
                        this.chainHead.bones[1].end,
                        IK.Y_AXE
                    )
                }
            },
            {
                id: 'Chest',
                pose: {
                    position: this.chainHead.bones[2].start,
                    quaternion: this.quaternion(
                        this.chainHead.bones[2].start,
                        this.chainHead.bones[2].end,
                        IK.Y_AXE
                    )
                }
            },
            {
                id: 'Neck',
                pose: {
                    position: this.chainHead.bones[5].start,
                    quaternion: this.quaternion(
                        this.chainHead.bones[5].start,
                        this.chainHead.bones[5].end,
                        IK.Y_AXE
                    )
                }
            },
            {
                id: 'Head',
                pose: {
                    position: this.chainHead.bones[5].end,
                    quaternion: this.quaternion(
                        this.chainHead.bones[5].end,
                        new IK.V3(headPos.x!, headPos.y!, headPos.z!),
                        IK.Y_AXE
                    )
                }
            },
            {
                id: 'LeftShoulder',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightShoulder',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftUpperArm',
                pose: {
                    position: this.chainLeftArm.bones[1].start,
                    quaternion: this.quaternion(
                        this.chainLeftArm.bones[1].start,
                        this.chainLeftArm.bones[1].end,
                        IK.Z_NEG
                    )
                }
            },
            {
                id: 'RightUpperArm',
                pose: {
                    position: this.chainRightArm.bones[1].start,
                    quaternion: this.quaternion(
                        this.chainRightArm.bones[1].start,
                        this.chainRightArm.bones[1].end
                    )
                }
            },
            {
                id: 'LeftLowerArm',
                pose: {
                    position: this.chainLeftArm.bones[2].start,
                    quaternion: this.quaternion(
                        this.chainLeftArm.bones[2].start,
                        this.chainLeftArm.bones[2].end,
                        IK.Z_AXE
                    )
                }
            },
            {
                id: 'RightLowerArm',
                pose: {
                    position: this.chainRightArm.bones[2].start,
                    quaternion: this.quaternion(
                        this.chainRightArm.bones[2].start,
                        this.chainRightArm.bones[2].end,
                        IK.Z_AXE
                    )
                }
            },
            {
                id: 'LeftHand',
                pose: {
                    position: this.chainLeftArm.bones[2].end,
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightHand',
                pose: {
                    position: this.chainRightArm.bones[2].end,
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftToes',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightToes',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftThumbProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftThumbIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftThumbDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftIndexProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftIndexIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftIndexDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftMiddleProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftMiddleIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftMiddleDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftRingProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftRingIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftRingDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftLittleProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftLittleIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'LeftLittleDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightThumbProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightThumbIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightThumbDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightIndexProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightIndexIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightIndexDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightMiddleProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightMiddleIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightMiddleDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightRingProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightRingIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightRingDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightLittleProximal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightLittleIntermediate',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'RightLittleDistal',
                pose: {
                    position: { x: 0, y: 0, z: 0 },
                    quaternion: { x: 0, y: 0, z: 0, w: 1 }
                }
            },
            {
                id: 'UpperChest',
                pose: {
                    position: this.chainHead.bones[4].start,
                    quaternion: this.quaternion(
                        this.chainHead.bones[4].start,
                        this.chainHead.bones[4].end,
                        IK.Y_AXE
                    )
                }
            },
        ];
    }

    setTarget(targets: ProtobufLibrary.ubii.dataStructure.IObject3D[], id: string, v: IK.V3) {
        const ubiiTarget = targets.find(t => t.id === id);

        if(!ubiiTarget) {
            console.error(`Received targets didn't contain a target with id "${id}"! Continuing with old value.`);
        }

        v.set(
            ubiiTarget?.pose?.position?.x || v.x,
            ubiiTarget?.pose?.position?.y || v.y,
            ubiiTarget?.pose?.position?.z || v.z
        );
    }

    crossProduct(p1: IK.V3, p2: IK.V3) {
        return new IK.V3(
            p1.y*p2.z - p1.z*p2.y,
            p1.z*p2.x - p1.x*p2.z,
            p1.x*p2.y - p1.y*p2.x
        );
    }

    /**
     * Calculates the rotation quaternion for a bone from start point p1 to end point p2
     * @param p1 
     * @param p2 
     * @returns 
     */
    quaternion(p1: IK.V3, p2: IK.V3, direction: IK.V3 = IK.Y_NEG) {

        const d2 = new IK.V3(
            p2.x - p1.x,
            p2.y - p1.y,
            p2.z - p1.z
        ).normalised();


        // based on the first two answers of
        // https://stackoverflow.com/questions/1171849/finding-quaternion-representing-the-rotation-from-one-vector-to-another
        const cross = direction.cross(d2);
        const dot = direction.dot(d2);

        return {
            x: cross.x,
            y: cross.y,
            z: cross.z,
            w: 1 + dot
        };
    }
}