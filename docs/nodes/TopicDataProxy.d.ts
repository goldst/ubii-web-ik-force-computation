export default class TopicDataProxy {
    topicData: any;
    ubiiNode: any;
    regexSubs: any[];
    constructor(topicData: any, ubiiNode: any);
    publish(topic: any, record: any): void;
    pull(topic: any): any;
    subscribe(topic: any, callback: any): Promise<any>;
    subscribeRegex(regex: any, callback: any): Promise<any>;
    unsubscribe(token: any): Promise<any>;
    /**
     * Subscribe a callback to a given topic.
     * @param {string} topic
     * @param {function} callback
     *
     * @returns {object} Subscription token, save to later unsubscribe
     */
    proxySubscribeTopic(topic: string, callback: Function): Promise<any>;
    /**
     * Subscribe to the specified regex.
     * @param {*} regexString
     * @param {*} callback
     */
    proxySubscribeRegex(regex: any, callback: any): Promise<any>;
    /**
     * Unsubscribe at topicdata and possibly at master node.
     * @param {*} token
     */
    proxyUnsubscribe(token: any): Promise<any>;
    /**
     * Publish some TopicData.
     * @param {ubii.topicData.TopicData} topicData
     */
    proxyPublish(topicData: any): void;
}
