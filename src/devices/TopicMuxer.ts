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

    constructor(specs: any, topicDataBuffer: any) {
        this.specs = specs;
        this.topicDataBuffer = topicDataBuffer;

        this.records = [];

        if (this.specs.identityMatchPattern) {
            this.identityRegex = new RegExp(this.specs.identityMatchPattern);
        }
    }

    onTopicData(record: any) {
        // if a data type is specified and the record matches the topic selector regex but not the data type, discard
        if (this.specs.dataType && record.type !== this.specs.dataType) {
            return;
        }

        let existingRecord = this.records.find((entry: any) => entry.topic === record.topic);
        if (!existingRecord) {
            record.type = record.type || this.specs.dataType;
            this.records.push(record);
            if (this.identityRegex) {
                let identityMatches = this.identityRegex.exec(record.topic);
                if (identityMatches && identityMatches.length > 0) {
                    record.identity = identityMatches[0];
                }
            }
        } else {
            existingRecord.timestamp = record.timestamp;
            existingRecord[existingRecord.type] = record[record.type];
        }
    }

    getRecords() {
        return {
            elements: this.records
        };
    }

    getSubscriptionToken() {
        return this.subscriptionToken;
    }

    toString() {
        return 'TopicMuxer ' + this.specs.name + ' (ID ' + this.specs.id + ')';
    }
}
