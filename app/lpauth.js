// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

// load modules
import fs from 'node:fs';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';
import path from 'node:path';
import { randomString } from '../public/js/misc.js';

// initialize module
let lpauth = {};

// create launch record
lpauth.newlaunch = function(datadir, reqbody, exnum) {
    // read info from request body
    const consumerkey =  reqbody.oauth_consumer_key;
    const contextid = reqbody.context_id;
    const userid = reqbody.user_id ?? reqbody.ext_user_username;
    const fullname = reqbody.lis_person_name_full ?? 'Anonymous user';
    const roles = reqbody.roles ?? '';
    const source_did = reqbody.lis_result_sourcedid ?? false;
    const service_url = reqbody.lis_outcome_service_url ?? false;
    const email = reqbody.lis_person_contact_email_primary ?? false;
    const returnurl = reqbody.launch_presentation_return_url ?? false;
    // record when the launch took place
    let activities = {};
    activities[ (new Date()).getTime().toString() ] = 'launched';
    // ensure user directory
    let userdir = lpdata.userdir(datadir, consumerkey, contextid,
        userid, fullname);
    if (!userdir) { return false; }
    // ensure launch directory
    const launchdir = path.join(userdir, 'launches');
    if (!lpfs.ensuredir(launchdir)) { return false; }
    // generate a random string to represent the launch
    // save as json file
    const launchid = randomString(40);
    const launchfile = path.join(launchdir, exnum + '-' +
        launchid + '.json');
    if (!lpfs.savejson(launchfile, {
        exnum, roles, source_did, service_url,
        email, returnurl, activities
    })) {
        return false;
    }
    // return the random string
    return launchid;
}

// check to see if a launch id has already been active
lpauth.verifylaunch = function (datadir, consumerkey, contextid,
    userid, exnum, launchid) {
    // allow development test when running in development mode
    if (( launchid == 'developmenttest' ) &&
        ( process.env.NODE_ENV == 'development' )) {
        return true;
    }
    // access/create user directory
    let userdir = lpdata.userdir(datadir, consumerkey, contextid,
        userid, false);
    if (!userdir) { return false; };
    // ensure the launch file exists
    return lpfs.isfile(path.join(userdir, 'launches',
        exnum + '-' + launchid + '.json'));
}

export default lpauth;
