import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import UbiiConstants from '@tum-far/ubii-msg-formats/dist/constants.json';
import { UbiiClientService } from '@tum-far/ubii-node-webbrowser';
import HumanIK from './humanIK';
import { ProcessorOptions } from './ProcessorOptions';
import ProcessingModuleAvatarMotionControls from './processing/ProcessingModuleAvatarMotionControls';
import ProcessingModuleManager from './processing/ProcessingModuleManager';
import TopicDataProxy from './nodes/TopicDataProxy';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';

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
export class Processor {
    started = false;
    publishIntervalMs = 0;

    targets: ProtobufLibrary.ubii.dataStructure.IObject3D[] = [];
    poses: ProtobufLibrary.ubii.dataStructure.IObject3D[] = [];
    calculatedPoses: ProtobufLibrary.ubii.dataStructure.IObject3D[] = [];

    // only for useDevice===false mode:
    topicIkTargets?: string;
    topicCurrentPose?: string;
    topicVelocity?: string;
    processingModuleManager?: ProcessingModuleManager;
    processingModule?: ProcessingModuleAvatarMotionControls;

    // only for useDevice===true mode:
    ubiiDevice?: Partial<ProtobufLibrary.ubii.devices.Device>;
    humanIK = new HumanIK();
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
    constructor(options: Partial<ProcessorOptions> = {}) {
        this.options = {
            urlServices: 'http://localhost:8102/services/json',
            urlTopicData: 'ws://localhost:8104/topicdata',
            topicIKTargets: '/avatar/ik_target',
            useDevicePrefixIKTarget: true,
            tagsIKTargets: ['ik targets'],
            topicCurrentPose: '/avatar/current_pose/list',
            useDevicePrefixCurrentPose: true,
            tagsCurrentPose: ['avatar', 'bones', 'pose'],
            topicVelocities: '/avatar/target_velocities',
            useDevicePrefixVelocities: false,
            tagsVelocities: ['avatar', 'bones', 'control', 'velocity'],
            publishIntervalMs: 20,
            onTargetsReceived: () => {/*do nothing*/},
            onPoseComputed:  () => {/*do nothing*/},
            onVelocitiesPublished:  () => {/*do nothing*/},
            configureInstance: true,
            skipUbii: false,
            useDevice: false,
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
            this.started = false;
        });
        
        if(this.options.configureInstance) {
            UbiiClientService.instance.setHTTPS(
                window.location.protocol.includes('https')
            );
            UbiiClientService.instance.setName('Physical Embodiment');
            //UbiiClientService.instance.setPublishIntervalMs(this.options.publishIntervalMs);
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

        await this.createUbiiSpecs();

        if(this.options.useDevice) {
            await UbiiClientService.instance.subscribeTopic(
                this.ubiiComponentIkTargets?.topic,
                (v: ProtobufLibrary.ubii.dataStructure.IObject3DList) => this.onIKTargetsReceived(v)
            );

            await UbiiClientService.instance.subscribeTopic(
                this.ubiiComponentCurrentPose?.topic,
                (v: ProtobufLibrary.ubii.dataStructure.IObject3DList) => this.onCurrentPoseReceived(v)
            );

            this.publishLoop();
            return;
        }

        if(
            this.options.skipUbii ||
            !this.processingModule ||
            !this.processingModuleManager ||
            !this.topicIkTargets ||
            !this.topicCurrentPose ||
            !this.topicVelocity
        ) {
            return;
        }

        await this.processingModuleManager.initializeModule(this.processingModule);
        this.processingModuleManager.addModule(this.processingModule);

        await this.processingModuleManager.applyIOMappings([{
            processingModuleId: this.processingModule.id,
            inputMappings: [
                {
                    inputName: this.processingModule.inputs?.[0].internalName,
                    topicSource: 'topic',
                    topic: this.topicIkTargets
                },
                {
                    inputName: this.processingModule.inputs?.[1].internalName,
                    topicSource: 'topic',
                    topic: this.topicCurrentPose
                }
            ],
            outputMappings: [
                {
                    outputName: this.processingModule.outputs?.[0].internalName,
                    topicSource: 'topic',
                    topic: this.topicVelocity
                }
            ]
        }], 1);

        this.processingModuleManager.startModule(this.processingModule);
    }

