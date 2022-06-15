/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/processingModuleManager.js
 */

import EventEmitter from 'events';
import * as workerpool from 'workerpool';
import { RuntimeTopicData } from '@tum-far/ubii-topic-data';
import ProcessingModule, { PROCESSING_MODULE_EVENTS } from './ProcessingModule';
import Utils from '../utilities';
import ProtobufLibrary from '@tum-far/ubii-msg-formats/dist/js/protobuf';
import { ProcessingModuleStorage } from '../storage/ProcessingModuleStorage';
import DeviceManager from '../devices/DeviceManager';
import TopicDataProxy from '../nodes/TopicDataProxy';

const ProcessingModuleProto = ProtobufLibrary.ubii.processing.ProcessingModule;

const EVENTS = Object.freeze({
    PM_STARTED: 'PM_STARTED',
    PM_STOPPED: 'PM_STOPPED'
});

export default class ProcessingModuleManager extends EventEmitter {
    nodeID: any;
    topicData: TopicDataProxy;
    processingModules: Map<string, any>;
    ioMappings: Map<any, any>;
    pmTopicSubscriptions: Map<unknown, unknown[]>;
    lockstepTopicData: any;
    workerPool: workerpool.WorkerPool;
    deviceManager: DeviceManager;

    constructor(nodeID: any, topicData: TopicDataProxy) {
        super();

        this.nodeID = nodeID;
        this.deviceManager = DeviceManager.instance;
        this.topicData = topicData;

        this.processingModules = new Map();
        this.ioMappings = new Map();
        this.pmTopicSubscriptions = new Map();

        //TODO: optimize for use without real TopicData, avoiding write/read cycles for each lockstep request/reply
        this.lockstepTopicData = new RuntimeTopicData();
        /*this.lockstepInputTopicdata = {
          records: []
        };
        this.lockstepOutputTopicdata = {
          records: []
        };*/

        this.workerPool = workerpool.pool();
    }

    createModule(specs: any) {
        if (specs.id && this.processingModules.has(specs.id)) {
            console.error(
                'ProcessingModuleManager',
                "can't create module " + specs.name + ', ID already exists: ' + specs.id
            );
        }

        let pm = undefined;
        if (ProcessingModuleStorage.instance.hasEntry(specs.name)) {
            pm = ProcessingModuleStorage.instance.createInstance(specs);
        } else {
            // create new module based on specs
            if (!specs.onProcessingStringified) {
                console.error(
                    'ProcessingModuleManager',
                    'can\'t create PM "' + specs.name + '" based on specs, missing onProcessing definition.'
                );
                return undefined;
            }
            pm = new ProcessingModule(specs);
        }
        pm.nodeId = this.nodeID;

        let success = this.addModule(pm);
        if (!success) {
            return undefined;
        } else {
            pm.initialized = this.initializeModule(pm);
            return pm;
        }
    }

    async initializeModule(pm: ProcessingModule) {
        try {
            pm.onCreated && (await pm.onCreated(pm.state));
            await pm.setWorkerPool(this.workerPool);

            return true;
        } catch (error) {
            console.error(this.toString(), 'PM initialization error:\n' + error);
            return false;
        }
    }

    addModule(pm: ProcessingModule) {
        if (!pm.id) {
            console.error('ProcessingModuleManager', 'module ' + pm.name + " does not have an ID, can't add");
            return false;
        }
        this.processingModules.set(pm.id, pm);
        return true;
    }

    removeModule(pmSpecs: any) {
        if (!pmSpecs.id) {
            console.error('ProcessingModuleManager', 'module ' + pmSpecs.name + " does not have an ID, can't remove");
            return false;
        }

        if (this.pmTopicSubscriptions.has(pmSpecs.id)) {
            let subscriptionTokens = this.pmTopicSubscriptions.get(pmSpecs.id)!;
            subscriptionTokens.forEach((token) => {
                this.topicData.unsubscribe(token);
            });
            this.pmTopicSubscriptions.delete(pmSpecs.id);
        }

        this.processingModules.delete(pmSpecs.id);
    }

