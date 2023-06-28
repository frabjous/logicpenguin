// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

// modules
import fs from 'node:fs';
import lpfs from './lpfs.js';
import lpdata from './lpdata.js';
import path from 'node:path';

// fills a templated string
export function filltemplate(template, fillins) {
    let rv = template;
    for (const k in fillins) {
        rv = rv.replaceAll('⟨logicpenguin:' + k + '⟩', fillins[k]);
    }
    return rv;
}

// gets an exercise html file with necessary info
export async function getexercise(datadir, consumerkey,
    contextid, userid, exnum, launchid) {
    // fill the template in with these
    let fillins = { consumerkey, contextid, userid, exnum, launchid };

    // load exercise metadata
    // note we do not use lpfs.loadjson because we also need the json
    // itself, not the parsed version
    let exdir = path.join(datadir, consumerkey, contextid, 'exercises');
    let exinfofile = path.join(exdir, exnum + '-info.json');
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
    if (!exinfo || !exinfo.problemsets) {
        return false;
    }
    fillins.exerciseinfo = exinfojson.trim();
    if (exinfo.longtitle) {
        fillins.longtitle = exinfo.longtitle;
    } else {
        fillins.longtitle = 'Exercise ' + exnum;
    }

    // determine number of problems for each set, and
    // whether to send answers for cheating purposes
    let numprobslist = [];
    let allowscheating = [];
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
    let userdir = lpdata.userdir(datadir, consumerkey, contextid,
        userid, false);
    if (!userdir) { return false; }
    let userprobfile = path.join(userdir, 'problems', exnum + '.json');
    let useransfile = path.join(userdir, 'answers', exnum + '.json');
    let exerciseproblems = '';
    let exerciseanswers = 'false'; // as string for ◇insertion in template
    let allanswersjson = ''; // those answers we *might* add
    // determine if past due for this individual
    if (!"duetime" in exinfo) {
        exinfo.duetime = false;
    }
    let duetime = lpdata.whenPastDue(datadir, consumerkey, contextid,
        userid, exnum, exinfo.duetime);
    let pastdue = false; 
    if (duetime) {
        pastdue = ((new Date()).getTime() > duetime + 300000);
    }
    let anycheats = allowscheating.reduce((a,b) => (a||b));
    // make the duetime a string for filling in template
    fillins.duetime = duetime.toString();
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
    let needtocheckanswers = (anycheats || pastdue);
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
        let allowedanswers = [];
        let allanswers = [];
        try {
            allanswers = JSON.parse(allanswersjson);
        } catch(err) {
            return false;
        }
        for (let i=0; i<allanswers.length; i++) {
            if (allowscheating[i]) {
                allowedanswers.push(allanswers[i]);
            } else {
                allowedanswers.push([]);
            }
        }
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
    let restoredir = path.join(userdir, 'saved');
    if (!lpfs.ensuredir(restoredir)) { return false; }
    let restorefile = path.join(restoredir, exnum + '.json');
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

export async function getlecture(datadir, consumerkey, contextid, unit) {
    let fillins = {};
    let lectdir = path.join(datadir, consumerkey, contextid, 'lectures');
    // read metadata about all lectures; ensure it and entry exist
    let lectdata = lpfs.loadjson(path.join(lectdir, 'lectureinfo.json'));
    if (!lectdata) { return false; }
    if (!("contextdescription" in lectdata)) { return false; }
    if (!(unit in lectdata)) { return false; }
    fillins.longtitle = lectdata[unit];
    fillins.contextdescription = lectdata.contextdescription;
    try {
        fillins.lecturecontent = fs.readFileSync(
            path.join(lectdir, unit + '.html'),
            { encoding: 'utf8', flag: 'r' });
    } catch(err) {
        return false;
    }
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

function makeProblemSets(userdir, exdir, exnum, numprobslist) {

    // read exercise problem pool
    let allprobsfile = path.join(exdir, exnum + '-allproblems.json');
    let allprobs = lpfs.loadjson(allprobsfile);
    if (!allprobs) { return [false, false]; }

    // read exercise answer pool
    let answersfile = path.join(exdir, exnum + '-answers.json');
    let answers = lpfs.loadjson(answersfile);
    if (!answers) { return [false, false]; }

    // ensure the number of sets match expected number
    if (allprobs.length != numprobslist.length) { return [false, false]; }
    if (answers.length != allprobs.length) { return [false, false]; }
    let probsets = [];
    let anssets = [];

    // loop through sets
    for (let i=0; i<allprobs.length; i++) {
        let newprobset = [];
        let newansset = [];
        let probpool = allprobs[i];
        let anspool = answers[i];
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
    let userprobdir = path.join(userdir, 'problems');
    let userprobfile = path.join(userprobdir, exnum + '.json');
    let useransdir = path.join(userdir, 'answers');
    let useransfile = path.join(useransdir, exnum + '.json');

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

