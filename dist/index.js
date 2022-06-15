"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Processor = void 0;
const protobuf_1 = __importDefault(require("@tum-far/ubii-msg-formats/dist/js/protobuf"));
const constants_json_1 = __importDefault(require("@tum-far/ubii-msg-formats/dist/constants.json"));
const ubii_node_webbrowser_1 = require("@tum-far/ubii-node-webbrowser");
const humanIK_1 = __importDefault(require("./humanIK"));
const ProcessingModuleAvatarMotionControls_1 = __importDefault(require("./processing/ProcessingModuleAvatarMotionControls"));
const ProcessingModuleManager_1 = __importDefault(require("./processing/ProcessingModuleManager"));
const TopicDataProxy_1 = __importDefault(require("./nodes/TopicDataProxy"));
const ubii_topic_data_1 = require("@tum-far/ubii-topic-data");
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
class Processor {
    /**
     * This creates the processor, which then automatically connects to
     * the Ubi Interact master node and starts sending, processing and
     * publishing information
     * @param options See {ProcessorOption} for documentation on the
     *   default values
     */
    constructor(options = {}) {
        this.started = false;
        this.publishIntervalMs = 0;
        this.targets = [];
        this.poses = [];
        this.calculatedPoses = [];
        this.humanIK = new humanIK_1.default();
        this.options = Object.assign({ urlServices: 'http://localhost:8102/services/json', urlTopicData: 'ws://localhost:8104/topicdata', topicIKTargets: '/avatar/ik_target', useDevicePrefixIKTarget: true, tagsIKTargets: ['ik targets'], topicCurrentPose: '/avatar/current_pose/list', useDevicePrefixCurrentPose: true, tagsCurrentPose: ['avatar', 'bones', 'pose'], topicVelocities: '/avatar/target_velocities', useDevicePrefixVelocities: false, tagsVelocities: ['avatar', 'bones', 'control', 'velocity'], publishIntervalMs: 20, onTargetsReceived: () => { }, onPoseComputed: () => { }, onVelocitiesPublished: () => { }, configureInstance: true, skipUbii: false, useDevice: false }, options);
        if (this.options.skipUbii) {
            this.start();
            return;
        }
        ubii_node_webbrowser_1.UbiiClientService.instance.on(ubii_node_webbrowser_1.UbiiClientService.EVENTS.CONNECT, () => {
            this.start();
        });
        ubii_node_webbrowser_1.UbiiClientService.instance.on(ubii_node_webbrowser_1.UbiiClientService.EVENTS.DISCONNECT, () => {
            this.started = false;
        });
        if (this.options.configureInstance) {
            ubii_node_webbrowser_1.UbiiClientService.instance.setHTTPS(window.location.protocol.includes('https'));
            ubii_node_webbrowser_1.UbiiClientService.instance.setName('Physical Embodiment');
            //UbiiClientService.instance.setPublishIntervalMs(this.options.publishIntervalMs);
        }
        ubii_node_webbrowser_1.UbiiClientService.instance.connect(this.options.urlServices, this.options.urlTopicData);
    }
    /**
     * This function is called from the constructor after the connection to
     * the Ubi Interact master node is established.
     */
    start() {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.started) {
                return;
            }
            this.started = true;
            yield this.createUbiiSpecs();
            if (this.options.useDevice) {
                yield ubii_node_webbrowser_1.UbiiClientService.instance.subscribeTopic((_a = this.ubiiComponentIkTargets) === null || _a === void 0 ? void 0 : _a.topic, (v) => this.onIKTargetsReceived(v));
                yield ubii_node_webbrowser_1.UbiiClientService.instance.subscribeTopic((_b = this.ubiiComponentCurrentPose) === null || _b === void 0 ? void 0 : _b.topic, (v) => this.onCurrentPoseReceived(v));
                this.publishLoop();
                return;
            }
            if (this.options.skipUbii ||
                !this.processingModule ||
                !this.processingModuleManager ||
                !this.topicIkTargets ||
                !this.topicCurrentPose ||
                !this.topicVelocity) {
                return;
            }
            yield this.processingModuleManager.initializeModule(this.processingModule);
            this.processingModuleManager.addModule(this.processingModule);
            yield this.processingModuleManager.applyIOMappings([{
                    processingModuleId: this.processingModule.id,
                    inputMappings: [
                        {
                            inputName: (_c = this.processingModule.inputs) === null || _c === void 0 ? void 0 : _c[0].internalName,
                            topicSource: 'topic',
                            topic: this.topicIkTargets
                        },
                        {
                            inputName: (_d = this.processingModule.inputs) === null || _d === void 0 ? void 0 : _d[1].internalName,
                            topicSource: 'topic',
                            topic: this.topicCurrentPose
                        }
                    ],
                    outputMappings: [
                        {
                            outputName: (_e = this.processingModule.outputs) === null || _e === void 0 ? void 0 : _e[0].internalName,
                            topicSource: 'topic',
                            topic: this.topicVelocity
                        }
                    ]
                }], 1);
            this.processingModuleManager.startModule(this.processingModule);
        });
    }
    /**
     * Only in useDevice mode:
     * Main loop, which takes asynchronously received IK targets and the
     * previous pose, calculates a full pose via IK, calculates required
     * forces, publishes those and repeats everything after the given
     * interval
     * @param i Index, starting at 0 and adding 1 at every iteration
     */
    publishLoop(i = 0) {
        var _a, _b;
        if (!this.started) {
            return;
        }
        if (!((_a = this.ubiiComponentVelocity) === null || _a === void 0 ? void 0 : _a.topic)) {
            console.error('Trying to publish velocities, but topic was not set.', 'Publishing with empty topic.');
        }
        const record = {
            topic: ((_b = this.ubiiComponentVelocity) === null || _b === void 0 ? void 0 : _b.topic) || '',
            object3DList: {
                elements: this.calculatedPoses
                    .map(calculatedPose => ({
                    calculatedPose,
                    existingPose: this.poses.find(p => p.id === calculatedPose.id)
                }))
                    .filter(p => p.existingPose)
                    .map(p => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                    return ({
                        id: p.calculatedPose.id,
                        pose: {
                            position: {
                                x: (((_c = (_b = (_a = p.calculatedPose) === null || _a === void 0 ? void 0 : _a.pose) === null || _b === void 0 ? void 0 : _b.position) === null || _c === void 0 ? void 0 : _c.x) || 0) - (((_f = (_e = (_d = p.existingPose) === null || _d === void 0 ? void 0 : _d.pose) === null || _e === void 0 ? void 0 : _e.position) === null || _f === void 0 ? void 0 : _f.x) || 0),
                                y: (((_j = (_h = (_g = p.calculatedPose) === null || _g === void 0 ? void 0 : _g.pose) === null || _h === void 0 ? void 0 : _h.position) === null || _j === void 0 ? void 0 : _j.y) || 0) - (((_m = (_l = (_k = p.existingPose) === null || _k === void 0 ? void 0 : _k.pose) === null || _l === void 0 ? void 0 : _l.position) === null || _m === void 0 ? void 0 : _m.y) || 0),
                                z: (((_q = (_p = (_o = p.calculatedPose) === null || _o === void 0 ? void 0 : _o.pose) === null || _p === void 0 ? void 0 : _p.position) === null || _q === void 0 ? void 0 : _q.z) || 0) - (((_t = (_s = (_r = p.existingPose) === null || _r === void 0 ? void 0 : _r.pose) === null || _s === void 0 ? void 0 : _s.position) === null || _t === void 0 ? void 0 : _t.z) || 0)
                            },
                            quaternion: { x: 0, y: 0, z: 0, w: 1 }
                        }
                    });
                }) || []
            }
        };
        if (!this.options.skipUbii) {
            ubii_node_webbrowser_1.UbiiClientService.instance.publishRecordImmediately(record);
        }
        this.options.onVelocitiesPublished(record);
        setTimeout(() => this.publishLoop(i + 1), this.options.publishIntervalMs);
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
    onIKTargetsReceived(targets) {
        if (!targets.elements || !targets.elements.length) {
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
    onCurrentPoseReceived(pose) {
        if (!pose.elements) {
            console.error('Received pose targets do not contain useful data');
            return;
        }
        this.poses = pose.elements;
    }
    /**
     * Sets {ubiiDevice} and all Components: {ubiiComponentIkTargets},
     * {ubiiComponentCurrentPose}, {ubiiComponentVelocity}
     */
    createUbiiSpecs() {
        return __awaiter(this, void 0, void 0, function* () {
            const clientId = ubii_node_webbrowser_1.UbiiClientService.instance.getClientID();
            const deviceName = 'web-ik-forces-processor';
            this.topicIkTargets = this.options.skipUbii
                ? 'none'
                : yield this.findComponentTopic({
                    ioType: protobuf_1.default.ubii.devices.Component.IOType.PUBLISHER,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                    tags: this.options.tagsIKTargets
                });
            this.topicCurrentPose = this.options.skipUbii
                ? 'none'
                : yield this.findComponentTopic({
                    ioType: protobuf_1.default.ubii.devices.Component.IOType.PUBLISHER,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                    tags: this.options.tagsCurrentPose
                });
            this.topicVelocity = this.options.skipUbii
                ? 'none'
                : yield this.findComponentTopic({
                    ioType: protobuf_1.default.ubii.devices.Component.IOType.SUBSCRIBER,
                    messageFormat: 'ubii.dataStructure.Object3DList',
                    tags: this.options.tagsVelocities
                });
            if (!this.options.useDevice) {
                const topicDataBuffer = new ubii_topic_data_1.RuntimeTopicData();
                this.processingModule = new ProcessingModuleAvatarMotionControls_1.default({}, this.options, this.humanIK);
                this.processingModuleManager = new ProcessingModuleManager_1.default(1, new TopicDataProxy_1.default(topicDataBuffer, ubii_node_webbrowser_1.UbiiClientService.instance));
                return;
            }
            this.ubiiDevice = {
                clientId,
                name: deviceName,
                deviceType: protobuf_1.default.ubii.devices.Device.DeviceType.PARTICIPANT,
                components: [
                    {
                        name: 'Inverse Kinematics targets',
                        ioType: protobuf_1.default.ubii.devices.Component.IOType.SUBSCRIBER,
                        topic: this.topicIkTargets,
                        messageFormat: 'ubii.dataStructure.Object3DList',
                    },
                    {
                        name: 'Current physical avatar pose',
                        ioType: protobuf_1.default.ubii.devices.Component.IOType.SUBSCRIBER,
                        topic: this.topicCurrentPose,
                        messageFormat: 'ubii.dataStructure.Object3DList',
                    },
                    {
                        name: 'Velocities for physical avatar',
                        ioType: protobuf_1.default.ubii.devices.Component.IOType.PUBLISHER,
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
                = this.ubiiDevice.components;
        });
    }
    /**
     * Asks master node for the topic of an existing component until it is found
     */
    findComponentTopic(component) {
        return __awaiter(this, void 0, void 0, function* () {
            let ret = [];
            let warn = true;
            while (ret.length !== 1) {
                ret = (yield ubii_node_webbrowser_1.UbiiClientService.instance.callService({
                    topic: constants_json_1.default.DEFAULT_TOPICS.SERVICES.COMPONENT_GET_LIST,
                    componentList: {
                        elements: [component]
                    }
                })).componentList.elements;
                if (!ret) {
                    console.error('Error fetching components.');
                    return;
                }
                if (warn && ret.length > 1) {
                    console.warn('Found more than one existing component with tags:', component.tags, 'Waiting until only one is available.');
                    warn = false;
                }
            }
            return ret[0].topic || undefined;
        });
    }
    /**
     * Disconnects Ubi Interact
     */
    stop() {
        var _a;
        if (!this.started || this.options.skipUbii) {
            return;
        }
        (_a = this.processingModule) === null || _a === void 0 ? void 0 : _a.stop();
        ubii_node_webbrowser_1.UbiiClientService.instance.disconnect();
    }
}
exports.Processor = Processor;