    hasModuleID(id: string) {
        return this.processingModules.has(id);
    }

    getModuleBySpecs(pmSpecs: any, sessionID: any) {
        return this.getModuleByID(pmSpecs.id) || this.getModuleByName(pmSpecs.name, sessionID);
    }

    getModuleByID(id: string) {
        return this.processingModules.get(id);
    }

    getModuleByName(name: any, sessionID: any) {
        let candidates: any[] = [];
        this.processingModules.forEach((pm) => {
            if (pm.name === name) {
                candidates.push(pm);
            }
        });

        if (sessionID) {
            candidates = candidates.filter((element) => element.sessionId === sessionID);
        }

        if (candidates.length > 1) {
            console.error(
                'ProcessingModuleManager',
                'trying to get PM by name (' + name + ') resulted in multiple candidates'
            );
        } else {
            return candidates[0];
        }
    }

    getModulesProcessing() {
        return this.getModulesByStatus(ProcessingModuleProto.Status.PROCESSING);
    }

    getModulesByStatus(status: any) {
        return Array.from(this.processingModules)
            .map((keyValue) => {
                return keyValue[1];
            })
            .filter((pm) => pm.status === status);
    }

    /* running modules */

    async startModule(pmSpec: any) {
        let pm = this.processingModules.get(pmSpec.id);
        await pm.initialized;
        pm && pm.start();
        this.emit(EVENTS.PM_STARTED, pmSpec);
    }

    async stopModule(pmSpec: any) {
        let pm = this.processingModules.get(pmSpec.id);
        pm && (await pm.stop());
        this.emit(EVENTS.PM_STOPPED, pmSpec);
        let subs = this.pmTopicSubscriptions.get(pmSpec.id);
        subs &&
            subs.forEach((token) => {
                this.topicData.unsubscribe(token);
            });
    }

    async startAllSessionModules(session: any) {
        const values = Array.from(this.processingModules.values())
        for (let pm of values) {
            if (pm.sessionId === session.id) {
                await this.startModule({ id: pm.id });
            }
        }
    }

    async stopAllSessionModules(session: any) {
        const values = Array.from(this.processingModules.values())
        for (let pm of values) {
            if (pm.sessionId === session.id) {
                await this.stopModule({ id: pm.id });
            }
        }
    }

    /* I/O <-> topic mapping functions */

    async applyIOMappings(ioMappings: any[], sessionID: any) {
        // filter out I/O mappings for PMs that run on this node
        let applicableIOMappings = ioMappings.filter((ioMapping) =>
            this.processingModules.has(ioMapping.processingModuleId)
        );

        for (let mapping of applicableIOMappings) {
            this.ioMappings.set(mapping.processingModuleId, mapping);
            let processingModule =
                this.getModuleByID(mapping.processingModuleId) || this.getModuleByName(mapping.processingModuleName, sessionID);
            if (!processingModule) {
                console.error(
                    'ProcessingModuleManager',
                    "can't find processing module for I/O mapping, given: ID = " +
                    mapping.processingModuleId +
                    ', name = ' +
                    mapping.processingModuleName +
                    ', session ID = ' +
                    sessionID
                );
                return;
            }

            // connect inputs
            mapping.inputMappings && (await this.applyInputMappings(processingModule, mapping.inputMappings));

            // connect outputs
            mapping.outputMappings && this.applyOutputMappings(processingModule, mapping.outputMappings);
        }
    }

