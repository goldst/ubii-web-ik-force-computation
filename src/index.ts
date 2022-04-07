import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import { UbiiClientService } from '@tum-far/ubii-node-webbrowser';
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
export class Processor {
    started = false;
    publishIntervalMs = 0;
    ubiiDevice?: Partial<ProtobufLibrary.ubii.devices.Device>;
    ubiiComponentIkTargets?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentCurrentPose?: ProtobufLibrary.ubii.devices.IComponent;
    ubiiComponentVelocity?: ProtobufLibrary.ubii.devices.IComponent;

    targets: ProtobufLibrary.ubii.dataStructure.IObject3D[] = [];
    poses: ProtobufLibrary.ubii.dataStructure.IObject3D[] = [];
    calculatedPoses: ProtobufLibrary.ubii.dataStructure.IObject3D[] = [];

    humanIK = new HumanIK();

    options: ProcessorOptions;

    /**
     * This creates the processor, which then automatically connects to
     * the Ubi Interact master node and starts sending, processing and
     * publishing information
     * @param options See {ProcessorOption} for documentation on the
     *   default values
     */
    constructor(options: Partial<ProcessorOptions> = {}) {
        this.options = {
            urlServices: 'http://localhost:8102/services',
            urlTopicData: 'ws://localhost:8104/topicdata',
            topicIKTargets: '/avatar/ik_target',
            useDevicePrefixIKTarget: false,
            topicCurrentPose: '/avatar/current_pose/list',
            useDevicePrefixCurrentPose: false,
            topicVelocities: '/avatar/target_velocities',
            useDevicePrefixVelocities: false,
            publishIntervalMs: 20,
            onTargetsReceived: () => {/*do nothing*/},
            onPoseComputed:  () => {/*do nothing*/},
            onVelocitiesPublished:  () => {/*do nothing*/},
            configureInstance: true,
            skipUbii: false,
            ...options
        };
        

        if(this.options.skipUbii) {
            this.start();
            return;
        }
        
        UbiiClientService.instance.on(UbiiClientService.EVENTS.CONNECT, () => {
            this.start();
        });

        UbiiClientService.instance.on(UbiiClientService.EVENTS.DISCONNECT, () => {
            this.stop();
        });
        
        if(this.options.configureInstance) {
            UbiiClientService.instance.setHTTPS(
                window.location.protocol.includes('https')
            );
            UbiiClientService.instance.setName('Physical Embodiment – Stage 1');
            UbiiClientService.instance.setPublishIntervalMs(this.options.publishIntervalMs);
        }

        UbiiClientService.instance.connect(this.options.urlServices, this.options.urlTopicData);
    }

    /**
     * This function is called from the constructor after the connection to
     * the Ubi Interact master node is established.
     */
    private async start() {
        if (this.started) {
            return;
        }
        this.started = true;

        this.createUbiiSpecs();

        if(
            !this.ubiiDevice ||
            !this.ubiiComponentIkTargets ||
            !this.ubiiComponentCurrentPose
        ) {
            return;
        }

        if(!this.options.skipUbii) {
            const replyRegisterDevice = await UbiiClientService.instance.registerDevice(this.ubiiDevice);

            if(replyRegisterDevice.id) {
                this.ubiiDevice = replyRegisterDevice;
            } else {
                console.error(
                    'Device registration failed. Ubi Interact replied',
                    replyRegisterDevice
                );
                return;
            }

            await UbiiClientService.instance.subscribeTopic(
                this.ubiiComponentIkTargets.topic,
                (v: any) => this.onIKTargetsReceived(v)
            );

            await UbiiClientService.instance.subscribeTopic(
                this.ubiiComponentCurrentPose.topic,
                (v: any) => this.onCurrentPoseReceived(v)
            );
        }

        this.publishLoop();
    }

