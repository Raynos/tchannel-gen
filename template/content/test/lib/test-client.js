'use strict';

var TChannel = require('tchannel');
var HyperbahnClient = require('tchannel/hyperbahn');
var fs = require('fs');
var path = require('path');

var thriftFile = fs.readFileSync(path.join(
    __dirname, '..', '..', 'thrift', 'service.thrift'
), 'utf8');

var SERVICE_NAME = 'my-service';

module.exports = TestClient;

function TestClient(options) {
    if (!(this instanceof TestClient)) {
        return new TestClient(options);
    }

    var self = this;

    self.tchannel = TChannel({
        logger: options.logger
    });
    self.hyperbahnClient = HyperbahnClient({
        tchannel: self.tchannel,
        serviceName: SERVICE_NAME + '-test',
        hostPortList: options.peers,
        logger: options.logger,
        reportTracing: false
    });

    self.tchannelThrift = self.tchannel.TChannelAsThrift({
        source: thriftFile,
        channel: self.hyperbahnClient.getClientChannel({
            serviceName: SERVICE_NAME
        })
    });
}

TestClient.prototype.health = function health(cb) {
    var self = this;

    self.tchannelThrift.request({
        serviceName: SERVICE_NAME,
        hasNoParent: true
    }).send('MyService::health_v1', null, null, cb);
};

TestClient.prototype.get = function get(key, cb) {
    var self = this;

    self.tchannelThrift.request({
        serviceName: SERVICE_NAME,
        hasNoParent: true
    }).send('MyService::get_v1', null, {
        key: key
    }, cb);
};

TestClient.prototype.put = function put(key, value, cb) {
    var self = this;

    self.tchannelThrift.request({
        serviceName: SERVICE_NAME,
        hasNoParent: true
    }).send('MyService::put_v1', null, {
        key: key,
        value: value
    }, cb);
};

TestClient.prototype.destroy = function destroy() {
    var self = this;

    self.hyperbahnClient.destroy();
    self.tchannel.close();
};
