// Chrome-specific dependencies.
// TODO: Convert to typescript
'use strict';

var ui = chrome.extension.getBackgroundPage().ui;
var UI = chrome.extension.getBackgroundPage().UI;
var core = chrome.extension.getBackgroundPage().core;
var model = chrome.extension.getBackgroundPage().model;
ui.browser = 'chrome';

// Functions used by app-missing.ts which need access to the background page.
var openDownloadAppPage = chrome.extension.getBackgroundPage().openDownloadAppPage;

console.log('Loaded dependencies for Chrome Extension.');
