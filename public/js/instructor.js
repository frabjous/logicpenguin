// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// instructor.js //////////////////////////////////////
// defines the main functions controlling the instructor page          //
/////////////////////////////////////////////////////////////////////////

import LP from '../load.js';
import { htmlEscape, jsonRequest } from './common.js';
import { randomString } from './misc.js';
import tr from './translate.js';

// initialize stuff
const LPinstr = {};
const mainAreasLoaded = {};
const problemSetCreators = {};

// convenience constants
const addelem = LP.addelem;
const byid = LP.byid;
const msgArea = byid('messagearea');
const theDialog = document.getElementsByTagName("dialog")[0];
const mainloadfns = {};

// add exercise to Exercise list, attached to ul element as "this"
function addExerciseItem(exnum, exinfo) {
    const li = addelem('li', this);
    const div = addelem('div', li);
    const exnumdiv = addelem('div', div, {
        classes: ['exnumtitle'],
        innerHTML: '(' + exnum + ')' + (("longtitle" in exinfo) ?
            (' ' + htmlEscape(exinfo.longtitle)) : '')
    });
    const exinfodiv = addelem('div', div, { classes: ['exinfo'] });
    const duetimepart = addelem('div', exinfodiv, {
        classes: ['exinfopart']
    });
    const timerinfo = ((exinfo?.duetime > 0) ?
        (new Date(exinfo.duetime)).toLocaleString() : 'never');
    const duetimelabel = addelem('span', duetimepart, {
        innerHTML: '<span class="material-symbols-outlined">timer</span>' +
            tr('Due') + ': '
    });
    const duetimeinfo = addelem('span', duetimepart, {
        innerHTML: timerinfo
    });
    const savablepart = addelem('div', exinfodiv, { classes: ['exinfopart'] });
    const savablelabel = addelem('span', savablepart, {
        innerHTML: '<span class="material-symbols-outlined">save</span>' +
            tr('Savable') + ': '
    });
    const savableinfo = addelem('span', savablepart, {
        innerHTML: ((("savable" in exinfo) && (exinfo.savable)) ? 'yes' : 'no')
    });

    const servergradedpart = addelem('div', exinfodiv, { classes: ['exinfopart'] });
    const servergradedlabel = addelem('span', servergradedpart, {
        innerHTML: '<span class="material-symbols-outlined">dns</span>' +
            tr('Server graded') + ': '
    });
    const servergradedinfo = addelem('span', servergradedpart, {
        innerHTML: ((("servergraded" in exinfo) && (exinfo.servergraded)) ? 'yes' : 'no')
    });
    const probsetpart = addelem('div', exinfodiv, { classes: ['exinfopart'] });
    const numsets = (exinfo?.problemsets?.length ?? 0);
    let pseticon = 'filter_' + numsets.toString();
    if (numsets == 0) { pseticon = 'filter_none'; }
    if (numsets > 9) { pseticon = 'filter_9_plus'; }
    const probsetlabel = addelem('span', probsetpart, {
        innerHTML: '<span class="material-symbols-outlined">' + pseticon +
            '</span>' + ((numsets != 1) ? tr('Problem sets') : tr('Problem set')) +
            ' (' + numsets.toString()  + '): '
    });
    const ptypes = {};
    for (const pset of exinfo?.problemsets) {
        if ("problemtype" in pset) {
            let ptype = pset.problemtype;
            if (ptype.substring(0,11) == 'derivation-') {
                ptype = 'derivation';
            }
            ptypes[ptype] = true;
        }
    }
    let ptypestr = Object.keys(ptypes).sort().join(', ');
    const probsetinfo = addelem('span', probsetpart, {
        innerHTML: ptypestr
    });
    const launchlinkurl = window.location.protocol + '//' +
        window.location.host + '/launch/' + exnum;
    const launchlinkdiv = addelem('div',div, {
        classes: ['exlaunchlinkdiv'],
        innerHTML: '<span class="material-symbols-outlined">link</span>' +
            'LMS LTI Tool Launch URL: <span class="launchlink">' +
            launchlinkurl + '</span> ' + '<span class="material-symbols' +
            '-outlined copylink" title="copy url" ' +
            'onclick="navigator.clipboard.writeText(\'' +
            launchlinkurl + '\')">content_copy</span>'
    });
    const bdiv = addelem('div', div, { classes: ['exlistbuttons'] });
    const editbutton = addelem('button', bdiv, {
        type: 'button',
        innerHTML: 'edit exercise ' + exnum,
        myexnum: exnum,
        onclick: function() {
            window.location.hash = '#exercise-' + this.myexnum;
        }
    });
    const deletebutton = addelem('div', bdiv, {
        classes: ['deleteexercise'],
        title: tr('delete this exercise'),
        myexnum: exnum,
        innerHTML: '<span class="material-symbols-outlined">delete_forever</span>',
        onclick: function() {
            showdialog(async function() {
                const req = {
                    query: 'deleteexercise',
                    exnum: this.exnum
                }
                const resp = editorquery(req);
                if (!resp) { return; }
                byid('exercisesmain').myexlist.update();
            }, 'Delete exercise', 'delete', 'deleting');
            theDialog.maindiv.innerHTML = 'Are you sure you want to ' +
                'delete exercise ' + this.myexnum + '? This cannot be ' +
                'undone!';
            theDialog.exnum = exnum;
        }
    });
}

