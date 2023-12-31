// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////////////lpdata.js/////////////////////////////////////
// This script handles dealing with the data of an individual user  //
//////////////////////////////////////////////////////////////////////

// load modules
import fs from 'node:fs';
import path from 'node:path';
import lpfs from './lpfs.js';

// initialize return value
const lpdata = {};

// set datadir
const datadir = process.appsettings.datadir;

// script to determine when exercises are past due
lpdata.determinePastDue = function(consumerkey, contextid, userid,
    exnum, duetime) {
    // if exercise has no due time, it is never past due
    if (duetime === false) { return false; }
    // get current time
    const currtime = (new Date()).getTime();
    // read grace period from settings, default to 300 seconds = 5 mins
    const graceperiod = process?.appsettings?.graceperiod ?? 300000;
    // compare current time to due time plus graceperiod
    return (currtime > (lpdata.whenPastDue(consumerkey,
        contextid, userid, exnum, duetime) + graceperiod));
}

// get the information for a given exercise
lpdata.getExerciseInfo = function(consumerkey, contextid, exnum) {
    const exdir = path.join(datadir, consumerkey, contextid, 'exercises');
    const exinfofile = path.join(exdir, exnum + '-info.json');
    return lpfs.loadjson(exinfofile);
}

// get the question and answer for a given student for a given problem
lpdata.getIndividualQnA = function(
    consumerkey, contextid, userid, exnum, probset, num) {
    // ensure user directory
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    if (!userdir) { return [null, null]; };
    // get problem and answer files
    const probfile = path.join(userdir, 'problems', exnum + '.json');
    const ansfile = path.join(userdir, 'answers', exnum + '.json');
    // load problems and this particular question
    const probsets = lpfs.loadjson(probfile);
    const question = probsets?.[probset]?.[num];
    // if an invalid set or number for question, return nulls
    if (typeof question === 'undefined') { return [null, null]; };
    // load answers and this particular answer
    const answersets = lpfs.loadjson(ansfile);
    const answer = answersets?.[probset]?.[num];
    // if an invalid set or number for answer, return nulls
    if (typeof answer === 'undefined') { return [null, null]; };
    return [ question, answer ];
}

// grant an extension for a particular user for a particular exercise
// the timestamp is the miliseconds since the start of the epoch (1970)
lpdata.grantExtension = function(
    consumerkey, contextid, userid, exnum, timestamp
) {
    // determine user data dir and extension dir, ensure they exist
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    if (!userdir) { return false; }
    const extensionsdir = path.join(userdir, 'extensions');
    if (!lpfs.ensuredir(extensionsdir)) { return false; }
    // the extension file is nothing but the timestamp number with
    // an appropriate filename
    return lpfs.savejson(
        path.join(extensionsdir, exnum + '.json'), timestamp
    );
}

// save an answer and the state of the answer for a given user
lpdata.recordAnswer = function(consumerkey, contextid, userid, exnum,
    elemid, state) {
    // ensure user saved problem directories exist
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    if (!userdir) { return false; }
    const saveddir = path.join(userdir, 'saved');
    if (!lpfs.ensuredir(saveddir)) { return false; }
    // read the current saved answers for the exercise; if it does
    // not exist, use an empty object
    const savefile = path.join(saveddir, exnum + '.json');
    let restoredata = {};
    if (lpfs.isfile(savefile)) {
        restoredata = lpfs.loadjson(savefile);
        if (!restoredata) { return false; }
    }
    // add/change the answer for the given problem id
    restoredata[elemid] = state;
    // save the file
    return lpfs.savejson(savefile, restoredata);
}

// save indeterminate answer in logicpenguin instance's
// list of indeterminate answers
lpdata.saveindeterminate = function(info) {
    const filename = path.join(datadir, 'indeterminate-answers.json');
    const ilist = lpfs.loadjson(filename);
    if (!ilist) { ilist = []; }
    ilist.push(info);
    return lpfs.savejson(filename, ilist);
}

// replace non-letters in a name with underscores for filenames
function simplename(fullname) {
    return fullname.trim().replace(/[^A-Za-z]/g, '_');
}

// get folder for user
// use FALSE as fullname if you don't want to create the folder in
// any case, but just get the name and ensure existence
lpdata.userdir = function(consumerkey, contextid, userid, fullname) {
    // determine proper path
    const dir = path.join(datadir, consumerkey, contextid, 'users', userid);
    // either read it or create it
    if (fullname === false) {
        if (lpfs.isdir(dir)) { return dir; }
        return false;
    }
    if (!lpfs.ensuredir(dir)) {
        return false;
    }
    // create a link to the user folder based on the name given
    const linksdir = path.join(datadir, consumerkey, contextid, 'userlinks');
    lpfs.ensuredir(linksdir);
    const userlink = path.join(linksdir, simplename(fullname));
    const linktarget = path.join('..', 'users', userid);
    // create the link if it doesn't already exist
    if (!lpfs.isdir(userlink)) {
        fs.symlink(linktarget, userlink, 'dir', () => {});
    }
    // create the subfolders as needed
    lpfs.ensuredir(path.join(dir, 'extensions'));
    lpfs.ensuredir(path.join(dir, 'launches'));
    lpfs.ensuredir(path.join(dir, 'problems'));
    lpfs.ensuredir(path.join(dir, 'answers'));
    lpfs.ensuredir(path.join(dir, 'scores'));
    lpfs.ensuredir(path.join(dir, 'saved'));
    // return the directory name
    return dir;
}

lpdata.whenPastDue = function(consumerkey, contextid, userid, exnum,
    duetime) {
    // if no due time, never past due
    if (!duetime) { return false; }
    // normally the return value is the same as provided, i.e., the
    // due time for most people
    let rv = duetime;
    // check for extension file
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    const extensionfile = path.join(userdir, 'extensions', exnum + '.json');
    const extdeadline = lpfs.loadjson(extensionfile);
    // if the user has an extension, return its time instead
    if (extdeadline) { rv = extdeadline; }
    // return the time due (milliseconds since epoch)
    return rv;
}

export default lpdata;
