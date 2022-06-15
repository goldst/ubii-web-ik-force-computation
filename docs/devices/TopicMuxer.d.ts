/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/devices/topicMuxer.js
 */
export default class TopicMuxer {
    specs: any;
    topicDataBuffer: any;
    records: any;
    subscriptionToken: any;
    identityRegex?: RegExp;
    constructor(specs: any, topicDataBuffer: any);
    onTopicData(record: any): void;
    getRecords(): {
        elements: any;
    };
    getSubscriptionToken(): any;
    toString(): string;
}
