// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////lpgrading.js////////////////////////////////////
// This script handles lp's grading mechanisms at a general level      //
/////////////////////////////////////////////////////////////////////////

// import modules
import path from 'node:path';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';
import lplti from './lplti.js';
import libgrade from '../public/js/libgrade.js';

// initiate return value
const lpgrading = {};

// read data dir from settings
const datadir = process.appsettings.datadir;

// scans a given context (course) for all users for grading to do
lpgrading.contextGradingScan = async function(consumerkey, contextid) {
    // get users as as the subdirectory list of the users folder
    const userdir = path.join(datadir, consumerkey, contextid, 'users');
    const users = await lpfs.subdirs(userdir);
    // scan each user
    for (let userid of users) {
        await lpgrading.userGradingScan(consumerkey, contextid, userid);
    }
}

// scans all consumers and contexts for grading to do
lpgrading.fullGradingScan = async function() {
    const consumers = await lpfs.subdirs(datadir);
    // scan all consumers
    for (let consumerkey of consumers) {
        // skip equivalents directory
        if (consumerkey == 'equivalents') { continue; }
        const cdir = path.join(datadir, consumerkey);
        // get its list of contexts (courses) and scan each one
        const contexts = await lpfs.subdirs(cdir);
        // scan each context
        for (let contextid of contexts) {
            await lpgrading.contextGradingScan(consumerkey, contextid);
        }
    }
}

// grade a given exercise for a given user
lpgrading.gradeExercise = async function(
    consumerkey, contextid, userid, exnum, exinfo) {
    // to allow not passing the exinfo, load it here if need be
    if (!exinfo) {
        exinfo = lpdata.getExerciseInfo(consumerkey, contextid, exnum);
    }
    // return false for bogus exercises without problems
    if (!exinfo.problemsets) { return false; }
    // load saved information
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    if (!userdir) { return false; }
    const savedfile = path.join(userdir, 'saved', exnum + '.json');
    let savedinfo = {};
    if (lpfs.isfile(savedfile)) {
        savedinfo = lpfs.loadjson(savedfile);
    }
    // if nothing saved, nothing to grade
    if (savedinfo === false) { return false; }
    // loop over problems
    let ptsearned = 0;
    // keep track of changes made to avoid wasting re-saves
    let changesmade = false;
    for (let probid in savedinfo) {
        // load data for the problem
        const probdata = savedinfo[probid];
        // skip problems without answers
        if (!("ans" in probdata)) { continue; }
        // check if graded already; if so, just count its points
        if (probdata.ind &&
            probdata.ind.successstatus &&
            (probdata.ind.successstatus == 'correct' ||
            probdata.ind.successstatus == 'incorrect') &&
            ("points" in probdata.ind)
        ) {
            ptsearned += probdata.ind.points;
            continue;
        }
        // NOT graded already
        // retrieve problem set and problem numbers from id
        const numparts = probid.substr(8).split('n').map(
            (x) => (parseInt(x))
        );
        if (numparts.length != 2) { continue; }
        const probsetnum = numparts[0];
        const probnum = numparts[1];
        // load problem set info
        const probsetinfo = exinfo.problemsets?.[probsetnum];
        if (!probsetinfo) { continue; }
        // get saved question and answer
        const [question, answer] = lpdata.getIndividualQnA(
            consumerkey, contextid, userid, exnum, probsetnum, probnum
        );
        // if getting the question/answer yielded null, skip it
        if (question === null || answer === null) {
            continue;
        }
        // actually check question
        let newind = await libgrade.checkAnswer(
            probsetinfo.problemtype, question, answer,
            probdata.ans, (probsetinfo?.partialcredit ?? false),
            (probsetinfo?.points ?? 1), (probsetinfo?.cheat ?? false),
            (probsetinfo?.options ?? {}));
        // if got false or null back, that's a malfunction; send it to
        // page's indicator
        if (!newind) {
            newind = {
                savestatus: "malfunction",
                successstatus: "malfunction",
                points: -1,
                message: 'Server is unable to check your answer.'
            }
        }
        probdata.ind = newind;
        // if we got here, the problem was actually graded
        changesmade = true;
        // add its points to the total
        const ptstoadd = Math.max(0, (newind.points ?? 0));
        ptsearned += ptstoadd;
    }
    let totalpoints = 0;
    // determine total number of points that were available
    for (let pset of exinfo.problemsets) {
        const pointsper = pset.points ?? 1;
        const number = pset.number ?? 0;
        totalpoints += (pointsper * number);
    }
    // calculate score as number from 0 to 1
    const score = (ptsearned/totalpoints);
    // save changes
    if (changesmade) { lpfs.savejson(savedfile, savedinfo); }
    // send the score to the LTI
    lplti.sendScore(consumerkey, contextid, userid, exnum, score);
    // send in background after 2 secs, but wait until promise returns
    await new Promise(r => setTimeout(r, 2000));
}

// scan all problems for a given user
lpgrading.userGradingScan =
    async function(consumerkey, contextid, userid) {
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    // ensure saved dir and scores dir exist
    const saveddir = path.join(userdir, 'saved');
    const scoresdir = path.join(userdir, 'scores');
    if (!lpfs.ensuredir(saveddir)) { return false; }
    if (!lpfs.ensuredir(scoresdir)) { return false; }
    // scan saved dir
    const savedexs = await lpfs.filesin(saveddir);
    for (let savedex of savedexs) {
        const savedfile = path.join(saveddir, savedex);
        const exnum = savedex.replace(/\.json$/,'');
        // skip non-json files
        if (exnum == savedex) { continue; }
        // skip those without a corresponding exercise
        const exinfo = lpdata.getExerciseInfo(consumerkey, contextid, exnum);
        if (!exinfo) { continue; }
        // skip those not yet past due
        const duetime = exinfo.duetime ?? false;
        const pastdue = lpdata.determinePastDue(
            consumerkey, contextid, userid, exnum, duetime);
        if (!pastdue) { continue; }
        // skip those with a newer score file
        const scorefile = path.join(scoresdir, exnum + '.json');
        if (lpfs.isfile(scorefile)) {
            const scmtime = await lpfs.mtime(scorefile);
            const savedmtime = await lpfs.mtime(savedfile);
            if (scmtime > savedmtime) { continue; }
        }
        // grade the exercise, and wait for it to be done before
        // starting a new one
        await lpgrading.gradeExercise(
            consumerkey, contextid, userid, exnum, exinfo);
    }
}

// export the library object containing the functions
export default lpgrading;
