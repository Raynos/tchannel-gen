'use strict';

var TChannel = require('tchannel');
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
        logger: options.logger,
        requestDefaults: {
            hasNoParent: true,
            headers: {
                cn: 'test-client'
            }
        }
    });
    self.tchannelThrift = self.tchannel.TChannelThrift({
        source: thriftFile
    });
    self.clientChannel = self.tchannel.makeSubChannel({
        serviceName: SERVICE_NAME,
        peers: [options.hostPort]
    });
}

TestClient.prototype.health = function health(cb) {
    var self = this;

    self.tchannelThrift.send(self.clientChannel.request({
        serviceName: 'logger'
    }), 'Logger::health', null, null, cb);
};
