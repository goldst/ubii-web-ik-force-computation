"use strict";
/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/externalLibrariesService.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
const SINGLETON_ENFORCER = Symbol();
class ExternalLibrariesService {
    constructor(enforcer) {
        this.libraries = {};
        if (enforcer !== SINGLETON_ENFORCER) {
            throw new Error('Use ' + this.constructor.name + '.instance');
        }
    }
    static get instance() {
        if (!this._instance) {
            this._instance = new ExternalLibrariesService(SINGLETON_ENFORCER);
        }
        return this._instance;
    }
    addExternalLibrary(name, library) {
        if (this.libraries.hasOwnProperty(name)) {
            console.error('InteractionModulesService.addModule() - module named "' + name + '" already exists');
            return;
        }
        this.libraries[name] = library;
    }
    getExternalLibraries() {
        return this.libraries;
    }
}
exports.default = ExternalLibrariesService;
