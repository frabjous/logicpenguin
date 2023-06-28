// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

// import other modules
import fs from 'node:fs';
import path from 'node:path';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';

// read lti
import lti from 'ims-lti';

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

lti.getLatestLaunch = async function(
    datadir, consumerkey, contextid, userid, exnum, keyonly
) {
    let userdir = lpdata.userdir(
        datadir, consumerkey, contextid, userid, false
    );
    if (!userdir) { return false; }
    let launchesdir = path.join(userdir, 'launches');
    let newest = '';
    let newestts = 0;
    let launches = await lpfs.filesin(launchesdir);
    if (!launches) { return false; }
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
        let mtime = await lpfs.mtime(ffn);
        if (mtime > newestts) {
            newestts = mtime;
            newest = ffn;
        }
    }
    // return false if none found
    if (newest == '') { return false; }
    if (keyonly) {
        newest = newest.substr(-45);
        newest = newest.substr(0,40);
    }
    return newest;
}

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

lti.sendScore = async function(
    datadir, consumerkey, contextid, userid, exnum, score
) {
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

export default lti;

/*
// TODO: fix this
app.get('/update', function(req, res) {
    const reqInfo = JSON.parse(
        fs.readFileSync('/tmp/request.json','utf8'));
    const oauthkey = reqInfo.oauth_consumer_key;
    const oauthsecret = get_consumer_secret(cokey);
    const provider = new lplti.Provider(oauthkey,oauthsecret);
    var resptext = 'got';
    const outcome_service = new lplti.OutcomeService({
        consumer_key: oauthkey,
        consumer_secret: oauthsecret,
        service_url: reqInfo.lis_outcome_service_url,
        source_did: reqInfo.lis_result_sourcedid,
        language: 'en'
    });
    outcome_service.send_replace_result(0.31, function(e, r) {
        if (r) {
            resptext += ' success';
        } else {
            respect += ' failure';
        }
    });
    res.send('Here with ' + resptext);
});
*/
