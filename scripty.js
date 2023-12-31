#!/usr/bin/env node
// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////////////////////////////////////////////////////////
// This is a script created by Kevin for his own use for doing things
// like granting extensions server side; it should be improved to make
// it more generic, or scrapped once instructor thingy is in place
/////////////////////////////////////////////////////////////////////

// TODO: let scripty take arguments

// node modules
//import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// determine project folder and navigate there
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

// read app settings
import appsettings from './app/lpsettings.js';
import lpdata from './app/lpdata.js';
import lplti from './app/lplti.js';

// set constants
const consumerkey = appsettings.defaultconsumer;
const contextid = appsettings.defaultcontext;
const urlRoot = appsettings.defaulturl;

async function printURL(consumerkey, contextid, userid, exnum) {
    let url = await lplti.launchUrlFor(consumerkey, contextid, userid, exnum
    );
    if (url === false) {
        console.log('That user has not launched that exercise yet.');
        return false;
    }
    url = urlRoot + url;
    console.log(url);
}

function showHelp() {
    console.log(`
Usage: ./scripty.js [cmd] [userid] [exnum] [yyyy-mm-dd] [hh:ss]

[cmd] should be either "url" or "extension"

`);
}

if (process.argv.length < 3) {
    showHelp();
    console.error('No command given.');
    process.exit(1);
}

const cmd = process.argv[2].toLowerCase();

if (/^-*help/.test(cmd)) {
    showHelp();
    process.exit(0);
}

if (cmd != 'url' && cmd != 'extension') {
    console.error('Unknown command.');
    process.exit(1);
}

let userid = process.argv[3] ?? '';
let exnum = process.argv[4] ?? '';

if (userid == '' || exnum == '') {
    console.error('User ID or exnum not given.');
    process.exit(1);
}

if (cmd == 'extension') {
    let date = process.argv[5] ?? '';
    let time = process.argv[6] ?? '';
    if (userid == '' || exnum == '') {
        console.error('Date or time not given.');
        process.exit(1);
    }
    let t = new Date( date + 'T' + time );
    if (isNaN(t)) {
        console.error('Invalid date or time given.');
        process.exit(1);
    }
    let r = lpdata.grantExtension(
        consumerkey, contextid, userid, exnum, t.getTime()
    );
    if (r === false) {
        console.error('There was an error granting the extension.');
        process.exit(1);
    }
}

printURL(consumerkey, contextid, userid, exnum);

