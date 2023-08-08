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
    msgArea.display.style = 'none';
    msgArea.classList.remove('info', 'loading', 'warning', 'error');
    msgArea.innerHTML = '';
}

function infoMessage(msg) {
    this.makeMessage('info', msg);
}

function loadhash(h) {
    LP.infoMessage('Well, hello there.');
}

function makeMessage(msgtype, msg) {
    msgArea.display.style = 'block';
    msgArea.classList.remove('info','loading','warning','error');
    msgArea.classList.add(msgtype);
    msgArea.innerHTML = msg;
}

// start stuff


export default LPinstr;

