'use strict';

var fetchConfig = require('zero-config');

var ApplicationClients = require('./clients.js');
var Endpoints = require('./endpoints.js');

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
    self.endpoints = Endpoints(self);

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
