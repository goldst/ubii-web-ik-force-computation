import { ProcessorOptions } from '../ProcessorOptions';
import ProcessingModule from './ProcessingModule';
import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import HumanIK from '../humanIK';

export default class ProcessingModuleAvatarMotionControls extends ProcessingModule {
    options: ProcessorOptions;
    humanIK: HumanIK;

    static specs = {
        name: 'Babylon.js Physical Avatar - Motion Controls PM',
        description: 'Input require IK Targets and current pose of avatar. Output are velocities to be applied to the avatar.',
        authors: [ 'Leonard Goldstein (l.goldstein@tum.de)' ],
        tags: [ 'avatar', 'motion control', 'inverse kinematics', 'velocity' ],
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

    constructor(specs: any, options: ProcessorOptions, humanIK: HumanIK) {
        super(specs);
        Object.assign(this, ProcessingModuleAvatarMotionControls.specs);
        this.options = options;
        this.humanIK = humanIK;
    }

    onCreated = () => {
        console.info('Processing Module Avatar Motion Controls created!');
    };

    onProcessing = async (
        deltaTime: number,
        inputs: {
            ikTargets?: ProtobufLibrary.ubii.dataStructure.IObject3DList,
            avatarCurrentPoses?: ProtobufLibrary.ubii.dataStructure.IObject3DList,
        },
        outputs: any,
        state: {
            humanIK?: HumanIK
        }
    ) => {
        // thrown errors in workers may not be handled in the usual way,
        // thus, all processing code is wrapped in this try ... catch block
        try {
            const { ikTargets, avatarCurrentPoses } = inputs;
            if(
                !ikTargets?.elements ||
                !avatarCurrentPoses?.elements
            ) {
                // data is incomplete, cannot calculate outputs
                return;
            }

            this.options.onTargetsReceived(ikTargets.elements);

            if(!state) {
                state = {};
            }

            // Workerpool does not work with normal imports here.
            // It would not work with this one either – that is one of the
            // reasons that this code does not run in a web worker, but on
            // the main thread. However, it will simplify the process when
            // switching to compiling the dependency in a separate bundle.
            // See: https://github.com/josdejong/workerpool/issues/189
            if(!state.humanIK) {
                state.humanIK = new (await import('../humanIK')).default();
                console.info('HumanIK created', state.humanIK);
            } else {
                //console.info('HumanIK is already in state');
            }

            const calculatedPoses = state.humanIK?.solve(ikTargets.elements);

            this.options.onPoseComputed(calculatedPoses);


            const out = calculatedPoses
                ?.map(calculatedPose => ({
                    calculatedPose,
                    existingPose: avatarCurrentPoses.elements?.find(p => p.id === calculatedPose.id)
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
                })) || [];

            const record = { object3DList: { elements: out } };
            
            this.options.onVelocitiesPublished(record);

            return { outputs: { avatarTargetVelocities: record } };

        } catch(error) {
            console.error('Error in Processing Module Avatar Motion Control:', error);
        }
        
    }
}