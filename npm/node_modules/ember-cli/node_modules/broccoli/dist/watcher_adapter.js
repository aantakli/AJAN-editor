"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const sane_1 = __importDefault(require("sane"));
const events_1 = require("events");
const source_node_1 = __importDefault(require("./wrappers/source-node"));
const bind_file_event_1 = __importDefault(require("./utils/bind-file-event"));
const heimdalljs_logger_1 = __importDefault(require("heimdalljs-logger"));
const path_1 = require("path");
const logger = new heimdalljs_logger_1.default('broccoli:watcherAdapter');
class WatcherAdapter extends events_1.EventEmitter {
    constructor(watchedNodes, options = {}, ignored = undefined) {
        super();
        if (!Array.isArray(watchedNodes)) {
            throw new TypeError(`WatcherAdapter's first argument must be an array of SourceNodeWrapper nodes`);
        }
        for (const node of watchedNodes) {
            if (!(node instanceof source_node_1.default)) {
                throw new Error(`${node} is not a SourceNode`);
            }
            if (node.nodeInfo.watched !== true) {
                throw new Error(`'${node.nodeInfo.sourceDirectory}' is not watched`);
            }
        }
        this.watchedNodes = watchedNodes;
        this.options = options;
        this.ignored = ignored;
        this.watchers = [];
    }
    watch() {
        const watchers = this.watchedNodes.map((node) => {
            const watchedPath = node.nodeInfo.sourceDirectory;
            const watcher = sane_1.default(watchedPath, this.optionsFor(watchedPath));
            this.watchers.push(watcher);
            bind_file_event_1.default(this, watcher, node, 'change');
            bind_file_event_1.default(this, watcher, node, 'add');
            bind_file_event_1.default(this, watcher, node, 'delete');
            return new Promise((resolve, reject) => {
                watcher.on('ready', resolve);
                watcher.on('error', reject);
            }).then(() => {
                watcher.removeAllListeners('ready');
                watcher.removeAllListeners('error');
                watcher.on('error', (err) => {
                    logger.debug('error', err);
                    this.emit('error', err);
                });
                logger.debug('ready', watchedPath);
            });
        });
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return Promise.all(watchers).then(() => { });
    }
    quit() {
        const closing = this.watchers.map((watcher) => new Promise((resolve, reject) => 
        // @ts-ignore
        watcher.close((err) => {
            if (err)
                reject(err);
            else
                resolve();
        })));
        this.watchers.length = 0;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return Promise.all(closing).then(() => { });
    }
    optionsFor(watchedPath) {
        let options = this.options;
        if (this.ignored) {
            // we need to convert any absolute ignored paths to local paths that sit
            // within the watchedPath
            const localIgnored = this.ignored
                .map(ignoredAbsPath => {
                const ignoredRelativePath = path_1.relative(watchedPath, ignoredAbsPath);
                if (!ignoredRelativePath.startsWith('..') && !path_1.isAbsolute(ignoredRelativePath)) {
                    return ignoredRelativePath + '/**';
                }
            })
                .filter(Boolean);
            if (localIgnored.length > 0) {
                options = Object.assign({}, options, { ignored: localIgnored });
            }
        }
        return options;
    }
}
module.exports = WatcherAdapter;
//# sourceMappingURL=watcher_adapter.js.map