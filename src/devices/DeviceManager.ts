/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/devices/deviceManager.js
 */

import TopicMuxer from './TopicMuxer';
import TopicDemuxer from './TopicDemuxer';

const SINGLETON_ENFORCER = Symbol();

export default class DeviceManager {
    private static _instance?: DeviceManager;
    devices: Map<string, any>;
    muxers: Map<string, any>;
    demuxers: Map<string, any>;
    topicDataBuffer: any;

    constructor(enforcer: Symbol) {
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

    setTopicDataBuffer(buffer: any) {
        this.topicDataBuffer = buffer;
    }

    addDevice(device: any) {
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

    registerDevice(specs: any) {
        //TODO
    }

    getTopicMuxer(id: any) {
        return this.muxers.get(id);
    }

    async createTopicMuxer(specs: any, topicDataBuffer = this.topicDataBuffer) {
        if (!specs.id) {
            console.error('DeviceManager', 'can not create TopicMuxer "' + specs.name + '", missing ID');
            return;
        }

        if (this.muxers.has(specs.id)) {
            console.error('DeviceManager', 'can not create TopicMuxer "' + specs.name + '", ID already exists');
            return;
        }

        let muxer = new TopicMuxer(specs, topicDataBuffer);
        //await muxer.init();
        this.muxers.set(specs.id, muxer);

        return muxer;
    }

    getTopicDemuxer(id: any) {
        return this.demuxers.get(id);
    }

    createTopicDemuxer(specs: any, topicDataBuffer = this.topicDataBuffer) {
        if (!specs.id) {
            console.error('DeviceManager', 'can not create TopicDemuxer "' + specs.name + '", missing ID');
            return;
        }

        if (this.demuxers.has(specs.id)) {
            console.error('DeviceManager', 'can not create TopicDemuxer "' + specs.name + '", ID already exists');
            return;
        }

        let demuxer = new TopicDemuxer(specs, topicDataBuffer);
        this.demuxers.set(specs.id, demuxer);

        return demuxer;
    }
}
