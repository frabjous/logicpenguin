// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

// import external modules
import cors    from 'cors';
import debugM  from 'debug';
import express from 'express';
import fs      from 'node:fs';
import http    from 'node:http';
import https   from 'node:https';
import morgan  from 'morgan';
import path    from 'node:path';

// define dirname, filename; move to that folder
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

// import internal modules
import lpauth from './app/lpauth.js';
import lpfs from './app/lpfs.js';
import lpgrading from './app/lpgrading.js';
import lplti from './app/lplti.js';
import lprequesthandler from './app/lprequesthandler.js';
import {
    getpagetext,
    getexercise,
    getlecture
} from './app/lppages.js';

// read app settings
import appsettings from './app/lpsettings.js';

// create debugger context
const debug = debugM('logic-penguin');
//
// ___  ___ _ ____   _____ _ __ 
/// __|/ _ \ '__\ \ / / _ \ '__|
//\__ \  __/ |   \ V /  __/ |
//|___/\___|_|    \_/ \___|_|
//
// report what's being used
debug('Data directory: ' + appsettings.datadir);
debug('HTTP port: '      + appsettings.httpport.toString());
debug('HTTPS port: '     + appsettings.httpsport.toString());

// determine whether to use http, https
let httpenabled = (appsettings.httpport != 0);
let httpsenabled = (appsettings.httpsport != 0 &&
    lpfs.isfile(path.join('certs', 'key.pem')) &&
    lpfs.isfile(path.join('certs', 'cert.pem')));

// create a new express app
const app = express();

// enable logging
app.use(morgan(
    "[:date[iso]] Started :method :url for :remote-addr",
    { immediate: true } )
);
app.use(morgan(
    "[:date[iso]] Completed :status :res[content-length] " +
    "in :response-time ms"
));

// redirect http to https
app.enable('trust proxy');
if (httpsenabled && httpenabled) {
    app.use(function(req, res, next) {
        if (!req.secure) {
            let redirectloc = 'https://' + req.headers.host + req.url;
            redirectloc = redirectloc.replace(
                appsettings.httpport.toString(),
                appsettings.httpsport.toString()
            );
            return res.redirect(redirectloc);
        }
        next();
    });
}

// enable CORS unless disabled by settings
if (!("disablecors" in appsettings) || (!appsettings.disablecors)) {
    app.use(cors());
    app.options('*', cors());
}

// middleware that parses requests with Content-Type = application.json
// and creates req.body object with the result of the parsing
app.use(express.json());

// middleware that parses requests with
// Content-Type = application/x-www-form-urlencoded
// and creates req.body object with the result of the parsing
app.use(express.urlencoded({ extended: false }));

// setup the public/ folder as serving static content
app.use(express.static('public'));

// define some routes

// exercise launch request
app.post('/launch/:exnum', async function(req, res) {
    // check consumerkey and check against consumer secret
    const consumerkey = req.body.oauth_consumer_key;
    if (!consumerkey) {
        return res.status(403).send(getpagetext('403.html', {
            message: 'No consumer key provided'
        }));
    }
    const consumersecret = await lplti.getConsumerSecret(
        consumerkey, appsettings.datadir
    );
    if (!consumersecret) {
        return res.status(403).send(getpagetext('403.html', {
            message: 'Invalid consumer key provided'
        }));
    }
    // read contextid, userid
    const contextid = req.body.context_id;
    const userid = req.body.user_id ?? req.body.ext_user_username;
    if (!contextid || !userid) {
        return res.status(403).send(getpagetext('403.html', {
            message: 'Inadequate course or user information provided'
        }));
    }
    // validate request
    const provider = new lplti.Provider(consumerkey, consumersecret);
    provider.valid_request(req, function(err, isValid) {
        if (!isValid) {
            return res.status(403).send(getpagetext('403.html', {
                message: err.toString()
            }));
        }
        // save launch information in user's data folder
        let launchid = lpauth.newlaunch(appsettings.datadir, req.body,
            req.params.exnum);
        if (launchid === false) {
            return res.status(500).send(getpagetext('500.html', {
                message: 'Server unable to make record of launch'
            }));
        }
        // redirect to actual exercise
        let redirectloc = 'https://' + req.headers.host +
            '/exercises/' + consumerkey + '/' + contextid + '/' +
            userid + '/' + req.params.exnum + '/'  + launchid;
        return res.redirect(redirectloc);
    });
});

// allow direct access to exercises for test consumer and context
app.get('/developmenttest/:exnum',
    async function(req, res) {
        if (process.env.NODE_ENV != 'development') {
            res.send("not in development");
            return;
        }
        const consumerkey = 'lpdeveloper';
        const contextid = 'testcontext';
        const exnum = req.params.exnum;
        const userid = 'teststudent';
        const launchid = 'developmenttest';
        if (!lpauth.verifylaunch(appsettings.datadir, consumerkey,
            contextid, userid, exnum, launchid)) {
            return res.status(403).send(getpagetext('403.html', {
                message: 'Invalid launch id for user and exercise'
            }));
        }
        let exercisepage = await getexercise(appsettings.datadir,
            consumerkey, contextid, userid, exnum, launchid);
        if (!exercisepage) {
            return res.status(404).send(getpagetext('404.html',{}));
        }
        return res.send(exercisepage);
    }
);


