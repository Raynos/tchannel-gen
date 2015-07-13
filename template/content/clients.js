'use strict';

var TChannel = require('tchannel');
var HyperbahnClient = require('tchannel/hyperbahn');
var fs = require('fs');
var path = require('path');
var Ringpop = require('ringpop');
var Logtron = require('logtron');
var Statsd = require('uber-statsd-client');
var os = require('os');
var process = require('process');
var myLocalIp = require('my-local-ip');
var Uncaught = require('uncaught-exception');
var ProcessReporter = require('process-reporter');

var thriftFile = fs.readFileSync(
    path.join(__dirname, 'thrift', 'service.thrift'), 'utf8'
);

/* TODO:
    - heap dump
    - repl
*/
module.exports = ApplicationClients;

function ApplicationClients(config, options) {
    /*eslint no-process-env: 0*/
    if (!(this instanceof ApplicationClients)) {
        return new ApplicationClients(config, options);
    }

    var self = this;

    self.serviceName = config.get('serviceName');

    self.logger = options.logger || Logtron({
        meta: {
            team: config.get('team'),
            project: config.get('project')
        },
        backends: Logtron.defaultBackends({
            console: config.get('clients.logtron.console'),
            raw: true
        })
    });
    self.statsd = options.statsd || new Statsd({
        host: config.get('clients.uber-statsd-client.host'),
        port: config.get('clients.uber-statsd-client.port'),
        prefix: [
            config.get('project'),
            process.env.NODE_ENV,
            os.hostname().split('.')[0]
        ]
    });
    self.uncaught = Uncaught({
        logger: self.logger,
        statsd: self.statsd,
        statsdKey: 'uncaught-exception',
        prefix: [
            config.get('project'),
            process.env.NODE_ENV,
            os.hostname().split('.')[0]
        ],
        backupFile: config.get('clients.uncaught-exception.backupFile')
    });
    self.bootFile = config.get('bootFile');
    self.port = config.get('port');
    self.host = config.get('host') || myLocalIp();

    self.rootChannel = TChannel({
        logger: self.logger,
        statsd: self.statsd,
        statTags: {
            app: self.serviceName
        }
    });

    self.appChannel = self.rootChannel.makeSubChannel({
        serviceName: self.serviceName
    });
    self.ringpopChannel = self.rootChannel.makeSubChannel({
        serviceName: 'ringpop'
    });
    self.tchannelThrift = self.rootChannel.TChannelAsThrift({
        source: thriftFile
    });

    self.hyperbahnClient = HyperbahnClient({
        tchannel: self.rootChannel,
        serviceName: self.serviceName,
        hostPortList: config.get('clients.hyperbahn.seedList'),
        hardFail: config.get('clients.hyperbahn.hardFail'),
        reportTracing: config.get('clients.hyperbahn.reportTracing'),
        logger: self.logger,
        statsd: self.statsd
    });

    self.ringpop = Ringpop({
        app: self.serviceName,
        logger: self.logger,
        channel: self.ringpopChannel,
        hostPort: self.host + ':' + self.port
    });

    self.processReporter = ProcessReporter({
        statsd: self.statsd
    });
}

ApplicationClients.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    var called = false;

    self.processReporter.bootstrap();
    self.rootChannel.listen(self.port, self.host, onListening);

    function onListening() {
        self.ringpop.setupChannel();

        if (self.bootFile) {
            self.ringpop.bootstrap(self.bootFile, onRingpop);
        } else {
            onRingpop(null);
        }
    }

    function onRingpop(err) {
        /*istanbul ignore if: should never happen in prod */
        if (err) {
            self.logger.fatal('cannot bootstrap ringpop', {
                err: err
            });
            return cb(err);
        }

        self.hyperbahnClient.once('advertised', onAdvertize);
        self.hyperbahnClient.once('error', onError);
        self.hyperbahnClient.advertise();
    }

    function onAdvertize() {
        /*istanbul ignore else: never happens in prod */
        if (!called) {
            called = true;
            cb();
        }
    }

    /*istanbul ignore next: should never happen in prod */
    function onError(err) {
        if (!called) {
            called = true;

            self.logger.fatal('cannot bootstrap hyperbahn', {
                err: err
            });
            cb(err);
        }
    }
};

ApplicationClients.prototype.destroy = function destroy() {
    var self = this;

    self.processReporter.destroy();
    self.hyperbahnClient.destroy();
    self.rootChannel.close();
    self.ringpop.destroy();
};
