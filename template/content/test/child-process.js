'use strict';

var console = require('console');
var path = require('path');
var test = require('tape');
var spawn = require('child_process').spawn;
var setTimeout = require('timers').setTimeout;

var TestClient = require('./lib/test-client.js');

var serverFile = path.join(
    __dirname, '..', 'server.js'
);

test('spin up server', function t(assert) {
    var proc = spawn('node', [
        serverFile,
        '--server.port', '0'
    ]);

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

        var portLine = lines.filter(function find(x) {
            return x.indexOf('server started') >= 0;
        })[0];

        if (!portLine) {
            console.error('# server failed');
            console.error('# server output');
            console.error(output);
            console.error('# server errput');
            console.error(errput);
        }

        assert.ok(portLine);
        var addr = JSON.parse(portLine).serverAddress;
        assert.ok(addr);

        var port = addr.port;
        var client = TestClient({
            hostPort: '127.0.0.1:' + String(port)
        });

        client.health(onHealth);
    }

    function onHealth(err, resp) {
        assert.ifError(err);

        assert.ok(resp.ok);
        assert.equal(resp.body.message, 'ok');

        proc.kill();
        assert.end();
    }
});
