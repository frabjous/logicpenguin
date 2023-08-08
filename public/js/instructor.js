// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// instructor.js //////////////////////////////////////
// defines the main functions controlling the instructor page          //
/////////////////////////////////////////////////////////////////////////

import LP from '../load.js';

// initialize stuff
const LPinstr = {};
const mainAreasLoaded = {};

// convenience constants
const byid = LP.byid;
const msgArea = byid('messagearea');


function clearMessage() {
    msgArea.style.display = 'none';
    msgArea.classList.remove('info', 'loading', 'warning', 'error');
    msgArea.innerHTML = '';
}

function infoMessage(msg) {
    makeMessage('info', '<span class="material-symbols-outlined">info</span> ' + msg);
}

function loadhash(h) {
    if (h == '') {

    }
    console.log('got here',h);
}

function makeMessage(msgtype, msg) {
    msgArea.style.display = 'block';
    msgArea.classList.remove('info','loading','warning','error');
    msgArea.classList.add(msgtype);
    msgArea.innerHTML = msg;
}


// attach stuff to window

window.onhashchange = function() {
    const h = window.location.hash;
    loadhash(h);
}

// start stuff

let starthash = window.location.hash ?? '';
if (starthash == '' &&
    Object.keys(window.loadedContextSettings).length == 0) {
    starthash = 'settingsmain';
}
loadhash(starthash);

export default LPinstr;

