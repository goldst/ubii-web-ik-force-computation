/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/processingModule.js
 */

import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import { ProtobufTranslator, MSG_TYPES } from '@tum-far/ubii-msg-formats/src/js/index';
import { WorkerPool, Promise as WorkerPoolPromise } from 'workerpool';
import ExternalLibrariesService from './ExternalLibrariesService';
import Utils from '../utilities';

const ProcessingModuleProto = ProtobufLibrary.ubii.processing.ProcessingModule;

export const PROCESSING_MODULE_EVENTS = Object.freeze({
    NEW_INPUT: 1,
    LOCKSTEP_PASS: 2,
    PROCESSED: 3
});

export default class ProcessingModule extends EventEmitter {
    id: string = '';
    inputs?: any[];
    outputs?: any[];
    language?: ProtobufLibrary.ubii.processing.ProcessingModule.Language;
    processingMode?: ProtobufLibrary.ubii.processing.IProcessingMode;
    onCreatedStringified?: string;
    onProcessingStringified?: string;
    onHaltedStringified?: string;
    onDestroyedStringified?: string;
    status: ProtobufLibrary.ubii.processing.ProcessingModule.Status;
    ioProxy: { [key: string]: Function };
    state: any;
    translatorProtobuf: any;
    workerPool?: WorkerPool;
    openWorkerpoolExecutions: WorkerPoolPromise<any>[] = [];
    originalOnProcessing?: (...args: any[]) => any;
    tLastProcess: number = Date.now();
    inputTriggerNames: string[] = [];
    name?: string;

    constructor(specs = {}) {
        super();

        // take over specs
        //TODO: refactor to this.specs = specs and getters
        specs && Object.assign(this, specs);
        // new instance is getting new ID
        this.id = this.id || uuidv4();
        this.inputs = this.inputs || [];
        this.outputs = this.outputs || [];
        // check that language specification for module is correct
        if (this.language === undefined) this.language = ProcessingModuleProto.Language.JS;
        if (this.language !== ProcessingModuleProto.Language.JS) {
            console.error(
                'ProcessingModule ' + this.toString(),
                'trying to create module under javascript, but specification says ' +
                ProcessingModuleProto.Language[this.language]
            );
            throw new Error(
                'Incompatible language specifications (javascript vs. ' + ProcessingModuleProto.Language[this.language] + ')'
            );
        }
        // default processing mode
        if (!this.processingMode) {
            this.processingMode = { frequency: { hertz: 30 } };
        }

        if (this.onCreatedStringified) {
            this.onCreated = Utils.createFunctionFromString(this.onCreatedStringified);
        }
        if (this.onProcessingStringified) {
            this.onProcessing = Utils.createFunctionFromString(this.onProcessingStringified);
        }
        if (this.onHaltedStringified) {
            this.onHalted = Utils.createFunctionFromString(this.onHaltedStringified);
        }
        if (this.onDestroyedStringified) {
            this.onDestroyed = Utils.createFunctionFromString(this.onDestroyedStringified);
        }

        this.status = ProcessingModuleProto.Status.CREATED;

        this.ioProxy = {};

        //TODO: refactor away from old "interactions" setup
        // only kept for backwards compatibility testing
        this.state = {};
        Object.defineProperty(this.state, 'modules', {
            // modules are read-only
            get: () => {
                return ExternalLibrariesService.instance.getExternalLibraries();
            },
            configurable: true
        });

        this.translatorProtobuf = new ProtobufTranslator(MSG_TYPES.PM);
    }

    /* execution control */

    start() {
        if (this.workerPool) {
            this.openWorkerpoolExecutions = [];
        }
        if (!this.processingMode) {
            console.error(this.toString(), 'no processing mode specified, can not start processing');
            return false;
        }

        if (this.processingMode.frequency) {
            this.startProcessingByFrequency();
        } else if (this.processingMode.triggerOnInput) {
            this.startProcessingByTriggerOnInput();
        } else if (this.processingMode.lockstep) {
            this.startProcessingByLockstep();
        }

        if (this.status === ProcessingModuleProto.Status.PROCESSING) {
            let message = 'started';
            if (this.workerPool) {
                message += ' (using workerpool)';
            } else {
                message += ' (without workerpool)';
            }
            console.log(this.toString(), message);
            return true;
        }

        return false;
    }

