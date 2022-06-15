"use strict";
/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/devices/topicDemuxer.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
class TopicDemuxer {
    constructor(specs, topicDataBuffer) {
        this.specs = specs;
        this.topicDataBuffer = topicDataBuffer;
        this.records = [];
        if (this.specs.identityMatchPattern) {
            this.identityRegex = new RegExp(this.specs.identityMatchPattern);
        }
        this.outputParamMatches = new Map();
        let outputParamMatch = undefined;
        // eslint-disable-next-line no-cond-assign
        while (outputParamMatch = TopicDemuxer.DEFAULT_REGEX_OUTPUT_PARAM.exec(this.specs.outputTopicFormat)) {
            let matchString = outputParamMatch[0];
            outputParamMatch.paramIndex = parseInt(matchString.substring(3, matchString.length - 2));
            this.outputParamMatches.set(outputParamMatch.paramIndex, outputParamMatch);
        }
    }
    publish(recordList) {
        for (let record of recordList.elements) {
            record.topic = this.specs.outputTopicFormat.slice(); //copy
            for (let i = 0; i < record.outputTopicParams.length; i++) {
                if (this.outputParamMatches.has(i)) {
                    record.topic = record.topic.replace(this.outputParamMatches.get(i)[0], record.outputTopicParams[i]);
                }
            }
            record.type = this.specs.dataType;
            this.topicDataBuffer.publish(record.topic, record);
        }
    }
    toString() {
        return 'TopicDemuxer ' + this.specs.name + ' (ID ' + this.specs.id + ')';
    }
}
exports.default = TopicDemuxer;
TopicDemuxer.DEFAULT_REGEX_OUTPUT_PARAM = /{{#[0-9]+}}/g;
