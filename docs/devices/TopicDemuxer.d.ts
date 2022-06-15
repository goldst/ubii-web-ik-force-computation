/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/devices/topicDemuxer.js
 */
export default class TopicDemuxer {
    static DEFAULT_REGEX_OUTPUT_PARAM: RegExp;
    specs: any;
    topicDataBuffer: any;
    records: any[];
    identityRegex?: RegExp;
    outputParamMatches: Map<number, any>;
    constructor(specs: any, topicDataBuffer: any);
    publish(recordList: any): void;
    toString(): string;
}
