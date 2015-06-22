'use strict';

var tapeCluster = require('tape-cluster');
var parallel = require('run-parallel');
var tape = require('tape');
var DebugLogtron = require('debug-logtron');
var NullStatsd = require('uber-statsd-client/null');

var TestClient = require('./test-client.js');
var Application = require('../../app.js');

TestCluster.test = tapeCluster(tape, TestCluster);

module.exports = TestCluster;

function TestCluster(opts) {
    if (!(this instanceof TestCluster)) {
        return new TestCluster(opts);
    }

    var self = this;

    self.logger = DebugLogtron('loggerservice');
    self.statsd = NullStatsd();
    self.appCount = opts.appCount || 1;
    self.host = '127.0.0.1';
    self.apps = [];
    self.appPorts = [];
    self.bootFile = null;

    self.clients = [];
}

TestCluster.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    for (var i = 0; i < self.appCount; i++) {
        // TODO: better port selection ;)
        self.appPorts[i] = 20000 + Math.floor(Math.random() * 10000);
    }

    self.bootFile = self.appPorts.map(function b(port) {
        return self.host + ':' + port;
    });

    for (i = 0; i < self.appCount; i++) {
        self.apps[i] = Application({
            logger: self.logger,
            seedConfig: {
                port: self.appPorts[i],
                bootFile: self.bootFile,
                host: self.host
            }
        });
    }

    parallel(self.apps.map(function l(app) {
        return app.bootstrap.bind(app);
    }), onInit);

    function onInit(err) {
        if (err) {
            return cb(err);
        }

        for (i = 0; i < self.appCount; i++) {
            var hostPort = self.bootFile[i];

            self.clients[i] = TestClient({
                hostPort: hostPort,
                logger: self.logger
            });
        }
        cb(null);
    }
};

TestCluster.prototype.close = function close(cb) {
    var self = this;

    for (var i = 0; i < self.appCount; i++) {
        self.apps[i].destroy();
    }

    cb();
};

