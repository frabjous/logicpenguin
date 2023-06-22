import path from 'node:path';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';
import lplti from './lplti.js';
import libgrade from '../public/js/libgrade.js';

const lpgrading = {};

lpgrading.contextGradingScan =
    async function(datadir, consumerkey, contextid) {
    let userdir = path.join(datadir, consumerkey, contextid, 'users');
    let users = await lpfs.subdirs(userdir);
    for (let userid of users) {
        await lpgrading.userGradingScan(
            datadir, consumerkey, contextid, userid
        );
    }
}

lpgrading.fullGradingScan = async function(datadir) {
    let consumers = await lpfs.subdirs(datadir);
    for (let consumerkey of consumers) {
        let cdir = path.join(datadir, consumerkey);
        let contexts = await lpfs.subdirs(cdir);
        for (let contextid of contexts) {
            await lpgrading.contextGradingScan(
                datadir, consumerkey, contextid
            );
        }
    }
}

lpgrading.gradeExercise = async function(
    datadir, consumerkey, contextid, userid, exnum, exinfo
) {
    // to allow not passing the exinfo, load it here
    if (!exinfo) {
        exinfo = lpdata.getExerciseInfo(
            datadir, consumerkey, contextid, exnum
        );
    }
    if (!exinfo.problemsets) { return false; }
    // load saved information
    let userdir = lpdata.userdir(datadir, consumerkey, contextid,
        userid, false);
    if (!userdir) { return false; }
    let savedfile = path.join(userdir, 'saved', exnum + '.json');
    let savedinfo = {};
    if (lpfs.isfile(savedfile)) {
        savedinfo = lpfs.loadjson(savedfile);
    }
    if (savedinfo === false) { return false; }
    // loop over problems
    let ptsearned = 0;
    let changesmade = false;
    for (let probid in savedinfo) {
        let probdata = savedinfo[probid];
        if (!("ans" in probdata)) { continue; }
        // check if Graded already
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
        // retrieve numbers from id
        let numparts = probid.substr(8).split('n').map(
            (x) => (parseInt(x))
        );
        if (numparts.length != 2) { continue; }
        let probsetnum = numparts[0];
        let probnum = numparts[1];
        // load probsetinfo
        let probsetinfo = exinfo.problemsets?.[probsetnum];
        if (!probsetinfo) { continue; }
        // get saved question and answer
        let [question, answer] = lpdata.getIndividualQnA(
            datadir, consumerkey, contextid, userid,
            exnum, probsetnum, probnum
        );
        if (question === null || answer === null) {
            continue;
        }
        // actually check question
        let newind = await libgrade.checkAnswer(
            probsetinfo.problemtype, question, answer, 
            probdata.ans, (probsetinfo?.partialcredit ?? false),
            (probsetinfo?.points ?? 1), (probsetinfo?.cheat ?? false),
            (probsetinfo?.options ?? {}));
        if (!newind) {
            newind = {
                savestatus: "malfunction",
                successstatus: "malfunction",
                points: -1,
                message: 'Server is unable to check your answer.'
            }
        }
        probdata.ind = newind;
        changesmade = true;
        let ptstoadd = Math.max(0, (newind.points ?? 0));
        ptsearned += ptstoadd;
    }
    let totalpoints = 0;
    for (let pset of exinfo.problemsets) {
        let pointsper = pset.points ?? 1;
        let number = pset.number ?? 0;
        totalpoints += (pointsper * number);
    }
    let score = (ptsearned/totalpoints);
    // save changes
    if (changesmade) {
        lpfs.savejson(savedfile, savedinfo);
    }
    lplti.sendScore(
        datadir, consumerkey, contextid, userid, exnum, score
    );
    // wait two seconds before sending next
    await new Promise(r => setTimeout(r, 2000));
}

lpgrading.userGradingScan =
    async function(datadir, consumerkey, contextid, userid) {
    let userdir = lpdata.userdir(
        datadir, consumerkey, contextid, userid, false
    );
    // ensure saved dir and scores dir exist
    let saveddir = path.join(userdir, 'saved');
    let scoresdir = path.join(userdir, 'scores');
    if (!lpfs.ensuredir(saveddir)) { return false; }
    if (!lpfs.ensuredir(scoresdir)) { return false; }
    // scan saved dir
    let savedexs = await lpfs.filesin(saveddir);
    for (let savedex of savedexs) {
        let savedfile = path.join(saveddir, savedex);
        let exnum = savedex.replace(/\.json$/,'');
        // skip non-json files
        if (exnum == savedex) { continue; }
        // skip those without a corresponding exercise
        let exinfo = lpdata.getExerciseInfo(
            datadir, consumerkey, contextid, exnum
        );
        if (!exinfo) { continue; }
        // skip those not yet past due
        let duetime = exinfo.duetime ?? false;
        let pastdue = lpdata.determinePastDue(
            datadir, consumerkey, contextid, userid, exnum, duetime
        );
        if (!pastdue) { continue; }
        // skip those with a newer score file
        let scorefile = path.join(scoresdir, exnum + '.json');
        if (lpfs.isfile(scorefile)) {
            let scmtime = await lpfs.mtime(scorefile);
            let savedmtime = await lpfs.mtime(savedfile);
            if (scmtime > savedmtime) { continue; }
        }
        await lpgrading.gradeExercise(
            datadir, consumerkey, contextid, userid, exnum, exinfo
        );
    }
}

export default lpgrading;