    async applyInputMappings(processingModule: any, inputMappings: any) {
        let isLockstep = processingModule.processingMode && processingModule.processingMode.lockstep;
        let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;

        for (let inputMapping of inputMappings) {
            if (!this.isValidIOMapping(processingModule, inputMapping)) {
                console.error(
                    'ProcessingModuleManager',
                    'IO-Mapping for module ' + processingModule.name + '->' + inputMapping.inputName + ' is invalid'
                );
                return;
            }

            let topicSource =
                inputMapping[inputMapping.topicSource] ||
                inputMapping.topicSource ||
                inputMapping.topic ||
                inputMapping.topicMux;

            let isTopicMuxer = typeof topicSource === 'object';

            // set approriate input getter
            let inputGetterCallback = undefined;
            let multiplexer: any = undefined;
            // single topic input
            if (!isTopicMuxer) {
                inputGetterCallback = () => {
                    return topicDataBuffer.pull(topicSource);
                };
            }
            // topic muxer input
            else if (isTopicMuxer) {
                multiplexer =
                    this.deviceManager.getTopicMuxer(topicSource.id) ||
                    (await this.deviceManager.createTopicMuxer(topicSource, topicDataBuffer));

                inputGetterCallback = () => {
                    return multiplexer.getRecords();
                };
            }
            processingModule.setInputGetter(inputMapping.inputName, inputGetterCallback);

            // subscribe to topics necessary for PM (if not lockstep), set input event emitter in case of trigger on input mode
            if (!isLockstep) {
                // if mode frequency, we do nothing but subscribe nonetheless to indicate our PM on this node needs the topic
                //TODO: allow undefined callbacks? potential ambiguous scenarios?
                let callback: Function = () => { };
                // if PM is triggered on input, notify PM for new input
                //TODO: needs to be done for topic muxer too? does it make sense for accumulated topics to trigger processing?
                // use-case seems not to match but leaving opportunity open could be nice
                if (processingModule.processingMode && processingModule.processingMode.triggerOnInput) {
                    if (!isTopicMuxer) {
                        callback = () => {
                            processingModule.emit(PROCESSING_MODULE_EVENTS.NEW_INPUT, inputMapping.inputName);
                        };
                    } else if (isTopicMuxer) {
                        callback = (record: any) => {
                            multiplexer.onTopicData(record);
                            processingModule.emit(PROCESSING_MODULE_EVENTS.NEW_INPUT, inputMapping.inputName);
                        };
                    }
                }

                // single topic input
                if (!isTopicMuxer) {
                    let subscriptionToken = await topicDataBuffer.subscribe(topicSource, callback);
                    if (!this.pmTopicSubscriptions.has(processingModule.id)) {
                        this.pmTopicSubscriptions.set(processingModule.id, []);
                    }
                    this.pmTopicSubscriptions.get(processingModule.id)?.push(subscriptionToken);
                }
                // topic muxer input
                else if (isTopicMuxer) {
                    let subscriptionToken = await topicDataBuffer.subscribeRegex(topicSource.topicSelector, callback);
                    if (!this.pmTopicSubscriptions.has(processingModule.id)) {
                        this.pmTopicSubscriptions.set(processingModule.id, []);
                    }
                    this.pmTopicSubscriptions.get(processingModule.id)?.push(subscriptionToken);
                }
            }
        }
    }

