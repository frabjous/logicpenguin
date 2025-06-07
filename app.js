// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////////// app.js /////////////////////////////////
// This is the main executable for the server that provides the
// tool provider, etc. Can be run using npm scripts, as either:
// npm run develop
// npm run production
// //////////////////////////////////////////////////////////////

// import external modules
import cors    from 'cors'; // allows cross-origin requests
import debugM  from 'debug'; // package for debugging
import express from 'express'; // general webserver framework
import fs      from 'node:fs'; // file system
import http    from 'node:http'; // for handling http requests
import https   from 'node:https'; // for handling https requests
import morgan  from 'morgan'; // logging and debug-reporting package
import path    from 'node:path'; // resolve path names

// define dirname, filename; move to that folder
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

// read app settings; should also make it attach to process global object
import appsettings from './app/lpsettings.js';

// import internal modules
import lpauth from './app/lpauth.js';
import lpfs from './app/lpfs.js'; // also creates process.lpfs
import lpgrading from './app/lpgrading.js';
import lplti from './app/lplti.js';
import lprequesthandler from './app/lprequesthandler.js';
import { getpagetext, getexercise, getinstructorpage, getlecture } from './app/lppages.js';

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
const httpenabled = (appsettings.httpport != 0);
const httpsenabled = (appsettings.httpsport != 0 &&
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

// use original url when behind a proxy
app.enable('trust proxy');
app.set('trust proxy', true);

// redirect http to https if both are enabled
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
// must set higher payload for large requests
app.use(express.json({limit: '5mb'}));

// middleware that parses requests with
// Content-Type = application/x-www-form-urlencoded
// and creates req.body object with the result of the parsing
app.use(express.urlencoded({ extended: false }));

// setup the public/ folder as serving static content
app.use(express.static('public'));

// ROUTES

// exercise launch request
app.post('/launch/:exnum', async function(req, res) {

  // use hostname of proxy
  if (req.headers['x-forwarded-host'] &&
    req.headers.host != req.headers['x-forwarded-host']) {
    req.headers.host = req.headers['x-forwarded-host'];
  }
  // use pre-proxy protocol
  if (req.headers['x-forwarded-proto'] &&
    req.protocol != req.headers['x-forwarded-proto']) {
      req.protocol = req.headers['x-forwarded-proto'];
  }

  // check consumerkey and check against consumer secret
  const consumerkey = req.body?.oauth_consumer_key ?? false;
  if (!consumerkey) {
    return res.status(403).send(getpagetext('403.html', {
      message: 'No consumer key provided'
    }));
  }
  const consumersecret = await lplti.getConsumerSecret(consumerkey);
  if (!consumersecret) {
    return res.status(403).send(getpagetext('403.html', {
      message: 'Invalid consumer key provided'
    }));
  }
  // read contextid, userid
  const contextid = req.body?.context_id ?? false;
  const userid =
    (req.body?.user_id ?? req.body?.ext_user_username) ?? false;
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
    const launchid = lpauth.newlaunch(req.body, req.params.exnum);
    if (launchid === false) {
      return res.status(500).send(getpagetext('500.html', {
        message: 'Server unable to make record of launch'
      }));
    }
    // instructorpage is special
    if (req.params.exnum == 'instructorpage') {
      console.log(req.body.roles);
      if (req.body.roles.indexOf('Instructor') == -1) {
        return res.status(403).send(getpagetext('403.html', {
          message: 'Non-instructor attempt to access instructor-only page.'
        }));
      }
      const redirectloc = 'https://' + req.headers.host +
        '/instructor/' + consumerkey + '/' + contextid + '/' +
        userid + '/' + launchid;
      return res.redirect(redirectloc);
    }
    // redirect to actual exercise
    const redirectloc = 'https://' + req.headers.host +
      '/exercises/' + consumerkey + '/' + contextid + '/' +
      userid + '/' + req.params.exnum + '/'  + launchid;
    return res.redirect(redirectloc);
  });
});

