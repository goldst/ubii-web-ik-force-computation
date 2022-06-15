/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/processingModule.js
 */
/// <reference types="node" />
import EventEmitter from 'events';
import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import { WorkerPool, Promise as WorkerPoolPromise } from 'workerpool';
export declare const PROCESSING_MODULE_EVENTS: Readonly<{
    NEW_INPUT: 1;
    LOCKSTEP_PASS: 2;
    PROCESSED: 3;
}>;
export default class ProcessingModule extends EventEmitter {
    id: string;
    inputs?: any[];
    outputs?: any[];
    language?: ProtobufLibrary.ubii.processing.ProcessingModule.Language;
    processingMode?: ProtobufLibrary.ubii.processing.IProcessingMode;
    onCreatedStringified?: string;
    onProcessingStringified?: string;
    onHaltedStringified?: string;
    onDestroyedStringified?: string;
    status: ProtobufLibrary.ubii.processing.ProcessingModule.Status;
    ioProxy: {
        [key: string]: Function;
    };
    state: any;
    translatorProtobuf: any;
    workerPool?: WorkerPool;
    openWorkerpoolExecutions: WorkerPoolPromise<any>[];
    originalOnProcessing?: (...args: any[]) => any;
    tLastProcess: number;
    inputTriggerNames: string[];
    name?: string;
    constructor(specs?: {});
    start(): boolean;
    stop(): Promise<boolean>;
    startProcessingByFrequency(): void;
    startProcessingByTriggerOnInput(): void;
    startProcessingByLockstep(): void;
    processingPass(): Promise<void>;
    setWorkerPool(workerPool: WorkerPool): Promise<void>;
    isWorkerpoolViable(workerPool: WorkerPool): Promise<boolean>;
    setOnCreated(callback: Function): void;
    setOnProcessing(callback: Function): void;
    setOnHalted(callback: Function): void;
    setOnDestroyed(callback: Function): void;
    onCreated: Function;
    /**
     * Lifecycle function to be called when module is supposed to process data.
     * Needs to be overwritten when extending this class, specified as a stringified version for the constructor or
     * set via setOnProcessing() before onProcessing() is called.
     */
    onProcessing: Function;
    onProcessingLockstepPass: (deltaTime: number, inputs?: {}) => Promise<any> | undefined;
    onHalted: Function;
    onDestroyed: Function;
    setInputGetter(internalName: string, getter: Function, overwrite?: boolean): boolean;
    setOutputSetter(internalName: string, setter: Function, overwrite?: boolean): boolean;
    removeIOAccessor(internalName: keyof ProcessingModule & keyof {
        [key: string]: Function;
    }): void;
    removeAllIOAccessors(): void;
    checkInternalName(internalName: string, overwrite?: boolean): boolean;
    readInput(name: keyof {
        [key: string]: Function;
    }): Function;
    writeOutput(name: keyof {
        [key: string]: Function;
    }, value: any): void;
    readAllInputData(): {
        [key: string]: Function;
    };
    writeAllOutputData(outputData: any): void;
    getIOMessageFormat(name: string): any;
    toString(): string;
    toProtobuf(): any;
}
