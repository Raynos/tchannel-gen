'use strict';

var fetchConfig = require('zero-config');

var ApplicationClients = require('./clients.js');

module.exports = Application;

function Application(options) {
    if (!(this instanceof Application)) {
        return new Application(options);
    }

    var self = this;
    options = options || {};

    self.config = fetchConfig(__dirname, {
        dcValue: 'todo',
        seed: options.seedConfig,
        loose: false
    });

    self.clients = ApplicationClients(self.config, {
        logger: options.logger,
        statsd: options.statsd
    });

    var channel = self.clients.appChannel;
    var thrift = self.clients.tchannelThrift;

    thrift.register(
        channel, 'MyService::health_v1', self, Application.health
    );

    // TODO remove example endpoints
    thrift.register(
        channel, 'MyService::get_v1', self, Application.get
    );
    thrift.register(
        channel, 'MyService::put_v1', self, Application.put
    );

    // Example data structure on application
    self.exampleDb = {};
}

Application.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.clients.bootstrap(cb);
};

Application.prototype.destroy = function destroy() {
    var self = this;

    self.clients.destroy();
};

Application.health = function health(app, req, head, body, cb) {
    cb(null, {
        ok: true,
        body: {
            message: 'ok'
        }
    });
};

// TODO remove me
Application.get = function get(app, req, head, body, cb) {
    if (!(body.key in app.exampleDb)) {
        return cb(null, {
            ok: false,
            body: new Error('no such key ' + body.key),
            typeName: 'noKey'
        });
    }

    var value = app.exampleDb[body.key];

    cb(null, {
        ok: true,
        body: value
    });
};

// TODO remove me
Application.put = function put(app, req, head, body, cb) {
    app.exampleDb[body.key] = body.value;

    cb(null, {
        ok: true,
        body: null
    });
};