    /**
     * Main loop, which takes asynchronously received IK targets and the
     * previous pose, calculates a full pose via IK, calculates required
     * forces, publishes those and repeats everything after the given
     * interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    private publishLoop(i = 0) {
        if(!this.ubiiComponentVelocity?.topic) {
            console.error(
                'Trying to publish velocities, but topic was not set.',
                'Publishing with empty topic.');
        }

        const record = {
            topic: this.ubiiComponentVelocity?.topic || '',
            object3DList: {
                elements: this.calculatedPoses
                    .map(calculatedPose => ({
                        calculatedPose,
                        existingPose: this.poses.find(p => p.id === calculatedPose.id)
                    }))
                    .filter(p => p.existingPose)
                    .map(p => ({
                        id: p.calculatedPose.id,
                        pose: {
                            position: {
                                x: (p.calculatedPose?.pose?.position?.x || 0) - (p.existingPose?.pose?.position?.x || 0),
                                y: (p.calculatedPose?.pose?.position?.y || 0) - (p.existingPose?.pose?.position?.y || 0),
                                z: (p.calculatedPose?.pose?.position?.z || 0) - (p.existingPose?.pose?.position?.z || 0)
                            },
                            quaternion: { x: 0, y: 0, z: 0, w: 1}
                        }
                    })) || []
            }
        };
      
        if(!this.options.skipUbii) {
            UbiiClientService.instance.publishRecordImmediately(record);
        }

        this.options.onVelocitiesPublished(record);

        setTimeout(() => this.publishLoop(i+1), this.options.publishIntervalMs);
    }

    /**
     * Function that takes the received inverse kinematics targets. This
     * function is called by Ubi Interact, but can also be called manually
     * if necessary, for example in the case that the skipUbii option was
     * enabled.
     * @param targets Targets for inverse kinematics. Shall contain
     *   elements with all of the IDs 'HEAD', 'VIEWING_DIRECTION', 'HIP',
     *   'HAND_LEFT', 'HAND_RIGHT', 'FOOT_LEFT', 'FOOT_RIGHT'.
     */
    onIKTargetsReceived(targets: ProtobufLibrary.ubii.dataStructure.IObject3DList) {
        if(!targets.elements || !targets.elements.length) {
            console.error('Received IK targets do not contain data');
            return;
        }

        this.options.onTargetsReceived(targets.elements);

        this.targets = targets.elements;

        const res = this.humanIK.solve(this.targets);

        this.calculatedPoses = res;

        this.options.onPoseComputed(res);
    }

    /**
     * Function that takes the received required full current pose. This
     * function is called by Ubi Interact, but can also be called manually
     * if necessary, for example in the case that skipUbii option was
     * enabled
     * @param pose Current pose which is used to calculate required
     *   forces
     */
    onCurrentPoseReceived(pose: ProtobufLibrary.ubii.dataStructure.IObject3DList) {
        if(!pose.elements) {
            console.error('Received pose targets do not contain useful data');
            return;
        }

        this.poses = pose.elements;
    }

    /**
     * Sets {ubiiDevice} and all Targets: {ubiiComponentIkTargets},
     * {ubiiComponentCurrentPose}, {ubiiComponentVelocity}
     */
    private createUbiiSpecs() {
        const clientId = UbiiClientService.instance.getClientID();
        const deviceName = 'web-ik-forces-processor';
        const prefix = `/${clientId}/${deviceName}`;

        this.ubiiDevice = {
            clientId,
            name: deviceName,
            deviceType: ProtobufLibrary.ubii.devices.Device.DeviceType.PARTICIPANT,
            components: [
                {
                    name: 'Inverse Kinematics targets',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.SUBSCRIBER,
                    topic: `${this.options.useDevicePrefixIKTarget ? prefix : ''}${this.options.topicIKTargets}`,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                },
                {
                    name: 'Current physical avatar pose',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.SUBSCRIBER,
                    topic: `${this.options.useDevicePrefixCurrentPose ? prefix : ''}${this.options.topicCurrentPose}`,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                },
                {
                    name: 'Velocities for physical avatar',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.PUBLISHER,
                    topic: `${this.options.useDevicePrefixVelocities ? prefix : ''}${this.options.topicVelocities}`,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                }
            ],
        };

        [
            this.ubiiComponentIkTargets,
            this.ubiiComponentCurrentPose,
            this.ubiiComponentVelocity,
        ]
            = this.ubiiDevice.components!;
    }

    /**
     * Disconnects Ubi Interact
     */
    stop() {
        UbiiClientService.instance.disconnect();
    }
}