// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// lpinstructor.js /////////////////////////////////////
// responds to instructor-only json requests                          //
////////////////////////////////////////////////////////////////////////

import lpauth from './lpauth.js';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';
import lplti from './lplti.js';
import path from 'node:path';

// set datadir
const datadir = process.appsettings.datadir;

const qr = {};

qr.allstudentinfo = async function(req) {
    const info = {};
    // read info about exercises
    const exdir = path.join(datadir, req.consumerkey, req.contextid, 'exercises');
    if (!lpfs.ensuredir(exdir)) {
        return {
            error: true,
            errMsg: 'Could not find or create exercise directory.'
        }
    }
    let exfiles = await lpfs.filesin(exdir);
    if (exfiles === false) { exfiles = []; }
    // only look at -info files
    exfiles = exfiles.filter((f) => (f.substr(-10) == '-info.json'));
    info.exercises = {};
    // read exercises for the duetime
    for (const fn of exfiles) {
        const ffn = path.join(exdir, fn);
        const exinfo = lpfs.loadjson(ffn);
        // the exnum cuts off 10 characters '-info.json'
        const exnum = fn.substr(0, fn.length - 10);
        if (!exinfo) { continue; }
        if (exinfo?.savable &&
            (("duetime" in exinfo) && (exinfo.duetime > 0))) {
            info.exercises[exnum] = exinfo.duetime;
        }
    }
    // read list of students
    const usersdir = path.join(datadir, req.consumerkey, req.contextid, 'users');
    const users = await lpfs.subdirs(usersdir);
    info.users = {};
    for (const userid of users) {
        const userinfo = {};
        userinfo.exercises = {};
        const userdir = path.join(usersdir, userid);
        const extensionsdir = path.join(userdir, 'extensions');
        const launchesdir = path.join(userdir, 'launches');
        let launches = await lpfs.filesin(launchesdir);
        if (!launches) {
            launches = [];
        }
        // read personal data from first launch
        if (launches.length > 0) {
            const launchfile = path.join(launchesdir, launches[0]);
            const launchinfo = lpfs.loadjson(launchfile);
            for (const personalinfo of ['email','family','given','fullname','roles']) {
                if (personalinfo in launchinfo) {
                    userinfo[personalinfo] = launchinfo[personalinfo];
                }
            }
        }
        const saveddir = path.join(userdir, 'saved');
        const scoresdir = path.join(userdir, 'scores');
        for (const exnum in info.exercises) {
            const thisex = {};
            const extfile = path.join(extensionsdir, exnum + '.json');
            const savedfile = path.join(saveddir, exnum + '.json');
            const scorefile = path.join(scoresdir, exnum + '.json');
            if (lpfs.isfile(extfile)) {
                const exttime = lpfs.loadjson(extfile);
                if (exttime !== false) {
                    thisex.extension = exttime;
                }
            }
            if (lpfs.isfile(scorefile)) {
                const score = lpfs.loadjson(scorefile);
                if (score !== false) {
                    thisex.score = score;
                }
            }
            thisex.launch = false;
            for (const l of launches) {
                if (l.substring(0, exnum.length + 1) == exnum + '-') {
                    let lstr = l.substr(-45);
                    lstr = lstr.substring(0,40);
                    thisex.launch = lstr;
                    break;
                }
            }
            thisex.saved = lpfs.isfile(savedfile);
            userinfo.exercises[exnum] = thisex;
        }
        info.users[userid] = userinfo;
    }
    return info;
}

qr.grantextension = async function(req) {
    for (const reqqy of ["consumerkey", "contextid", "extuserid", "extexnum",
        "ts"]) {
        if (!(reqqy in req)) {
            return { error: true, errMsg: 'Insufficient information ' +
                'provided to grant extension.' }
        }
    }
    const success = lpdata.grantExtension(req.consumerkey, req.contextid,
        req.extuserid, req.extexnum, req.ts);
    if (!success) {
        return { error: true,
            errMsg: 'Unable to grant extension.'
        }
    }
    return { success: true };
}

qr.getsystemnames = async function(req) {
    const files = await lpfs.filesin('public/js/problemtypes');
    const systemspt = files.filter((f) => {
        if (f.substring(0,11) != 'derivation-') { return false; }
        if (f.indexOf('-base') != -1) { return false; }
        return true;
    });
    const systems = systemspt.map((n) => (
        n.replace('derivation-','').replace('.js','')
    ));
    return { systems }
}

qr.overridescore = async function(req) {
    for (const reqqy of ["consumerkey", "contextid", "scoreuserid",
        "scoreexnum", "newscore"]) {
        if (!(reqqy in req)) {
            return { error: true, errMsg: 'Insufficient information ' +
                'provided to override score.' }
        }
    }
    return req;
}

qr.savecontextsettings = async function(req) {
    if (!("contextSettings" in req)) {
        return {
            error: true,
            errMsg: 'No context settings to save were sent.'
        }
    }
    const dirname = path.join(datadir, req.consumerkey, req.contextid);
    if (!lpfs.ensuredir(dirname)) {
        return {
            error: true,
            errMsg: 'Could not find or create directory for course.'
        }
    }
    const settingsfile = path.join(dirname, 'context-settings.json');
    if (!lpfs.savejson(settingsfile, req.contextSettings)) {
        return {
            error: true,
            errMsg: 'Could not save course settings file.'
        }
    }
    return { success: true }
}

const lpinstructor = async function(reqobj) {
        // ensure we have all needed data
    const { userid, contextid, consumerkey, launchid, query } = reqobj;
    if (!launchid || !userid || !contextid || !consumerkey || !query) {
        return {
            error: true,
            errMsg: 'Insufficient information provided to process query.'
        };
    }
    if (!(query in qr)) {
        return {
            error: true,
            errMsg: 'Unkown query type.'
        };
    }
    if (!lpauth.verifylaunch(consumerkey, contextid, userid,
        'instructorpage', launchid)) {
        return {
            error: true,
            errMsg: 'Instructor query with unverified launch id.'
        };
    }
    return await qr[query](reqobj);
}

export default lpinstructor;
