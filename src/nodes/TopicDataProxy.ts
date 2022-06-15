import { UbiiClientService } from '@tum-far/ubii-node-webbrowser';

import { DEFAULT_TOPICS } from '@tum-far/ubii-msg-formats/src/js/index';
import { SUBSCRIPTION_TYPES } from '@tum-far/ubii-topic-data';

export default class TopicDataProxy {
    topicData: any;
    ubiiNode: any;
    regexSubs: any[];

    constructor(topicData: any, ubiiNode: any) {
        this.topicData = topicData;
        this.ubiiNode = ubiiNode;
        this.regexSubs = [];
    }

    publish(topic: any, record: any) {
        const msgTopicData = {
            topicDataRecord: record
        };
        this.proxyPublish(msgTopicData);
    }

    pull(topic: any) {
        return this.topicData.pull(topic);
    }

    async subscribe(topic: any, callback: any) {
        return await this.proxySubscribeTopic(topic, callback);
    }

    async subscribeRegex(regex: any, callback: any) {
        return await this.proxySubscribeRegex(regex, callback);
    }

    async unsubscribe(token: any) {
        return await this.proxyUnsubscribe(token);
    }

    /**
     * Subscribe a callback to a given topic.
     * @param {string} topic
     * @param {function} callback
     *
     * @returns {object} Subscription token, save to later unsubscribe
     */
    async proxySubscribeTopic(topic: string, callback: Function) {
        const subscriptions = this.topicData.getSubscriptionTokensForTopic(topic);
        if (!subscriptions || subscriptions.length === 0) {
            const message = {
                topic: DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
                topicSubscription: {
                    clientId: this.ubiiNode.getClientID(),
                    subscribeTopics: [topic]
                }
            };

            try {
                const replySubscribe = await this.ubiiNode.subscribeTopic(topic, (a: any) => {
                    this.topicData.publish(topic, a);
                });
                if (replySubscribe === false) {
                    console.error('TopicDataProxy', 'server error during subscribe to "' + topic + '"');
                    return replySubscribe;
                }
            } catch (error) {
                console.error('TopicDataProxy', 'local error during subscribe to "' + topic + '": ' + error);
                return error;
            }
        }

        const token = this.topicData.subscribe(topic, (record: any) => {
            callback(record);
        });

        return token;
    }

    /**
     * Subscribe to the specified regex.
     * @param {*} regexString
     * @param {*} callback
     */
    async proxySubscribeRegex(regex: any, callback: any) {
        const subscriptions = this.topicData.getSubscriptionTokensForRegex(regex);
        if (!subscriptions || subscriptions.length === 0) {
            const message = {
                topic: DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
                topicSubscription: {
                    clientId: this.ubiiNode.getClientID(),
                    subscribeTopicRegexp: [regex]
                }
            };

            try {
                const replySubscribe = await this.ubiiNode.callService(message);
                if (replySubscribe.error) {
                    return replySubscribe.error;
                }
            } catch (error) {
                console.error('TopicDataProxy', error);
                return error;
            }
        }

        const token = this.topicData.subscribeRegex(regex, (record: any) => {
            callback(record);
        });

        return token;
    }

    /**
     * Unsubscribe at topicdata and possibly at master node.
     * @param {*} token
     */
    async proxyUnsubscribe(token: any) {
        const result = this.topicData.unsubscribe(token);

        let subs = undefined;
        if (token.type === SUBSCRIPTION_TYPES.TOPIC) {
            subs = this.topicData.getSubscriptionTokensForTopic(token.topic);
        } else if (token.type === SUBSCRIPTION_TYPES.REGEX) {
            subs = this.topicData.getSubscriptionTokensForRegex(token.topic);
        }

        if (!subs || subs.length === 0) {
            const message: any = {
                topic: DEFAULT_TOPICS.SERVICES.TOPIC_SUBSCRIPTION,
                topicSubscription: {
                    clientId: this.ubiiNode.getClientID()
                }
            };
            if (token.type === SUBSCRIPTION_TYPES.TOPIC) {
                message.topicSubscription.unsubscribeTopics = [token.topic];
            } else if (token.type === SUBSCRIPTION_TYPES.REGEX) {
                message.topicSubscription.unsubscribeTopicRegexp = [token.topic];
            }

            try {
                const replySubscribe = await this.ubiiNode.callService(message);
                if (replySubscribe.error) {
                    return replySubscribe.error;
                }
            } catch (error) {
                console.error('TopicData Proxy', error);
                return error;
            }
        }

        return result;
    }

    /**
     * Publish some TopicData.
     * @param {ubii.topicData.TopicData} topicData
     */
    proxyPublish(topicData: any) {
        this.ubiiNode.publishRecord(topicData.topicDataRecord);
    }
}
