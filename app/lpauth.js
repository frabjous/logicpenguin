// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////lpauth.js//////////////////////////////////////
// Deals with authenticating access to exercises and whether they are //
// appropriate given the launch data for the user                     //
////////////////////////////////////////////////////////////////////////

// load modules
import fs from 'node:fs';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';
import path from 'node:path';
import { randomString } from '../public/js/misc.js';

// initialize module
const lpauth = {};

// create launch record
lpauth.newlaunch = function(reqbody, exnum) {
    // read info from request body
    const consumerkey =  reqbody?.oauth_consumer_key ??  '';
    const contextid = reqbody?.context_id ?? '';
    const userid = (reqbody?.user_id ?? reqbody?.ext_user_username) ?? '';
    const fullname = reqbody?.lis_person_name_full ?? 'Anonymous user';
    const roles = reqbody?.roles ?? '';
    const source_did = reqbody?.lis_result_sourcedid ?? false;
    const service_url = reqbody?.lis_outcome_service_url ?? false;
    const email = reqbody?.lis_person_contact_email_primary ?? false;
    const returnurl = reqbody?.launch_presentation_return_url ?? false;
    // record when the launch took place
    const activities = {};
    activities[ (new Date()).getTime().toString() ] = 'launched';
    // ensure user directory
    const userdir = lpdata.userdir(consumerkey, contextid, userid, fullname);
    if (!userdir) { return false; }
    // ensure launch directory
    const launchdir = path.join(userdir, 'launches');
    if (!lpfs.ensuredir(launchdir)) { return false; }
    // generate a random string to represent the launch
    // save as json file
    const launchid = randomString(40);
    const launchfile = path.join(launchdir, exnum + '-' +
        launchid + '.json');
    if (!lpfs.savejson(launchfile, { exnum, fullname, roles, source_did,
        service_url, email, returnurl, activities })) {
        return false;
    }
    // return the random string
    return launchid;
}

// check to see if a launch id has already been active
lpauth.verifylaunch = function (consumerkey, contextid, userid, exnum,
    launchid) {
    // allow development test when running in development mode
    if (( launchid == 'developmenttest' ) &&
        ( process.env.NODE_ENV == 'development' )) {
        return true;
    }
    // access/create user directory
    const userdir = lpdata.userdir(consumerkey, contextid, userid, false);
    if (!userdir) { return false; };
    // ensure the launch file exists
    const launchfile = path.join(userdir, 'launches', exnum + '-' +
        launchid + '.json');
    if (!lpfs.isfile(launchfile)) { return false; }
    // to access instructor page must be instructor
    if (exnum == 'instructorpage') {
        const launchinfo = lpfs.loadjson(launchfile);
        if (!launchinfo) { return false; }
        if (!("roles" in launchinfo)) { return false; }
        if (launchinfo.roles.indexOf('Instructor') == -1) { return false; }
    }
    return true;
}

// return library object with the functions
export default lpauth;
