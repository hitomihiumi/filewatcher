# FileWatcher

## Overview

FileWatcher is a Node.js utility that monitors file system changes in specified directories. It can detect file additions, modifications, and deletions, and allows you to set custom handlers for these events.

## Features

- Monitor multiple directories
- Set custom handlers for file events (add, change, unlink)
- Ignore specific directories
- Filter by allowed file extensions

## Installation

```sh
npm install @hitomihiumi/filewatcher
```

## Usage

```javascript
const FileWatcher = require('@hitomihiumi/filewatcher');

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

watcher.setMonitoredDirectories('./test');

watcher.startWatching();
```

![FileWatcher](https://i.imgur.com/Z5wUnGw.png)

