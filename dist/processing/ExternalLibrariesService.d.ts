/**
 * Adapted from SandroWeber/ubii-node-nodejs
 * https://raw.githubusercontent.com/SandroWeber/ubii-node-nodejs/develop/src/processing/externalLibrariesService.js
 */
export default class ExternalLibrariesService {
    libraries: {
        [name: string]: any;
    };
    private static _instance?;
    constructor(enforcer: Symbol);
    static get instance(): ExternalLibrariesService;
    addExternalLibrary(name: string, library: any): void;
    getExternalLibraries(): {
        [name: string]: any;
    };
}
