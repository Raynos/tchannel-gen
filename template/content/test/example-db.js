'use strict';

/** TODO DELETE ME

This is an example test to demonstrate how to use the
test-client.js to write integration tests

*/

var TestCluster = require('./lib/test-cluster.js');

TestCluster.test('calling put and get', {
    appCount: 1
}, function t(cluster, assert) {
    cluster.client.put('foo', 'bar', onPut);

    function onPut(err, resp) {
        assert.ifError(err);

        assert.ok(resp.ok);

        cluster.client.get('foo', onGet);
    }

    function onGet(err, resp) {
        assert.ifError(err);

        assert.ok(resp.ok);
        assert.equal(resp.body, 'bar');

        assert.end();
    }
});

TestCluster.test('calling get for non-existant key', {
    appCount: 1
}, function t(cluster, assert) {
    cluster.client.get('foo', onGet);

    function onGet(err, resp) {
        assert.ifError(err);

        assert.ok(!resp.ok);
        assert.equal(resp.body.message, 'no such key foo');

        assert.end();
    }
});
