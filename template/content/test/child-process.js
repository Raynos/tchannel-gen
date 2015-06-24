'use strict';

var console = require('console');
var path = require('path');
var spawn = require('child_process').spawn;
var setTimeout = require('timers').setTimeout;

var TestCluster = require('./lib/test-cluster.js');

var serverFile = path.join(
    __dirname, '..', 'server.js'
);

TestCluster.test('spin up server', {
    appCount: 0
}, function t(cluster, assert) {
    var args = [
        serverFile,
        '--port', '0'
    ];

    var hostPortList = cluster.hyperbahnCluster.hostPortList;
    for (var i = 0; i < hostPortList.length; i++) {
        args.push('--clients.hyperbahn.seedList');
        args.push(hostPortList[i]);
    }

    var proc = spawn('node', args);

    var output = '';
    var errput = '';

    proc.stdout.on('data', function onData(buf) {
        output += String(buf);
    });
    proc.stderr.on('data', function onData(buf) {
        errput += String(buf);
    });

    var counter = 0;
    setTimeout(verifyStarted, 500);

    function verifyStarted() {
        /*eslint no-console: 0, max-statements: [2, 25]*/
        counter++;
        var lines = output.split('\n').filter(Boolean);

        if (lines.length === 0 && counter < 5) {
            return setTimeout(verifyStarted, 500);
        }

        assert.ok(lines.length > 0);

        // server.js logs the server started message
        var startedLine = lines.filter(function find(x) {
            return x.indexOf('server started') >= 0;
        });

        if (!startedLine) {
            console.error('# server failed');
            console.error('# server output');
            console.error(output);
            console.error('# server errput');
            console.error(errput);
        }

        assert.ok(startedLine);
        cluster.client.health(onHealth);
    }

    function onHealth(err, resp) {
        assert.ifError(err);

        assert.ok(resp.ok);
        assert.equal(resp.body.message, 'ok');

        proc.kill();
        assert.end();
    }
});
