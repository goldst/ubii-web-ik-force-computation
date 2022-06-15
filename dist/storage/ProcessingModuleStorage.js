"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingModuleStorage = void 0;
/**
 * ubii-node-nodejs uses a file-based storage. Because access to file systems is limited
 * in browsers, this class is a simpler version that doesn't store persistently.
 */
class ProcessingModuleStorage {
    constructor() {
        this.entries = new Map();
    }
    static get instance() {
        if (!ProcessingModuleStorage._instance) {
            ProcessingModuleStorage._instance = new ProcessingModuleStorage();
        }
        return ProcessingModuleStorage._instance;
    }
    hasEntry(name) {
        return this.entries.has(name);
    }
    createInstance(specs) {
        return this.entries.get(specs.name);
    }
}
exports.ProcessingModuleStorage = ProcessingModuleStorage;
