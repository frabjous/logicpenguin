// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// instructor.js //////////////////////////////////////
// defines the main functions controlling the instructor page          //
/////////////////////////////////////////////////////////////////////////

import LP from '../load.js';
import { htmlEscape, jsonRequest } from './common.js';
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

async function editorquery(req= {}) {
    req.reqtype = 'instructorrequest';
    req.consumerkey = window.consumerkey;
    req.contextid = window.contextid;
    req.userid = window.userid;
    req.launchid = window.launchid;
    let resp = {};
    try {
        const response = await fetch('/json', {
            method: 'POST',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(req)
        });
        resp = await response.json();
    } catch(err) {
        errormessage('Problem interacting with server: ' +
            err.toString());
        return false;
    }
    if (resp?.error) {
        errormessage('Problem reported by server: ' +
            (resp?.errMsg ?? 'unknown error'));
        return false;
    }
    return resp;
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
    let systemsresponse = await editorquery({ query: 'getsystemnames' });
    if (!systemsresponse) { return false; }
    const systems = systemsresponse?.systems ?? [];
    const hdr = addelem('h2', m, {
        innerHTML: tr('Course Settings')
    });
    const tbl = addelem('table', m);
    const tbdy = addelem('tbody', tbl);
    const tfoot = addelem('tfoot', tbl);
    const btnrow = addelem('tr', tfoot);
    const btncell = addelem('td', btnrow, {
        colSpan: 2,
        classes: ['buttondiv']
    });
    const btn = addelem('button', btncell, {
        innerHTML: 'save',
        type: 'button',
        disabled: true,
        mym: m,
        onclick: function() { this.mym.save(); }
    });
    const titrow = addelem('tr',tbdy);
    const titlab = addelem('td', titrow, {
        innerHTML: tr('Course name')
    });
    const titcell = addelem('td', titrow);
    const titinput = addelem('input', titcell, {
        type: 'text',
        placeholder: tr('course name'),
        mybtn: btn,
        oninput: function() {
            clearmessage();
            this.mybtn.disabled = false;
        }
    });
    if (window?.contextSettings?.coursename) {
        titinput.value = window.contextSettings.coursename;
    }
    const insrow = addelem('tr',tbdy);
    const inslbl = addelem('td', insrow, {
        innerHTML: tr('Instructor(s)')
    });
    const inscell = addelem('td', insrow);
    const insinput = addelem('input', inscell, {
        type: 'text',
        placeholder: tr('instructor name(s)'),
        mybtn: btn,
        oninput: function() {
            clearmessage();
            this.mybtn.disabled = false;
        }
    });
    if (window?.contextSettings?.instructor) {
        insinput.value = window.contextSettings.instructor;
    }
    const notrow = addelem('tr', tbdy);
    const notlbl = addelem('td', notrow, {
        innerHTML: tr('Notation')
    });
    const notcell = addelem('td', notrow);
    const notinput = addelem('select', notcell, {
        classes: ['symbolic'],
        mybtn: btn,
        onchange: function() {
            this.mybtn.disabled = false;
            clearmessage();
            this.classList.remove('invalid');
            if (this?.mysysinput) {
                if (((this.mysysinput.value == '') ||
                    this.mysysinput.value == 'none') &&
                    this.value != 'none') {
                    this.mysysinput.value = this.value;
                }
            }
        }
    });
    const noneopt = addelem('option', notinput, {
        value: 'none',
        innerHTML: 'none'
    });
    for (const notationname in notations) {
        const notation = notations[notationname];
        let notationdisplay = htmlEscape(
            (notation?.NOT ?? '') +
            (notation?.OR ?? '') +
            (notation?.AND ?? '') +
            (notation?.IFTHEN ?? '') +
            (notation?.IFF ?? '') +
            (notation?.FALSUM ?? '') + ' '
        );
        if (notation?.quantifierForm.indexOf('?') != -1) {
            notationdisplay += notation.quantifierForm.replace(/Q\?/g,'') +
                ' ' + notation.quantifierForm.replace(/Q\?/g, notation?.EXISTS ?? '');
        } else {
            notationdisplay += notation.quantifierForm.replace(/Q/g, notation.FORALL) +
                ' ' + notation.quantifierForm.replace(/Q/g, notation.EXISTS)
        }
        const notopt = addelem('option', notinput, {
            value: notationname,
            innerHTML: notationname + ': ' + notationdisplay
        });
    }
    if (window?.contextSettings?.notation) {
        notinput.value = window.contextSettings.notation;
    }
    const sysrow = addelem('tr', tbdy);
    const syslbl = addelem('td', sysrow, {
        innerHTML: 'Deductive system'
    });
    const syscell = addelem('td', sysrow);
    const sysinput = addelem('select', syscell, {
        myninput: notinput,
        mybtn: btn,
        onchange: function() {
            this.mybtn.disabled = false;
            clearmessage();
            if ((this.value != '') &&
                (this.myninput.value == '' || this.myninput.value == 'none')) {
                this.myninput.value = this.value;
            }
        }
    });
    notinput.mysysinput = sysinput;
    const sysnoneopt = addelem('option', sysinput, {
        innerHTML: 'none',
        value: 'none'
    });
    for (const system of systems) {
        const sysop = addelem('option', sysinput, {
            innerHTML: system,
            value: system
        });
    }
    if (window?.contextSettings?.system) {
        sysinput.value = window.contextSettings.system;
    }
    m.titinput = titinput;
    m.insinput = insinput;
    m.notinput = notinput;
    m.sysinput = sysinput;
    m.btn = btn;
    m.save = async function() {
        const btn = this.btn;
        const contextSettings = {};
        contextSettings.coursename = this.titinput.value;
        contextSettings.instructor = this.insinput.value;
        contextSettings.notation = this.notinput.value;
        contextSettings.system = this.sysinput.value;
        if ((contextSettings.system != 'none' && contextSettings.system != '') &&
            (contextSettings.notation == 'none' || contextSettings.notation == '')) {
            this.notinput.classList.add('invalid');
            return;
        }
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined spinning">' +
            'sync</span> saving …';
        const resp = editorquery({ query: 'savecontextsettings', contextSettings });
        btn.innerHTML = 'save';
        if (!resp) {
            btn.disabled = false;
            return;
        }
        window.contextSettings = contextSettings;
        updateTitle();
        infomessage('Course settings saved.');
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
    } else {
        clearmessage();
    }
}

function updateTitle() {
    const pagetitle = byid('pagetitle');
    if (("coursename" in window?.contextSettings)
        && (window.contextSettings.coursename != '')) {
        pagetitle.innerHTML = tr('Instructor Page') + ': ' +
            htmlEscape(window.contextSettings.coursename);
        document.title = window.contextSettings.coursename + ' ' +
            tr('Instructor Page') + ' | ' + tr('Logic Penguin');
    } else {
        pagetitle.innerHTML = tr('Instructor Page') + ': ' +
            tr('Course') + ' ' + window.contextid;
        document.title = tr('Instructor Page') + ' | ' +
            tr('Logic Penguin');
    }
}

// attach stuff to window

window.onhashchange = function() {
    const h = window.location.hash;
    loadhash(h);
}

// start stuff

updateTitle();

let starthash = window.location.hash ?? '';
if (starthash == '' &&
    Object.keys(window.loadedContextSettings).length == 0) {
    starthash = '#settingsmain';
}
loadhash(starthash);

export default LPinstr;

