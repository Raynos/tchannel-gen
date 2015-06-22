'use strict';

module.exports = Endpoints;

function Endpoints(app) {
    if (!(this instanceof Endpoints)) {
        return new Endpoints(app);
    }

    var self = this;

    var channel = app.clients.appChannel;
    var thrift = app.clients.tchannelThrift;

    thrift.register(
        channel, 'MyService::health_v1', app, self.health
    );
    thrift.register(
        channel, 'MyService::get_v1', app, self.get
    );
    thrift.register(
        channel, 'MyService::put_v1', app, self.put
    );
}

Endpoints.prototype.health =
function health(app, req, head, body, cb) {
    cb(null, {
        ok: true,
        body: {
            message: 'ok'
        }
    });
};

Endpoints.prototype.get =
function get(app, req, head, body, cb) {
    var value = app.exampleDb[body.key];

    cb(null, {
        ok: true,
        body: value
    });
};

Endpoints.prototype.put =
function put(app, req, head, body, cb) {
    app.exampleDb[body.key] = body.value;

    cb(null, {
        ok: true,
        body: null
    });
};
