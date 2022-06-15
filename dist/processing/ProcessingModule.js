"use strict";
/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/processingModule.js
 */
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
exports.PROCESSING_MODULE_EVENTS = void 0;
const events_1 = __importDefault(require("events"));
const uuid_1 = require("uuid");
const protobuf_1 = __importDefault(require("@tum-far/ubii-msg-formats/dist/js/protobuf"));
const index_1 = require("@tum-far/ubii-msg-formats/src/js/index");
const ExternalLibrariesService_1 = __importDefault(require("./ExternalLibrariesService"));
const utilities_1 = __importDefault(require("../utilities"));
const ProcessingModuleProto = protobuf_1.default.ubii.processing.ProcessingModule;
exports.PROCESSING_MODULE_EVENTS = Object.freeze({
    NEW_INPUT: 1,
    LOCKSTEP_PASS: 2,
    PROCESSED: 3
});
class ProcessingModule extends events_1.default {
    constructor(specs = {}) {
        super();
        this.id = '';
        this.openWorkerpoolExecutions = [];
        this.tLastProcess = Date.now();
        this.inputTriggerNames = [];
        this.onCreated = () => { };
        /**
         * Lifecycle function to be called when module is supposed to process data.
         * Needs to be overwritten when extending this class, specified as a stringified version for the constructor or
         * set via setOnProcessing() before onProcessing() is called.
         */
        this.onProcessing = (deltaTime, inputs, outputs, state) => {
            let errorMsg = 'onProcessing callback is not specified, called with' +
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
        };
        this.onProcessingLockstepPass = () => {
            return undefined;
        };
        this.onHalted = () => { };
        this.onDestroyed = () => { };
        // take over specs
        //TODO: refactor to this.specs = specs and getters
        specs && Object.assign(this, specs);
        // new instance is getting new ID
        this.id = this.id || (0, uuid_1.v4)();
        this.inputs = this.inputs || [];
        this.outputs = this.outputs || [];
        // check that language specification for module is correct
        if (this.language === undefined)
            this.language = ProcessingModuleProto.Language.JS;
        if (this.language !== ProcessingModuleProto.Language.JS) {
            console.error('ProcessingModule ' + this.toString(), 'trying to create module under javascript, but specification says ' +
                ProcessingModuleProto.Language[this.language]);
            throw new Error('Incompatible language specifications (javascript vs. ' + ProcessingModuleProto.Language[this.language] + ')');
        }
        // default processing mode
        if (!this.processingMode) {
            this.processingMode = { frequency: { hertz: 30 } };
        }
        if (this.onCreatedStringified) {
            this.onCreated = utilities_1.default.createFunctionFromString(this.onCreatedStringified);
        }
        if (this.onProcessingStringified) {
            this.onProcessing = utilities_1.default.createFunctionFromString(this.onProcessingStringified);
        }
        if (this.onHaltedStringified) {
            this.onHalted = utilities_1.default.createFunctionFromString(this.onHaltedStringified);
        }
        if (this.onDestroyedStringified) {
            this.onDestroyed = utilities_1.default.createFunctionFromString(this.onDestroyedStringified);
        }
        this.status = ProcessingModuleProto.Status.CREATED;
        this.ioProxy = {};
        //TODO: refactor away from old "interactions" setup
        // only kept for backwards compatibility testing
        this.state = {};
        Object.defineProperty(this.state, 'modules', {
            // modules are read-only
            get: () => {
                return ExternalLibrariesService_1.default.instance.getExternalLibraries();
            },
            configurable: true
        });
        this.translatorProtobuf = new index_1.ProtobufTranslator(index_1.MSG_TYPES.PM);
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
        }
        else if (this.processingMode.triggerOnInput) {
            this.startProcessingByTriggerOnInput();
        }
        else if (this.processingMode.lockstep) {
            this.startProcessingByLockstep();
        }
        if (this.status === ProcessingModuleProto.Status.PROCESSING) {
            let message = 'started';
            if (this.workerPool) {
                message += ' (using workerpool)';
            }
            else {
                message += ' (without workerpool)';
            }
            console.log(this.toString(), message);
            return true;
        }
        return false;
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.status === ProcessingModuleProto.Status.HALTED) {
                return false;
            }
            this.onHalted && (yield this.onHalted());
            this.status = ProcessingModuleProto.Status.HALTED;
            this.removeAllListeners(`${exports.PROCESSING_MODULE_EVENTS.NEW_INPUT}`);
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
        });
    }
    startProcessingByFrequency() {
        this.status = ProcessingModuleProto.Status.PROCESSING; //TODO: unify with other start... in start()
        this.tLastProcess = Date.now(); //TODO: unify with other start... in start()
        let targetFrequencyMillis = 1000 / this.processingMode.frequency.hertz;
        /*this.intervalProcessing = setInterval(async () => {
          await this.processingPass();
          if (this.status !== ProcessingModuleProto.Status.PROCESSING) {
            this.intervalProcessing && clearInterval(this.intervalProcessing);
          }
        }, targetFrequencyMillis);*/
        let process = () => __awaiter(this, void 0, void 0, function* () {
            yield this.processingPass();
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
        });
        process();
    }
    startProcessingByTriggerOnInput() {
        this.status = ProcessingModuleProto.Status.PROCESSING;
        let allInputsNeedUpdate = this.processingMode.triggerOnInput.allInputsNeedUpdate;
        let minDelayMs = this.processingMode.triggerOnInput.minDelayMs;
        this.tLastProcess = Date.now();
        let checkProcessingNeeded = false;
        let checkProcessing = () => {
            var _a, _b;
            if (this.status !== ProcessingModuleProto.Status.PROCESSING)
                return;
            let inputUpdatesFulfilled = !allInputsNeedUpdate || ((_b = (_a = this.inputs) === null || _a === void 0 ? void 0 : _a.every((element) => this.inputTriggerNames.includes(element.internalName))) !== null && _b !== void 0 ? _b : true);
            let minDelayFulfilled = !minDelayMs || Date.now() - this.tLastProcess >= minDelayMs;
            if (inputUpdatesFulfilled && minDelayFulfilled) {
                this.state.inputTriggerNames = [...this.inputTriggerNames]; // copy those input names that received update trigger to state
                this.inputTriggerNames = [];
                this.processingPass();
            }
            checkProcessingNeeded = false;
        };
        this.inputTriggerNames = [];
        this.on(`${exports.PROCESSING_MODULE_EVENTS.NEW_INPUT}`, (inputName) => {
            if (!this.inputTriggerNames.includes(inputName))
                this.inputTriggerNames.push(inputName);
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
        this.onProcessingLockstepPass = (deltaTime, inputs = this.readAllInputData()) => {
            return new Promise((resolve, reject) => {
                try {
                    let outputData = this.onProcessing(deltaTime, inputs, this.state);
                    return resolve(outputData);
                }
                catch (error) {
                    return reject(error);
                }
            });
        };
    }
    processingPass() {
        return __awaiter(this, void 0, void 0, function* () {
            let tNow = Date.now();
            let deltaTime = tNow - this.tLastProcess;
            this.tLastProcess = tNow;
            let inputData = this.readAllInputData();
            try {
                let { outputs, state } = yield this.onProcessing(deltaTime, inputData, [], this.state);
                outputs && this.writeAllOutputData(outputs);
                this.state = state ? state : this.state;
            }
            catch (error) {
                // onProcessing pass might be canceled when run on workerpool
            }
        });
    }
    setWorkerPool(workerPool) {
        return __awaiter(this, void 0, void 0, function* () {
            let viable = yield this.isWorkerpoolViable(workerPool);
            if (viable) {
                this.workerPool = workerPool;
                // redefine onProcessing to be executed via workerpool
                this.originalOnProcessing = this.onProcessing;
                let workerpoolOnProcessing = (deltaTime, inputs, state) => __awaiter(this, void 0, void 0, function* () {
                    let wpExecPromise = this.workerPool
                        .exec(this.originalOnProcessing, [deltaTime, inputs, state])
                        .catch((error) => {
                        if (!error.message || error.message !== 'promise cancelled') {
                            // executuion was not just cancelled via workerpool API
                            console.error(this.toString(), 'workerpool execution failed - ' + error + '\n' + error.stack);
                        }
                    });
                    this.openWorkerpoolExecutions.push(wpExecPromise);
                    let results = yield wpExecPromise;
                    this.openWorkerpoolExecutions.splice(this.openWorkerpoolExecutions.indexOf(wpExecPromise), 1);
                    return results;
                });
                this.onProcessing = workerpoolOnProcessing;
            }
            else {
                console.warn(this.toString(), 'not viable to be executed via workerpool, might slow down system significantly');
            }
        });
    }
    isWorkerpoolViable(workerPool) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield workerPool.exec(this.onProcessing, [1, this.readAllInputData(), [], this.state]);
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    /* execution control end */
    /* lifecycle functions */
    setOnCreated(callback) {
        this.onCreated = callback;
    }
    setOnProcessing(callback) {
        this.onProcessing = callback;
    }
    setOnHalted(callback) {
        this.onHalted = callback;
    }
    setOnDestroyed(callback) {
        this.onDestroyed = callback;
    }
    /* lifecycle functions end */
    /* I/O functions */
    setInputGetter(internalName, getter, overwrite = false) {
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
        this.removeIOAccessor(internalName);
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
    setOutputSetter(internalName, setter, overwrite = false) {
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
            console.error(this.toString(), 'trying to set output setter for ' + internalName + ' but setter is not a function');
            return false;
        }
        // make sure we're clean
        this.removeIOAccessor(internalName);
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
    removeIOAccessor(internalName) {
        if (this.ioProxy.hasOwnProperty(internalName)) {
            delete this.ioProxy[internalName];
            delete this[internalName];
        }
    }
    removeAllIOAccessors() {
        for (let key in this.ioProxy) {
            this.removeIOAccessor(key);
        }
    }
    checkInternalName(internalName, overwrite = false) {
        // case: name that is a property of this class and explicitly not an otherwise viable internal name
        // and should therefore never be overwritten
        if (this.hasOwnProperty(internalName) && !this.ioProxy.hasOwnProperty(internalName)) {
            console.error(this.toString(), 'the internal I/O naming "' + internalName + '" should not be used as it conflicts with internal properties');
            return false;
        }
        // case: we're not using an already defined name without specifying to overwrite
        if (this.ioProxy.hasOwnProperty(internalName) && !overwrite) {
            console.error(this.toString(), 'the internal I/O naming "' + internalName + '" is already defined (overwrite not specified)');
            return false;
        }
        // case: the internal name is empty
        if (internalName === '') {
            console.error(this.toString(), 'the internal I/O naming "' + internalName + '" can\'t be used (empty)');
            return false;
        }
        return true;
    }
    readInput(name) {
        return this.ioProxy[name];
    }
    writeOutput(name, value) {
        this.ioProxy[name] = value;
    }
    /* I/O functions end */
    /* helper functions */
    readAllInputData() {
        let inputData = {};
        for (let input of this.inputs || []) {
            inputData[input.internalName] = this.ioProxy[input.internalName];
        }
        return inputData;
    }
    writeAllOutputData(outputData) {
        if (!outputData)
            return;
        for (let outputSpec of this.outputs || []) {
            let output = outputData[outputSpec.internalName];
            if (typeof output !== 'undefined') {
                this.ioProxy[outputSpec.internalName] = output;
            }
        }
    }
    getIOMessageFormat(name) {
        var _a, _b;
        let ios = [...((_a = this.inputs) !== null && _a !== void 0 ? _a : []), ...((_b = this.outputs) !== null && _b !== void 0 ? _b : [])];
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
}
exports.default = ProcessingModule;
