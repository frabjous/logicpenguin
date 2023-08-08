// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// lpinstructor.js /////////////////////////////////////
// responds to instructor-only json requests                          //
////////////////////////////////////////////////////////////////////////

import lpauth from './lpauth.js';
import lpfs from './lpfs.js';
import path from 'node:path';

// set datadir
const datadir = process.appsettings.datadir;

const qr = {};

qr.getsystemnames = async function(req) {
    const files = await lpfs.filesin('public/js/problemtypes');
    const systemspt = files.filter((f) => {
        if (f.substring(0,11) != 'derivation-') { return false; }
        if (f.indexOf('-base') != -1) { return false; }
        return true;
    });
    const systems = systemspt.map((n) => (
        n.replace('derivation-','').replace('.js','')
    ));
    return { systems }
}

qr.savecontextsettings = async function(req) {
    if (!("contextSettings" in req)) {
        return {
            error: true,
            errMsg: 'No context settings to save were sent.'
        }
    }
    const dirname = path.join(datadir, req.consumerkey, req.contextid);
    if (!lpfs.ensuredir(dirname)) {
        return {
            error: true,
            errMsg: 'Could not find or create directory for course.'
        }
    }
    const settingsfile = path.join(dirname, 'context-settings.json');
    if (!lpfs.savejson(settingsfile, req.contextSettings)) {
        return {
            error: true,
            errMsg: 'Could not save course settings file.'
        }
    }
    return { success: true }
}

const lpinstructor = async function(reqobj) {
        // ensure we have all needed data
    const { userid, contextid, consumerkey, launchid, query } = reqobj;
    if (!launchid || !userid || !contextid || !consumerkey || !query) {
        return {
            error: true,
            errMsg: 'Insufficient information provided to process query.'
        };
    }
    if (!(query in qr)) {
        return {
            error: true,
            errMsg: 'Unkown query type.'
        };
    }
    if (!lpauth.verifylaunch(consumerkey, contextid, userid,
        'instructorpage', launchid)) {
        return {
            error: true,
            errMsg: 'Instructor query with unverified launch id.'
        };
    }
    return await qr[query](reqobj);
}

export default lpinstructor;
