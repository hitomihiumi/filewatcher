const { FileWatcher } = require('../dist');

const watcher = new FileWatcher()
    .setAllowedExtensions('.js');

watcher.setHandler('./test', 'change', (dir, file, relativePath) => {
    console.log(`File ${file} changed at ${relativePath}`);
    })
    .setHandler('./test', 'add', (dir, file, relativePath) => {
        console.log(`File ${file} added at ${relativePath}`);
    })
    .setHandler('./test', 'unlink', (dir, file, relativePath) => {
        console.log(`File ${file} removed at ${relativePath}`);
    });

watcher.setMonitoredDirectories('./test')

watcher.startWatching()