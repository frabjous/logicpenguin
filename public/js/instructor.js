// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// instructor.js //////////////////////////////////////
// defines the main functions controlling the instructor page          //
/////////////////////////////////////////////////////////////////////////

import LP from '../load.js';
import {htmlEscape, jsonRequest} from './common.js';
import {randomString} from './misc.js';
import tr from './translate.js';
import multieditor from "../multiedit/multieditor.mjs"


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
const lectureComponentTypes = {
  "content": {
    makeEditor: function(elem, restore) {
      let html = restore?.html ?? '';
      let mode = '';
      if (/LOGICPENGUIN-LECTURE-CONTENT-MODE/.test(html)) {
        mode = html.replace(/.*LOGICPENGUIN-LECTURE-CONTENT-MODE\s*([a-z]*)\s*-->.*/,'$1').split('\n')[0].trim();
        html = html.replace(/.*LOGICPENGUIN-LECTURE-CONTENT-MODE\s*([a-z]*)\s*-->/,'').trim();
      }
      if (mode == '') mode = 'wysiwyg';
      let mdcontent = '';
      if (/LOGICPENGUIN-LECTURE-CONTENT-MD/.test(html)) {
        mdcontent = html.replace(/.*LOGICPENGUIN-LECTURE-CONTENT-MD\s*/,'')
          .split('-->')[0].replaceAll('⟨!——','<!--').replaceAll('——⟩','-->').trim();
        html = html.split('-->')?.[1].trim();
      }
      elem.me = multieditor({
        parent: elem,
        mode: mode,
        content: (mode == 'md' && mdcontent != '') ? mdcontent : html
      });
      elem.note = addelem('p', elem, {
        innerHTML: tr('Content placed inside math modes') +
          ' (<span class="material-symbols-outlined">function</span> ' +
          tr('or') +
          ' <span class="material-symbols-outlined">calculate</span>) ' +
          tr('indicated in the WYSIWYG editor in') + ' ' +
          '<span class="math">' + tr('green') + '</span>' + ' ' +
          tr('will be rendered in the lecture notes using the ' +
          'Logic Penguin symbol/math font, without the green background.') + ' ' +
          tr('Content saved when in Markdown mode will be converted to html using pandoc on the server. ' +
          'The in-browser widget uses a much simpler conversion method. ' +
          'If using complex markup in Markdown or HTML source, avoid switching back to ' +
          'WYSIWYG mode, or content could be lost. Use the preview button below instead ' +
          'to see how it will appear.'),
        classes: ['multieditornote']
      });
    },
    getHtml: function(elem) {
      if (!elem?.me?.gatherinfo) return '';
      const meinfo = elem.me.gatherinfo();
      let h = `<!-- LOGICPENGUIN-LECTURE-CONTENT-MODE ${meinfo.mode} -->\n`;
      if (meinfo.mode == 'md' && meinfo.content) {
        h+= `<!-- LOGICPENGUIN-LECTURE-CONTENT-MD\n` +
          meinfo.content.replaceAll('<!--', '⟨!——')
            .replaceAll('-->','——⟩') + '\n-->'
      }
      h += meinfo.html;
      return h;
    }
  },
  "heading": {
    makeEditor: function(elem, restore) {
      let content = '';
      let level = '2';
      if (restore.html) {
        level = restore.html
          .replace(/^<h([0-5])>.*/,'$1') ?? '2';
        content = restore.html
          .split(/^<h[1-5]>/)?.[1]
          .split(/<\/h[1-5]>$/)?.[0] ?? '';
      }
      const levellbl = addelem('label', elem, {
        innerHTML: tr('Heading level')
      });
      elem.levelselect = addelem('select', elem, {
        innerHTML: [1,2,3,4,5].map(
          (n) => (
            `<option value="${n.toString()}">` +
            `Level ${n.toString()}</option>`
          )
        ).join(''),
        value: level
      });
      const contentlbl = addelem('label', elem, {
        innerHTML: tr('Heading content'),
        classes: ['headercontentlabel']
      });
      elem.headercontentinput = addelem('input', elem, {
        type: 'text',
        classes: ['headercontent'],
        value: content
      });
    },
    getHtml: function(elem) {
      const level = elem?.levelselect?.value ?? '2';
      const content = elem?.headercontentinput?.value ?? '';
      return `<h${level}>${content.trim()}</h${level}>`;
    }
  },
  "image": {
    makeEditor: function(elem, restore) {
      const previewdiv = addelem('div', elem, {
        classes: ['previewer']
      });
      const btndiv = addelem('div', elem, {});
      const ulabel = addelem('label', btndiv, {
        innerHTML: 'Choose an image'
      })
      const uload = addelem('input', btndiv, {
        type: 'file',
        myprev: previewdiv,
        accept: '.avif, .gif, .jpg, .jpeg, .png, .svg, .webp',
        onchange: function() {
          const file = this?.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.myprev = this.myprev;
          reader.onload = function() {
            this.myprev.innerHTML = '';
            addelem('img', this.myprev, {
              src: reader.result
            });
          }
        }
      });
      if (restore?.html && restore.html != '') {
        previewdiv.innerHTML = restore.html;
      } else {
        uload.click();
      }
    },
    getHtml: function(elem) {
      const previewer = elem.getElementsByClassName("previewer")?.[0];
      if (!previewer) return '';
      return previewer.innerHTML;
    }
  },
  "sample problems": {
    makeEditor: async function(elem, restore) {
      elem.sc = addelem('div', elem, {});
      elem.sc.makeSampleCreator = makeSampleCreator;
      // TODO:
      elem.sc.makeSampleCreator(false);
      const {probsetinfo, problems, answers} =
        parseSampleProbHtml(restore?.html);
      if (probsetinfo?.problemtype &&
          problems?.length > 0 &&
          answers?.length > 0) {
        if (elem?.sc?.problemtypeinput) {
          let ptype = probsetinfo?.problemtype ?? '—';
          if (ptype.startsWith('derivation')) {
            ptype = 'derivation';
          }
          elem.sc.problemtypeinput.value = ptype;
        }
        if (elem?.sc?.makeProbSetCreator) {
          await elem.sc.makeProbSetCreator(probsetinfo, problems, answers);
        }
      }
    },
    getHtml: function(elem) {
      return elem?.sc?.problemsetcreator?.getHtmlFragment() ?? ''
    }
  }
}

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
  const savablepart = addelem('div', exinfodiv, {
    classes: ['exinfopart']
  });
  const savablelabel = addelem('span', savablepart, {
    innerHTML: '<span class="material-symbols-outlined">save</span>' +
      tr('Savable') + ': '
  });
  const savableinfo = addelem('span', savablepart, {
    innerHTML: ((("savable" in exinfo) && (exinfo.savable))
      ? 'yes' : 'no')
  });

  const servergradedpart = addelem('div', exinfodiv, {
    classes: ['exinfopart']
  });
  const servergradedlabel = addelem('span', servergradedpart, {
    innerHTML: '<span class="material-symbols-outlined">dns</span>' +
      tr('Server graded') + ': '
  });
  const servergradedinfo = addelem('span', servergradedpart, {
    innerHTML: ((("servergraded" in exinfo)
      && (exinfo.servergraded)) ? 'yes' : 'no')
  });
  const probsetpart = addelem('div', exinfodiv, {
    classes: ['exinfopart']
  });
  const numsets = (exinfo?.problemsets?.length ?? 0);
  let pseticon = 'filter_' + numsets.toString();
  if (numsets == 0) { pseticon = 'filter_none'; }
  if (numsets > 9) { pseticon = 'filter_9_plus'; }
  const probsetlabel = addelem('span', probsetpart, {
    innerHTML: '<span class="material-symbols-outlined">' + pseticon +
      '</span>' + ((numsets != 1) ? tr('Problem sets') :
      tr('Problem set')) + ' (' + numsets.toString()  + '): '
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
      tr('LMS LTI Tool Launch URL') + ': <span class="launchlink">' +
      launchlinkurl + '</span> ' + '<span class="material-symbols' +
      '-outlined copylink" title="' + tr('copy url') + '" ' +
      'onclick="navigator.clipboard.writeText(\'' +
      launchlinkurl + '\')">content_copy</span>'
  });
  const bdiv = addelem('div', div, { classes: ['exlistbuttons'] });
  const editbutton = addelem('button', bdiv, {
    type: 'button',
    innerHTML: tr('edit exercise') + ' ' + exnum,
    myexnum: exnum,
    onclick: function() {
      window.location.hash = '#exercise-' + this.myexnum;
    }
  });
  const deletebutton = addelem('div', bdiv, {
    classes: ['deleteexercise'],
    title: tr('delete this exercise'),
    myexnum: exnum,
    innerHTML: '<span class="material-symbols-outlined">' +
      'delete_forever</span>',
    onclick: function() {
      showdialog(async function() {
        const req = {
          query: 'deleteexercise',
          exnum: this.exnum
        }
        const resp = instructorquery(req);
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

function getHtmlFragment() {
  const psc = this;
  let [info, problems, answers] = psc?.gatherInfo();
  if (!info || !problems || !answers) return false;
  if (problems.length != answers.length) return false;
  if (("cheat" in info) && ("options" in info)) {
    info.options.cheat = info.cheat;
  }
  const randId = 'lpembed' + randomString(8);
  let html = '';
  for (let i=0; i<problems.length; i++) {
    html += `<div id="${randId}${i.toString()}"></div>\n`;
  }
  html += `<script type="module">\n`;
  html += `import LP from "${window.location.protocol}//` +
    `${window.location.host}/load.js";\n`;
  for (let i=0; i<problems.length; i++) {
    const problem = problems[i];
    const answer = answers[i];
    const probObj = {
      parentid: randId + i.toString(),
      problemtype: info.problemtype,
      options: info.options,
      problem: problem,
      answer: answer
    }
    html += `LP.embed(${JSON.stringify(probObj,null,2)});\n`;
  }
  html += `</script>`;
  return html;
}

// function for interacting with server; better and more modern
// than current student-server interaction
async function instructorquery(req = {}) {
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
      (resp?.errMsg ?? tr('unknown error')));
    return false;
  }
  return resp;
}

function addLectureComponent(comptype, insafter, restore = {}) {
  const lectblock = this;
  if (!lectureComponentTypes?.[comptype]?.makeEditor) return null;
  const lectcomponent = addelem('div', lectblock.componentarea, {
    classes: [
      'lecturecomponent',
      comptype.replaceAll(' ','')
    ],
    comptype: comptype
  });
  lectcomponent.delBtnDiv = addelem('div', lectcomponent, {
    classes: ['deletelecturecomponent'],
    title: 'delete this component',
    mycomponent: lectcomponent,
    innerHTML: '<span class="material-symbols-outlined">delete_forever</span>',
    onclick: function() {
      const lectcomponent = this.mycomponent;
      if (this?.mycomponent?.dividerbelow) {
        const divider = this.mycomponent.dividerbelow;
        divider.parentNode.removeChild(divider);
      }
      lectcomponent.parentNode.removeChild(lectcomponent);
    }
  });
  lectcomponent.typelabel = addelem('div', lectcomponent, {
    classes: ['lectcomponentlabel'],
    innerHTML: `(${comptype})`
  })
  lectureComponentTypes[comptype].makeEditor(lectcomponent, restore);
  lectcomponent.getHtml = function() {
    const elem = this;
    const comptype = elem.comptype;
    if (!lectureComponentTypes?.[comptype]?.getHtml) return '';
    return lectureComponentTypes[comptype].getHtml(elem);
  }
  lectcomponent.dividerbelow = lectblock.addLectureDivider();
  lectblock.componentarea.insertBefore(lectcomponent.dividerbelow, insafter.nextSibling);
  lectblock.componentarea.insertBefore(lectcomponent, lectcomponent.dividerbelow);
  return lectcomponent;
}

function addLectureDivider() {
  const componentarea = this?.componentarea;
  if (!componentarea) return null;
  const divider = addelem('div', componentarea, {
    classes: ['lecturecomponentdivider'],
    mycomponentarea: componentarea,
    mylectureblock: this
  });
  const dlabel = addelem('label', divider, {
    innerHTML: tr('Insert component here')
  });
  const dsel = addelem('select', divider, {
    mydivider: divider,
    onchange: function() {
      const v = this.value;
      if (!v || v == '—') return;
      this?.mydivider?.mylectureblock?.addComponent(v, this.mydivider);
      this.value = '—';
    }
  });
  const blankop = addelem('option', dsel, {
    selected: true,
    disabled: true,
    value: '—',
    innerHTML: '—'
  });
  for (const comptype in lectureComponentTypes) {
    const thisop = addelem('option', dsel, {
      value: comptype,
      innerHTML: comptype
    });
  }
  return divider;
}

// setting the message area at the top to an error message
function errormessage(msg) {
  makemessage('error', '<span class="material-symbols-outlined">' +
    'emergency_home</span> <span class="errortitle">' +
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
    innerHTML: tr('Short name'),
    title: tr('The short name occurs as part of the URL and ' +
      'should only consist of letters and digits.'),
    htmlFor: idbase + '-exinfoform-shortname'
  });
  const sncell = addelem('td', snrow);
  div.origexnum = ((exnum == 'new') ? false : exnum);
  div.sninput = addelem('input', sncell, {
    id: idbase + '-exinfoform-shortname',
    name: idbase + '-exinfoform-shortname',
    type: 'text',
    placeholder: tr('short name for url'),
    value: ((exnum == 'new') ? '' : exnum),
    mydiv: div
  });
  // long name row
  const ltlabeld = addelem('td', ltrow);
  const ltlabel = addelem('label', ltlabeld, {
    innerHTML: tr('Full title'),
    title: tr('The full title appears at the top of the exercise page'),
    htmlFor: idbase + '-exinfoform-fulltitle'
  });
  const ltcell = addelem('td', ltrow);
  div.ltinput = addelem('input', ltcell, {
    id: idbase + '-exinfoform-fulltitle',
    name: idbase + '-exinfoform-fulltitle',
    type: 'text',
    placeholder: tr('full exercise title'),
    value: (exinfo?.longtitle ?? ''),
    mydiv: div
  });
  // due time row
  const duelabeld = addelem('td', duerow);
  const duelabel = addelem('label', duelabeld, {
    innerHTML: tr('When due'),
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
    innerHTML: tr('Start #'),
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
    innerHTML: tr('Savable'),
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
    innerHTML: tr('Graded on server'),
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
  makemessage('info', '<span class="material-symbols-outlined">' +
    'info</span> ' + tr(msg));
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
      tr('Return to exercises list') + '</a>',
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
    'spinning">sync</span> ' + tr('loading') + ' …';
  const resp = await instructorquery(req);
  exdiv.innerHTML = '';
  if (!resp) { return; }
  if (!("exinfo" in resp) || !("answers" in resp) ||
      !("problems" in resp)) {
    errormessage('Invalid response from server when ' +
      'requesting information about exercise.');
    return;
  }
  const exinfoholder = addelem('div', exdiv, {
    classes: ['exinfoholder']
  });
  exblock.exinfoform = exinfoform(exinfoholder, exnum, resp.exinfo);
  const pshdr = addelem('h2', exdiv, { innerHTML: tr('Problem sets') });
  exblock.psetdiv = addelem('div', exdiv);
  // TODO: more here
  exblock.addProbSetCreator = async function
    (probsetinfo, problems, answers, putbefore = false) {
      const problemtype = probsetinfo.problemtype;
      let shproblemtype = problemtype;
      if (shproblemtype.substr(0,11) == 'derivation-') {
        shproblemtype = 'derivation';
      }
      if (!(shproblemtype in problemSetCreators)) {
        try {
          LP.loadCSS(problemtype);
          const imported = await import('/js/creators/'
            + shproblemtype + '.js');
          problemSetCreators[shproblemtype] = imported.default;
        } catch(err) {
          errormessage('ERROR loading script for creating ' +
            'problem type ' + shproblemtype + ': ' +
            err.toString());
          return;
        }
      }
      const problemsetcreator =
        addelem(shproblemtype + '-creator', this.psetdiv);
      problemsetcreator.makeProblemSetCreator(
        probsetinfo, problems, answers);
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
    await exblock.addProbSetCreator(probsetinfo,
      setproblems, setanswers, false);
  }
  exblock.addPSCDialog = function(putbefore) {
    showdialog(async function() {
      let probtype = this.problemtypeinput.value;
      if (probtype == 'derivation') {
        if (!window?.contextSettings?.system) {
          errormessage('Cannot create derivation exercise ' +
            'if no deductive system set in settings.');
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
    theDialog.maindiv.innerHTML = tr('Do you really wish to remove ' +
      'this problem set? This cannot be undone.');
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
      const pscpsc =
        exblock.getElementsByClassName("problemsetcreator");
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
      const resp = await instructorquery(req);
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
async function loadhash(h) {
  if (h == '') {
    h = '#studentsmain';
  }
  if (h.substr(-4) == 'main') {
    await showmain(h);
    if (h == '#exercisesmain') {
      const m = byid('exercisesmain');
      if ("toparea" in m) {
        m.toparea.style.display = 'block';
        m.indivexarea.style.display = 'none';
      }
    }
    if (h == '#lecturesmain') {
      const m = byid('lecturesmain');
      if (m?.embedArea) {
        m.embedArea.style.display = 'block';
      }
      if (m?.serverLNArea) {
        m.serverLNArea.style.display = 'block';
      }
      if (m?.indivlectsarea) {
        m.indivlectsarea.style.display = 'none';
      }
    }
    return;
  }
  if (h.substr(0,10) == '#lectures-') {
    showlecture(h);
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

async function loadlecture(lecthash) {
  const pagename = lecthash.substr(10);
  const pagetitle = window?.lectinfo?.[pagename] ?? '';
  const lectarea = byid("lecturesmain")?.indivlectsarea;
  if (!lectarea) return;
  const lectblock = addelem('div', lectarea, {
    id: lecthash.substr(1),
    classes: ["lectureblock"],
    startName: pagename
  });
  const breadcrumb = addelem('div', lectblock, {
    innerHTML: '<a href="#lecturesmain"><span class="' +
      'material-symbols-outlined">arrow_back_ios</span>' +
      tr('Return to lectures list') + '</a>',
    classes: ['breadcrumb']
  });
  const hdr = addelem('h2', lectblock, {
    innerHTML: tr('Edit lecture notes page')
  });
  lectblock.metaart = addelem('article', lectblock, {
    classes: ['metadata']
  });
  lectblock.pagetitlelabel = addelem('label', lectblock.metaart, {
    innerHTML: tr('Page title'),
    htmlFor: lecthash.substr(1) + '-pagetitle',
    classes: ['pagetitlelabel']
  });
  lectblock.pagetitleinput = addelem('input', lectblock.metaart, {
    id: lecthash.substr(1) + '-pagetitle',
    value: pagetitle,
    type: 'text',
    classes: ['pagetitleinput'],
    oninput: function() {
      this.classList.remove('invalid');
    }
  });
  lectblock.pagenamelabel = addelem('label', lectblock.metaart, {
    htmlFor: lecthash.substr(1) + '-pagename',
    classes: ['pagenamelabel'],
    innerHTML: tr('Filename')
  });
  lectblock.pagenameinput = addelem('input', lectblock.metaart, {
    classes: ['pagenameinput'],
    id: lecthash.substr(1) + '-pagename',
    type: 'text',
    value: pagename,
    oninput: function() {
      this.classList.remove('invalid');
      this.value = this.value.replaceAll(/[^0-9a-z]/gi,'');
    },
    onedit: function() {
      this.classList.remove('invalid');
      this.value = this.value.replaceAll(/[^0-9a-z]/gi,'');
    },
    onchange: function() {
      this.classList.remove('invalid');
      this.value = this.value.replaceAll(/[^0-9a-z]/gi,'');
    }
  });
  lectblock.pagenamenote = addelem('span', lectblock.metaart, {
    innerHTML: tr('(included at end of url)')
  });
  lectblock.componentarea = addelem('div', lectblock, {});
  lectblock.addLectureDivider = addLectureDivider;
  lectblock.addComponent = addLectureComponent;
  lectblock.topdivider = lectblock.addLectureDivider(true);
  // restore previous
  if (pagename in window.lectinfo) {
    const lectcomponentinfo = await instructorquery({
      query: 'lectcomponentinfo',
      pagename: pagename
    });
    if (!lectcomponentinfo?.success) {
      window.location.hash = '#lecturesmain';
      await loadhash(window.location.hash);
      return null;
    }
    for (const piece of lectcomponentinfo.htmlPieces.reverse()) {
      lectblock.addComponent(
        piece.comptype,
        lectblock.topdivider,
        piece
      );
    }
  }
  lectblock.saveme = saveLecturePage;
  lectblock.saveBtnDiv = addelem('div', lectblock, {});
  lectblock.saveBtn = addelem('button', lectblock, {
    innerHTML: 'save changes',
    myblock: lectblock,
    onclick: async function() {
      clearmessage();
      await this.myblock.saveme(false);
    }
  });
  lectblock.pagePrevBtn = addelem('button', lectblock, {
    innerHTML: 'preview changes',
    myblock: lectblock,
    onclick: async function() {
      clearmessage();
      await this.myblock.saveme(true);
    }
  });
  return lectblock;
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

// below are several functions used by loadmain to load each
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
  let systemsresponse = await instructorquery({ query: 'getsystemnames' });
  if (!systemsresponse) { return false; }
  const systems = systemsresponse?.systems ?? [];
  // section header
  const hdr = addelem('h2', m, {
    innerHTML: tr('Course settings')
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
        ' ' + notation.quantifierForm.replace(/Q\?/g,
        notation?.EXISTS ?? '');
    } else {
      notationdisplay += notation.quantifierForm.replace(/Q/g,
        notation.FORALL) + ' ' + notation.quantifierForm
        .replace(/Q/g, notation.EXISTS);
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
    innerHTML: tr('Deductive system')
  });
  const syscell = addelem('td', sysrow);
  const sysinput = addelem('select', syscell, {
    myninput: notinput,
    mybtn: btn,
    onchange: function() {
      this.mybtn.disabled = false;
      clearmessage();
      if ((this.value != '') && (this.myninput.value == '' ||
        this.myninput.value == 'none')) {
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
    if ((contextSettings.system != 'none' &&
         contextSettings.system != '') &&
        (contextSettings.notation == 'none' ||
         contextSettings.notation == '')) {
      this.notinput.classList.add('invalid');
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined ' +
      'spinning">sync</span> saving …';
    const resp = instructorquery({
      query: 'savecontextsettings',
      contextSettings
    });
    btn.innerHTML = tr('save');
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
  const resp = await instructorquery({ query: 'allstudentinfo' });
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
    nch += '</div><div><strong title="' + userid + '">(' +
      shortuserid + ')</strong></div>';
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
            const newscore = (parseFloat(
              this.overridescoreinput.value) / 100
            );
            const req = {
              query: 'overridescore',
              scoreuserid: this.userid,
              scoreexnum: this.exnum,
              newscore: newscore
            }
            const orresp = await instructorquery(req);
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
              scorediv.title = '(overridden) '
                + scorediv.title;
            }

          }, 'Override score', 'override', 'overriding');
          addelem('div', theDialog.maindiv, {
            innerHTML: 'Override ' + this.myexnum + ' for ' +
              ((this.myfamily) ?
               this.myfamily : this.myuserid)
          });
          const scoreholder = addelem('div', theDialog.maindiv, {
            classes: ['overridescoreholder']
          });
          theDialog.overridescoreinput =
            addelem('input', scoreholder, {
              type: 'number',
              step: '0.1',
              value: (((this?.myscore * 100)
                .toFixed(1).toString()) ?? '0')
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
      /* OLD: save icon if info saved
            if (exinfo?.saved) {
                llh += '<span class="material-symbols-outlined">save</span>'
            }
            */
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
      const resetbtn = addelem('span', btndiv, {
        innerHTML: '<span class="material-symbols-outlined">' +
          'restart_alt</span>',
        classes: ['resetbutton'],
        title: tr('click to reset exercise'),
        myexnum: exnum,
        myuserid: userid,
        myfamily: userinfo?.family ?? false,
        disableme: function() {
          this.classList.add('disabled');
          this.title = tr('nothing to reset')
        },
        onclick: function() {
          if (this.classList.contains('disabled')) { return; }
          showdialog(async function() {
            const req = {
              query: 'resetexercise',
              resetuserid: this.userid,
              resetexnum: this.exnum
            }
            const resetresp = await instructorquery(req);
            if (!resetresp) { return; }
            const btn = this.resetbtn;
            if (btn?.disableme) { btn.disableme(); }
            btn.title = tr('already reset');
          }, 'Reset exercise', 'reset', 'resetting');
          addelem('div', theDialog.maindiv, {
            innerHTML: tr('Reset') + ' ' + this.myexnum +
              ' ' + tr('for') + ' ' + ((this.myfamily) ?
              this.myfamily : this.myuserid) + '? (' +
              tr('Warning: this will eliminate all ' +
                 'progress made.') + ')',

          });
          theDialog.userid = this.myuserid;
          theDialog.exnum = this.myexnum;
          theDialog.resetbtn = this;
        }
      });

      if (!("launch" in exinfo) || (!exinfo.launch)) {
        resetbtn.disableme();
      }
      const deadlinebtn = addelem('span', btndiv, {
        innerHTML: '<span class="material-symbols-outlined">' +
          'timer</span>',
        classes: ['extensionbutton'],
        title: tr('due') + ' ' + (new Date(resp.exercises[exnum]))
          .toLocaleString() + '; ' +
          tr('click to grant extension'),
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
              ts: (new Date(this.extensiontimeinput.value))
                .getTime()
            }
            const extresp = await instructorquery(req);
            if (!extresp) { return; }
            const btn = this.extensionbutton;
            btn.classList.add('activeextension');
            btn.title = tr('extended till') + ' ' +
              (new Date(req.ts)).toLocaleString() +
              ' (' + tr('click to change') + ')';
            btn.extensiontime = req.ts;

          }, 'Grant extension', 'confirm', 'granting');
          addelem('div', theDialog.maindiv, {
            innerHTML: tr('Extend') + ' ' + this.myexnum +
              ' ' + tr('for') + ' ' +
              ((this.myfamily) ? this.myfamily :
               this.myuserid) + ' ' + tr('until') + '…'
          });
          const dtholder = addelem('div', theDialog.maindiv, {
            classes: ['datetimeinputholder']
          });
          theDialog.extensiontimeinput =
            addelem('input', dtholder, {
              type: 'datetime-local',
              value: ((this.extensiontime != -1) ?
                tsToInp(this.extensiontime) :
                tsToInp(this.duetime))
            });
          theDialog.userid = this.myuserid;
          theDialog.exnum = this.myexnum;
          theDialog.extensionbutton = this;
        }
      });
      if (exinfo?.extension) {
        deadlinebtn.classList.add('activeextension');
        deadlinebtn.title = tr('extended till') + ' ' +
          (new Date(exinfo.extension)).toLocaleString() +
          ' (' + tr('click to change') + ')';
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
        const resp = await instructorquery(req);
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
  m.embedArea = addelem('div', m, {
    id: 'lecturesembedarea'
  });
  m.embedHdr = addelem('h2', m.embedArea, {
    innerHTML: tr('Embed problems into another site')
  });
  m.explainPar = addelem('p', m.embedArea, {
    innerHTML: tr(`Use the widget below to create sample problems (not for credit), and generate a fragment of HTML that can be used to embed the problems into any webpage).`)
  });
  m.embedSampleCreator = addelem('div', m.embedArea, {});
  m.embedSampleCreator.makeSampleCreator = makeSampleCreator;
  m.embedSampleCreator.makeSampleCreator(true);
  // TODO
  m.serverLNArea = addelem('div', m, {
    id: 'lectureslistarea'
  });
  m.serverLNHdr = addelem('h2', m.serverLNArea, {
    innerHTML: tr(`Lecture notes pages`)
  });
  window.lectinfo = await instructorquery({
    query: 'lectureinfo'
  });
  window.lectlist = addelem('ol', m.serverLNArea, {
    classes: ['editlecturelist']
  });
  window.lectlist.fillme = function() {
    const lectlist = this;
    lectlist.innerHTML = '';
    if (!window?.lectinfo) return;
    const sorted = Object.keys(window.lectinfo)
      .filter((a)=>(!a.startsWith('tmp-preview')))
      .sort((a,b) => {
      const inta = parseInt(a);
      const intb = parseInt(b);
      if (!isNaN(inta) && !isNaN(intb)) {
        return inta - intb;
      }
      if (isNaN(inta) && !isNaN(intb)) {
        return 1;
      }
      if (isNaN(intb) && !isNaN(inta)) {
        return -1;
      }
      return a.localeCompare(b);
    });
    for (const pagename of sorted) {
      if (pagename == 'contextdescription') continue;
      const pagetitle = window.lectinfo[pagename];
      const li = addelem('li', lectlist, {});
      const str = addelem('strong', li, {
        innerHTML: pagetitle
      });
      const br = addelem('br', li, {});
      const url = window.location.protocol + `//` +
        window.location.host + '/lectures/' +
        window.consumerkey + '/' +
        window.contextid + '/' + pagename;
      const link = addelem('a', li, {
        href: url,
        innerHTML: htmlEscape(url),
        target: '_blank'
      });
      const copier = addelem('span', li, {
        myurl: url,
        onclick: function() {
          navigator.clipboard.writeText(this.myurl);
        },
        title: 'copy url',
        classes: ['material-symbols-outlined','copylink'],
        innerHTML: 'content_copy'
      });
      const abr = addelem('br', li, {});
      const fakebutton = addelem('a', li, {
        classes: ['fakebutton'],
        href: `#lectures-${pagename}`,
        innerHTML: 'edit'
      });
    }
  }
  window.lectlist.fillme();
  m.newlectureButtonDiv = addelem('div', m.serverLNArea, {});
  m.newlectureButton = addelem('button', m.newlectureButtonDiv, {
    innerHTML: '<span class="material-symbols-outlined">add</span> add lecture notes page',
    onclick: async function() {
      let max = 0;
      for (const pagename in window.lectinfo) {
        const int = parseInt(pagename);
        if (isNaN(int)) continue;
        if (int > max) max = int;
      }
      const newpagename = (max+1).toString();
      const hash = '#lectures-' + newpagename;
      window.location.hash = hash;
      await loadhash(hash);
    }
  })
  m.indivlectsarea = addelem('div', m, {});
  m.indivlectsarea.style.display = 'none';
  return true;
}

function makemessage(msgtype, msg) {
  msgArea.style.display = 'block';
  msgArea.classList.remove('info','loading','warning','error');
  msgArea.classList.add(msgtype);
  msgArea.innerHTML = msg;
  msgArea.scrollIntoView({ block: 'nearest' });
}

function makeSampleCreator(isembed = false) {
  const sc = this;
  sc.classList.add('samplecreator');
  sc.isembed = isembed;
  // blank out first
  sc.innerHTML = '';
  sc.widgdiv = addelem('div', sc, {
    classes: ['samplecreatorptchooser']
  });
  sc.ptypelabel = addelem('div', sc.widgdiv, {
    innerHTML: tr('Choose problem type:')
  });
  sc.problemtypeinput = addelem('select', sc.widgdiv, {
    classes: ['problemtypeselect']
  });
  const blankopt = addelem(
    'option',
    sc.problemtypeinput, {
      selected: true,
      innerHTML: '—',
      value: '—',
      disabled: true
    }
  );
  for (const ptype of window.problemtypes) {
    const opt = addelem('option', sc.problemtypeinput, {
      innerHTML: ptype,
      value: ptype
    });
  }
  sc.psetCreatorDivPar = addelem('div', sc);
  sc.psetdiv = addelem('div', sc.psetCreatorDivPar);
  sc.makeProbSetCreator = async function
    (probsetinfo, problems, answers) {
    const sc = this;
    const problemtype = probsetinfo.problemtype;
    let shproblemtype = problemtype;
    if (shproblemtype.startsWith('derivation-')) {
      shproblemtype = 'derivation';
    }
    if (!(shproblemtype in problemSetCreators)) {
      try {
        LP.loadCSS(problemtype);
        const imported = await import('/js/creators/'
          + shproblemtype + '.js');
        problemSetCreators[shproblemtype] = imported.default;
      } catch(err) {
        errormessage('ERROR loading script for creating ' +
          'problem type ' + problemtype + ': ' +
          err.toString());
        return;
      }
    }
    sc.problemsetcreator =
      addelem(shproblemtype + '-creator', sc.psetdiv);
    sc.problemsetcreator.makeProblemSetCreator(
      probsetinfo, problems, answers);
    sc.problemsetcreator.myexblock = sc;
    sc.problemsetcreator.getHtmlFragment = getHtmlFragment;
    if (isembed) {
      sc.problemsetcreator.showHtmlFragment = showHtmlFragment;
      const btns = sc.getElementsByClassName('problemsetcreatorbuttondiv')?.[0];
      if (!btns) return;
      sc.fragbutton = addelem('button', btns, {
        innerHTML: tr('get embed HTML'),
        title: tr('export to HTML fragment'),
        mypsc: sc.problemsetcreator,
        onclick: function() {
          if (!this?.mypsc) return;
          this.mypsc.showHtmlFragment()
        }
      });
    }
    return sc.problemsetcreator;
  }
  sc.problemtypeinput.mysc = sc;
  sc.problemtypeinput.onchange = async function() {
    const val = this.value;
    const sc = this?.mysc;
    if (!sc) return;
    sc.psetdiv.innerHTML = '';
    let ptype = val;
    if (ptype == 'derivation') {
      if (!window?.contextSettings?.system) {
        errormessage('Cannot create derivation problems ' +
          'until deductive system chosen in settings.');
        return;
      }
      ptype = 'derivation-' + window.contextSettings.system;
    }
    await sc.makeProbSetCreator({
      problemtype: ptype,
      options: {
        question: true,
        hints: true,
        checklines: true
      }
    },[],[]);
    if (sc?.problemsetcreator?.cheatcb) {
      sc.problemsetcreator.cheatcb.checked = true;
      sc.problemsetcreator.immediatecb.checked = true;
    }
  }
  return sc;
}

function parseSampleProbHtml(html) {
  if (!html) return {};
  const probs = html.split('LP.embed(')
    .slice(1).map((h)=>(h.split(');')?.[0]))
    .map((j) => {
      let o;
      try {
        o = JSON.parse(j);
      } catch (err) {
        return null;
      }
      return o;
    }).filter((x)=>(x));
  if (probs.length == 0) return {};
  const probsetinfo = {};
  if (probs[0]?.problemtype) {
    probsetinfo.problemtype = probs[0].problemtype;
  } else {
    return {};
  }
  probsetinfo.options = probs[0]?.options ?? {};
  if (probs[0]?.cheat || probs[0]?.options?.cheat) {
    probsetinfo.cheat = true;
  }
  const problems = [];
  const answers = [];
  for (const pr of probs) {
    problems.push(pr?.problem ?? {});
    answers.push(pr?.answer ?? {});
  }
  return {probsetinfo, problems, answers};
}

function renumberProblemSets(exhash) {
  const exblock = byid(exhash.substr(1));
  if (!exblock) { return; }
  const pscpsc = exblock.getElementsByClassName("problemsetcreator");
  for (let i=0; i<pscpsc.length; i++) {
    const psc = pscpsc[i];
    if (psc?.pslabel) {
      psc.pslabel.innerHTML = tr('Problem set') + ' ' +
        (i+1).toString();
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

async function saveLecturePage(ispreview) {
  const lectblock = this;
  const pagetitle = lectblock.pagetitleinput.value;
  const pagename = lectblock.pagenameinput.value;
  const startName = lectblock.startName;
  if (pagename == '') {
    errormessage('Filename cannot be blank.');
    lectblock.pagenameinput.classList.add('invalid');
    return false;
  }
  if (pagetitle == '') {
    errormessage('Page title cannot be blank.');
    lectblock.pagetitleinput.classList.add('invalid');
    return false;
  }
  if (pagename != startName && (pagename in window.lectinfo)) {
    errormessage('Filename already in use. Choose another.');
    lectblock.pagenameinput.classList.add('invalid');
    return false;
  }
  const components = lectblock.getElementsByClassName("lecturecomponent");
  let htmlPieces = [];
  for (const lectcomponent of components) {
    if (lectcomponent?.getHtml) {
      htmlPieces.push({
        comptype: lectcomponent.comptype,
        html: lectcomponent.getHtml()
      });
    }
  }
  if (htmlPieces.length == 0) {
    errormessage('Lecture notes page must contain at least one component.');
    return false;
  }
  const resp = await instructorquery({
    query: 'savelecturepage',
    htmlPieces,
    pagetitle,
    pagename,
    startName,
    ispreview
  });
  if (!resp?.success) return false;
  if (ispreview && resp?.savedpagename) {
    window.open(`/lectures/` +
      `${window.consumerkey}/${window.contextid}/` +
      `${resp.savedpagename}`, "_blank");
    return true;
  }
  if (!window?.lectinfo) window.lectinfo = {};
  window.lectinfo[resp.savedpagename] = resp.savedpagetitle;
  if (startName != pagename) {
    delete(window.lectinfo[startName]);
    lectblock.id = 'lectures-' + resp?.savedpagename;
  }
  window.lectlist.fillme();
  window.location.hash='#lecturesmain';
  loadhash(window.location.hash);
  setTimeout(
    ()  =>
      (infomessage(`Lecture notes page (${resp.savedpagename}) saved.`)),
    50
  )
  return true;
}

function showdialog(fn, htext = '', blabel = 'confirm', bwait = 'wait') {
  theDialog.innerHTML = '';
  theDialog.hdr = addelem('div', theDialog, { classes: ['header'] });
  theDialog.maindiv = addelem('div', theDialog);
  theDialog.ftr = addelem('div', theDialog, { classes: ['footer'] });
  theDialog.closebtn = addelem('div', theDialog.hdr, {
    innerHTML: '<span class="material-symbols-outlined">close</span>',
    classes: ['closebutton'],
    title: tr('close dialog'),
    onclick: function() { theDialog.close(); }
  });
  if (htext != '') {
    theDialog.hdrspan = addelem('span', theDialog.hdr, {
      innerHTML: tr(htext)
    });
  }
  theDialog.fn = fn;
  theDialog.cancelbtn = addelem('button', theDialog.ftr, {
    type: 'button',
    innerHTML: tr('cancel'),
    onclick: function() { theDialog.close(); }
  });
  theDialog.confirmbutton = addelem('button', theDialog.ftr, {
    type: 'button',
    innerHTML: tr(blabel),
    loadtext: bwait,
    origtext: blabel,
    onclick: async function() {
      this.innerHTML = '<span class="material-symbols-outlined ' +
        'spinning">sync</span> ' + tr(this.loadtext) + ' …';
      await theDialog.fn();
      this.innerHTML = tr(this.origtext);
      theDialog.close();
    }
  });
  theDialog.showModal();
}

async function showexercise(exhash) {
  await showmain('#exercisesmain');
  const m = byid('exercisesmain');
  /*
  if (!("indivexarea" in m)) {
    setTimeout(
      function() { showexercise(window.location.hash, false); }, 10
    );
    return;
  }*/
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
    await loadexercise(exhash);
  }
}

async function showlecture(lecthash) {
  await showmain('#lecturesmain');
  const m = byid('lecturesmain');
  m.embedArea.style.display = 'none';
  m.serverLNArea.style.display = 'none';
  m.indivlectsarea.style.display = 'block';
  const dd = m.indivlectsarea.getElementsByClassName("lectureblock");
  let found = false;
  for (const lb of dd) {
    if (lb.id == lecthash.substr(1)) {
      lb.style.display = "block";
      found = true;
    } else {
      lb.style.display = "none";
    }
  }
  if (!found) {
    await loadlecture(lecthash);
  }
}

function showHtmlFragment() {
  const psc = this;
  const html = psc.getHtmlFragment();
  showdialog(
    async function() {
      if (!theDialog?.codeTA) return;
      navigator.clipboard.writeText(
        theDialog.codeTA.value
      )
    },
    'HTML to embed',
    '<span class="material-symbols-outlined">content_copy</span> copy to clipboard',
    'wait'
  );
  theDialog.cancelbtn.parentNode.removeChild(theDialog.cancelbtn);
  theDialog.ftr.classList.add('centerbutton');
  theDialog.codeTA = addelem('textarea', theDialog.maindiv, {
    readOnly: true,
    value: html,
    classes: ['htmlfrag']
  });
}

async function showmain(area) {
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
    await loadmain(area.substr(1));
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
  const resp = await instructorquery({ query: 'allexerciseinfo' });
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

window.onhashchange = async function() {
  const h = window.location.hash;
  await loadhash(h);
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
