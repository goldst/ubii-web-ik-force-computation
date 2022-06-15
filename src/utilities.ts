/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/utilities.js
 */

const uuidv4Regex = '[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}';

export default class Utils {
  static createFunctionFromString(string: string) {
    if (!string || string.length === 0) {
      return undefined;
    }

    // eslint-disable-next-line no-new-func
    return new Function("return " + string)();
  };

  static getTopicDataTypeFromMessageFormat(messageFormat: string) {
    let messageFormatArray = messageFormat.split('.');
    let type = messageFormatArray[messageFormatArray.length - 1]; // remove namespacing
    type = type.charAt(0).toLowerCase() + type.slice(1); // make first letter lowercase

    return type;
  }

  static getUUIDv4Regex() {
    return uuidv4Regex;
  }

  static isBrowser() {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  }

  static isNodeJS() {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
  }

  /**
   * Generate a timestamp for topic data.
   */
  static generateTimestamp() {
    return { millis: Date.now() };
  }
}
