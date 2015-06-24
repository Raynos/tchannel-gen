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

var SERVICE_NAME = 'my-service';

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

    self.logger = options.logger || Logtron({
        meta: {
            team: 'my-team',
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
            app: SERVICE_NAME
        }
    });

    self.appChannel = self.rootChannel.makeSubChannel({
        serviceName: SERVICE_NAME
    });
    self.ringpopChannel = self.rootChannel.makeSubChannel({
        serviceName: 'ringpop'
    });
    self.tchannelThrift = self.rootChannel.TChannelAsThrift({
        source: thriftFile
    });

    self.hyperbahnClient = HyperbahnClient({
        tchannel: self.rootChannel,
        serviceName: SERVICE_NAME,
        hostPortList: config.get('clients.hyperbahn.seedList'),
        hardFail: config.get('clients.hyperbahn.hardFail'),
        reportTracing: config.get('clients.hyperbahn.reportTracing'),
        logger: self.logger,
        statsd: self.statsd
    });

    self.ringpop = Ringpop({
        app: SERVICE_NAME,
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
        /*istanbul ignore if*/
        if (err) {
            self.logger.fatal('cannot bootstrap ringpop', {
                err: err
            });
            return cb(err);
        }

        self.hyperbahnClient.once('advertised', cb);
        self.hyperbahnClient.advertise();
    }
};

ApplicationClients.prototype.destroy = function destroy() {
    var self = this;

    self.processReporter.destroy();
    self.hyperbahnClient.destroy();
    self.rootChannel.close();
    self.ringpop.destroy();
};
