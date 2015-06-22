'use strict';

var test = require('tape');

var tchannelGen = require('../index.js');

test('tchannelGen is a function', function t(assert) {
    assert.equal(typeof tchannelGen, 'function');
    assert.end();
});
