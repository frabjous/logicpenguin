// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////////////////////////////////////////////////////
// Functions specific to loading exercises in sets for exercise pages  //
/////////////////////////////////////////////////////////////////////////

import LP from '../load.js';

// original setting of wasontime
window.wasontime = (!window.duetime ||
    ((new Date()).getTime() < window.duetime)) ;

// check if a certain time is past due; also set "wasontime" to
// result for next check, and warn if this has changed
// should not be used seriously; always double check on server
window.checkOnTime = function(currtime, graceperiod = 300000) {
    if (!window.duetime) { return true; }
    // give five minute grace period
    const ontime = (currtime < (window.duetime + graceperiod));
    if ((!ontime) && window?.wasontime) {
        window.wasontime = false;
        // -1 indicates time hadn't expired but now has
        return -1;
    }
    return ontime;
}

// formats a time in human readable form (time-stamp to string)
function prettytime(ts) {
    const d = new Date(ts);
    let ampm = 'am';
    let hour = d.getHours();
    if (hour > 12) { hour = hour - 12 ; ampm = 'pm'; }
    if (hour == 0) { hour = 12; }
    hour = hour.toString();
    let min = d.getMinutes().toString();
    if (min.length == 1) { min = '0' + min; };
    return hour + ':' + min + ampm + ' on ' +
        d.toDateString();
}

// load the exercises when the page is ready for them
window.addEventListener('load', async function() {

    // get the page title element
    const pagetitle = LP.byid('pagetitle');

    // set page title
    if (window?.exerciseinfo?.longtitle && pagetitle) {
        pagetitle.innerHTML = window.exerciseinfo.longtitle;
    }

    // insert the problems
    if (window.exerciseinfo && window.exerciseproblems) {
        await LP.makeProblems('problems', window.exerciseinfo,
            window.exerciseproblems, window.exerciseanswers,
            true);
    }

    // restore the answers
    if (window.restoredata) {
        LP.restoreProblemStates(window.restoredata);
    }


    // info about when due
    if (!window.duetime) { return; }
    if (window.wasontime) {
        LP.infoboxMsg('This exercise is due by ' +
            prettytime(window.duetime) + '.', 'info');
    } else {
        LP.infoboxMsg('This exercise was due by ' +
            prettytime(window.duetime) + ' — it is now past due. ' +
            'Answers may no longer be saved.','warning');
    }
});