// get rid of current message near top
function clearmessage() {
    msgArea.style.display = 'none';
    msgArea.classList.remove('info', 'loading', 'warning', 'error');
    msgArea.innerHTML = '';
}
window.clearmessage = clearmessage;

// function for interacting with server; better and more modern
// than current student-server interaction
async function editorquery(req = {}) {
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

// setting the message area at the top to an error message
function errormessage(msg) {
    makemessage('error', '<span class="material-symbols-outlined">emergency_home</span> <span class="errortitle">' +
        tr('ERROR') + '</span>: ' + tr(msg));
}

function exinfoform(parnode, exnum = 'new', exinfo = {}) {
    const div = addelem('div', parnode, { classes: ['exinfoform'] });
    let idbase = exnum;
    if (idbase == 'new') {
        idbase = randomString(12);
        while (document.getElementById(idbase + '-exinfoform')) {
            idbase = randomString(12);
        }
    }
    div.id = idbase + '-exinfoform';
    // form table
    const tbl = addelem('table', div);
    const tbody = addelem('tbody', tbl);
    // form rows
    const snrow = addelem('tr', tbody);
    const ltrow = addelem('tr', tbody);
    const duerow = addelem('tr', tbody);
    const miscrow = addelem('tr', tbody);
    // short name row
    const snlabeld = addelem('td', snrow);
    const snlabel = addelem('label', snlabeld, {
        innerHTML: 'Short name',
        title: 'The short name occurs as part of the URL and should only consist of letters and digits.',
        htmlFor: idbase + '-exinfoform-shortname'
    });
    const sncell = addelem('td', snrow);
    div.origexnum = ((exnum == 'new') ? false : exnum);
    div.sninput = addelem('input', sncell, {
        id: idbase + '-exinfoform-shortname',
        name: idbase + '-exinfoform-shortname',
        type: 'text',
        placeholder: 'short name for url',
        value: ((exnum == 'new') ? '' : exnum),
        mydiv: div
    });
    // long name row
    const ltlabeld = addelem('td', ltrow);
    const ltlabel = addelem('label', ltlabeld, {
        innerHTML: 'Full title',
        title: 'The full title appears at the top of the exercise page',
        htmlFor: idbase + '-exinfoform-fulltitle'
    });
    const ltcell = addelem('td', ltrow);
    div.ltinput = addelem('input', ltcell, {
        id: idbase + '-exinfoform-fulltitle',
        name: idbase + '-exinfoform-fulltitle',
        type: 'text',
        placeholder: 'full exercise title',
        value: (exinfo?.longtitle ?? ''),
        mydiv: div
    });
    // due time row
    const duelabeld = addelem('td', duerow);
    const duelabel = addelem('label', duelabeld, {
        innerHTML: 'When due',
        htmlFor: idbase + '-exinfoform-duetime'
    });
    const duecell = addelem('td', duerow);
    div.dueinput = addelem('input', duecell, {
        type: 'datetime-local',
        id: idbase + '-exinfoform-duetime',
        name: idbase + '-exinfoform-duetime',
        value: ((exinfo?.duetime) ? tsToInp(exinfo.duetime) : ''),
        mydiv: div,
    });
    // misc row
    const misclabeld = addelem('td', miscrow);
    const misclabel = addelem('label', misclabeld, {
        innerHTML: 'Start #',
        htmlFor: idbase + '-exinfoform-startnum'
    });
    const misccell = addelem('td', miscrow);
    div.startnuminput = addelem('input', misccell, {
        type: 'number',
        id: idbase + '-exinfoform-startnum',
        name: idbase + '-exinfoform-startnum',
        value: ((exinfo?.startnum?.toString()) ?? 1),
        mydiv: div
    });
    const savablelabel = addelem('label', misccell, {
        innerHTML: 'Savable',
        htmlFor: idbase + '-exinfoform-savable'
    });
    div.savablecheckbox = addelem('input', misccell, {
        type: 'checkbox',
        id: idbase + '-exinfoform-savable',
        name: idbase + '-exinfoform-savable',
        checked: (("savable" in exinfo) ? exinfo.savable : true),
        mydiv: div
    });
    const servergradedlabel = addelem('label', misccell, {
        innerHTML: 'Graded on server',
        htmlFor: idbase + '-exinfoform-servergraded'
    });
    div.servergradedcheckbox = addelem('input', misccell, {
        type: 'checkbox',
        id: idbase + '-exinfoform-servergraded',
        name: idbase + '-exinfoform-servergraded',
        checked: (("servergraded" in exinfo) ? exinfo.servergraded : true),
        mydiv: div
    });
    const inpinp = div.getElementsByTagName("input");
    for (const inp of inpinp) {
        inp.onchange = function() { if (this.mydiv.verify) {
            this.mydiv.verify();
        }}
        inp.oninput = function() { if (this.mydiv.verify) {
            this.mydiv.verify();
        }}
    }
    div.verify = function() {
        if (this.sninput) { this.sninput.classList.remove('invalid'); }
        // check short name is not empty
        const snval = this?.sninput?.value ?? '';
        if (snval == '') {
            if (this.savebutton) {
                this.savebutton.disabled = true;
                return;
            }
        }
        // check short name has no garbage
        if (!/^[A-Za-z0-9]*$/.test(snval)) {
            if (this.sninput) { this.sninput.classList.add('invalid'); }
            if (this.savebutton) { this.savebutton.disabled = true; }
            return;
        }
        // if made it here, OK
        if (this.savebutton) { this.savebutton.disabled = false; }
    }
    div.gatherinfo = function() {
        const rv = {};
        rv.exinfo = {};
        rv.exnum = this?.sninput?.value;
        rv.origexnum = this?.origexnum ?? false;
        rv.exinfo.longtitle = this?.ltinput?.value;
        rv.exinfo.duetime = (new Date(this?.dueinput?.value)).getTime();
        rv.exinfo.startnum = parseInt(this?.startnuminput?.value) ?? 1;
        rv.exinfo.savable = this?.savablecheckbox?.checked;
        rv.exinfo.servergraded = this?.servergradedcheckbox?.checked;
        return rv;
    }
    return div;
}

// setting the message area at the top to a informational message
function infomessage(msg) {
    makemessage('info', '<span class="material-symbols-outlined">info</span> ' + tr(msg));
}

async function loadexercise(exhash) {
    const exnum = exhash.substr(10);
    const exarea = byid("exercisesmain")?.indivexarea;
    if (!exarea) { return; }
    const exblock = addelem('div', exarea, {
        id: exhash.substr(1),
        classes: ["exerciseblock"]
    });
    const breadcrumb = addelem('div', exblock, {
        innerHTML: '<a href="#exercisesmain"><span class="' +
            'material-symbols-outlined">arrow_back_ios</span>' +
            'Return to Exercise List</a>',
        classes: ['breadcrumb']
    });
    const hdr = addelem('h2', exblock, {
        innerHTML: tr('Exercise') + ': ' + exnum
    });
    const exdiv = addelem('div', exblock);
    const req = {
        query: 'getexinfo',
        exnum: exnum
    }
    exdiv.innerHTML = '<span class="material-symbols-outlined ' +
        'spinning">sync</span> loading …';
    const resp = await editorquery(req);
    exdiv.innerHTML = '';
    if (!resp) { return; }
    if (!("exinfo" in resp) || !("answers" in resp) || !("problems" in resp)) {
        errormessage(tr('Invalid response from server when requesting information about exercise.'));
        return;
    }
    const exinfoholder = addelem('div', exdiv, {
        classes: ['exinfoholder']
    });
    exblock.exinfoform = exinfoform(exinfoholder, exnum, resp.exinfo);
    const pshdr = addelem('h2', exdiv, { innerHTML: tr('Problem sets') });
    exblock.psetdiv = addelem('div', exdiv);
    // TODO: more here
    exblock.addProbSetCreator = async function(probsetinfo, problems, answers, putbefore = false) {
        const problemtype = probsetinfo.problemtype;
        let shproblemtype = problemtype;
        if (shproblemtype.substr(0,11) == 'derivation-') {
            shproblemtype = 'derivation';
        }
        if (!(shproblemtype in problemSetCreators)) {
            try {
                LP.loadCSS(problemtype);
                const imported = await import('/js/creators/' + shproblemtype + '.js');
                problemSetCreators[shproblemtype] = imported.default;
            } catch(err) {
                errormessage(tr('ERROR loading script for creating problem type') +
                    ' ' + shproblemtype + ': ' + err.toString());
                return;
            }
        }
        const problemsetcreator = addelem(shproblemtype + '-creator', this.psetdiv);
        problemsetcreator.makeProblemSetCreator(probsetinfo, problems, answers);
        problemsetcreator.myexblock = this;
        if (putbefore) {
            putbefore.parentNode.insertBefore(problemsetcreator, putbefore);
        }
        return problemsetcreator;
    }
    for (let i=0; i<resp.exinfo.problemsets.length; i++) {
        const probsetinfo = resp.exinfo.problemsets[i];
        const setproblems = resp.problems[i];
        const setanswers = resp.answers[i];
        await exblock.addProbSetCreator(probsetinfo, setproblems, setanswers, false);
    }
    exblock.addPSCDialog = function(putbefore) {
        showdialog(async function() {
            let probtype = this.problemtypeinput.value;
            if (probtype == 'derivation') {
                if (!window?.contextSettings?.system) {
                    errormessage(tr('Cannot create derivation exercise if no deductive system set in settings.'));
                    return;
                }
                probtype = 'derivation-' + window.contextSettings.system;
            }
            const newprobinfo = { problemtype: probtype };
            const psc = await this.exblock.addProbSetCreator(
                newprobinfo, [], [], this.putbefore
            );
            psc.makeChanged();
            renumberProblemSets('#' + psc.myexblock.id);
        }, 'Add problem set', 'add', 'adding');
        theDialog.putbefore = putbefore;
        theDialog.exblock = this;
        const ptypelabel = addelem('div', theDialog.maindiv, {
            innerHTML: tr('Choose problem type:')
        });
        theDialog.problemtypeinput = addelem('select', theDialog.maindiv, {
            classes: ['problemtypeselect']
        });
        for (const ptype of window.problemtypes) {
            const opt = addelem('option', theDialog.problemtypeinput, {
                innerHTML: ptype,
                value: ptype
            });
        }
    }
    renumberProblemSets(exhash);
    exblock.renumberProblemSets = function() {
        const h = '#' + this.id;
        renumberProblemSets(h);
    }
    exblock.dialogToRemove = function(psc) {
        showdialog(async function() {
            const psc = this.psc;
            psc.makeChanged();
            psc.parentNode.removeChild(psc);
            this.exblock.renumberProblemSets();
        }, 'Remove problem set', 'remove', 'removing');
        theDialog.psc = psc;
        theDialog.maindiv.innerHTML = 'Do you really wish to remove ' +
            'this problem set? This cannot be undone.';
        theDialog.exblock = this;
    }
    const btndiv = addelem('div', exdiv, {
        classes: ['exbuttondiv']
    });
    const newprobsetbutton = addelem('button', btndiv, {
        type: 'button',
        innerHTML: tr('insert new problem set (at end)'),
        myexblock: exblock,
        onclick: function() {
            this.myexblock.addPSCDialog(false);
        }
    });
    const savebutton = addelem('button', exdiv, {
        type: 'button',
        innerHTML: tr('save exercise'),
        classes: ['fixedbutton'],
        disabled: true,
        myexblock: exblock,
        onclick: async function() {
            const exblock = this.myexblock;
            const allproblems = [];
            const allanswers = [];
            const exdata = exblock.exinfoform.gatherinfo();
            const pscpsc = exblock.getElementsByClassName("problemsetcreator");
            for (const psc of pscpsc) {
                const [info, problems, answers] = psc.gatherInfo();
                if (!("problemsets" in exdata.exinfo)) {
                    exdata.exinfo.problemsets = [];
                }
                exdata.exinfo.problemsets.push(info);
                allproblems.push(problems);
                allanswers.push(answers);
            }
            const req = {
                query: 'exerciseinfo',
                exdata: exdata
            }
            if (allproblems.length > 0) {
                req.problems = allproblems;
                req.answers = allanswers;
            }
            this.innerHTML = '<span class="material-symbols-outlined ' +
                'spining">sync</span> saving …';
            const resp = await editorquery(req);
            this.innerHTML = tr('save exercise');
            if (!resp) { return; }
            infomessage('Exercise saved.');
            byid('exercisesmain').myexlist.update();
            this.disabled = true;
        }
    });
    exblock.exinfoform.savebutton = savebutton;
}

// load something based on changes in hash
function loadhash(h) {
    if (h == '') {
        h = '#studentsmain';
    }
    if (h.substr(-4) == 'main') {
        showmain(h);
        if (h == '#exercisesmain') {
            const m = byid('exercisesmain');
            if ("toparea" in m) {
                m.toparea.style.display = 'block';
                m.indivexarea.style.display = 'none';
            }
        }
        return;
    }
    if (h.substr(0,10) == '#exercise-') {
        showexercise(h);
        return;
    }
}

// set message area at the top to a loading message
function loadingmessage(msg = 'loading …') {
    makemessage('loading',
        '<span class="material-symbols-outlined spinning">sync</span>' +
        tr(msg));
}

// load (for the first time) one of the five main sections
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

// below are several functions used by laodmain to load each
// individual main section

// should return true on success
mainloadfns.settingsmain = async function() {
    const m = byid('settingsmain');
    // clear it out
    m.innerHTML = '';
    // get notations from servers
    let notations = {};
    try {
        const imported = await import('/js/symbolic/notations.js');
        notations = imported.default;
    } catch(err) {
        errormessage('Could not load notations options.');
        return false;
    }
    // get systems from server
    let systemsresponse = await editorquery({ query: 'getsystemnames' });
    if (!systemsresponse) { return false; }
    const systems = systemsresponse?.systems ?? [];
    // section header
    const hdr = addelem('h2', m, {
        innerHTML: tr('Course Settings')
    });
    // form of options, which is a table
    const tbl = addelem('table', m);
    const tbdy = addelem('tbody', tbl);
    const tfoot = addelem('tfoot', tbl);
    // save button
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
    // course name (tit="title")
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
    // restore previous value
    if (window?.contextSettings?.coursename) {
        titinput.value = window.contextSettings.coursename;
    }
    // instructor
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
    // restore previous value
    if (window?.contextSettings?.instructor) {
        insinput.value = window.contextSettings.instructor;
    }
    // notation choice
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
    // restore previous
    if (window?.contextSettings?.notation) {
        notinput.value = window.contextSettings.notation;
    }
    // deductive system choice
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
    // restore previous
    if (window?.contextSettings?.system) {
        sysinput.value = window.contextSettings.system;
    }
    // attach inputs to area
    m.titinput = titinput;
    m.insinput = insinput;
    m.notinput = notinput;
    m.sysinput = sysinput;
    m.btn = btn;
    // function to save course settings
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
    // loaded successfully
    return true;
}

mainloadfns.studentsmain = async function() {
    const m = byid('studentsmain');
    // clear out
    m.innerHTML = '';
    // get data on students
    const resp = await editorquery({ query: 'allstudentinfo' });
    if (!resp) { return false; }
    const hdr = addelem('h2', m, { innerHTML: tr('Students') });
    const tbl = addelem('table', m, { classes: ['studentstable'] });
    const thead = addelem('thead', tbl);
    const tbody = addelem('tbody', tbl);
    const tfoot = addelem('tfoot', tbl);
    const thr = addelem('tr', thead);
    const tfr = addelem('tr', tfoot);
    const thrnamecell = addelem('th', thr);
    const tfrnamecell = addelem('th', tfr);
    let exnums = Object.keys(resp.exercises);
    exnums = exnums.sort(function(a,b) {
        const anum = parseInt(a.replace(/[^0-9]/g, ''));
        const bnum = parseInt(b.replace(/[^0-9]/g, ''));
        if (anum != bnum) { return anum - bnum; }
        return a.localeCompare(b);
    });
    for (const exnum of exnums) {
        const thcell = addelem('th', thr, { innerHTML: exnum });
        const tfcell = addelem('th', tfr, { innerHTML: exnum });
    }
    // fill in users' family and given names from fullname if need be
    for (const user in resp.users) {
        const userinfo = resp.users[user];
        if ((!("family" in userinfo) || userinfo.family == '')
            && ("fullname" in userinfo)) {
            const nameparts = userinfo.fullname.split(' ');
            if (nameparts.length == 1) {
                userinfo.family = nameparts[0];
            } else {
                if (!("given" in userinfo) || userinfo.given == '') {
                    userinfo.given = nameparts[0];
                }
                userinfo.family = nameparts.slice(1).join(' ');
            }
        }
    }
    let users = Object.keys(resp.users);
    // sort users by name, etc.
    users = users.sort(function(a,b) {
        const ainfo = resp.users[a];
        const binfo = resp.users[b];
        if ((ainfo?.roles?.indexOf("Learner") != -1) &&
            (binfo?.roles?.indexOf("Learner") == -1)) { return -1; }
        if ((ainfo?.roles?.indexOf("Learner") == -1) &&
            (binfo?.roles?.indexOf("Learner") != -1)) { return 1; }
        if (("family" in ainfo) && ("family" in binfo)) {
            let fcompare = ainfo.family.localeCompare(binfo.family);
            if (fcompare != 0) { return fcompare; }
        }
        if (("family" in ainfo) && !("family" in binfo)) {
            return -1;
        }
        if (("family" in binfo) && !("family" in ainfo)) {
            return 1
        }
        if (("given" in ainfo) && ("given" in binfo)) {
            let gcompare = ainfo.given.localeCompare(binfo.given);
            if (gcompare != 0) { return gcompare; }
        }
        return (a.localeCompare(b));
    });
    // row for each user
    for (const userid of users) {
        const userinfo = resp.users[userid];
        const utr = addelem('tr', tbody);
        if (!("roles" in userinfo) || (userinfo.roles != 'Learner')) {
            utr.classList.add('nonstudent');
        }
        // cell for name/userid
        const namecell = addelem('td', utr);
        let nch = '<div>';
        if (("email" in userinfo) && userinfo.email != '') {
            nch += '<a href="mailto:' + userinfo.email + '">';
        }
        if ("family" in userinfo && userinfo.family != '') {
            nch += userinfo.family;
            if (("given" in userinfo) && userinfo.given != '') {
                nch += ', ' + userinfo.given;
            }
        } else {
            if (("email" in userinfo) && userinfo.email != '') {
                nch += userinfo.email;
            }
        }
        if (("email" in userinfo) && userinfo.email != '') {
            nch += '</a>';
        }
        let shortuserid = userid.substring(0,10);
        if (shortuserid != userid) {
            shortuserid += '…';
        }
        nch += '</div><div><strong title="' + userid + '">(' + shortuserid + ')</strong></div>';
        namecell.innerHTML = nch;
        // cell for each exericse
        for (const exnum of exnums) {
            const exinfo = userinfo?.exercises?.[exnum] ?? {};
            const extd = addelem('td', utr);
            const scorediv = addelem('div', extd, {
                classes: ['studenttablescore'],
                title: 'override ' + exnum + ((
                    ("family" in userinfo) && userinfo.family != ''
                ) ? (' for ' + userinfo.family) : ''),
                myexnum: exnum,
                myuserid: userid,
                myfamily: userinfo?.family ?? false,
                onclick: function() {
                    showdialog(async function() {
                        const newscore = (parseFloat(this.overridescoreinput.value) / 100);
                        const req = {
                            query: 'overridescore',
                            scoreuserid: this.userid,
                            scoreexnum: this.exnum,
                            newscore: newscore
                        }
                        const orresp = await editorquery(req);
                        if (!orresp) { return; }
                        const scorediv = this.scorediv;
                        scorediv.myscore = newscore;
                        scorediv.innerHTML = (newscore * 100)
                            .toFixed(1).toString() + '%';
                        if (scorediv.innerHTML == '100.0%') {
                            scorediv.innerHTML = '100%';
                        }
                        scorediv.classList.add('overridden');
                        if (scorediv.title.indexOf('(overridden) ') == -1) {
                            scorediv.title = '(overridden) ' + scorediv.title;
                        }

                    }, 'Override score', 'override', 'overriding');
                    addelem('div', theDialog.maindiv, {
                        innerHTML: 'Override ' + this.myexnum + ' for ' +
                            ((this.myfamily) ? this.myfamily : this.myuserid)
                    });
                    const scoreholder = addelem('div', theDialog.maindiv, {
                        classes: ['overridescoreholder']
                    });
                    theDialog.overridescoreinput = addelem('input', scoreholder, {
                        type: 'number',
                        step: '0.1',
                        value: (((this?.myscore * 100).toFixed(1).toString()) ?? '0')
                    });
                    addelem('span', scoreholder, { innerHTML: '%' });
                    theDialog.userid = this.myuserid;
                    theDialog.exnum = this.myexnum;
                    theDialog.scorediv = this;
                }
            });
            if ("score" in exinfo) {
                scorediv.myscore = exinfo.score;
                scorediv.innerHTML = (exinfo.score * 100)
                    .toFixed(1).toString() + '%';
                if (scorediv.innerHTML == '100.0%') {
                    scorediv.innerHTML = '100%';
                }
            } else {
                scorediv.myscore = 0;
                scorediv.innerHTML = '—';
            }
            if (("overridden" in exinfo) && (exinfo.overridden)) {
                scorediv.classList.add("overridden");
                scorediv.title = '(overridden) ' + scorediv.title;
            }
            const btndiv = addelem('div', extd, {
                classes: ['cellbuttons']
            });
            let launchtag = 'span';
            let launchicon = 'link_off';
            if ("launch" in exinfo && exinfo.launch) {
                launchtag = 'a';
                launchicon = 'link';
            }
            const launchlink = addelem(launchtag, btndiv, {
                title: ((launchtag == 'a') ?
                    'view ' + exnum + ' as ' +
                    ((userinfo?.family) ? userinfo.family : 'student')
                    : 'student has not launched exercise')
            });
            let llh = '<span class="material-symbols-outlined">' +
                launchicon + '</span>';
            if (exinfo?.saved) {
                llh += '<span class="material-symbols-outlined">save</span>'
            }
            launchlink.innerHTML = llh;
            if (launchtag == 'a') {
                launchlink.href = window.location.protocol + '//' +
                    window.location.host + '/exercises/' +
                    window.consumerkey + '/' + window.contextid +
                    '/' + userid + '/' + exnum + '/' +
                    exinfo.launch;
                launchlink.target='_blank';
            } else {
                // disable override if no launch
                scorediv.classList.add('disabled');
                scorediv.title = '';
                scorediv.onclick = function(){}
            }
            const deadlinebtn = addelem('span', btndiv, {
                innerHTML: '<span class="material-symbols-outlined">' +
                    'timer</span>',
                classes: ['extensionbutton'],
                title: 'due ' + (new Date(resp.exercises[exnum])).toLocaleString() + '; click to grant extension',
                duetime: resp.exercises[exnum],
                extensiontime: -1,
                myexnum: exnum,
                myuserid: userid,
                myfamily: userinfo?.family ?? false,
                onclick: function() {
                    showdialog(async function() {
                        const req = {
                            query: 'grantextension',
                            extuserid: this.userid,
                            extexnum: this.exnum,
                            ts: (new Date(this.extensiontimeinput.value)).getTime()
                        }
                        const extresp = await editorquery(req);
                        if (!extresp) { return; }
                        const btn = this.extensionbutton;
                        btn.classList.add('activeextension');
                        btn.title = 'extended till ' +
                            (new Date(req.ts)).toLocaleString() +
                            ' (click to change)';
                        btn.extensiontime = req.ts;

                    }, 'Grant extension', 'confirm', 'granting');
                    addelem('div', theDialog.maindiv, {
                        innerHTML: 'Extend ' + this.myexnum + ' for ' +
                            ((this.myfamily) ? this.myfamily : this.myuserid) +
                            ' until …'
                    });
                    const dtholder = addelem('div', theDialog.maindiv, {
                        classes: ['datetimeinputholder']
                    });
                    theDialog.extensiontimeinput = addelem('input', dtholder, {
                        type: 'datetime-local',
                        value: ((this.extensiontime != -1) ? tsToInp(this.extensiontime) :
                            tsToInp(this.duetime))
                    });
                    theDialog.userid = this.myuserid;
                    theDialog.exnum = this.myexnum;
                    theDialog.extensionbutton = this;
                }
            });
            if (exinfo?.extension) {
                deadlinebtn.classList.add('activeextension');
                deadlinebtn.title = 'extended till ' +
                    (new Date(exinfo.extension)).toLocaleString() +
                    ' (click to change)';
                deadlinebtn.extensiontime = exinfo.extension;
            }
        }
    }
    return true;
}

mainloadfns.exercisesmain = async function() {
    const m = byid('exercisesmain');
    m.innerHTML = '';
    const toparea = addelem('div', m, {
        id: 'exercisestop'
    });
    m.toparea = toparea;
    const indivexarea = addelem('div', m, {
        id: 'individualexercise'
    });
    m.indivexarea = indivexarea;
    m.indivexarea.style.display = 'none';
    const hdr = addelem('h2', toparea, { innerHTML: tr('Exercises') });
    // create the exercise list
    const exlist = addelem('ul', toparea, { classes: ['allexerciselist'] });
    exlist.update = updateExerciseList;
    m.myexlist = exlist;
    // new ex button
    const btndiv = addelem('div', toparea, { classes: ['newexbtndiv'] });
    const newexbtn = addelem('button', btndiv, {
        type: 'button',
        innerHTML: 'add new exercise',
        onclick: function() {
            showdialog(async function() {
                const exdata = theDialog.exinfoform.gatherinfo();
                if (!("problemsets" in exdata.exinfo)) {
                    exdata.exinfo.problemsets = [];
                }
                const req = {
                    query: 'exerciseinfo',
                    exdata: exdata
                }
                const resp = await editorquery(req);
                if (!resp) { return; }
                byid('exercisesmain').myexlist.update();
                //switch to viewing new exercise
                window.location.hash = '#exercise-' + exdata.exnum;
            }, 'Create new exercise', 'create', 'creating');

            theDialog.exinfoform = exinfoform(theDialog.maindiv, 'new', {});
            theDialog.exinfoform.savebutton = theDialog.confirmbutton;
            theDialog.exinfoform.savebutton.disabled = true;
        }
    });
    // update it
    const updateRes = await exlist.update();
    if (!updateRes) { return false; }
    // TODO: add individual exercise area
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
    msgArea.scrollIntoView({ block: 'nearest' });
}

function renumberProblemSets(exhash) {
    const exblock = byid(exhash.substr(1));
    if (!exblock) { return; }
    const pscpsc = exblock.getElementsByClassName("problemsetcreator");
    for (let i=0; i<pscpsc.length; i++) {
        const psc = pscpsc[i];
        if (psc?.pslabel) {
            psc.pslabel.innerHTML = tr('Problem set') + ' ' + (i+1).toString();
        }
        if (psc?.moveAboveBtn) {
            // remove old options
            const optopt = psc.moveAboveBtn.getElementsByTagName("option");
            while (optopt.length > 0) {
                const o = optopt[optopt.length - 1 ];
                o.parentNode.removeChild(o);
            }
            const blankopt = addelem('option', psc.moveAboveBtn, {
                innerHTML: '—',
                value: '--',
                selected: true
            });
            let numdone = 0;
            for (let j = 0; j<pscpsc.length; j++) {
                if (j==i) { continue; }
                if (j==(i+1)) { continue; }
                numdone++;
                const opt = addelem('option', psc.moveAboveBtn, {
                    innerHTML: tr('above set') + ' ' + (j+1).toString(),
                    selected: false,
                    value: j.toString()
                });
            }
            if (i != (pscpsc.length - 1)) {
                numdone++;
                const eopt = addelem('option', psc.moveAboveBtn, {
                    innerHTML: 'to end',
                    selected: false,
                    value: 'end'
                });
            }
            if (numdone > 0) {
                psc.moveAboveBtn.disabled = false;
            } else {
                psc.moveAboveBtn.disabled = true;
            }
        }
    }
}

function showdialog(fn, htext = '', blabel = 'confirm', bwait = 'wait') {
    theDialog.innerHTML = '';
    theDialog.hdr = addelem('div', theDialog, { classes: ['header'] });
    theDialog.maindiv = addelem('div', theDialog);
    theDialog.ftr = addelem('div', theDialog, { classes: ['footer'] });
    theDialog.closebtn = addelem('div', theDialog.hdr, {
        innerHTML: '<span class="material-symbols-outlined">close</span>',
        classes: ['closebutton'],
        title: 'close dialog',
        onclick: function() { theDialog.close(); }
    });
    if (htext != '') {
        theDialog.hdrspan = addelem('span', theDialog.hdr, {
            innerHTML: htext
        });
    }
    theDialog.fn = fn;
    theDialog.cancelbtn = addelem('button', theDialog.ftr, {
        type: 'button',
        innerHTML: 'cancel',
        onclick: function() { theDialog.close(); }
    });
    theDialog.confirmbutton = addelem('button', theDialog.ftr, {
        type: 'button',
        innerHTML: blabel,
        loadtext: bwait,
        origtext: blabel,
        onclick: async function() {
            this.innerHTML = '<span class="material-symbols-outlined ' +
                'spinning">sync</span> ' + this.loadtext + ' …';
            await theDialog.fn();
            this.innerHTML = this.origtext;
            theDialog.close();
        }
    });
    theDialog.showModal();
}

function showexercise(exhash) {
    showmain('#exercisesmain');
    const m = byid('exercisesmain');
    if (!("indivexarea" in m)) {
        setTimeout(
            function() { showexercise(window.location.hash); }, 10
        );
        return;
    }
    m.toparea.style.display = 'none';
    m.indivexarea.style.display = 'block';
    let found = false;
    const dd = m.indivexarea.getElementsByClassName("exerciseblock");
    for (const eb of dd) {
        if (eb.id == exhash.substr(1)) {
            eb.style.display = "block";
            found = true;
        } else {
            eb.style.display = "none";
        }
    }
    if (!found) {
        loadexercise(exhash);
    }
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

function tsToInp(ts) {
    const d = new Date(ts);
    let rv = d.getFullYear().toString();
    let mon = (d.getMonth() + 1);
    let monstr = mon.toString();
    if (mon < 10) { monstr = '0' + monstr; }
    rv += '-' + monstr;
    let dt = d.getDate();
    let dtstr = dt.toString();
    if (dt < 10) { dtstr = '0' + dtstr; }
    rv += '-' + dtstr + 'T';
    let hour = d.getHours();
    let hourstr = hour.toString();
    if (hour < 10) { hourstr = '0' + hourstr; }
    rv += hourstr + ':';
    let min = d.getMinutes();
    let minstr = min.toString();
    if (min < 10) { minstr = '0' + minstr; }
    rv += minstr + ':';
    let sec = d.getSeconds();
    let secstr = sec.toString();
    if (sec < 10) { secstr = '0' + secstr; }
    rv += secstr;
    return rv;
}

// attached to 'ul' as 'this'
async function updateExerciseList() {
    // clear out old items
    const lili = this.getElementsByTagName('li');
    while (lili.length > 0) {
        const li = lili[lili.length - 1];
        li.parentNode.removeChild(li);
    }
    // fetch info
    const resp = await editorquery({ query: 'allexerciseinfo' });
    if (!resp) { return false; }
    // function to add exercises
    this.addExerciseItem = addExerciseItem;
    // sort exercises
    let exnums = Object.keys(resp);
    exnums = exnums.sort(function(a, b) {
        const atext = a.replace(/[^a-z].*/g, '');
        const btext = b.replace(/[^a-z].*/g, '');
        const anum = parseInt(a.replace(/[^0-9]/g, ''));
        const bnum = parseInt(b.replace(/[^0-9]/g, ''));
        const textComp = atext.localeCompare(btext);
        if (textComp != 0) { return textComp; }
        const numComp = anum - bnum;
        if (numComp != 0) { return numComp; }
        return a.localeCompare(b);
    });
    for (const exnum of exnums) {
        this.addExerciseItem(exnum, resp[exnum]);
    }
    return true;
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
window.errormessage = errormessage;

// start stuff

updateTitle();

let starthash = window.location.hash ?? '';
if (starthash == '' &&
    Object.keys(window.loadedContextSettings).length == 0) {
    starthash = '#settingsmain';
}
loadhash(starthash);

export default LPinstr;
