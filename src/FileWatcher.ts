import { EventEmitter } from "node:events";
import chokidar, { FSWatcher } from "chokidar";
import fs from "node:fs";
import path from "node:path";

/**
 * Class representing a file watcher.
 * @extends EventEmitter
 */
export class FileWatcher extends EventEmitter {
    private processId: number;
    private baseDir: string;
    private watchers: Map<string, FSWatcher>;
    private dirHandlers: Map<string, Map<"add" | "change" | "unlink", (directory: string, filename: string, relativePath: string, eventType: "add" | "change" | "unlink") => void>>;
    private ignoredDirectories: Set<string>;
    private allowedExtensions: Set<string>;
    private monitoredDirectories: Set<string>;
    private initialFiles: Set<string>;

    /**
     * Create a FileWatcher.
     * @param {number} [processId] - The process ID.
     */
    constructor(processId?: number) {
        super();
        this.processId = processId || process.pid;
        this.baseDir = process.cwd();
        this.watchers = new Map();
        this.dirHandlers = new Map();
        this.ignoredDirectories = new Set();
        this.allowedExtensions = new Set();
        this.monitoredDirectories = new Set();
        this.initialFiles = new Set();
    }

    /**
     * Watch a directory for changes.
     * @private
     * @param {string} directory - The directory to watch.
     */
    private watchDirectory(directory: string) {
        if (this.watchers.has(directory)) return;

        const watcher = chokidar.watch(directory, {
            persistent: true,
            ignored: () => {
                for (const ignoredDir of this.ignoredDirectories) {
                    if (this.baseDir + '/' + ignoredDir) {
                        return true;
                    }
                }
                return false;
            }
        });

        watcher.on("add", (filePath: string) => this.handleEvent("add", directory, filePath));
        watcher.on("change", (filePath: string) => this.handleEvent("change", directory, filePath));
        watcher.on("unlink", (filePath: string) => this.handleEvent("unlink", directory, filePath));

        this.watchers.set(directory, watcher);
    }

    /**
     * Find a handler for a specific event type in a directory.
     * @private
     * @param {string} directory - The directory to find the handler for.
     * @param {"add" | "change" | "unlink"} eventType - The event type.
     * @returns {Function | undefined} The handler function or undefined if not found.
     */
    private findHandler(directory: string, eventType: "add" | "change" | "unlink") {
        let currentDir = directory;
        while (currentDir !== path.dirname(currentDir)) {
            if (this.dirHandlers.has(currentDir)) {
                const handlers = this.dirHandlers.get(currentDir);
                if (handlers && handlers.has(eventType)) {
                    return handlers.get(eventType);
                }
            }
            currentDir = path.dirname(currentDir);
        }
        return undefined;
    }

    /**
     * Handle a file system event.
     * @private
     * @param {"add" | "change" | "unlink"} eventType - The event type.
     * @param {string} directory - The directory where the event occurred.
     * @param {string} filePath - The path of the file that triggered the event.
     */
    private handleEvent(eventType: "add" | "change" | "unlink", directory: string, filePath: string) {
        const filename = path.basename(filePath);
        const extension = path.extname(filename).toLowerCase();
        const relativePath = path.relative(this.baseDir, filePath).replace(new RegExp(`[\\\\/]${filename}$`), '');

        if (this.allowedExtensions.size > 0 && !this.allowedExtensions.has(extension)) {
            return;
        }

        if (this.initialFiles.has(filePath) && eventType === "add") {
            return;
        }

        this.emit(eventType, directory, filename, `${this.baseDir}/` + relativePath);

        const handler = this.findHandler(directory, eventType);
        if (handler) handler(directory, filename, `${this.baseDir}/` + relativePath, eventType);
    }

    /**
     * Capture the initial files in a directory.
     * @private
     * @param {string} directory - The directory to capture initial files from.
     */
    private captureInitialFiles(directory: string) {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const fullPath = path.join(directory, file);
            if (fs.statSync(fullPath).isDirectory()) {
                this.captureInitialFiles(fullPath);
            } else {
                this.initialFiles.add(fullPath);
            }
        }
    }

    /**
     * Start watching the directories.
     */
    public startWatching() {
        const directories = this.monitoredDirectories.size > 0 ? this.monitoredDirectories : new Set([this.baseDir]);

        for (const dir of directories) {
            this.captureInitialFiles(dir);
        }

        for (const dir of directories) {
            this.watchDirectory(dir);
        }
        return this;
    }

    /**
     * Stop watching all directories.
     */
    public stopWatching() {
        for (const watcher of this.watchers.values()) {
            watcher.close();
        }
        this.watchers.clear();
        return this;
    }

    /**
     * Set a handler for a specific event type in a directory.
     * @param {string} directory - The directory to set the handler for.
     * @param {"add" | "change" | "unlink"} eventType - The event type.
     * @param {Function} callback - The handler function.
     */
    public setHandler(directory: string, eventType: "add" | "change" | "unlink", callback: (directory: string, filename: string, relativePath: string, eventType: "add" | "change" | "unlink") => void) {
        if (!this.dirHandlers.has(directory)) {
            this.dirHandlers.set(directory, new Map());
        }
        const handlers = this.dirHandlers.get(directory);
        if (handlers) {
            handlers.set(eventType, callback);
        }
        this.watchDirectory(directory);
        return this;
    }

    /**
     * Ignore specific directories.
     * @param {...string} directory - The directories to ignore.
     * @returns {FileWatcher} The current FileWatcher instance.
     */
    public ignoreDirectory(...directory: string[]) {
        for (const dir of directory) {
            if (!fs.existsSync(dir)) {
                console.warn(`Directory ${dir} doesr not exist, ignoring it will not work.`);
            } else {
                this.ignoredDirectories.add(dir);
            }
        }
        return this;
    }

    /**
     * Unignore specific directories.
     * @param {...string} directory - The directories to unignore.
     * @returns {FileWatcher} The current FileWatcher instance.
     */
    public unignoreDirectory(...directory: string[]) {
        for (const dir of directory) {
            if (this.ignoredDirectories.has(dir)) {
                this.ignoredDirectories.delete(dir);
            } else {
                console.warn(`Directory ${dir} is not ignored.`);
            }
        }
        return this;
    }

    /**
     * Set the allowed file extensions to watch.
     * @param {...string} extensions - The file extensions to allow.
     * @returns {FileWatcher} The current FileWatcher instance.
     */
    public setAllowedExtensions(...extensions: string[]) {
        this.allowedExtensions = new Set(extensions.map(ext => ext.toLowerCase()));
        return this;
    }

    /**
     * Set the directories to monitor.
     * @param {...string} directories - The directories to monitor.
     * @returns {FileWatcher} The current FileWatcher instance.
     */
    public setMonitoredDirectories(...directories: string[]) {
        this.monitoredDirectories = new Set(directories.map(dir => path.resolve(this.baseDir, dir)));
        return this;
    }
}