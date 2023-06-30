// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////lplti.js/////////////////////////////////////
// This script handles logic penguin's interactions with LMSes through
// the LTI protocol
//////////////////////////////////////////////////////////////////////

// import other modules
import fs from 'node:fs';
import path from 'node:path';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';

// read lti
import lti from 'ims-lti';

// get the secret for a given consumer
// return false if none or error with filesystem
lti.getConsumerSecret = async function(consumerkey, datadir) {
    let consumersecret = false;
    try {
        consumersecret = fs.readFileSync(
            path.join(datadir, consumerkey, '.secret.txt'),
            { encoding: 'utf8', flag: 'r' }
        ).trim();
    } catch(err) {
        consumersecret = false;
    }
    return consumersecret;
}

// get the most recent launch for a user for the given exercise
lti.getLatestLaunch = async function(
    datadir, consumerkey, contextid, userid, exnum, keyonly
) {
    let userdir = lpdata.userdir(
        datadir, consumerkey, contextid, userid, false
    );
    if (!userdir) { return false; }
    // read the launches by the user
    let launchesdir = path.join(userdir, 'launches');
    let newest = '';
    let newestts = 0;
    let launches = await lpfs.filesin(launchesdir);
    if (!launches) { return false; }
    // loop over the launches looking for the right one
    for (const fn of launches) {
        let l = exnum.length + 1;
        // skip if a different exercise's launch
        if (fn.substr(0,l) != (exnum + '-')) { continue; }
        let r = fn.substr(l);
        let s = r.replace(/\.json$/,'');
        // skip non-json files
        if (r == s) { continue; }
        // skip filenames not of right length
        if (s.length != 40) { continue; }
        let ffn = path.join(launchesdir, fn);
        // compare times to see if this one is more recent than any
        // already found
        let mtime = await lpfs.mtime(ffn);
        if (mtime > newestts) {
            newestts = mtime;
            newest = ffn;
        }
    }
    // return false if none found
    if (newest == '') { return false; }
    // might want just the key itself, rather than the name of the
    // launch json, allow it to be returned instead
    if (keyonly) {
        // 40 characters for launch id + 5 for '.json';
        newest = newest.substr(-45);
        // get rid of the '.json' at end
        newest = newest.substr(0,40);
    }
    // returns either the filename, or just the key depending on keyonly
    return newest;
}

// get the most relevant URL for a given launch for a given user and
// exercise; useful for instructors to keep track of students
lti.launchUrlFor = async function(
    datadir, consumerkey, contextid, userid, exnum
) {
    let launchid = await lti.getLatestLaunch(
        datadir, consumerkey, contextid, userid, exnum, true
    );
    if (launchid === false) { return false; }
    return '/exercises/' + consumerkey + '/' + contextid + '/' +
        userid + '/' + exnum + '/' + launchid;
}

// send a given score back to the LTI
lti.sendScore = async function(
    datadir, consumerkey, contextid, userid, exnum, score
) {
    // get the secret for the consumer
    let consumersecret = await lti.getConsumerSecret(consumerkey, datadir);
    if (!consumersecret) { return false; }
    // get latest launch file
    let newest = await lti.getLatestLaunch(
        datadir, consumerkey, contextid, userid, exnum, false
    );
    // return false if no launch file
    if (newest === false) { return false; }
    // read data; ensure we have what we need
    let launchdata = lpfs.loadjson(newest);
    if (!launchdata) { return false; }
    if (!launchdata.service_url || !launchdata.source_did) {
        return false;
    }
    // create LTI Provider
    const provider = new lti.Provider(consumerkey, consumersecret);
    const outcService = new lti.OutcomeService({
        consumer_key: consumerkey,
        consumer_secret: consumersecret,
        service_url: launchdata.service_url,
        source_did: launchdata.source_did,
        language: 'en'
    });
    // actually send core; record errors
    outcService.send_replace_result(score,
        function(err, resp) {
            if (err) {
                let cdir = path.join(datadir, consumerkey);
                let errfile = path.join(cdir, 'senderrors.json');
                let trackederrs = [];
                if (lpfs.isfile(errfile)) {
                    trackederrs = lpfs.loadjson(errfile);
                }
                trackederrs.push({
                    consumerkey: (consumerkey ?? 'unknown'),
                    contextid: (contextid ?? 'unknown'),
                    userid: (userid ?? 'unknown'),
                    exnum: (exnum ?? 'unknown'),
                    timestamp: ( (new Date()).getTime() ),
                    error: err.toString(),
                    resp: resp.toString()
                });
                lpfs.savejson(errfile, trackederrs);
            }
        }
    );
    // get userdir for saving score
    let userdir = lpdata.userdir(
        datadir, consumerkey, contextid, userid, false
    );
    if (!userdir) { return false; }
    // save sent score
    let scoresdir = path.join(userdir, 'scores');
    let scorefile = path.join(scoresdir, exnum + '.json');
    return lpfs.savejson(scorefile, score);
}

//export the library object with the functions attached
export default lti;


