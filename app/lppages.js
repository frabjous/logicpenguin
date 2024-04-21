// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////lpages.js/////////////////////////////////////
// Serves the HTML files and fills in their templates with the
// relevant data
//////////////////////////////////////////////////////////////////////

// loads modules
import fs from 'node:fs';
import lpfs from './lpfs.js';
import lpdata from './lpdata.js';
import path from 'node:path';

const datadir = process.appsettings.datadir;

// fills a templated string from list of fillins
export function filltemplate(template, fillins) {
    let rv = template;
    for (const k in fillins) {
        rv = rv.replaceAll('⟨logicpenguin:' + k + '⟩', fillins[k]);
    }
    return rv;
}

// gets an exercise html file with necessary info
export async function getexercise(consumerkey, contextid, userid, exnum,
    launchid) {
    // fill the template in with these
    const fillins = { consumerkey, contextid, userid, exnum, launchid };

    // load exercise metadata
    // note we do not use lpfs.loadjson because we also need the json
    // itself, not the parsed version
    const exdir = path.join(datadir, consumerkey, contextid, 'exercises');
    const exinfofile = path.join(exdir, exnum + '-info.json');
    let exinfojson = '';
    let exinfo = {};
    try {
        exinfojson = await fs.promises.readFile(exinfofile,
            { encoding: 'utf8' });
        exinfo = JSON.parse(exinfojson);
    } catch(err) {
        return false;
    }

    // ensure we got the needed info
    if (!exinfo || !exinfo.problemsets) { return false; }
    // fill in some additional info for the exercise
    fillins.exerciseinfo = exinfojson.trim();
    if (exinfo.longtitle) {
        fillins.longtitle = exinfo.longtitle;
    } else {
        fillins.longtitle = 'Exercise ' + exnum;
    }

    // determine number of problems for each set, and
    // whether to send answers for cheating purposes
    const numprobslist = [];
    const allowscheating = [];
    // loop over info for problem sets and see if it allows cheating
    for (const probsetinfo of exinfo.problemsets) {
        const probtype = probsetinfo.problemtype;
        if (!probtype) { continue; }
        if (!probsetinfo.number) { continue; }
        numprobslist.push(probsetinfo.number);
        allowscheating.push(probsetinfo.cheat ?? false);
    }

    // note: problems and answers are a random set specific to
    // the individual; first we see if set has already been made
    // so determine userdir
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    if (!userdir) { return false; }
    const userprobfile = path.join(userdir, 'problems', exnum + '.json');
    const useransfile = path.join(userdir, 'answers', exnum + '.json');
    let exerciseproblems = '';
    let exerciseanswers = 'false'; // as string for ◇insertion in template
    let allanswersjson = ''; // those answers we *might* add
    // determine if past due for this individual
    if (!"duetime" in exinfo) { exinfo.duetime = false; }
    const duetime = lpdata.whenPastDue(consumerkey, contextid, userid,
        exnum, exinfo.duetime);
    let pastdue = false;
    if (duetime) {
        // add graceperiod or default of 300 secs = 5 minutes
        const graceperiod = process?.appsettings?.graceperiod ?? 300000;
        pastdue = ((new Date()).getTime() > duetime + graceperiod);
    }
    // determine whether cheating is allowed at all for anything
    const anycheats = allowscheating.reduce((a,b) => (a||b));
    // make the duetime a string for filling in template
    fillins.duetime = duetime.toString();
    // determine if problems already generated for user, if so read it,
    // if not, create it
    if (lpfs.isfile(userprobfile)) {
        try {
            exerciseproblems = await fs.promises.readFile(
                userprobfile, { encoding: 'utf8', flags: 'r' }
            );
        } catch(err) {
            return false;
        }
    } else {
        let genexerciseanswers = '';
        [ exerciseproblems, allanswersjson ] = makeProblemSets(
            userdir, exdir, exnum, numprobslist);
        if (exerciseproblems === false) {
            return false;
        }
    }
    // if problems already exist and answers are needed
    // read them from answers file
    const needtocheckanswers = (anycheats || pastdue);
    if (needtocheckanswers && (allanswersjson === '') &&
        lpfs.isfile(useransfile)) {
        try {
            allanswersjson = await fs.promises.readFile(
                useransfile, { encoding: 'utf8' }
            );
        } catch(err) {
            return false;
        }
    }

    // can include all answers if past due
    if (pastdue) {
        exerciseanswers = allanswersjson;
    } else if (anycheats) {
        // otherwise just include answers for those allowing cheats
        const allowedanswers = [];
        let allanswers = [];
        try {
            allanswers = JSON.parse(allanswersjson);
        } catch(err) {
            return false;
        }
        // check for each problem set whether answers should be included
        for (let i=0; i<allanswers.length; i++) {
            if (allowscheating[i]) {
                allowedanswers.push(allanswers[i]);
            } else {
                // pass empty arrays for problems not allowing cheats
                allowedanswers.push([]);
            }
        }
        // stringify the answers for inclusion in html document
        try {
            exerciseanswers = JSON.stringify(allowedanswers);
        } catch(err) {
            return false;
        }
    }
    // sanity check
    if (!exerciseproblems) {
        return false;
    }
    // fill problems, answers
    fillins.exerciseproblems = exerciseproblems.trim();
    fillins.exerciseanswers = exerciseanswers.trim();
    // get data for restoring old answers if needed
    const restoredir = path.join(userdir, 'saved');
    if (!lpfs.ensuredir(restoredir)) { return false; }
    const restorefile = path.join(restoredir, exnum + '.json');
    let restoredata = 'false'; // as string for ◇insertion in template
    if (lpfs.isfile(restorefile)) {
        try {
            restoredata = await fs.promises.readFile(
                restorefile, { encoding: 'utf8' }
            );
        } catch(err) {
            return false;
        }
    }
    fillins.restoredata = restoredata.trim();
    // fill in template, return text
    return getpagetext('exercise.html', fillins);
}

