import fs from 'node:fs';
import path from 'node:path';
import lpfs from './lpfs.js';

let lpdata = {};

lpdata.determinePastDue = function(datadir, consumerkey, contextid, userid,
    exnum, duetime) {
    if (duetime === false) { return false; }
    let currtime = (new Date()).getTime();
    // 5 minute grace period
    return (currtime > (lpdata.whenPastDue(datadir, consumerkey,
        contextid, userid, exnum, duetime) + 300000));
}

lpdata.getExerciseInfo = function(datadir, consumerkey, contextid, exnum) {
    let exdir = path.join(datadir, consumerkey, contextid, 'exercises');
    let exinfofile = path.join(exdir, exnum + '-info.json');
    return lpfs.loadjson(exinfofile);
}

lpdata.getIndividualQnA = function(
    datadir, consumerkey, contextid, userid, exnum, probset, num) {
    let userdir = lpdata.userdir(datadir, consumerkey, contextid,
        userid, false);
    if (!userdir) { return [null, null]; };
    let probfile = path.join(userdir, 'problems', exnum + '.json');
    let ansfile = path.join(userdir, 'answers', exnum + '.json');
    let probsets = lpfs.loadjson(probfile);
    let question = probsets?.[probset]?.[num];
    if (typeof question === 'undefined') { return [null, null]; };
    let answersets = lpfs.loadjson(ansfile);
    let answer = answersets?.[probset]?.[num];
    if (typeof answer === 'undefined') { return [null, null]; };
    return [ question, answer ];
}

lpdata.grantExtension = function(
    datadir, consumerkey, contextid, userid, exnum, timestamp
) {
    const userdir = lpdata.userdir(
        datadir, consumerkey, contextid, userid, false
    );
    if (!userdir) { return false; }
    const extensionsdir = path.join(userdir, 'extensions');
    if (!lpfs.ensuredir(extensionsdir)) { return false; }
    return lpfs.savejson(
        path.join(extensionsdir, exnum + '.json'),
        timestamp
    );
}

lpdata.recordAnswer = function(datadir, consumerkey, contextid,
    userid, exnum, elemid, state) {
    let userdir = lpdata.userdir(datadir, consumerkey, contextid,
        userid, false);
    if (!userdir) {
        return false;
    }
    let saveddir = path.join(userdir, 'saved');
    if (!lpfs.ensuredir(saveddir)) {
        return false;
    }
    let savefile = path.join(saveddir, exnum + '.json');
    let restoredata = {};
    if (lpfs.isfile(savefile)) {
        restoredata = lpfs.loadjson(savefile);
        if (!restoredata) {
            return false;
        }
    }
    restoredata[elemid] = state;
    return lpfs.savejson(savefile, restoredata);
}

lpdata.saveindeterminate = function(datadir, info) {
    let filename = path.join(datadir, 'indeterminate-answers.json');
    let ilist = lpfs.loadjson(filename);
    if (!ilist) { ilist = []; }
    ilist.push(info);
    return lpfs.savejson(filename, ilist);
}

function simplename(fullname) {
    return fullname.trim().replace(/[^A-Za-z]/g, '_');
}

// get folder for user
// use FALSE as fullname if you don't want to create the folder in
// any case, but just get the name and ensure existence
lpdata.userdir = function(datadir, consumerkey, contextid,
    userid, fullname) {
    let dir = path.join(datadir, consumerkey, contextid, 'users', userid);
    if (fullname === false) {
        if (lpfs.isdir(dir)) {
            return dir;
        }
        return false;
    }
    if (!lpfs.ensuredir(dir)) {
        return false;
    }
    let linksdir = path.join(datadir, consumerkey, contextid, 'userlinks');
    lpfs.ensuredir(linksdir);
    let userlink = path.join(linksdir, simplename(fullname));
    let linktarget = path.join('..','users',userid);
    if (!lpfs.isdir(userlink)) {
        fs.symlink(linktarget, userlink, 'dir', () => {} );
    }
    lpfs.ensuredir(path.join(dir, 'extensions'));
    lpfs.ensuredir(path.join(dir, 'launches'));
    lpfs.ensuredir(path.join(dir, 'problems'));
    lpfs.ensuredir(path.join(dir, 'answers'));
    lpfs.ensuredir(path.join(dir, 'scores'));
    lpfs.ensuredir(path.join(dir, 'saved'));
    return dir;
}

lpdata.whenPastDue = function(datadir, consumerkey, contextid, userid,
    exnum, duetime) {
    if (!duetime) { return false; }
    let rv = duetime;
    const userdir = lpdata.userdir(datadir, consumerkey, contextid,
        userid, false);
    const extensionfile = path.join(userdir, 'extensions', exnum + '.json');
    const extdeadline = lpfs.loadjson(extensionfile);
    if (extdeadline) {
        rv = extdeadline;
    }
    return rv;
}

export default lpdata;