// allow direct access to exercises for test consumer and context
// when app is in development mode
app.get('/developmenttest/:exnum',
  async function(req, res) {
    if (process.env.NODE_ENV != 'development') {
      res.send("not in development");
      return;
    }
    const consumerkey = appsettings.defaultconsumer;
    const contextid = appsettings.defaultcontext;
    const exnum = req.params.exnum;
    const userid = appsettings.defaultstudent;
    const launchid = 'developmenttest';
    if (!lpauth.verifylaunch(consumerkey, contextid, userid, exnum,
                             launchid)) {
      return res.status(403).send(getpagetext('403.html', {
        message: 'Invalid launch id for user and exercise'
      }));
    }
    const exercisepage = await getexercise( consumerkey, contextid,
                                            userid, exnum, launchid);
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
    if (!lpauth.verifylaunch(consumerkey, contextid, userid,
        exnum, launchid)) {
      return res.status(403).send(getpagetext('403.html', {
        message: 'Invalid launch id for user and exercise'
      }));
    }
    const exercisepage = await getexercise(consumerkey, contextid,
      userid, exnum, launchid);
    if (!exercisepage) {
      return res.status(404).send(getpagetext('404.html',{}));
    }
    return res.send(exercisepage);
  }
);

// instructor page, typically redirected from lti launch
app.get('/instructor/:consumerkey/:contextid/:userid/:launchid',
  async function(req, res) {
    const consumerkey = req.params.consumerkey;
    const contextid = req.params.contextid;
    const userid = req.params.userid;
    const launchid = req.params.launchid;
    if (!lpauth.verifylaunch(consumerkey, contextid, userid,
                             'instructorpage', launchid)) {
      return res.status(403).send(getpagetext('403.html', {
        message: 'Invalid attempt to access instructor page.'
      }));
    }
    const instructorpage = await getinstructorpage(consumerkey,
                                                   contextid, userid, launchid);
    if (!instructorpage) {
      return res.status(404).send(getpagetext('404.html',{}));
    }
    return res.send(instructorpage);
  }
);

// lecture notes
app.get('/lectures/:consumerkey/:contextid/:unit',
  async function(req, res) {
    const consumerkey = req.params.consumerkey;
    const contextid = req.params.contextid;
    const unit = req.params.unit;
    const lecturepage = await getlecture(consumerkey, contextid, unit);
    if (!lecturepage) {
      return res.status(404).send(getpagetext('404.html',{}));
    }
    return res.send(lecturepage);
  }
);

// process json request
app.post('/json', async function(req, res) {
  const resp = await lprequesthandler.respond(req.body);
  res.json(resp);
});

// reverse string: used to test if server is still up
app.get('/reverse/:str',
  async function(req, res) {
    res.send(req.params.str.split('').reverse().join(''));
  }
);

// if a fallback folder exists, it is served as static content
if (lpfs.isdir('fallback')) {
  app.use(express.static('fallback'));
}

// serve "index.html" when no filename is given to fallback
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

// listen on https port
if (httpsenabled) {
  httpsserver = https.createServer({
    key: fs.readFileSync(path.join('certs', 'key.pem')),
    cert: fs.readFileSync(path.join('certs', 'cert.pem'))
  }, app);
  httpsserver.listen(appsettings.httpsport);
  // report errors
  httpsserver.on('error', onError);
  // report listening to stdout
  httpsserver.on('listening', () => {
    const addr = httpsserver.address();
    debug('HTTPS server listening on ' + addr.port.toString());
  });
}

// listen on http port
if (httpenabled) {
  httpserver = http.createServer(app);
  httpserver.listen(appsettings.httpport);
  // report errors
  httpserver.on('error', onError);
  // report listening to stderr
  httpserver.on('listening', () => {
    const addr = httpserver.address();
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
process.on('SIGINT', () => {
  debug('SIGINT signal received: closing HTTP/S server');
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
  const currentDateObj = new Date();
  const currentTime = currentDateObj.getTime();
  const year = currentDateObj.getFullYear();
  const monthIndex = currentDateObj.getMonth();
  const date = currentDateObj.getDate();
  // read time to start grading from settings; or make midnight
  const hours = (appsettings.starthour ?? 0);
  const minutes = (appsettings.startmin ?? 0);
  // determine when that would be today
  const startDateObj = new Date(
    year, monthIndex, date, hours, minutes);
  let startTime = startDateObj.getTime();
  // if we missed that time, add a day to start tomorrow
  if (startTime < currentTime) { startTime += 86400000; }
  let waittostart = startTime - currentTime;
  // we do not wait in development mode
  if (process.env.NODE_ENV == 'development') {
    waittostart = 0;
  }
  // set timer to begin intervals
  setTimeout(
    async () => {
      // do it right away
      await lpgrading.fullGradingScan();
      // set regular interval
      setInterval(
        async () => {
          // don't do it if already doing it and taking awhile
          if (isgrading) { return; }
          // mark as grading
          isgrading = true;
          // do actual grading
          debug('Starting grading scan …');
          await lpgrading.fullGradingScan();
          // mark as no longer doing it
          isgrading = false;
        },
        appsettings.gradeinterval
      );
    },
    waittostart
  );
}
