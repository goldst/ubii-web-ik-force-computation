import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import HumanIK from './humanIK';
import { ProcessorOptions } from './ProcessorOptions';
import ProcessingModuleAvatarMotionControls from './processing/ProcessingModuleAvatarMotionControls';
import ProcessingModuleManager from './processing/ProcessingModuleManager';
/**
 * Main class of the inverse kinematics and velocity calculation module.
 * Instantiating this class will setup everything that is necessary to
 * launch receiving IK targets, calculating a full pose via IK, receiving
 * the current pose, calculating the velocities to change the current pose
 * to the calculated one, and publishing the calculated velocities.
 * In debugging cases, users may call {onIKTargetsReceived} or
 * {onCurrentPoseReceived} at any time.
 * There are two modes the processor can run in: the default processing
 * module mode uses a Ubi-Interact processing module. In the future, this
 * processing module may run on a separate thread and will therefore be
 * more performant.
 * Alternatively, when the option {useDevice===true} is passed in, a device
 * that does the same calculations as the processing module is used.
 * {skipUbii} only works with {useDevice===true}.
 */
export declare class Processor {
    started: boolean;
    publishIntervalMs: number;
    targets: ProtobufLibrary.ubii.dataStructure.IObject3D[];
    poses: ProtobufLibrary.ubii.dataStructure.IObject3D[];
    calculatedPoses: ProtobufLibrary.ubii.dataStructure.IObject3D[];
    topicIkTargets?: string;
    topicCurrentPose?: string;
    topicVelocity?: string;
    processingModuleManager?: ProcessingModuleManager;
    processingModule?: ProcessingModuleAvatarMotionControls;
    ubiiDevice?: Partial<ProtobufLibrary.ubii.devices.Device>;
    humanIK: HumanIK;
    ubiiComponentIkTargets?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentCurrentPose?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentVelocity?: ProtobufLibrary.ubii.devices.IComponent;
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
     * Only in useDevice mode:
     * Main loop, which takes asynchronously received IK targets and the
     * previous pose, calculates a full pose via IK, calculates required
     * forces, publishes those and repeats everything after the given
     * interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    private publishLoop;
    /**
     * Only for when using device instead of processing module:
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
     * Sets {ubiiDevice} and all Components: {ubiiComponentIkTargets},
     * {ubiiComponentCurrentPose}, {ubiiComponentVelocity}
     */
    private createUbiiSpecs;
    /**
     * Asks master node for the topic of an existing component until it is found
     */
    findComponentTopic(component: ProtobufLibrary.ubii.devices.IComponent): Promise<string | undefined>;
    /**
     * Disconnects Ubi Interact
     */
    stop(): void;
}
