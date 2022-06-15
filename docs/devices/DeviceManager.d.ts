/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/devices/deviceManager.js
 */
import TopicMuxer from './TopicMuxer';
import TopicDemuxer from './TopicDemuxer';
export default class DeviceManager {
    private static _instance?;
    devices: Map<string, any>;
    muxers: Map<string, any>;
    demuxers: Map<string, any>;
    topicDataBuffer: any;
    constructor(enforcer: Symbol);
    static get instance(): DeviceManager;
    setTopicDataBuffer(buffer: any): void;
    addDevice(device: any): boolean;
    registerDevice(specs: any): void;
    getTopicMuxer(id: any): any;
    createTopicMuxer(specs: any, topicDataBuffer?: any): Promise<TopicMuxer | undefined>;
    getTopicDemuxer(id: any): any;
    createTopicDemuxer(specs: any, topicDataBuffer?: any): TopicDemuxer | undefined;
}
