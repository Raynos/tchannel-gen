#!/usr/bin/env node
'use strict';

var process = require('process');

var Application = require('./app.js');

module.exports = main;

/*istanbul ignore else*/
if (require.main === module) {
    main();
}

function main() {
    var app = Application();

    // attach before throwing exception
    process.on('uncaughtException', app.clients.uncaught);

    app.bootstrap(function onAppReady(err) {
        /*istanbul ignore if*/
        if (err) {
            throw err;
        }

        app.clients.logger.info('server started', {
            serverAddress: app.clients.rootChannel.address()
        });
    });
}