// gets the instructor page for a given course/context
export async function getinstructorpage(
    consumerkey, contextid, userid, launchid) {
    const fillins = {
        consumerkey: consumerkey,
        contextid: contextid,
        launchid: launchid,
        userid: userid
    }
    const ctxtsettingsfile = path.join(datadir, consumerkey, contextid,
        'context-settings.json');
    let settingsjson = '{}';
    if (lpfs.isfile(ctxtsettingsfile)) {
        try {
            settingsjson = await fs.promises.readFile(
                ctxtsettingsfile, { encoding: 'utf8' }
            );
        } catch(err) {
            return false;
        }
    }
    fillins.contextsettings = settingsjson;
    const creatordir = path.join('.', 'public', 'js', 'creators');
    const creatorfiles = await lpfs.filesin(creatordir);
    const probtypes = creatorfiles.map((f) => (f.replace(/\.js$/,'')));
    fillins.problemtypes = JSON.stringify(probtypes);
    return getpagetext('instructor.html', fillins);
}

// gets a lecture html file for a given unit
export async function getlecture(consumerkey, contextid, unit) {
    // initialize what should be filled in in temmplate
    const fillins = {};
    const lectdir = path.join(datadir, consumerkey, contextid, 'lectures');
    // read metadata about all lectures; ensure it and entry exist
    const lectdata = lpfs.loadjson(path.join(lectdir, 'lectureinfo.json'));
    // sanity checks
    if (!lectdata) { return false; }
    if (!("contextdescription" in lectdata)) { return false; }
    if (!(unit in lectdata)) { return false; }
    // some fields to fill in
    fillins.longtitle = lectdata[unit];
    fillins.contextdescription = lectdata.contextdescription;
    // get html for this particular lecture unit
    try {
        fillins.lecturecontent = fs.readFileSync(
            path.join(lectdir, unit + '.html'),
            { encoding: 'utf8', flag: 'r' });
    } catch(err) {
        return false;
    }
    // fill everything in in general template and return
    return getpagetext('lecturenotes.html', fillins);
}

// takes a template-ish html file and fills in the template
export function getpagetext(filename, fillins) {
    let template = '';
    try {
        template = fs.readFileSync(
            path.join('pages' , filename),
            { encoding: 'utf8', flag: 'r' });
    } catch(err) {
        return 'template could not be read';
    }
    return filltemplate(template, fillins);
}

// generate new problem sets for a given user from the random pool
function makeProblemSets(userdir, exdir, exnum, numprobslist) {

    // read exercise problem pool
    const allprobsfile = path.join(exdir, exnum + '-allproblems.json');
    const allprobs = lpfs.loadjson(allprobsfile);
    if (!allprobs) { return [false, false]; }

    // read exercise answer pool
    const answersfile = path.join(exdir, exnum + '-answers.json');
    const answers = lpfs.loadjson(answersfile);
    if (!answers) { return [false, false]; }

    // ensure the number of sets match expected number
    if (allprobs.length != numprobslist.length) { return [false, false]; }
    if (answers.length != allprobs.length) { return [false, false]; }
    const probsets = [];
    const anssets = [];

    // loop through sets
    for (let i=0; i<allprobs.length; i++) {
        let newprobset = [];
        let newansset = [];
        const probpool = allprobs[i];
        const anspool = answers[i];
        // ensure answers match question in number
        if (anspool.length != probpool.length) { return [false, false]; }
        // ensure there are enough problems in pool
        if (probpool.length < numprobslist[i]) { return [false, false]; }
        // if all problems are needed, just copy over
        if (probpool.length == numprobslist[i]) {
            newprobset = probpool;
            newansset = anspool;
        } else {
            // move problems/answers from pool to new problem/answer sets
            while (newprobset.length < numprobslist[i]) {
                const randindex = Math.floor(Math.random() * probpool.length );
                newprobset.push(probpool.splice(randindex, 1)[0]);
                newansset.push(anspool.splice(randindex, 1)[0]);
            }
        }
        // append new problem set
        probsets.push(newprobset);
        anssets.push(newansset);
    }

    // determine save locations
    const userprobdir = path.join(userdir, 'problems');
    const userprobfile = path.join(userprobdir, exnum + '.json');
    const useransdir = path.join(userdir, 'answers');
    const useransfile = path.join(useransdir, exnum + '.json');

    // ensure directories exist
    if (!lpfs.ensuredir(userprobdir) || !lpfs.ensuredir(useransdir)) {
        return [false, false];
    }

    // convert to json
    let probjson='';
    let ansjson='';
    try {
        probjson = JSON.stringify(probsets);
        ansjson = JSON.stringify(anssets);
    } catch(err) {
        return [false, false];
    }
    if (!probjson || !ansjson) {
        return [false, false];
    }

    // save in background asynchronously?
    try {
        fs.promises.writeFile(userprobfile, probjson,
            { encoding: 'utf8', mode: 0o644 });
        fs.promises.writeFile(useransfile, ansjson,
            { encoding: 'utf8', mode: 0o644 });
    } catch(err) {
        console.error('Error saving new problem sets/answer files: ' +
            err.toString());
    }

    // return json text
    return [ probjson, ansjson ];
}

