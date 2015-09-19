'use strict';

var console = require('console');
var path = require('path');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var setTimeout = require('timers').setTimeout;

var TestCluster = require('./lib/test-cluster.js');

var serverFile = path.join(
    __dirname, '..', 'server.js'
);

TestCluster.test('spin up server', {
    appCount: 0
}, function t(cluster, assert) {

    spawnChild(cluster, onChild);

    function onChild(err1, child) {
        assert.ifError(err1);

        assert.ok(child.lines.length > 0);

        // server.js logs the server started message
        var startedLine = child.lines.filter(function find(x) {
            return x.indexOf('server started') >= 0;
        })[0];

        assert.ok(startedLine);
        cluster.client.health(onHealth);

        function onHealth(err2, resp) {
            assert.ifError(err2);

            assert.ok(resp.ok);
            assert.equal(resp.body.message, 'ok');

            child.proc.kill();
            assert.end();
        }
    }
});

TestCluster.test('spin up server with --processTitle', {
    appCount: 0
}, function t(cluster, assert) {

    spawnChild(cluster, {
        cliArgs: ['--processTitle', 'test-process-title']
    }, onChild);

    function onChild(err1, child) {
        assert.ifError(err1);

        assert.ok(child.lines.length > 0);

        // server.js logs the server started message
        var startedLine = child.lines.filter(function find(x) {
            return x.indexOf('server started') >= 0;
        })[0];

        assert.ok(startedLine);
        cluster.client.health(onHealth);

        function onHealth(err2, resp) {
            assert.ifError(err2);

            assert.ok(resp.ok);
            assert.equal(resp.body.message, 'ok');

            exec('ps -Cp ' + child.proc.pid, onProcesses);
        }

        function onProcesses(err2, stdout) {
            assert.ifError(err2);

            assert.ok(stdout.indexOf('test-process-title') !== -1);

            child.proc.kill();
            assert.end();
        }
    }
});

function spawnChild(cluster, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }

    var args = [
        serverFile,
        '--port', '0'
    ];

    var hostPortList = cluster.hyperbahnCluster.hostPortList;
    for (var i = 0; i < hostPortList.length; i++) {
        args.push('--clients.hyperbahn.seedList');
        args.push(hostPortList[i]);
    }

    if (opts.cliArgs) {
        args = args.concat(opts.cliArgs);
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

        // server.js logs the server started message
        var startedLine = lines.filter(function find(x) {
            return x.indexOf('server started') >= 0;
        })[0];

        if (!startedLine && counter < 5) {
            return setTimeout(verifyStarted, 500);
        }

        if (!startedLine) {
            console.error('# server failed');
            console.error('# server output');
            console.error(output);
            console.error('# server errput');
            console.error(errput);
        }

        cb(null, {
            proc: proc,
            lines: lines
        });
    }
}
