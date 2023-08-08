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
        h = '#studentsmain';
    }
    if (h.substr(-4) == 'main') {
        showmain(h);
    }
}

async function loadmain(main) {
    document.body.scrollIntoView();
    const m = byid(main);
    m.innerHTML = 'Hello there ' + main + (new Date()).getTime().toString();
    mainAreasLoaded[main] = true;
}

function makeMessage(msgtype, msg) {
    msgArea.style.display = 'block';
    msgArea.classList.remove('info','loading','warning','error');
    msgArea.classList.add(msgtype);
    msgArea.innerHTML = msg;
}


function showmain(area) {
    const navlist = byid("mainnavlist");
    // fix nav bar
    const aa = navlist.getElementsByTagName("a");
    for (const a of aa) {
        const hrefhash = a.href.split('#').reverse()[0];
        if (('#' + hrefhash) == area) {
            a.classList.add('current');
        } else {
            a.classList.remove('current');
        }
    }
    // show only this area
    const mm = document.getElementsByClassName("mainarea");
    for (const m of mm) {
        if (('#' + m.id) == area) {
            m.style.display = 'block';
        } else {
            m.style.display = 'none'
        }
    }
    if ((!(area.substr(1) in mainAreasLoaded)) ||
        (!mainAreasLoaded[area.substr(1)])) {
        loadmain(area.substr(1));
    }
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
    starthash = '#settingsmain';
}
loadhash(starthash);

export default LPinstr;

