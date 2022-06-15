
/**
 * ubii-node-nodejs uses a file-based storage. Because access to file systems is limited
 * in browsers, this class is a simpler version that doesn't store persistently.
 */
export class ProcessingModuleStorage {
    private static _instance?: ProcessingModuleStorage;

    entries: Map<string, any> = new Map();

    static get instance() {
        if(!ProcessingModuleStorage._instance) {
            ProcessingModuleStorage._instance = new ProcessingModuleStorage();
        }

        return ProcessingModuleStorage._instance;
    }

    hasEntry(name: string) {
        return this.entries.has(name);
    }

    createInstance(specs: any) {
        return this.entries.get(specs.name);
    }
}