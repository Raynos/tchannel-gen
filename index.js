'use strict';

var process = require('process');
var ngen = require('uber-ngen/bin/ngen.js');
var parseArgs = require('minimist');

if (require.main === module) {
    main(parseArgs(process.argv.slice(2)));
}

function main(opts) {
    opts.template = 'template';
    opts.directory = __dirname;

    ngen(opts);
}
