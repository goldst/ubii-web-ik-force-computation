"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const ProcessingModule_1 = __importDefault(require("./ProcessingModule"));
class ProcessingModuleAvatarMotionControls extends ProcessingModule_1.default {
    constructor(specs, options, humanIK) {
        super(specs);
        this.onCreated = () => {
            console.info('Processing Module Avatar Motion Controls created!');
        };
        this.onProcessing = (deltaTime, inputs, outputs, state) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // thrown errors in workers may not be handled in the usual way,
            // thus, all processing code is wrapped in this try ... catch block
            try {
                const { ikTargets, avatarCurrentPoses } = inputs;
                if (!(ikTargets === null || ikTargets === void 0 ? void 0 : ikTargets.elements) ||
                    !(avatarCurrentPoses === null || avatarCurrentPoses === void 0 ? void 0 : avatarCurrentPoses.elements)) {
                    // data is incomplete, cannot calculate outputs
                    return;
                }
                this.options.onTargetsReceived(ikTargets.elements);
                if (!state) {
                    state = {};
                }
                // Workerpool does not work with normal imports here.
                // It would not work with this one either – that is one of the
                // reasons that this code does not run in a web worker, but on
                // the main thread. However, it will simplify the process when
                // switching to compiling the dependency in a separate bundle.
                // See: https://github.com/josdejong/workerpool/issues/189
                if (!state.humanIK) {
                    state.humanIK = new (yield Promise.resolve().then(() => __importStar(require('../humanIK')))).default();
                    console.info('HumanIK created', state.humanIK);
                }
                else {
                    //console.info('HumanIK is already in state');
                }
                const calculatedPoses = (_a = state.humanIK) === null || _a === void 0 ? void 0 : _a.solve(ikTargets.elements);
                this.options.onPoseComputed(calculatedPoses);
                const out = (calculatedPoses === null || calculatedPoses === void 0 ? void 0 : calculatedPoses.map(calculatedPose => {
                    var _a;
                    return ({
                        calculatedPose,
                        existingPose: (_a = avatarCurrentPoses.elements) === null || _a === void 0 ? void 0 : _a.find(p => p.id === calculatedPose.id)
                    });
                }).filter(p => p.existingPose).map(p => {
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
                })) || [];
                const record = { object3DList: { elements: out } };
                this.options.onVelocitiesPublished(record);
                return { outputs: { avatarTargetVelocities: record } };
            }
            catch (error) {
                console.error('Error in Processing Module Avatar Motion Control:', error);
            }
        });
        Object.assign(this, ProcessingModuleAvatarMotionControls.specs);
        this.options = options;
        this.humanIK = humanIK;
    }
}
exports.default = ProcessingModuleAvatarMotionControls;
ProcessingModuleAvatarMotionControls.specs = {
    name: 'Babylon.js Physical Avatar - Motion Controls PM',
    description: 'Input require IK Targets and current pose of avatar. Output are velocities to be applied to the avatar.',
    authors: ['Leonard Goldstein (l.goldstein@tum.de)'],
    tags: ['avatar', 'motion control', 'inverse kinematics', 'velocity'],
    onProcessingStringified: '() => console.log(\'PROCESSING FROM STRINGIFIED SPECS!\')',
    processingMode: {
        frequency: {
            hertz: 60
        }
    },
    inputs: [
        {
            internalName: 'ikTargets',
            messageFormat: 'ubii.dataStructure.Object3DList'
        },
        {
            internalName: 'avatarCurrentPoses',
            messageFormat: 'ubii.dataStructure.Object3DList'
        }
    ],
    outputs: [
        {
            internalName: 'avatarTargetVelocities',
            messageFormat: 'ubii.dataStructure.Object3DList'
        }
    ]
};
