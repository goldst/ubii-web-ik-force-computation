import { ProcessorOptions } from '../ProcessorOptions';
import ProcessingModule from './ProcessingModule';
import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import HumanIK from '../humanIK';
export default class ProcessingModuleAvatarMotionControls extends ProcessingModule {
    options: ProcessorOptions;
    humanIK: HumanIK;
    static specs: {
        name: string;
        description: string;
        authors: string[];
        tags: string[];
        onProcessingStringified: string;
        processingMode: {
            frequency: {
                hertz: number;
            };
        };
        inputs: {
            internalName: string;
            messageFormat: string;
        }[];
        outputs: {
            internalName: string;
            messageFormat: string;
        }[];
    };
    constructor(specs: any, options: ProcessorOptions, humanIK: HumanIK);
    onCreated: () => void;
    onProcessing: (deltaTime: number, inputs: {
        ikTargets?: ProtobufLibrary.ubii.dataStructure.IObject3DList;
        avatarCurrentPoses?: ProtobufLibrary.ubii.dataStructure.IObject3DList;
    }, outputs: any, state: {
        humanIK?: HumanIK;
    }) => Promise<{
        outputs: {
            avatarTargetVelocities: {
                object3DList: {
                    elements: {
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
                    }[];
                };
            };
        };
    } | undefined>;
}
