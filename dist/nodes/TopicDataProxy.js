"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@tum-far/ubii-msg-formats/src/js/index");
const ubii_topic_data_1 = require("@tum-far/ubii-topic-data");
class TopicDataProxy {
    constructor(topicData, ubiiNode) {
        this.topicData = topicData;
        this.ubiiNode = ubiiNode;
        this.regexSubs = [];
    }
    publish(topic, record) {
        const msgTopicData = {
            topicDataRecord: record
        };
        this.proxyPublish(msgTopicData);
    }
    pull(topic) {
        return this.topicData.pull(topic);
    }
    subscribe(topic, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.proxySubscribeTopic(topic, callback);
        });
    }
    subscribeRegex(regex, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.proxySubscribeRegex(regex, callback);
        });
    }
    unsubscribe(token) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.proxyUnsubscribe(token);
        });
    }
    /**
     * Subscribe a callback to a given topic.
     * @param {string} topic
     * @param {function} callback
     *
     * @returns {object} Subscription token, save to later unsubscribe
     */
    proxySubscribeTopic(topic, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscriptions = this.topicData.getSubscriptionTokensForTopic(topic);
            if (!subscriptions || subscriptions.length === 0) {
                const message = {
                    topic: index_1.DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
                    topicSubscription: {
                        clientId: this.ubiiNode.getClientID(),
                        subscribeTopics: [topic]
                    }
                };
                try {
                    const replySubscribe = yield this.ubiiNode.subscribeTopic(topic, (a) => {
                        this.topicData.publish(topic, a);
                    });
                    if (replySubscribe === false) {
                        console.error('TopicDataProxy', 'server error during subscribe to "' + topic + '"');
                        return replySubscribe;
                    }
                }
                catch (error) {
                    console.error('TopicDataProxy', 'local error during subscribe to "' + topic + '": ' + error);
                    return error;
                }
            }
            const token = this.topicData.subscribe(topic, (record) => {
                callback(record);
            });
            return token;
        });
    }
    /**
     * Subscribe to the specified regex.
     * @param {*} regexString
     * @param {*} callback
     */
    proxySubscribeRegex(regex, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscriptions = this.topicData.getSubscriptionTokensForRegex(regex);
            if (!subscriptions || subscriptions.length === 0) {
                const message = {
                    topic: index_1.DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
                    topicSubscription: {
                        clientId: this.ubiiNode.getClientID(),
                        subscribeTopicRegexp: [regex]
                    }
                };
                try {
                    const replySubscribe = yield this.ubiiNode.callService(message);
                    if (replySubscribe.error) {
                        return replySubscribe.error;
                    }
                }
                catch (error) {
                    console.error('TopicDataProxy', error);
                    return error;
                }
            }
            const token = this.topicData.subscribeRegex(regex, (record) => {
                callback(record);
            });
            return token;
        });
    }
    /**
     * Unsubscribe at topicdata and possibly at master node.
     * @param {*} token
     */
    proxyUnsubscribe(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.topicData.unsubscribe(token);
            let subs = undefined;
            if (token.type === ubii_topic_data_1.SUBSCRIPTION_TYPES.TOPIC) {
                subs = this.topicData.getSubscriptionTokensForTopic(token.topic);
            }
            else if (token.type === ubii_topic_data_1.SUBSCRIPTION_TYPES.REGEX) {
                subs = this.topicData.getSubscriptionTokensForRegex(token.topic);
            }
            if (!subs || subs.length === 0) {
                const message = {
                    topic: index_1.DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
                    topicSubscription: {
                        clientId: this.ubiiNode.getClientID()
                    }
                };
                if (token.type === ubii_topic_data_1.SUBSCRIPTION_TYPES.TOPIC) {
                    message.topicSubscription.unsubscribeTopics = [token.topic];
                }
                else if (token.type === ubii_topic_data_1.SUBSCRIPTION_TYPES.REGEX) {
                    message.topicSubscription.unsubscribeTopicRegexp = [token.topic];
                }
                try {
                    const replySubscribe = yield this.ubiiNode.callService(message);
                    if (replySubscribe.error) {
                        return replySubscribe.error;
                    }
                }
                catch (error) {
                    console.error('TopicData Proxy', error);
                    return error;
                }
            }
            return result;
        });
    }
    /**
     * Publish some TopicData.
     * @param {ubii.topicData.TopicData} topicData
     */
    proxyPublish(topicData) {
        this.ubiiNode.publishRecord(topicData.topicDataRecord);
    }
}
exports.default = TopicDataProxy;
