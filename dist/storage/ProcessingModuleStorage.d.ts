/**
 * ubii-node-nodejs uses a file-based storage. Because access to file systems is limited
 * in browsers, this class is a simpler version that doesn't store persistently.
 */
export declare class ProcessingModuleStorage {
    private static _instance?;
    entries: Map<string, any>;
    static get instance(): ProcessingModuleStorage;
    hasEntry(name: string): boolean;
    createInstance(specs: any): any;
}