    /**
     * Only in useDevice mode:
     * Main loop, which takes asynchronously received IK targets and the
     * previous pose, calculates a full pose via IK, calculates required
     * forces, publishes those and repeats everything after the given
     * interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    private publishLoop(i = 0) {
        if(!this.started) {
            return;
        }

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
     * Only for when using device instead of processing module:
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
            //console.error('Received IK targets do not contain data');
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
     * Sets {ubiiDevice} and all Components: {ubiiComponentIkTargets},
     * {ubiiComponentCurrentPose}, {ubiiComponentVelocity}
     */
    private async createUbiiSpecs() {
        const clientId = UbiiClientService.instance.getClientID();
        const deviceName = 'web-ik-forces-processor';

        this.topicIkTargets = this.options.skipUbii
            ? 'none'
            : await this.findComponentTopic({
                ioType: ProtobufLibrary.ubii.devices.Component.IOType.PUBLISHER,
                messageFormat: 'ubii.dataStructure.Object3DList',
                tags: this.options.tagsIKTargets
            });
    
        this.topicCurrentPose = this.options.skipUbii
            ? 'none'
            : await this.findComponentTopic({
                ioType: ProtobufLibrary.ubii.devices.Component.IOType.PUBLISHER,
                messageFormat: 'ubii.dataStructure.Object3DList',
                tags: this.options.tagsCurrentPose
            });

        
        this.topicVelocity = this.options.skipUbii
            ? 'none'
            : await this.findComponentTopic({
                ioType: ProtobufLibrary.ubii.devices.Component.IOType.SUBSCRIBER,
                messageFormat: 'ubii.dataStructure.Object3DList',
                tags: this.options.tagsVelocities
            });   

        if(!this.options.useDevice) {
            const topicDataBuffer = new RuntimeTopicData();

            this.processingModule = new ProcessingModuleAvatarMotionControls({}, this.options, this.humanIK);
            this.processingModuleManager = new ProcessingModuleManager(1, new TopicDataProxy(topicDataBuffer, UbiiClientService.instance));

            return;
        }

        this.ubiiDevice = {
            clientId,
            name: deviceName,
            deviceType: ProtobufLibrary.ubii.devices.Device.DeviceType.PARTICIPANT,
            components: [
                {
                    name: 'Inverse Kinematics targets',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.SUBSCRIBER,
                    topic: this.topicIkTargets,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                },
                {
                    name: 'Current physical avatar pose',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.SUBSCRIBER,
                    topic: this.topicCurrentPose,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                },
                {
                    name: 'Velocities for physical avatar',
                    ioType: ProtobufLibrary.ubii.devices.Component.IOType.PUBLISHER,
                    topic: this.topicVelocity,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                }
            ],
        };
    
        [
            this.ubiiComponentIkTargets,
            this.ubiiComponentCurrentPose,
            this.ubiiComponentVelocity,
        ]
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            = this.ubiiDevice.components!;
    }

    /**
     * Asks master node for the topic of an existing component until it is found
     */
    async findComponentTopic(component: ProtobufLibrary.ubii.devices.IComponent) {
        let ret: ProtobufLibrary.ubii.devices.IComponent[] = [];
        let warn = true;

        while(ret.length !== 1) {
            ret = (await UbiiClientService.instance.callService({
                topic: UbiiConstants.DEFAULT_TOPICS.SERVICES.COMPONENT_GET_LIST,
                componentList: {
                    elements: [ component ]
                }
            })).componentList.elements;

            if(!ret) {
                console.error('Error fetching components.');
                return;
            }

            if(warn && ret.length > 1) {
                console.warn(
                    'Found more than one existing component with tags:',
                    component.tags,
                    'Waiting until only one is available.'
                );
                warn = false;
            }
        }

        return ret[0].topic || undefined;
    }

    /**
     * Disconnects Ubi Interact
     */
    stop() {
        if(!this.started || this.options.skipUbii) {
            return;
        }
        this.processingModule?.stop();
        UbiiClientService.instance.disconnect();
    }
}