'use strict';

var tapeCluster = require('tape-cluster');
var parallel = require('run-parallel');
var tape = require('tape');
var DebugLogtron = require('debug-logtron');
var NullStatsd = require('uber-statsd-client/null');
var HyperbahnCluster = require('tchannel/test/lib/hyperbahn-cluster');
var path = require('path');
var fetchConfig = require('zero-config');

var TestClient = require('./test-client.js');
var Application = require('../../app.js');

TestCluster.test = tapeCluster(tape, TestCluster);

module.exports = TestCluster;

function TestCluster(opts) {
    if (!(this instanceof TestCluster)) {
        return new TestCluster(opts);
    }

    var self = this;

    self.config = fetchConfig(path.join(__dirname, '..', '..'), {
        dcValue: 'null',
        loose: false
    });

    self.logger = DebugLogtron('mytests');
    self.statsd = NullStatsd();
    self.appCount = 'appCount' in opts ? opts.appCount : 1;
    self.host = '127.0.0.1';
    self.apps = [];
    self.appPorts = [];
    self.bootFile = null;

    self.hyperbahnCluster = HyperbahnCluster({
        size: 2
    });

    self.client = null;
}

TestCluster.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.hyperbahnCluster.bootstrap(onHyperbahn);

    function onHyperbahn(err) {
        if (err) {
            return cb(err);
        }

        var i;

        for (i = 0; i < self.appCount; i++) {
            // TODO: better port selection ;)
            self.appPorts[i] = 20000 + Math.floor(Math.random() * 10000);
        }

        self.bootFile = self.appPorts.map(function b(port) {
            return self.host + ':' + port;
        });

        for (i = 0; i < self.appCount; i++) {
            var seedConfig = {
                port: self.appPorts[i],
                bootFile: self.bootFile,
                host: self.host,
                clients: {
                    hyperbahn: {
                        seedList: self.hyperbahnCluster.hostPortList
                    }
                }
            };

            self.apps[i] = Application({
                logger: self.logger,
                statsd: self.statsd,
                seedConfig: seedConfig
            });
        }

        parallel(self.apps.map(function l(app) {
            return app.bootstrap.bind(app);
        }), onInit);
    }

    function onInit(err) {
        if (err) {
            return cb(err);
        }

        self.client = TestClient({
            logger: self.logger,
            serviceName: self.config.get('serviceName'),
            peers: self.hyperbahnCluster.hostPortList
        });
        cb(null);
    }
};

TestCluster.prototype.close = function close(cb) {
    var self = this;

    for (var i = 0; i < self.appCount; i++) {
        self.apps[i].destroy();
    }

    self.client.destroy();
    self.hyperbahnCluster.close(cb);
};
