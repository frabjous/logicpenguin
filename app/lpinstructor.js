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

qr.allexerciseinfo = async function(req) {
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
    // read exercises for the duetime
    for (const fn of exfiles) {
        const ffn = path.join(exdir, fn);
        const exinfo = lpfs.loadjson(ffn);
        // the exnum cuts off 10 characters '-info.json'
        const exnum = fn.substr(0, fn.length - 10);
        if (!exinfo) { continue; }
        info[exnum] = exinfo;
    }
    return info;
}

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
            const overridefile = path.join(scoresdir,
                'override-' + exnum + '.json');
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
            if (lpfs.isfile(overridefile)) {
                thisex.overridden = true;
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

qr.exerciseinfo = async function(req) {
    if (!("exdata" in req)) {
        return { error: true, errMsg: 'No exercise info included.' }
    }
    const exdata = req.exdata;
    // rename if need be
    if (exdata.origexnum && (exdata.origexnum != exdata.exnum)) {
        const renameRes = await renameExerciseFiles(req.consumerkey,
            req.contextid, exdata.origexnum, exdata.exnum);
        if (!renameRes) {
            return { error: true, errMsg: 'Unable to rename exercise.' }
        }
    }
    const exdir = path.join(datadir, req.consumerkey, req.contextid, 'exercises');
    if (!lpfs.ensuredir(exdir)) {
        return { error: true, errMsg: 'Cannot find or create exercise directory.' }
    }
    const exinfofile = path.join(exdir, exdata.exnum + '-info.json');
    // do not overwrite existing exercise
    if ((!exdata.origexnum) && (lpfs.isfile(exinfofile))) {
        return { error: true, errMsg: 'Unable to create exercise; an ' +
            'exercise with that short name already exists!' }
    }
    const exinfo = exdata.exinfo;
    const exnum = exdata.exnum;
    if (exinfo.duetime === null) { delete exinfo.duetime; }
    let answers = [];
    let problems = [];
    if ("answers" in req) {
        answers = req.answers;
    }
    if ("problems" in req) {
        problems = req.problems;
    }
    // make sure all the numbers match
    const probsets = exinfo.problemsets;
    if (probsets.length != answers.length || probsets.length != problems.length) {
        return {
            error: true,
            errMsg: 'Info for an inconsistent number of problem sets received.'
        }
    }
    for (let i=0; i<problems.length; i++) {
        const probsetprobs = problems[i];
        const probsetans = answers[i];
        if (probsetprobs.length != probsetans.length) {
            return {
                error: true,
                errMsg: 'Numbers of problems and answers do not match.'
            }
        }
    }
    // save files
    const exprobfile = path.join(exdir, exnum + '-allproblems.json');
    const exansfile = path.join(exdir, exnum + '-answers.json');
    if (!lpfs.savejson(exinfofile, exinfo)) {
        return {
            error: true,
            errMsg: 'Unable to save exercise information file.'
        }
    }
    if (!lpfs.savejson(exprobfile, problems)) {
        return {
            error: true,
            errMsg: 'Unable to save exercise problems file.'
        }
    }
    if (!lpfs.savejson(exansfile, answers)) {
        return {
            error: true,
            errMsg: 'Unable to save exercise answers file.'
        }
    }
    return { success: true }
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
    const userdir = lpdata.userdir(req.consumerkey, req.contextid,
        req.scoreuserid, false);
    if (!userdir) {
        return { error: true, errMsg: 'Cannot find directory for user.' }
    }
    const scoredir = path.join(userdir, 'scores');
    const scorefile = path.join(scoredir, req.scoreexnum + '.json');
    const overridefile = path.join(scoredir, 'override-' + req.scoreexnum + '.json');
    let overrides = [];
    if (lpfs.isfile(overridefile)) {
        const readoverrides = lpfs.loadjson(overridefile);
        if (readoverrides) { overrides = readoverrides; }
    }
    let oldscore = false
    if (lpfs.isfile(scorefile)) {
        const readoldscore = lpfs.loadjson(scorefile);
        if (readoldscore) { oldscore = readoldscore; }
    }
    if (oldscore !== false) { overrides.push(oldscore); }
    const osavesucc = lpfs.savejson(overridefile, overrides);
    if (!osavesucc) {
        return { error: true, errMsg: 'Could not write file ' +
            'with override information.' };
    }
    const ssavesucc = lpfs.savejson(scorefile, req.newscore);
    if (!ssavesucc) {
        return { error: true, errMsg: 'Could not save new score.' };
    }
    // send to server
    lplti.sendScore(req.consumerkey, req.contextid, req.scoreuserid,
        req.scoreexnum, req.newscore);
    return { success: true };
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

async function renameExerciseFiles(consumerkey, contextid, oldexnum, newexnum) {
    const exdir = path.join(datadir, consumerkey, contextid, 'exercises');
    if (!lpfs.ensuredir(exdir)) {
        return false;
    }
    const oldinfofile = path.join(exdir, oldexnum + '-info.json');
    const oldprobfile = path.join(exdir, oldexnum + '-allproblems.json');
    const oldansfile = path.join(exdir, oldexnum + '-answers.json');
    const newinfofile = path.join(exdir, newexnum + '-info.json');
    const newprobfile = path.join(exdir, newexnum + '-allproblems.json');
    const newansfile = path.join(exdir, newexnum + '-answers.json');
    // do not overwrite
    if (lpfs.isfile(newinfofile)) { return false; }
    if (lpfs.isfile(oldinfofile)) {
        const renresult = await lpfs.rename(oldinfofile, newinfofile);
        if (!renresult) { return false; }
    }
    if (lpfs.isfile(oldprobfile)) {
        const probrenresult = await lpfs.rename(oldprobfile, newprobfile);
        if (!probrenresult) { return false; }
    }
    if (lpfs.isfile(oldansfile)) {
        const ansrenresult = await lpfs.rename(oldansfile, newansfile);
        if (!ansrenresult) { return false; }
    }
    return true;
}

export default lpinstructor;
