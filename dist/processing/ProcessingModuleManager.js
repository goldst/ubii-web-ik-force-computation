"use strict";
/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/processingModuleManager.js
 */
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
const events_1 = __importDefault(require("events"));
const workerpool = __importStar(require("workerpool"));
const ubii_topic_data_1 = require("@tum-far/ubii-topic-data");
const ProcessingModule_1 = __importStar(require("./ProcessingModule"));
const utilities_1 = __importDefault(require("../utilities"));
const protobuf_1 = __importDefault(require("@tum-far/ubii-msg-formats/dist/js/protobuf"));
const ProcessingModuleStorage_1 = require("../storage/ProcessingModuleStorage");
const DeviceManager_1 = __importDefault(require("../devices/DeviceManager"));
const ProcessingModuleProto = protobuf_1.default.ubii.processing.ProcessingModule;
const EVENTS = Object.freeze({
    PM_STARTED: 'PM_STARTED',
    PM_STOPPED: 'PM_STOPPED'
});
class ProcessingModuleManager extends events_1.default {
    constructor(nodeID, topicData) {
        super();
        this.nodeID = nodeID;
        this.deviceManager = DeviceManager_1.default.instance;
        this.topicData = topicData;
        this.processingModules = new Map();
        this.ioMappings = new Map();
        this.pmTopicSubscriptions = new Map();
        //TODO: optimize for use without real TopicData, avoiding write/read cycles for each lockstep request/reply
        this.lockstepTopicData = new ubii_topic_data_1.RuntimeTopicData();
        /*this.lockstepInputTopicdata = {
          records: []
        };
        this.lockstepOutputTopicdata = {
          records: []
        };*/
        this.workerPool = workerpool.pool();
    }
    createModule(specs) {
        if (specs.id && this.processingModules.has(specs.id)) {
            console.error('ProcessingModuleManager', "can't create module " + specs.name + ', ID already exists: ' + specs.id);
        }
        let pm = undefined;
        if (ProcessingModuleStorage_1.ProcessingModuleStorage.instance.hasEntry(specs.name)) {
            pm = ProcessingModuleStorage_1.ProcessingModuleStorage.instance.createInstance(specs);
        }
        else {
            // create new module based on specs
            if (!specs.onProcessingStringified) {
                console.error('ProcessingModuleManager', 'can\'t create PM "' + specs.name + '" based on specs, missing onProcessing definition.');
                return undefined;
            }
            pm = new ProcessingModule_1.default(specs);
        }
        pm.nodeId = this.nodeID;
        let success = this.addModule(pm);
        if (!success) {
            return undefined;
        }
        else {
            pm.initialized = this.initializeModule(pm);
            return pm;
        }
    }
    initializeModule(pm) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                pm.onCreated && (yield pm.onCreated(pm.state));
                yield pm.setWorkerPool(this.workerPool);
                return true;
            }
            catch (error) {
                console.error(this.toString(), 'PM initialization error:\n' + error);
                return false;
            }
        });
    }
    addModule(pm) {
        if (!pm.id) {
            console.error('ProcessingModuleManager', 'module ' + pm.name + " does not have an ID, can't add");
            return false;
        }
        this.processingModules.set(pm.id, pm);
        return true;
    }
    removeModule(pmSpecs) {
        if (!pmSpecs.id) {
            console.error('ProcessingModuleManager', 'module ' + pmSpecs.name + " does not have an ID, can't remove");
            return false;
        }
        if (this.pmTopicSubscriptions.has(pmSpecs.id)) {
            let subscriptionTokens = this.pmTopicSubscriptions.get(pmSpecs.id);
            subscriptionTokens.forEach((token) => {
                this.topicData.unsubscribe(token);
            });
            this.pmTopicSubscriptions.delete(pmSpecs.id);
        }
        this.processingModules.delete(pmSpecs.id);
    }
    hasModuleID(id) {
        return this.processingModules.has(id);
    }
    getModuleBySpecs(pmSpecs, sessionID) {
        return this.getModuleByID(pmSpecs.id) || this.getModuleByName(pmSpecs.name, sessionID);
    }
    getModuleByID(id) {
        return this.processingModules.get(id);
    }
    getModuleByName(name, sessionID) {
        let candidates = [];
        this.processingModules.forEach((pm) => {
            if (pm.name === name) {
                candidates.push(pm);
            }
        });
        if (sessionID) {
            candidates = candidates.filter((element) => element.sessionId === sessionID);
        }
        if (candidates.length > 1) {
            console.error('ProcessingModuleManager', 'trying to get PM by name (' + name + ') resulted in multiple candidates');
        }
        else {
            return candidates[0];
        }
    }
    getModulesProcessing() {
        return this.getModulesByStatus(ProcessingModuleProto.Status.PROCESSING);
    }
    getModulesByStatus(status) {
        return Array.from(this.processingModules)
            .map((keyValue) => {
            return keyValue[1];
        })
            .filter((pm) => pm.status === status);
    }
    /* running modules */
    startModule(pmSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            let pm = this.processingModules.get(pmSpec.id);
            yield pm.initialized;
            pm && pm.start();
            this.emit(EVENTS.PM_STARTED, pmSpec);
        });
    }
    stopModule(pmSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            let pm = this.processingModules.get(pmSpec.id);
            pm && (yield pm.stop());
            this.emit(EVENTS.PM_STOPPED, pmSpec);
            let subs = this.pmTopicSubscriptions.get(pmSpec.id);
            subs &&
                subs.forEach((token) => {
                    this.topicData.unsubscribe(token);
                });
        });
    }
    startAllSessionModules(session) {
        return __awaiter(this, void 0, void 0, function* () {
            const values = Array.from(this.processingModules.values());
            for (let pm of values) {
                if (pm.sessionId === session.id) {
                    yield this.startModule({ id: pm.id });
                }
            }
        });
    }
    stopAllSessionModules(session) {
        return __awaiter(this, void 0, void 0, function* () {
            const values = Array.from(this.processingModules.values());
            for (let pm of values) {
                if (pm.sessionId === session.id) {
                    yield this.stopModule({ id: pm.id });
                }
            }
        });
    }
    /* I/O <-> topic mapping functions */
    applyIOMappings(ioMappings, sessionID) {
        return __awaiter(this, void 0, void 0, function* () {
            // filter out I/O mappings for PMs that run on this node
            let applicableIOMappings = ioMappings.filter((ioMapping) => this.processingModules.has(ioMapping.processingModuleId));
            for (let mapping of applicableIOMappings) {
                this.ioMappings.set(mapping.processingModuleId, mapping);
                let processingModule = this.getModuleByID(mapping.processingModuleId) || this.getModuleByName(mapping.processingModuleName, sessionID);
                if (!processingModule) {
                    console.error('ProcessingModuleManager', "can't find processing module for I/O mapping, given: ID = " +
                        mapping.processingModuleId +
                        ', name = ' +
                        mapping.processingModuleName +
                        ', session ID = ' +
                        sessionID);
                    return;
                }
                // connect inputs
                mapping.inputMappings && (yield this.applyInputMappings(processingModule, mapping.inputMappings));
                // connect outputs
                mapping.outputMappings && this.applyOutputMappings(processingModule, mapping.outputMappings);
            }
        });
    }
    applyInputMappings(processingModule, inputMappings) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let isLockstep = processingModule.processingMode && processingModule.processingMode.lockstep;
            let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;
            for (let inputMapping of inputMappings) {
                if (!this.isValidIOMapping(processingModule, inputMapping)) {
                    console.error('ProcessingModuleManager', 'IO-Mapping for module ' + processingModule.name + '->' + inputMapping.inputName + ' is invalid');
                    return;
                }
                let topicSource = inputMapping[inputMapping.topicSource] ||
                    inputMapping.topicSource ||
                    inputMapping.topic ||
                    inputMapping.topicMux;
                let isTopicMuxer = typeof topicSource === 'object';
                // set approriate input getter
                let inputGetterCallback = undefined;
                let multiplexer = undefined;
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
                            (yield this.deviceManager.createTopicMuxer(topicSource, topicDataBuffer));
                    inputGetterCallback = () => {
                        return multiplexer.getRecords();
                    };
                }
                processingModule.setInputGetter(inputMapping.inputName, inputGetterCallback);
                // subscribe to topics necessary for PM (if not lockstep), set input event emitter in case of trigger on input mode
                if (!isLockstep) {
                    // if mode frequency, we do nothing but subscribe nonetheless to indicate our PM on this node needs the topic
                    //TODO: allow undefined callbacks? potential ambiguous scenarios?
                    let callback = () => { };
                    // if PM is triggered on input, notify PM for new input
                    //TODO: needs to be done for topic muxer too? does it make sense for accumulated topics to trigger processing?
                    // use-case seems not to match but leaving opportunity open could be nice
                    if (processingModule.processingMode && processingModule.processingMode.triggerOnInput) {
                        if (!isTopicMuxer) {
                            callback = () => {
                                processingModule.emit(ProcessingModule_1.PROCESSING_MODULE_EVENTS.NEW_INPUT, inputMapping.inputName);
                            };
                        }
                        else if (isTopicMuxer) {
                            callback = (record) => {
                                multiplexer.onTopicData(record);
                                processingModule.emit(ProcessingModule_1.PROCESSING_MODULE_EVENTS.NEW_INPUT, inputMapping.inputName);
                            };
                        }
                    }
                    // single topic input
                    if (!isTopicMuxer) {
                        let subscriptionToken = yield topicDataBuffer.subscribe(topicSource, callback);
                        if (!this.pmTopicSubscriptions.has(processingModule.id)) {
                            this.pmTopicSubscriptions.set(processingModule.id, []);
                        }
                        (_a = this.pmTopicSubscriptions.get(processingModule.id)) === null || _a === void 0 ? void 0 : _a.push(subscriptionToken);
                    }
                    // topic muxer input
                    else if (isTopicMuxer) {
                        let subscriptionToken = yield topicDataBuffer.subscribeRegex(topicSource.topicSelector, callback);
                        if (!this.pmTopicSubscriptions.has(processingModule.id)) {
                            this.pmTopicSubscriptions.set(processingModule.id, []);
                        }
                        (_b = this.pmTopicSubscriptions.get(processingModule.id)) === null || _b === void 0 ? void 0 : _b.push(subscriptionToken);
                    }
                }
            }
        });
    }
    applyOutputMappings(processingModule, outputMappings) {
        let isLockstep = processingModule.processingMode && processingModule.processingMode.lockstep;
        let topicDataBuffer = isLockstep ? this.lockstepTopicData : this.topicData;
        for (let outputMapping of outputMappings) {
            if (!this.isValidIOMapping(processingModule, outputMapping)) {
                console.error('ProcessingModuleManager', 'OutputMapping for module ' +
                    processingModule.toString() +
                    ' -> "' +
                    outputMapping.outputName +
                    '" is invalid');
                console.error('ProcessingModuleManager', outputMapping);
                return;
            }
            let topicDestination = outputMapping[outputMapping.topicDestination] ||
                outputMapping.topicDestination ||
                outputMapping.topic ||
                outputMapping.topicDemux;
            // single topic output
            if (typeof topicDestination === 'string') {
                let messageFormat = processingModule.getIOMessageFormat(outputMapping.outputName);
                let type = utilities_1.default.getTopicDataTypeFromMessageFormat(messageFormat);
                processingModule.setOutputSetter(outputMapping.outputName, (record) => {
                    if (!record[type]) {
                        console.error(processingModule.toString(), 'Output "' +
                            outputMapping.outputName +
                            '" (topic=' +
                            topicDestination +
                            ') returned without any value for "' +
                            type +
                            '" after processing.');
                        return;
                    }
                    record.topic = topicDestination;
                    record.type = type;
                    record.timestamp = utilities_1.default.generateTimestamp();
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
                let demultiplexer = this.deviceManager.getTopicDemuxer(topicDestination.id) ||
                    this.deviceManager.createTopicDemuxer(topicDestination, topicDataBuffer);
                processingModule.setOutputSetter(outputMapping.outputName, (demuxerRecordList) => {
                    demultiplexer.publish(demuxerRecordList);
                });
            }
        }
    }
    isValidIOMapping(processingModule, ioMapping) {
        if (ioMapping.inputName) {
            return processingModule.inputs.some((element) => element.internalName === ioMapping.inputName);
        }
        else if (ioMapping.outputName) {
            return processingModule.outputs.some((element) => element.internalName === ioMapping.outputName);
        }
        return false;
    }
    /* I/O <-> topic mapping functions end */
    /* lockstep processing functions */
    sendLockstepProcessingRequest(nodeId, request) {
        if (nodeId === this.nodeID) {
            // server side PM
            return new Promise((resolve, reject) => {
                // assign input
                request.records.forEach((record) => {
                    //TODO: refactor without use of extra topicdata to avoid write/read cycles
                    this.lockstepTopicData.publish(record.topic, record);
                });
                //this.lockstepInputTopicdata.records = request.records;
                //TODO: need to map input names for lockstepInputTopicdata to records so it can be passed as second argument to onProcessingLockstepPass()
                // clear output
                //this.lockstepOutputTopicdata.records = [];
                // lockstep pass calls to PMs
                let lockstepPasses = [];
                request.processingModuleIds.forEach((id) => {
                    lockstepPasses.push(this.processingModules.get(id).onProcessingLockstepPass(request.deltaTimeMs));
                });
                Promise.all(lockstepPasses).then(() => {
                    let reply = this.produceLockstepProcessingReply(request);
                    return resolve(reply);
                });
            });
        }
    }
    produceLockstepProcessingReply(lockstepProcessingRequest) {
        let lockstepProcessingReply = {
            processingModuleIds: [],
            records: []
        };
        lockstepProcessingRequest.processingModuleIds.forEach((id) => {
            var _a, _b;
            lockstepProcessingReply.processingModuleIds.push(id);
            (_b = (_a = this.processingModules.get(id)) === null || _a === void 0 ? void 0 : _a.outputs) === null || _b === void 0 ? void 0 : _b.forEach((pmOutput) => {
                let outputMapping = this.ioMappings
                    .get(id)
                    .outputMappings.find((mapping) => mapping.outputName === pmOutput.internalName);
                let destination = outputMapping[outputMapping.topicDestination] || outputMapping.topicDestination;
                // single topic
                let topicdataEntry = this.lockstepTopicData.pull(destination);
                if (topicdataEntry) {
                    let record = {
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
}
exports.default = ProcessingModuleManager;