    applyOutputMappings(processingModule: any, outputMappings: any) {
        let isLockstep = processingModule.processingMode && processingModule.processingMode.lockstep;
        let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;

        for (let outputMapping of outputMappings) {
            if (!this.isValidIOMapping(processingModule, outputMapping)) {
                console.error(
                    'ProcessingModuleManager',
                    'OutputMapping for module ' +
                    processingModule.toString() +
                    ' -> "' +
                    outputMapping.outputName +
                    '" is invalid'
                );
                console.error('ProcessingModuleManager', outputMapping);
                return;
            }

            let topicDestination =
                outputMapping[outputMapping.topicDestination] ||
                outputMapping.topicDestination ||
                outputMapping.topic ||
                outputMapping.topicDemux;
            // single topic output
            if (typeof topicDestination === 'string') {
                let messageFormat = processingModule.getIOMessageFormat(outputMapping.outputName);
                let type = Utils.getTopicDataTypeFromMessageFormat(messageFormat);

                processingModule.setOutputSetter(outputMapping.outputName, (record: any) => {
                    if (!record[type]) {
                        console.error(
                            processingModule.toString(),
                            'Output "' +
                            outputMapping.outputName +
                            '" (topic=' +
                            topicDestination +
                            ') returned without any value for "' +
                            type +
                            '" after processing.'
                        );
                        return;
                    }

                    record.topic = topicDestination;
                    record.type = type;
                    record.timestamp = Utils.generateTimestamp();
                    topicDataBuffer.publish(record.topic, record);
                });

                /*// lockstep mode
                  if (isLockstep) {
                    processingModule.setOutputSetter(inputMapping.inputName, (value) => {
                      let record = { topic: topicDestination };
                      record.type = type;
                      record[type] = value;
                      this.lockstepOutputTopicdata.records.push(record);
                    });
                  }
                  // all async modes (immediate cycles, frequency, input trigger) - directly publish to topicdata buffer
                  processingModule.setOutputSetter(outputMapping.outputName, (value) => {
                    this.topicData.publish(topicDestination, value, type);
                  });*/
            }
            // topic demuxer output
            else if (typeof topicDestination === 'object') {
                let demultiplexer =
                    this.deviceManager.getTopicDemuxer(topicDestination.id) ||
                    this.deviceManager.createTopicDemuxer(topicDestination, topicDataBuffer);

                processingModule.setOutputSetter(outputMapping.outputName, (demuxerRecordList: any) => {
                    demultiplexer.publish(demuxerRecordList);
                });
            }
        }
    }

    isValidIOMapping(processingModule: any, ioMapping: any) {
        if (ioMapping.inputName) {
            return processingModule.inputs.some((element: any) => element.internalName === ioMapping.inputName);
        } else if (ioMapping.outputName) {
            return processingModule.outputs.some((element: any) => element.internalName === ioMapping.outputName);
        }

        return false;
    }

    /* I/O <-> topic mapping functions end */

    /* lockstep processing functions */

    sendLockstepProcessingRequest(nodeId: any, request: any) {
        if (nodeId === this.nodeID) {
            // server side PM
            return new Promise((resolve, reject) => {
                // assign input
                request.records.forEach((record: any) => {
                    //TODO: refactor without use of extra topicdata to avoid write/read cycles
                    this.lockstepTopicData.publish(record.topic, record);
                });
                //this.lockstepInputTopicdata.records = request.records;
                //TODO: need to map input names for lockstepInputTopicdata to records so it can be passed as second argument to onProcessingLockstepPass()
                // clear output
                //this.lockstepOutputTopicdata.records = [];

                // lockstep pass calls to PMs
                let lockstepPasses: any[] = [];
                request.processingModuleIds.forEach((id: any) => {
                    lockstepPasses.push(this.processingModules.get(id).onProcessingLockstepPass(request.deltaTimeMs));
                });

                Promise.all(lockstepPasses).then(() => {
                    let reply = this.produceLockstepProcessingReply(request);
                    return resolve(reply);
                });
            });
        }
    }

    produceLockstepProcessingReply(lockstepProcessingRequest: any) {
        let lockstepProcessingReply: any = {
            processingModuleIds: [],
            records: []
        };
        lockstepProcessingRequest.processingModuleIds.forEach((id: any) => {
            lockstepProcessingReply.processingModuleIds.push(id);
            this.processingModules.get(id)?.outputs?.forEach((pmOutput: any) => {
                let outputMapping = this.ioMappings
                    .get(id)
                    .outputMappings.find((mapping: any) => mapping.outputName === pmOutput.internalName);
                let destination = outputMapping[outputMapping.topicDestination] || outputMapping.topicDestination;

                // single topic
                let topicdataEntry = this.lockstepTopicData.pull(destination);
                if (topicdataEntry) {
                    let record: any = {
                        topic: destination,
                        type: topicdataEntry.type
                    };
                    record[record.type] = topicdataEntry.data;
                    lockstepProcessingReply.records.push(record);
                }
                //TODO: handle demuxer output
            });
        });

        return lockstepProcessingReply;
    }

    /* lockstep processing functions end */
}
