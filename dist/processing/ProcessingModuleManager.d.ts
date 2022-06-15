/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/processingModuleManager.js
 */
/// <reference types="node" />
import EventEmitter from 'events';
import * as workerpool from 'workerpool';
import ProcessingModule from './ProcessingModule';
import DeviceManager from '../devices/DeviceManager';
import TopicDataProxy from '../nodes/TopicDataProxy';
export default class ProcessingModuleManager extends EventEmitter {
    nodeID: any;
    topicData: TopicDataProxy;
    processingModules: Map<string, any>;
    ioMappings: Map<any, any>;
    pmTopicSubscriptions: Map<unknown, unknown[]>;
    lockstepTopicData: any;
    workerPool: workerpool.WorkerPool;
    deviceManager: DeviceManager;
    constructor(nodeID: any, topicData: TopicDataProxy);
    createModule(specs: any): any;
    initializeModule(pm: ProcessingModule): Promise<boolean>;
    addModule(pm: ProcessingModule): boolean;
    removeModule(pmSpecs: any): false | undefined;
    hasModuleID(id: string): boolean;
    getModuleBySpecs(pmSpecs: any, sessionID: any): any;
    getModuleByID(id: string): any;
    getModuleByName(name: any, sessionID: any): any;
    getModulesProcessing(): any[];
    getModulesByStatus(status: any): any[];
    startModule(pmSpec: any): Promise<void>;
    stopModule(pmSpec: any): Promise<void>;
    startAllSessionModules(session: any): Promise<void>;
    stopAllSessionModules(session: any): Promise<void>;
    applyIOMappings(ioMappings: any[], sessionID: any): Promise<void>;
    applyInputMappings(processingModule: any, inputMappings: any): Promise<void>;
    applyOutputMappings(processingModule: any, outputMappings: any): void;
    isValidIOMapping(processingModule: any, ioMapping: any): any;
    sendLockstepProcessingRequest(nodeId: any, request: any): Promise<unknown> | undefined;
    produceLockstepProcessingReply(lockstepProcessingRequest: any): any;
}
