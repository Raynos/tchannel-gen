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
    /*eslint no-process-exit: 0*/
    var app = Application();

    // attach before throwing exception
    process.on('uncaughtException', app.clients.uncaught);

    app.bootstrap(function onAppReady(err) {
        /*istanbul ignore if*/
        if (err) {
            app.clients.logger.fatal('Could not start', {
                error: err
            });
            return process.exit(1);
        }

        // TODO set process.title

        app.clients.logger.info('server started', {
            serverAddress: app.clients.rootChannel.address()
        });
    });
}
