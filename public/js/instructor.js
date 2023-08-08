// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// instructor.js //////////////////////////////////////
// defines the main functions controlling the instructor page          //
/////////////////////////////////////////////////////////////////////////

import LP from '../load.js';
import { htmlEscape } from './misc.js';
import tr from './translate.js';

// initialize stuff
const LPinstr = {};
const mainAreasLoaded = {};

// convenience constants
const addelem = LP.addelem;
const byid = LP.byid;
const msgArea = byid('messagearea');
const mainloadfns = {};

function clearmessage() {
    msgArea.style.display = 'none';
    msgArea.classList.remove('info', 'loading', 'warning', 'error');
    msgArea.innerHTML = '';
}

function errormessage(msg) {
    makemessage('error', '<span class="material-symbols-outlined">emergency_home</span> <span class="errortitle">' +
        tr('ERROR') + '</span>: ' + tr(msg));
}

function infomessage(msg) {
    makemessage('info', '<span class="material-symbols-outlined">info</span> ' + tr(msg));
}

function loadhash(h) {
    if (h == '') {
        h = '#studentsmain';
    }
    if (h.substr(-4) == 'main') {
        showmain(h);
    }
}

function loadingmessage(msg = 'loading …') {
    makemessage('loading',
        '<span class="material-symbols-outlined spinning">sync</span>' +
        tr(msg));
}

async function loadmain(main) {
    const m = byid(main);
    if (main in mainloadfns) {
        loadingmessage();
        const loadresult = await mainloadfns[main]();
        if (loadresult) {
            clearmessage();
            mainAreasLoaded[main] = true;
        }
    }
}

mainloadfns.settingsmain = async function() {
    const m = byid('settingsmain');
    m.innerHTML = '';
    let notations = {};
    try {
        const imported = await import('/js/symbolic/notations.js');
        notations = imported.default;
    } catch(err) {
        errormessage('Could not load notations options.');
        return false;
    }
    const hdr = addelem('h2', m, {
        innerHTML: tr('Course Settings')
    });
    const tbl = addelem('table', m);
    const btndiv = addelem('div', m, {
        classes: ['buttondiv']
    });
    const btn = addelem('button', btndiv, {
        innerHTML: 'save',
        type: 'button',
        disabled: true
    });
    const tbdy = addelem('tbody', tbl);
    const titrow = addelem('tr',tbdy);
    const titlab = addelem('td', titrow, {
        innerHTML: tr('Course name')
    });
    const titcell = addelem('td', titrow);
    const titinput = addelem('input', titcell, {
        type: 'text',
        placeholder: tr('course name'),
        mybtn: btn,
        oninput: function() { this.mybtn.disabled = false; }
    });
    const insrow = addelem('tr',tbdy);
    const inslbl = addelem('td', insrow, {
        innerHTML: tr('Instructor(s)')
    });
    const inscell = addelem('td', insrow);
    const insinput = addelem('input', inscell, {
        type: 'text',
        placeholder: tr('instructor name(s)'),
        mybtn: btn,
        oninput: function() { this.mybtn.disabled = false; }
    });
    const notrow = addelem('tr', tbdy);
    const notlbl = addelem('td', notrow, {
        innerHTML: tr('Notation')
    });
    const notcell = addelem('td', notrow);
    const notinput = addelem('select', notcell);
    const noneopt = addelem('option', notinput, {
        value: 'none',
        innerHTML: 'none'
    });
    for (const notationname in notations) {
        const notation = notations[notationname];
        const notationdisplay =
            ({notation.NOT}
        const notopt = addelem('option', notinput, {
            value: notationname
        });
    }
    return true;
}

mainloadfns.studentsmain = async function() {
    const m = byid('studentsmain');
    m.innerHTML = 'Instructor student coming soon.';
    return true;
}

mainloadfns.exercisesmain = async function() {
    const m = byid('exercisesmain');
    m.innerHTML = 'Instructor exercise control coming soon.';
    return true;
}

mainloadfns.gradingmain = async function() {
    const m = byid('gradingmain');
    m.innerHTML = 'Instructor grading coming soon.';
    return true;
}

mainloadfns.lecturesmain = async function() {
    const m = byid('lecturesmain');
    m.innerHTML = 'Instructor lecture notes control coming soon.';
    return true;
}

function makemessage(msgtype, msg) {
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

