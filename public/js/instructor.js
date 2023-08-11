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
const theDialog = document.getElementsByTagName("dialog")[0];
const mainloadfns = {};

// add exercise to Exercise list, attached to ul element as "this"
function addExerciseItem(exnum, exinfo) {
    const li = addelem('li', this);
    const div = addelem('div', li);
    const exnumdiv = addelem('div', div, {
        classes: ['exnumtitle'],
        innerHTML: '(' + exnum + ')'
    });
}

// get rid of current message near top
function clearmessage() {
    msgArea.style.display = 'none';
    msgArea.classList.remove('info', 'loading', 'warning', 'error');
    msgArea.innerHTML = '';
}

// function for interacting with server; better and more modern
// than current student-server interaction
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

// setting the message area at the top to an error message
function errormessage(msg) {
    makemessage('error', '<span class="material-symbols-outlined">emergency_home</span> <span class="errortitle">' +
        tr('ERROR') + '</span>: ' + tr(msg));
}

// setting the message area at the top to a informational message
function infomessage(msg) {
    makemessage('info', '<span class="material-symbols-outlined">info</span> ' + tr(msg));
}

// load something based on changes in hash
function loadhash(h) {
    if (h == '') {
        h = '#studentsmain';
    }
    if (h.substr(-4) == 'main') {
        showmain(h);
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
        if (ainfo?.roles == "Learner" && binfo?.roles != "Learner") { return -1; }
        if (binfo?.roles == "Learner" && binfo?.roles != "Learner") { return 1; }
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
        nch += '</div><div><strong>(' + userid + ')</strong></div>';
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
    const hdr = addelem('h2', toparea, { innerHTML: tr('Exercises') });
    // create the exercise list
    const exlist = addelem('ul', toparea, { classes: ['allexerciselist'] });
    exlist.update = updateExerciseList;
    // TODO: get rid of thise
    exlist.pre = addelem('pre', toparea);
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
    // TODO: get rid of this
    this.pre.innerHTML = JSON.stringify(resp, null, 4);
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

// start stuff

updateTitle();

let starthash = window.location.hash ?? '';
if (starthash == '' &&
    Object.keys(window.loadedContextSettings).length == 0) {
    starthash = '#settingsmain';
}
loadhash(starthash);

export default LPinstr;

