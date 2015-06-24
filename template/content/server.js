#!/usr/bin/env node
'use strict';

var fileStart = Date.now();

var hostname = require('os').hostname;
var process = require('process');
var path = require('path');
var getRepoInfo = require('git-repo-info');
var parseArgs = require('minimist');

var Application = require('./app.js');

module.exports = main;

/*istanbul ignore else: dead branch*/
if (require.main === module) {
    main({
        argv: parseArgs(process.argv.slice(2))
    });
}

function main(opts) {
    var mainStart = Date.now();

    /*eslint no-process-exit: 0*/
    var app = Application();

    // attach before throwing exception
    process.on('uncaughtException', app.clients.uncaught);

    var gitRepo = path.join(__dirname, '.git');
    var gitSha = getRepoInfo(gitRepo).sha;

    app.bootstrap(onAppReady);

    var bootstrapEnd = Date.now();

    function onAppReady(err) {
        /*istanbul ignore if: should never happen in prod*/
        if (err) {
            app.clients.logger.fatal('Could not start', {
                error: err
            });
            return process.exit(1);
        }

        // TODO set process.title

        var now = Date.now();
        app.clients.logger.info('server started', {
            serverAddress: app.clients.rootChannel.address(),
            gitSha: gitSha,
            startupTiming: {
                beforeMain: mainStart - fileStart,
                appTime: bootstrapEnd - mainStart,
                startTime: now - bootstrapEnd,
                totalTime: now - fileStart
            }
        });
    });
}
