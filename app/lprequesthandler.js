// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////lprequesthandler.js//////////////////////////
// Functions for reacting appropriately to json-based requests
// such as saving an answer, etc.
//////////////////////////////////////////////////////////////////////

// load modules
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';
import lpauth from './lpauth.js';
import libgrade from '../public/js/libgrade.js';
import path from 'node:path';

// initialize return object
let lprequesthandler = {};

// generic function for returning an error
function errResponse(msg){
    return { error: true, errMsg: msg };
}

// core function for responding to kinds of requests
lprequesthandler.respond = function(datadir, reqobj) {
    // sanity check
    if (!reqobj.reqtype) {
        return errResponse('Request type not specified.');
    }
    // react appropriately depending on request type
    switch(reqobj.reqtype) {
        case 'saveans':
            return lprequesthandler.saveAnswer(datadir, reqobj);
            break;
        default:
            return errResponse('Unsupported request type.');
    }
    // shouldn't get here, but in case of bug …
    return errResponse('Unable to handle request.');
}

lprequesthandler.saveAnswer = async function(datadir, reqobj) {

    // ensure we have all needed data
    let { probset, num, elemid, timestamp, state, launchid, exnum,
            userid, contextid, consumerkey } = reqobj;
    if (!(probset >= 0) || !(num >= 0) || !timestamp || !state || !elemid ||
        !launchid || !exnum || !userid || !contextid || !consumerkey) {
        return errResponse('Inadequate information provided to save answer.');
    }

    // verify launch id for this exnum/user
    let launchok = lpauth.verifylaunch( datadir, consumerkey,
        contextid, userid, exnum, launchid);
    if (!launchok) {
        return errResponse('User not authorized to save answer with ' +
            'this launch.');
    }

    // ensure exercise is savable
    let exinfo = lpdata.getExerciseInfo(datadir, consumerkey, contextid, exnum);
    let { duetime, savable, servergraded } = exinfo;
    if (!duetime) { duetime = false; }
    if (!savable) {
        return errResponse('Exercises in this set cannot be saved.');
    }

    // ensure problem in range of problem sets
    let setinfo = exinfo?.problemsets?.[probset];
    if (!setinfo) {
        return errResponse('Problem set for specified answer not found.');
    }

    // check if exercise is past due
    let pastDue = lpdata.determinePastDue(datadir, consumerkey, contextid,
        userid, exnum, duetime);
    if (pastDue) {
        return {
            error: false,
            elemid: elemid,
            timestamp: (reqobj.timestamp ?? -1),
            newind:  {
                savestatus: "saveerror",
                successstatus: "edited",
                points: -1,
                message: 'Time has expired. Answers to this exercise ' +
                    'may no longer be saved.'
            }
        }
    }

    // set success to unknown prior to checking
    state.ind.successstatus = "unknown";

    // check if server should do grading
    let { immediateresult, manuallygraded, problemtype, partialcredit,
        points } = setinfo;
    if (servergraded && immediateresult) {
        // sanity checks
        if (!("ans" in state)) {
            return errResponse('No answer provided to save.');
        }
        if (!problemtype) {
            return errResponse('Unknown type of problem.');
        }
        let [question, answer] = lpdata.getIndividualQnA(
            datadir, consumerkey, contextid, userid, exnum, probset, num
        );
        if ((question === null) || (answer === null)) {
            return errResponse(
                'Unable to find question or answer data on server');
        }
        // actually check the answer and get what should go in the
        // problem indicator (ind)
        state.ind = await libgrade.checkAnswer( problemtype, question,
            answer, state.ans, partialcredit, points, (setinfo.cheat ?? false),
            (setinfo.options ?? {}));
        // if previous function returned false or null, that's a malfunction
        if (!state.ind) {
            state.ind = {
                savestatus: "malfunction",
                successstatus: "malfunction",
                points: -1,
                message: 'Server is unable to check your answer.'
            }
        }
    }
    // save/record the answer; set status to saved assuming it will
    // save; if it does not, there is no harm
    if (state.ind.savestatus != "malfunction") {
        state.ind.savestatus = "saved";
    }
    // actually do the saving
    let saveRes = lpdata.recordAnswer(datadir, consumerkey, contextid,
        userid, exnum, elemid, state);
    if (!saveRes) {
        return errResponse('Unable to save answer on server.');
    }
    // record indeterminate answers
    if (state.ind.successstatus == 'indeterminate') {
        lpdata.saveindeterminate(datadir, { consumerkey, contextid, userid,
            exnum, elemid, state } );
    }
    // report to browser
    return {
        error: false,
        elemid: elemid,
        timestamp: (reqobj.timestamp ?? -1),
        newind: state.ind
    }
}

/* TODO:
 * NOTE: I don't know why this was here, so I'm commenting out
 * and seeing if breaks anything
function removeMarks(deriv) {
    if (!("parts" in deriv)) { return; }
    for (let p of deriv.parts) {
        if ("parts" in p) {
            if (p.showline && ("c" in p.showline)) {
                p.showline.c = "unchecked";
            }
            removeMarks(p);
        } else {
            if ("c" in p) {
                p.c = "unchecked";
            }
        }
    }
}
*/

//export the library object with the functions
export default lprequesthandler;