    async stop() {
        if (this.status === ProcessingModuleProto.Status.HALTED) {
            return false;
        }

        this.onHalted && (await this.onHalted());
        this.status = ProcessingModuleProto.Status.HALTED;

        this.removeAllListeners(`${PROCESSING_MODULE_EVENTS.NEW_INPUT}`);
        this.onProcessingLockstepPass = () => {
            return undefined;
        };

        if (this.workerPool) {
            for (let exec of this.openWorkerpoolExecutions) {
                console.warn('Attempted to stop workerpool executions. This is not possible in this version.');
                //exec.cancel();
            }
        }

        console.log(this.toString(), 'stopped');

        return true;
    }

    startProcessingByFrequency() {
        this.status = ProcessingModuleProto.Status.PROCESSING; //TODO: unify with other start... in start()

        this.tLastProcess = Date.now(); //TODO: unify with other start... in start()
        let targetFrequencyMillis = 1000 / this.processingMode!.frequency!.hertz!;

        /*this.intervalProcessing = setInterval(async () => {
          await this.processingPass();
          if (this.status !== ProcessingModuleProto.Status.PROCESSING) {
            this.intervalProcessing && clearInterval(this.intervalProcessing);
          }
        }, targetFrequencyMillis);*/

        let process = async () => {
            await this.processingPass();
            if (this.status === ProcessingModuleProto.Status.PROCESSING) {
                let tRemaining = this.tLastProcess + targetFrequencyMillis - Date.now();
                /*if (tRemaining < 0) {
                  namida.warn(
                    this.toString(),
                    'overshooting target frequency by ' +
                      Math.abs(tRemaining) +
                      ' - consider throttling down processing frequency'
                  );
                }*/
                setTimeout(process, tRemaining);
            }
        };
        process();
    }

    startProcessingByTriggerOnInput() {
        this.status = ProcessingModuleProto.Status.PROCESSING;

        let allInputsNeedUpdate = this.processingMode!.triggerOnInput!.allInputsNeedUpdate!;
        let minDelayMs = this.processingMode!.triggerOnInput!.minDelayMs!;

        this.tLastProcess = Date.now();

        let checkProcessingNeeded = false;
        let checkProcessing = () => {
            if (this.status !== ProcessingModuleProto.Status.PROCESSING) return;

            let inputUpdatesFulfilled =
                !allInputsNeedUpdate || (this.inputs?.every((element) => this.inputTriggerNames.includes(element.internalName)) ?? true);
            let minDelayFulfilled = !minDelayMs || Date.now() - this.tLastProcess >= minDelayMs;
            if (inputUpdatesFulfilled && minDelayFulfilled) {
                this.state.inputTriggerNames = [...this.inputTriggerNames]; // copy those input names that received update trigger to state
                this.inputTriggerNames = [];

                this.processingPass();
            }
            checkProcessingNeeded = false;
        };

        this.inputTriggerNames = [];
        this.on(`${PROCESSING_MODULE_EVENTS.NEW_INPUT}`, (inputName) => {
            if (!this.inputTriggerNames.includes(inputName)) this.inputTriggerNames.push(inputName);
            if (!checkProcessingNeeded) {
                checkProcessingNeeded = true;
                setImmediate(() => {
                    checkProcessing();
                });
            }
        });
    }

    startProcessingByLockstep() {
        this.status = ProcessingModuleProto.Status.PROCESSING;

        this.onProcessingLockstepPass = (deltaTime: number, inputs = this.readAllInputData()) => {
            return new Promise((resolve, reject) => {
                try {
                    let outputData = this.onProcessing(deltaTime, inputs, this.state);
                    return resolve(outputData);
                } catch (error) {
                    return reject(error);
                }
            });
        };
    }

