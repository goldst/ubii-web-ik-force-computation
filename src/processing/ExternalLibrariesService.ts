/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/externalLibrariesService.js
 */

const SINGLETON_ENFORCER = Symbol();


export default class ExternalLibrariesService {
    libraries: { [name: string]: any } = {};
    private static _instance?: ExternalLibrariesService;

    constructor(enforcer: Symbol) {
        if (enforcer !== SINGLETON_ENFORCER) {
            throw new Error('Use ' + this.constructor.name + '.instance');
        }
    }

    static get instance() {
        if (!this._instance) {
            this._instance = new ExternalLibrariesService(SINGLETON_ENFORCER);
        }

        return this._instance as ExternalLibrariesService;
    }

    addExternalLibrary(name: string, library: any) {
        if (this.libraries.hasOwnProperty(name)) {
            console.error(
                'InteractionModulesService.addModule() - module named "' + name + '" already exists'
            );
            return;
        }

        this.libraries[name] = library;
    }

    getExternalLibraries() {
        return this.libraries;
    }
}


