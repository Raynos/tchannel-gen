'use strict';

var TestCluster = require('./lib/test-cluster.js');

TestCluster.test('calling health', {
    appCount: 2
}, function t(cluster, assert) {
    cluster.client.health(onHealth);

    function onHealth(err, resp) {
        assert.ifError(err);

        assert.ok(resp.ok);
        assert.equal(resp.body.message, 'ok');

        assert.end();
    }
});