    async processingPass() {
        let tNow = Date.now();
        let deltaTime = tNow - this.tLastProcess;
        this.tLastProcess = tNow;

        let inputData = this.readAllInputData();

        try {
            let { outputs, state } = await this.onProcessing(deltaTime, inputData, [], this.state);
            outputs && this.writeAllOutputData(outputs);
            this.state = state ? state : this.state;
        } catch (error) {
            // onProcessing pass might be canceled when run on workerpool
        }
    }

    async setWorkerPool(workerPool: WorkerPool) {
        let viable = await this.isWorkerpoolViable(workerPool);

        if (viable) {
            this.workerPool = workerPool;

            // redefine onProcessing to be executed via workerpool
            this.originalOnProcessing = this.onProcessing as (...args: any[]) => any;
            let workerpoolOnProcessing = async (deltaTime: number, inputs: any[], state: any) => {
                let wpExecPromise = this.workerPool!
                    .exec(this.originalOnProcessing!, [deltaTime, inputs, state])
                    .catch((error) => {
                        if (!error.message || error.message !== 'promise cancelled') {
                            // executuion was not just cancelled via workerpool API
                            console.error(this.toString(), 'workerpool execution failed - ' + error + '\n' + error.stack);
                        }
                    });
                this.openWorkerpoolExecutions.push(wpExecPromise);
                let results = await wpExecPromise;
                this.openWorkerpoolExecutions.splice(this.openWorkerpoolExecutions.indexOf(wpExecPromise), 1);
                return results;
            };
            this.onProcessing = workerpoolOnProcessing;
        } else {
            console.warn(this.toString(), 'not viable to be executed via workerpool, might slow down system significantly');
        }
    }

    async isWorkerpoolViable(workerPool: WorkerPool) {
        try {
            await workerPool.exec(this.onProcessing as any, [1, this.readAllInputData(), [], this.state]);
            return true;
        } catch (error) {
            return false;
        }
    }

    /* execution control end */

    /* lifecycle functions */

    setOnCreated(callback: Function) {
        this.onCreated = callback;
    }

    setOnProcessing(callback: Function) {
        this.onProcessing = callback;
    }

    setOnHalted(callback: Function) {
        this.onHalted = callback;
    }

    setOnDestroyed(callback: Function) {
        this.onDestroyed = callback;
    }

    onCreated: Function = () => { }

    /**
     * Lifecycle function to be called when module is supposed to process data.
     * Needs to be overwritten when extending this class, specified as a stringified version for the constructor or
     * set via setOnProcessing() before onProcessing() is called.
     */
    onProcessing: Function = (deltaTime: number, inputs: any[], outputs: any[], state: any) => {
        let errorMsg =
            'onProcessing callback is not specified, called with' +
            '\ndeltaTime: ' +
            deltaTime +
            '\ninputs:\n' +
            inputs +
            '\noutputs:\n' +
            outputs +
            '\nstate:\n' +
            state;
        console.error(this.toString(), errorMsg);
        throw new Error(this.toString() + ' - onProcessing() callback is not specified');
    }

    onProcessingLockstepPass: (deltaTime: number, inputs?: {}) => Promise<any> | undefined = () => {
        return undefined;
    }

    onHalted: Function = () => { }

    onDestroyed: Function = () => { }

    /* lifecycle functions end */

    /* I/O functions */

    setInputGetter(internalName: string, getter: Function, overwrite = false) {
        // check internal naming is viable
        if (!this.checkInternalName(internalName, overwrite)) {
            return false;
        }

        // make sure getter is defined
        if (getter === undefined) {
            console.error(this.toString(), 'trying to set input getter for ' + internalName + ' but getter is undefined');
            return false;
        }
        // make sure getter is a function
        if (typeof getter !== 'function') {
            console.error(this.toString(), 'trying to set input getter for ' + internalName + ' but getter is not a function');
            return false;
        }

        // make sure we're clean
        this.removeIOAccessor(internalName as unknown as keyof ProcessingModule & { [key: string]: Function; });
        // define getter for both ioProxy and module itself (as shortcut), input is read-only
        [this.ioProxy, this].forEach((object) => {
            Object.defineProperty(object, internalName, {
                get: () => {
                    return getter();
                },
                configurable: true,
                enumerable: true
            });
        });

        return true;
    }

