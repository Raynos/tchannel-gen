'use strict';

var TChannel = require('tchannel');
var HyperbahnClient = require('tchannel/hyperbahn');
var path = require('path');

var thriftFile = path.join(
    __dirname, '..', '..', 'thrift', 'service.thrift'
);

module.exports = TestClient;

function TestClient(options) {
    if (!(this instanceof TestClient)) {
        return new TestClient(options);
    }

    var self = this;

    self.serviceName = options.serviceName;
    self.tchannel = TChannel({
        logger: options.logger
    });
    self.hyperbahnClient = HyperbahnClient({
        tchannel: self.tchannel,
        serviceName: self.serviceName + '-test',
        hostPortList: options.peers,
        logger: options.logger,
        hardFail: true,
        reportTracing: true
    });

    self.tchannelThrift = self.hyperbahnClient.getThriftCodecSync({
        serviceName: self.serviceName,
        thriftFile: thriftFile
    });
}

TestClient.prototype.destroy = function destroy() {
    var self = this;

    self.hyperbahnClient.destroy();
    self.tchannel.close();
};

TestClient.prototype._warmup = function _warmup(opts, cb) {
    var self = this;

    if (opts && opts.host) {
        self.tchannelThrift.waitForIdentified({
            host: opts.host
        }, cb);
    } else {
        cb(null);
    }

};

TestClient.prototype.health = function health(cb) {
    var self = this;

    self.tchannelThrift.request({
        serviceName: self.serviceName,
        hasNoParent: true
    }).send('MyService::health_v1', null, null, cb);
};

// TODO delete me
TestClient.prototype.get = function get(opts, cb) {
    var self = this;

    self._warmup(opts, onIdentified);

    function onIdentified(err) {
        if (err) {
            return cb(err);
        }

        self.tchannelThrift.request({
            serviceName: self.serviceName,
            hasNoParent: true,
            host: opts.host
        }).send('MyService::get_v1', null, {
            key: opts.key
        }, cb);
    }
};

// TODO delete me
TestClient.prototype.put = function put(opts, cb) {
    var self = this;

    self._warmup(opts, onIdentified);

    function onIdentified(err) {
        if (err) {
            return cb(err);
        }

        self.tchannelThrift.request({
            serviceName: self.serviceName,
            hasNoParent: true,
            host: opts.host
        }).send('MyService::put_v1', null, {
            key: opts.key,
            value: opts.value
        }, cb);
    }
};
