"use strict";
/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/devices/deviceManager.js
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
const TopicMuxer_1 = __importDefault(require("./TopicMuxer"));
const TopicDemuxer_1 = __importDefault(require("./TopicDemuxer"));
const SINGLETON_ENFORCER = Symbol();
class DeviceManager {
    constructor(enforcer) {
        if (enforcer !== SINGLETON_ENFORCER) {
            throw new Error('Use ' + this.constructor.name + '.instance');
        }
        this.devices = new Map();
        this.muxers = new Map();
        this.demuxers = new Map();
    }
    static get instance() {
        if (DeviceManager._instance == null) {
            DeviceManager._instance = new DeviceManager(SINGLETON_ENFORCER);
        }
        return DeviceManager._instance;
    }
    setTopicDataBuffer(buffer) {
        this.topicDataBuffer = buffer;
    }
    addDevice(device) {
        if (!device.id) {
            console.error('DeviceManager', 'can not add device "' + device.name + '", missing ID');
            return false;
        }
        if (this.devices.has(device.id)) {
            console.error('DeviceManager', 'can not add device "' + device.name + '", ID already exists');
            return false;
        }
        this.devices.set(device.id, device);
        return true;
    }
    registerDevice(specs) {
        //TODO
    }
    getTopicMuxer(id) {
        return this.muxers.get(id);
    }
    createTopicMuxer(specs, topicDataBuffer = this.topicDataBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!specs.id) {
                console.error('DeviceManager', 'can not create TopicMuxer "' + specs.name + '", missing ID');
                return;
            }
            if (this.muxers.has(specs.id)) {
                console.error('DeviceManager', 'can not create TopicMuxer "' + specs.name + '", ID already exists');
                return;
            }
            let muxer = new TopicMuxer_1.default(specs, topicDataBuffer);
            //await muxer.init();
            this.muxers.set(specs.id, muxer);
            return muxer;
        });
    }
    getTopicDemuxer(id) {
        return this.demuxers.get(id);
    }
    createTopicDemuxer(specs, topicDataBuffer = this.topicDataBuffer) {
        if (!specs.id) {
            console.error('DeviceManager', 'can not create TopicDemuxer "' + specs.name + '", missing ID');
            return;
        }
        if (this.demuxers.has(specs.id)) {
            console.error('DeviceManager', 'can not create TopicDemuxer "' + specs.name + '", ID already exists');
            return;
        }
        let demuxer = new TopicDemuxer_1.default(specs, topicDataBuffer);
        this.demuxers.set(specs.id, demuxer);
        return demuxer;
    }
}
exports.default = DeviceManager;
