/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/utilities.js
 */
export default class Utils {
    static createFunctionFromString(string: string): any;
    static getTopicDataTypeFromMessageFormat(messageFormat: string): string;
    static getUUIDv4Regex(): string;
    static isBrowser(): boolean;
    static isNodeJS(): boolean;
    /**
     * Generate a timestamp for topic data.
     */
    static generateTimestamp(): {
        millis: number;
    };
}
