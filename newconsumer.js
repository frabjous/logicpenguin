#!/usr/bin/env node
// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.


////////////////////// newconsumer.js //////////////////////////
// Creates a new consumer and saves and/or generates its secret
// Should be executed from command line on the server
////////////////////////////////////////////////////////////////

// node modules
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// determine project folder and navigate there
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

// read app settings
import appsettings from './app/lpsettings.js';
import lpfs from './app/lpfs.js';
import { randomString } from './public/js/misc.js';

// help output
function showHelp() {
    console.log(`

Usage: newconsumer.js [consumerkey] ([secret])

Creates a new consumer for the logic penguin LTI with the
specified key id and secret. If no secret is supplied, a random
secret will be generated and printed.

`);
}

// give help if requested, then quit
if (/-*[Hh](elp)?/.test(process.argv[2])) {
    showHelp();
    process.exit(0);
}

// quit if wrong number of arguments
if (process.argv.length < 3 || process.argv.length > 4) {
    showHelp();
    console.error('Wrong number of arguments given.')
    process.exit(1);
}

// read consumerkey from command line
let consumerkey = process.argv[2];
const consumerdir = path.join(appsettings.datadir, consumerkey);

// ensure does not already exist
if (lpfs.isdir(consumerdir)) {
    console.error('Consumer with id ' + consumerkey + ' already exists');
    process.exit(1);
}

// create directory for consumer
if (!lpfs.mkdir(consumerdir)) {
    console.error('Could not create directory for consumer ' +
        consumerkey + '.');
    process.exit(1);
}

// read consumer secret from id or generate random one
let consumersecret = process.argv[3];
if (!consumersecret) {
    consumersecret = randomString(32);
}

// write secret file
let consumersecretfile = path.join(consumerdir, '.secret.txt');
try {
    fs.writeFileSync(consumersecretfile, consumersecret,
        { encoding: 'utf8', mode: 0o644 });
} catch(err) {
    console.error('Error writing consumer secret file: ' +
        err.toString());
    process.exit(1);
}

// report success
console.log('\nConsumer ' + consumerkey + ' created with secret: ' +
    consumersecret);
console.log('\nTo remove a consumer, simply delete its directory from\n' +
    appsettings.datadir + '\n(after backing up any necessary data).');
process.exit(0);