    setOutputSetter(internalName: string, setter: Function, overwrite = false) {
        // check internal naming is viable
        if (!this.checkInternalName(internalName, overwrite)) {
            return false;
        }

        // make sure setter is defined
        if (setter === undefined) {
            console.error(this.toString(), 'trying to set output setter for ' + internalName + ' but setter is undefined');
            return false;
        }
        // make sure setter is a function
        if (typeof setter !== 'function') {
            console.error(
                this.toString(),
                'trying to set output setter for ' + internalName + ' but setter is not a function'
            );
            return false;
        }

        // make sure we're clean
        this.removeIOAccessor(internalName as unknown as keyof ProcessingModule & { [key: string]: Function; });
        // define setter for both ioProxy and module itself (as shortcut), output is write-only
        [this.ioProxy, this].forEach((object) => {
            Object.defineProperty(object, internalName, {
                set: (value) => {
                    setter(value);
                },
                configurable: true,
                enumerable: true
            });
        });

        return true;
    }

    removeIOAccessor(internalName: keyof ProcessingModule & keyof { [key: string]: Function }) {
        if (this.ioProxy.hasOwnProperty(internalName)) {
            delete this.ioProxy[internalName];
            delete this[internalName as keyof ProcessingModule];
        }
    }

    removeAllIOAccessors() {
        for (let key in this.ioProxy) {
            this.removeIOAccessor(key as unknown as (keyof ProcessingModule & keyof { [key: string]: Function; }));
        }
    }

    checkInternalName(internalName: string, overwrite = false) {
        // case: name that is a property of this class and explicitly not an otherwise viable internal name
        // and should therefore never be overwritten
        if (this.hasOwnProperty(internalName) && !this.ioProxy.hasOwnProperty(internalName)) {
            console.error(
                this.toString(),
                'the internal I/O naming "' + internalName + '" should not be used as it conflicts with internal properties'
            );
            return false;
        }
        // case: we're not using an already defined name without specifying to overwrite
        if (this.ioProxy.hasOwnProperty(internalName) && !overwrite) {
            console.error(
                this.toString(),
                'the internal I/O naming "' + internalName + '" is already defined (overwrite not specified)'
            );
            return false;
        }
        // case: the internal name is empty
        if (internalName === '') {
            console.error(this.toString(), 'the internal I/O naming "' + internalName + '" can\'t be used (empty)');
            return false;
        }

        return true;
    }

    readInput(name: keyof { [key: string]: Function; }) {
        return this.ioProxy[name];
    }

    writeOutput(name: keyof { [key: string]: Function; }, value: any) {
        this.ioProxy[name] = value;
    }

    /* I/O functions end */

    /* helper functions */

    readAllInputData() {
        let inputData: { [key: string] : Function } = {};
        for (let input of this.inputs || []) {
            inputData[input.internalName] = this.ioProxy[input.internalName];
        }

        return inputData;
    }

    writeAllOutputData(outputData: any) {
        if (!outputData) return;

        for (let outputSpec of this.outputs || []) {
            let output = outputData[outputSpec.internalName];
            if (typeof output !== 'undefined') {
                this.ioProxy[outputSpec.internalName] = output;
            }
        }
    }

    getIOMessageFormat(name: string) {
        let ios = [...(this.inputs ?? []), ...(this.outputs ?? [])];
        let io = ios.find((io) => {
            return io.internalName === name;
        });

        return io.messageFormat;
    }

    toString() {
        return 'ProcessingModule ' + this.name + ' (ID ' + this.id + ')';
    }

    toProtobuf() {
        return this.translatorProtobuf.createMessageFromPayload(this);
    }

    /* helper functions end */
}
