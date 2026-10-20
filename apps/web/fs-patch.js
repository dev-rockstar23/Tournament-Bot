// Patch fs.readdir and fs.opendir to skip Windows system junction directories
// This must be loaded BEFORE any other modules
const fs = require('fs');
const path = require('path');

const SYSTEM_DIRS = [
  'Application Data',
  'AppData',
  'Cookies',
  'Local Settings',
  'My Documents',
  'My Music',
  'My Pictures',
  'My Videos',
  'NetHood',
  'PrintHood',
  'Recent',
  'SendTo',
  'Start Menu',
  'Templates',
  'Desktop',
  'Favorites',
  'Links',
  'Saved Games',
  'Searches',
];

function isSystemDir(dirPath) {
  try {
    const normalized = path.normalize(dirPath);
    const parts = normalized.split(path.sep);
    return parts.some(part => SYSTEM_DIRS.includes(part));
  } catch {
    return false;
  }
}

function patchReaddir(original) {
  return function(dirPath, options, callback) {
    // Handle different argument patterns
    let opts = options;
    let cb = callback;
    
    if (typeof options === 'function') {
      opts = {};
      cb = options;
    }
    
    if (isSystemDir(dirPath)) {
      // Return empty array for system directories
      const emptyResult = [];
      if (cb) {
        process.nextTick(() => cb(null, emptyResult));
      }
      return Promise.resolve(emptyResult);
    }
    
    return original.call(this, dirPath, opts, cb);
  };
}

function patchReaddirSync(original) {
  return function(dirPath, options) {
    if (isSystemDir(dirPath)) {
      return [];
    }
    return original.call(this, dirPath, options);
  };
}

function patchOpendir(original) {
  return function(dirPath, options, callback) {
    let opts = options;
    let cb = callback;
    
    if (typeof options === 'function') {
      opts = {};
      cb = options;
    }
    
    if (isSystemDir(dirPath)) {
      // Return a mock directory handle that yields no entries
      const mockDir = {
        close: (cb) => process.nextTick(() => cb && cb(null)),
        closeSync: () => {},
        [Symbol.asyncIterator]: function* () { return; },
      };
      if (cb) {
        process.nextTick(() => cb(null, mockDir));
      }
      return Promise.resolve(mockDir);
    }
    
    return original.call(this, dirPath, opts, cb);
  };
}

function patchOpendirSync(original) {
  return function(dirPath, options) {
    if (isSystemDir(dirPath)) {
      return {
        close: () => {},
        closeSync: () => {},
        [Symbol.asyncIterator]: function* () { return; },
      };
    }
    return original.call(this, dirPath, options);
  };
}

if (fs.readdir) fs.readdir = patchReaddir(fs.readdir);
if (fs.readdirSync) fs.readdirSync = patchReaddirSync(fs.readdirSync);
if (fs.opendir) fs.opendir = patchOpendir(fs.opendir);
if (fs.opendirSync) fs.opendirSync = patchOpendirSync(fs.opendirSync);

console.log('[fs-patch] Patched fs.readdir/opendir to skip Windows system directories');