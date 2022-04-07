import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import HumanIK from './humanIK';
import { ProcessorOptions } from './ProcessorOptions';
/**
 * Main class of the inverse kinematics and velocity calculation module.
 * Instantiating this class will setup everything that is necessary to
 * launch receiving IK targets, calculating a full pose via IK, receiving
 * the current pose, calculating the velocities to change the current pose
 * to the calculated one, and publishing the calculated velocities.
 * In debugging cases, users may call {onIKTargetsReceived} or
 * {onCurrentPoseReceived} at any time.
 */
export declare class Processor {
    started: boolean;
    publishIntervalMs: number;
    ubiiDevice?: Partial<ProtobufLibrary.ubii.devices.Device>;
    ubiiComponentIkTargets?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentCurrentPose?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentVelocity?: ProtobufLibrary.ubii.devices.IComponent;
    targets: ProtobufLibrary.ubii.dataStructure.IObject3D[];
    poses: ProtobufLibrary.ubii.dataStructure.IObject3D[];
    calculatedPoses: ProtobufLibrary.ubii.dataStructure.IObject3D[];
    humanIK: HumanIK;
    options: ProcessorOptions;
    /**
     * This creates the processor, which then automatically connects to
     * the Ubi Interact master node and starts sending, processing and
     * publishing information
     * @param options See {ProcessorOption} for documentation on the
     *   default values
     */
    constructor(options?: Partial<ProcessorOptions>);
    /**
     * This function is called from the constructor after the connection to
     * the Ubi Interact master node is established.
     */
    private start;
    /**
     * Main loop, which takes asynchronously received IK targets and the
     * previous pose, calculates a full pose via IK, calculates required
     * forces, publishes those and repeats everything after the given
     * interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    private publishLoop;
    /**
     * Function that takes the received inverse kinematics targets. This
     * function is called by Ubi Interact, but can also be called manually
     * if necessary, for example in the case that the skipUbii option was
     * enabled.
     * @param targets Targets for inverse kinematics. Shall contain
     *   elements with all of the IDs 'HEAD', 'VIEWING_DIRECTION', 'HIP',
     *   'HAND_LEFT', 'HAND_RIGHT', 'FOOT_LEFT', 'FOOT_RIGHT'.
     */
    onIKTargetsReceived(targets: ProtobufLibrary.ubii.dataStructure.IObject3DList): void;
    /**
     * Function that takes the received required full current pose. This
     * function is called by Ubi Interact, but can also be called manually
     * if necessary, for example in the case that skipUbii option was
     * enabled
     * @param pose Current pose which is used to calculate required
     *   forces
     */
    onCurrentPoseReceived(pose: ProtobufLibrary.ubii.dataStructure.IObject3DList): void;
    /**
     * Sets {ubiiDevice} and all Targets: {ubiiComponentIkTargets},
     * {ubiiComponentCurrentPose}, {ubiiComponentVelocity}
     */
    private createUbiiSpecs;
    /**
     * Disconnects Ubi Interact
     */
    stop(): void;
}
