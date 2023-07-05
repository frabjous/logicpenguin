// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////lpsettings.js////////////////////////////////
// Reads the settings for the logic penguin instance and fills in   //
// defaults, etc., if not specified                                 //
//////////////////////////////////////////////////////////////////////

// load necessary modules
import fs from 'node:fs';
import lpfs from './lpfs.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// determine project folder and navigate there
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.dirname(__dirname));

// try to read settings from files
const appsettings = lpfs.loadjson('settings.json');
if (!appsettings) {
    appsettings = {}
}

// settings can be overridden with environmental variables
if ("LOGIC_PENGUIN_HTTP_PORT" in process.env) {
    appsettings.httpport = parseInt(
        process.env.LOGIC_PENGUIN_HTTP_PORT
    );
}

if ("LOGIC_PENGUIN_HTTPS_PORT" in process.env) {
    appsettings.httpsport = parseInt(
        process.env.LOGIC_PENGUIN_HTTPS_PORT
    );
}

if ("LOGIC_PENGUIN_DATA_DIR" in process.env) {
    appsettings.datadir = process.env.LOGIC_PENGUIN_DATA_DIR;
}

if ("LOGIC_PENGUIN_DEFAULT_CONSUMER" in process.env) {
    appsettings.defaultconsumer =
        process.env. LOGIC_PENGUIN_DEFAULT_CONSUMER;
}

if ("LOGIC_PENGUIN_DEFAULT_CONTEXT" in process.env) {
    appsettings.defaultcontext =
        process.env. LOGIC_PENGUIN_DEFAULT_CONTEXT;
}

if ("LOGIC_PENGUIN_DEFAULT_STUDENT" in process.env) {
    appsettings.defaultstudent =
        process.env. LOGIC_PENGUIN_DEFAULT_STUDENT;
}

if ("LOGIC_PENGUIN_DEFAULT_NOTATION" in process.env) {
    appsettings.defaultnotation =
        process.env. LOGIC_PENGUIN_DEFAULT_NOTATION;
}

if ("LOGIC_PENGUIN_DEFAULT_URL" in process.env) {
    appsettings.defaulturl =
        process.env. LOGIC_PENGUIN_DEFAULT_URL;
}

if ("LOGIC_PENGUIN_GRACEPERIOD" in process.env) {
    appsettings.graceperiod = parseInt(
        process.env.LOGIC_PENGUIN_GRACEPERIOD
    );
}

if ("LOGIC_PENGUIN_GRADING_START_HOUR" in process.env) {
    appsettings.starthour = parseInt(
        process.env.LOGIC_PENGUIN_GRADING_START_HOUR
    );
}

if ("LOGIC_PENGUIN_GRADING_START_MINUTE" in process.env) {
    appsettings.startmin = parseInt(
        process.env.LOGIC_PENGUIN_GRADING_START_MINUTE
    );
}

if ("LOGIC_PENGUIN_GRADING_INTERVAL" in process.env) {
    appsettings.gradeinterval = parseInt(
        process.env.LOGIC_PENGUIN_GRADING_INTERVAL
    );
}

// default ports at 8084 (dev)/80 (prod) or 4344/443
if (!("httpport" in appsettings)) {
    if (process.env.NODE_ENV &&
        process.env.NODE_ENV == 'development') {
        appsettings.httpport = 8084;
    } else {
        appsettings.httpport = 80;
    }
}

if (!("httpsport" in appsettings)) {
    if (process.env.NODE_ENV &&
        process.env.NODE_ENV == 'development') {
        appsettings.httpsport = 4344;
    } else {
        appsettings.httpsport = 443;
    }
}

// default datadir is __dirname/data
if (!("datadir" in appsettings)) {
    appsettings.datadir = 'data';
}

// default consumer, context and student are those for development
if (!("defaultconsumer" in appsettings)) {
    appsettings.defaultconsumer = "lpdeveloper";
}

if (!("defaultcontext" in appsettings)) {
    appsettings.defaultcontext = "testcontext";
}

if (!("defaultstudent" in appsettings)) {
    appsettings.defaultstudent = "teststudent";
}

// cambridge as default notation; sorry Gary?
if (!("defaultnotation" in appsettings)) {
    appsettings.defaultnotation = "cambridge";
}

// default graceperiod is 300000 ms or 5 minutes
if (!("graceperiod" in appsettings)) {
    appsettings.graceperiod = 300000;
}

// default url is localhost; I think this is only used by scripty
if (!("defaulturl" in appsettings)) {
    appsettings.defaulturl = 'http://localhost';
}

// no defaults set for gradeinterval, starthour, startmin; without
// gradeinterval, no grading will be done; starthour and startmin = 0

// ensure data dir exists
if (!lpfs.ensuredir(appsettings.datadir)) {
    console.error('Could not create data directory: ' +
        err.toString());
    process.exit(1);
}

// export to process so it can be used by public scripts
if (process) { process.appsettings = appsettings; }

export default appsettings;