// regular exercises page typically redirected from launch by lti
app.get('/exercises/:consumerkey/:contextid/:userid/:exnum/:launchid',
    async function(req, res) {
        const consumerkey = req.params.consumerkey;
        const contextid = req.params.contextid;
        const exnum = req.params.exnum;
        const userid = req.params.userid;
        const launchid = req.params.launchid;
        if (!lpauth.verifylaunch(appsettings.datadir, consumerkey,
            contextid, userid, exnum, launchid)) {
            return res.status(403).send(getpagetext('403.html', {
                message: 'Invalid launch id for user and exercise'
            }));
        }
        let exercisepage = await getexercise(appsettings.datadir,
            consumerkey, contextid, userid, exnum, launchid);
        if (!exercisepage) {
            return res.status(404).send(getpagetext('404.html',{}));
        }
        return res.send(exercisepage);
    }
);

// lecture notes
app.get('/lectures/:consumerkey/:contextid/:unit',
    async function(req, res) {
        const consumerkey = req.params.consumerkey;
        const contextid = req.params.contextid;
        const unit = req.params.unit;
        let lecturepage = await getlecture(appsettings.datadir, 
            consumerkey, contextid, unit);
        if (!lecturepage) {
            return res.status(404).send(getpagetext('404.html',{}));
        }
        return res.send(lecturepage);
    }
);

// process json request
app.post('/json', async function(req, res) {
    let resp = await lprequesthandler.respond(appsettings.datadir,
        req.body);
    res.json(resp);
});

// reverse string: used to test still up
app.get('/reverse/:str',
    async function(req, res) {
        res.send(req.params.str.split('').reverse().join(''));
    }
);

// if a fallback folder exists, it is served as static content
if (lpfs.isdir('fallback')) {
    app.use(express.static('fallback'));
}

if (lpfs.isfile(path.join('fallback','index.html'))) {
    app.get('/', function(req, res) {
        res.sendfile(path.join('fallback','index.html'));
    });
}

// catch 404
app.use(function (req, res, next) {
    res.status(404).send(getpagetext('404.html',{}));
});

// catch other errors
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send(getpagetext('500.html',{}));
});

// disable X-Powered-By header to avoid attacks targeting Express
app.disable('x-powered-by');

// create servers; attach listeners
let httpserver = {};
let httpsserver = {};

if (httpsenabled) {
    httpsserver = https.createServer({
        key: fs.readFileSync(path.join('certs', 'key.pem')),
        cert: fs.readFileSync(path.join('certs', 'cert.pem'))
    }, app);
    httpsserver.listen(appsettings.httpsport);
    httpsserver.on('error', onError);
    httpsserver.on('listening', () => {
        let addr = httpsserver.address();
        debug('HTTPS server listening on ' + addr.port.toString());
    });
}

if (httpenabled) {
    httpserver = http.createServer(app);
    httpserver.listen(appsettings.httpport);
    httpserver.on('error', onError);
    httpserver.on('listening', () => {
        let addr = httpserver.address();
        debug('HTTP server listening on ' + addr.port.toString());
    });
}

// shutdown gracefully if terminated
process.on('SIGTERM', () => {
    debug('SIGTERM signal received: closing HTTP/S server');
    if (httpenabled) {
        httpserver.close(() => {
            debug('HTTP server closed')
        });
    }
    if (httpsenabled) {
        httpsserver.close(() => {
            debug('HTTPS server closed')
        });
    }
});

// handle specific listen errors with friendly messages
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    switch (error.code) {
        case 'EACCES':
            console.error('ERROR: Port requires elevated privileges.');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error('ERROR: Port is already in use.');
            process.exit(1);
            break;
        default:
            throw error;
    }
}
//                      _ _
//   __ _ _ __ __ _  __| (_)_ __   __ _
//  / _` | '__/ _` |/ _` | | '_ \ / _` |
// | (_| | | | (_| | (_| | | | | | (_| |
//  \__, |_|  \__,_|\__,_|_|_| |_|\__, |
//  |___/                         |___/
//

let isgrading = false;
if (appsettings.gradeinterval) {
    // get current time, year, month, date
    let currentDateObj = new Date();
    let currentTime = currentDateObj.getTime();
    let year = currentDateObj.getFullYear();
    let monthIndex = currentDateObj.getMonth();
    let date = currentDateObj.getDate();
    // read time to start grading from settings
    let hours = (appsettings.starthour ?? 0);
    let minutes = (appsettings.startmin ?? 0);
    // determine when that would be today
    let startDateObj = new Date(
        year, monthIndex, date, hours, minutes);
    let startTime = startDateObj.getTime();
    // if we missed that time, add a day to start
    // tomorrow
    if (startTime < currentTime) {
        startTime += 86400000;
    }
    let waittostart = startTime - currentTime;
    // we do not wait in development mode
    if (process.env.NODE_ENV == 'development') {
        waittostart = 0;
    }
    // set timer to begin intervals
    setTimeout(
        async (datadir) => {
            // do it right away
            await lpgrading.fullGradingScan(datadir);
            // set regular interval
            setInterval(
                async (datadir) => {
                    if (isgrading) { return; }
                    isgrading = true;
                    debug('Starting grading scan …');
                    await lpgrading.fullGradingScan(datadir);
                    isgrading = false;
                },
                appsettings.gradeinterval,
                datadir
            );
        },
        waittostart,
        appsettings.datadir
    );
}
