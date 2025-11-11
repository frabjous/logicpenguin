// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// create-class.js /////////////////////////////
// base class for creating problems of a certain problem-type //
////////////////////////////////////////////////////////////////

import { addelem } from './common.js';
import tr from './translate.js';

export default class LogicPenguinProblemSetCreator extends HTMLElement {

  constructor() {
    super();
  }

  gatherInfo() {
    const info = {};
    const problems = [];
    const answers = [];
    const description = this?.descinput?.value.trim();
    info.problemtype = this.problemtype;
    if (description && description != '') {
      info.description = description;
    }
    const instructions = this?.instructionsinput?.value.trim();
    if (instructions && instructions != '') {
      info.instructions = instructions;
    }
    const number = this?.numberinput?.value;
    if (number && parseInt(number)) {
      info.number = parseInt(number);
    }
    const points = this?.pointsinput?.value;
    if (points && parseInt(points)) {
      info.points = parseInt(points);
    }
    info.partialcredit = this?.partialcreditcb?.checked ?? true;
    info.immediateresult = this?.immediatecb?.checked ?? false;
    info.cheat = this?.cheatcb?.checked ?? false;
    info.manuallygraded = this?.manualcb?.checked ?? false;
    if (this.gatherOptions) {
      info.options = this.gatherOptions();
    } else {
      info.options = {};
    }
    const pcpc = this.getElementsByClassName("problemcreator");
    for (const pc of pcpc) {
      problems.push(pc.getProblem());
      answers.push(pc.getAnswer());
    }
    return [info, problems, answers];
  }

  makeChanged() {
    let checknode = this;
    while ((checknode.tagName != 'body') && (checknode?.classList)
      && !(checknode.classList.contains('exerciseblock'))) {
      checknode = checknode.parentNode;
    }
    if (checknode?.classList?.contains('exerciseblock')) {
      if (checknode?.exinfoform?.savebutton) {
        checknode.exinfoform.savebutton.disabled = false;
      }
    }
    if (window.clearmessage) { window.clearmessage(); }
  }

  // specific problem types should do things with pc.probinfoarea
  // and pc.ansinfoarea and add pc.getProblem and pc.getAnswer functions
  makeProblemCreator(problem, answer, isnew) {
    const pc = addelem('div', this.problemCreatorArea, {
      classes: ['problemcreator'],
      mypsc: this
    });
    const strip = addelem('div', pc, {
      classes: ['problemcreatortopstrip']
    });
    const deletefloat = addelem('div', strip, {
      classes: ['problemcreatordeletefloat']
    });
    pc.deletebtn = addelem('span', deletefloat, {
      classes: ['problemcreatordeletebtn'],
      mypc: pc,
      mypsc: this,
      title: 'delete this problem',
      innerHTML: '<span class="material-symbols-outlined">' +
        'delete_forever</span>',
      onclick: function() {
        const pc = this.mypc;
        pc.parentNode.removeChild(pc);
        this.mypsc.renumberProblems();
        this.mypsc.makeChanged();
      }
    });
    pc.numfield = addelem('span', strip);
    const slashspan = addelem('span', strip, { innerHTML: '/' });
    pc.numoffield = addelem('span', strip);
    pc.probinfoarea = addelem('div', pc);
    pc.ansbelowlabel = addelem('div', pc, {
      innerHTML: tr('Provide answer below'),
      classes: ['provideanswerbelow']
    });
    if (isnew) { pc.ansbelowlabel.style.display = 'none'; }
    pc.ansinfoarea = addelem('div', pc);
    return pc;
  }

  makeProblemSetCreator(probsetinfo, problems, answers) {
    this.classList.add('problemsetcreator');
    this.insAboveBtn = addelem('button', this, {
      type: 'button',
      innerHTML: tr('insert new problem set here'),
      mypsc: this,
      onclick: function() {
        if (!this.mypsc.myexblock) {
          return;
        }
        this.mypsc.myexblock.addPSCDialog(this.mypsc);
      }
    });
    const article = addelem('article', this);
    const header = addelem('header', article);
    this.divider = addelem('div', header, {
      classes: ['problemsetdivider']
    });
    const topbuttons = addelem('div',  this.divider, {
      classes: ['problemsetdividerbuttons']
    });
    const moveAboveLabel = addelem('span', topbuttons, {
      innerHTML: 'move '
    });
    this.moveAboveBtn = addelem('select', topbuttons, {
      classes: ['problemsetmoveselect'],
      mypsc: this,
      onchange: function() {
        const psc = this.mypsc;
        if (!psc?.myexblock) { return; }
        if (this.value == '--') { return; }
        if (this.value == 'end') {
          psc.parentNode.appendChild(psc);
          if (psc?.myexblock) {
            if (psc.myexblock.renumberProblemSets) {
              psc.myexblock.renumberProblemSets();
            }
          }
          this.scrollIntoView({block: 'nearest'});
          return;
        }
        const numAbove = parseInt(this.value);
        if (numAbove !== 0 && !numAbove) { return; }
        const allpscs = psc.parentNode
          .getElementsByClassName("problemsetcreator");
        psc.parentNode.insertBefore(psc, allpscs[numAbove]);
        if (psc?.myexblock) {
          if (psc.myexblock.renumberProblemSets) {
            psc.myexblock.renumberProblemSets();
          }
        }
        this.scrollIntoView({block: 'nearest'});
      }
    });
    this.deleteButton = addelem('span', topbuttons, {
      classes: ['material-symbols-outlined',  'problemsetdeletebtn'],
      title: 'delete this problem set',
      innerHTML: 'delete_forever',
      mypsc: this,
      onclick: function() {
        if (!this?.mypsc?.myexblock) { return; }
        this.mypsc.myexblock.dialogToRemove(this.mypsc);
      }
    });
    this.pslabel = addelem('h3', this.divider);
    const settingsform = addelem('div', header, {
      classes: ['problemsetsettings']
    });
    this.settingsform = settingsform;
    const problemtypediv = addelem('div', settingsform);
    const problemtypelabel = addelem('span', problemtypediv, {
      innerHTML: tr('Problem type: '),
      classes: ['problemsetproblemtypelabel']
    });
    const problemtypeindicator = addelem('span', problemtypediv, {
      innerHTML: probsetinfo.problemtype,
      classes: ['problemsetproblemtype']
    });
    this.problemtype = probsetinfo.problemtype;
    const descdiv = addelem('div', settingsform, {
      classes: ['pscdescription']
    });
    const desclabel = addelem('div', descdiv, {
      innerHTML: tr('Heading (may be left blank to blend with set above)')
    });
    this.descinput = addelem('input', descdiv, {
      type: 'text'
    });
    if (probsetinfo?.description) {
      this.descinput.value = probsetinfo.description;
    }
    const instructionsdiv = addelem('div', settingsform, {
      classes: ['pscinstructions']
    });
    const instructionslabel = addelem('div', instructionsdiv, {
      innerHTML: tr('Instructions (may be left blank to blend with set above)')
    });
    this.instructionsinput = addelem('textarea', instructionsdiv);
    if (probsetinfo?.instructions) {
      this.instructionsinput.value = probsetinfo.instructions;
    }
    const numberdiv = addelem('div', settingsform, {
      classes: ['pscnumber']
    });
    const numberlabel = addelem('span', numberdiv, {
      innerHTML: tr('Number of problems') + ': '
    });
    this.numberinput = addelem('input', numberdiv, {
      type: 'number',
      min: '1'
    });
    if ("number" in probsetinfo) {
      this.numberinput.value = probsetinfo.number.toString()
    }
    const numbermoreinfo = addelem('div', numberdiv, {
      innerHTML: '(' + tr('If number is smaller than the number of ' +
        'problems below, students will be given a random ' +
        'selection.') + ')',
      classes: ['settingsnote']
    });
    const pointsdiv = addelem('div', settingsform, {
      classes: ['pscpoints']
    });
    const pointslabel = addelem('span', pointsdiv, {
      innerHTML: tr('Points per problem') + ': '
    });
    this.pointsinput = addelem('input', pointsdiv, {
      type: 'number',
      min: '1',
      max: '100'
    });
    if ("points" in probsetinfo) {
      this.pointsinput.value = probsetinfo.points.toString()
    } else {
      this.pointsinput.value = '1';
    }
    const partialCreditLabel = addelem('label', pointsdiv, {
      innerHTML: tr('Allow partial credit') + ' '
    });
    this.partialcreditcb = addelem('input', partialCreditLabel, {
      type: 'checkbox'
    });
    this.partialcreditcb.checked =
      (!("partialcredit" in probsetinfo)
       || probsetinfo.partialcredit);
    const immediatediv = addelem('div', settingsform, {
      classes: ['pscimmediate']
    });
    const immediatelabel = addelem('label', immediatediv, {
      innerHTML: tr('Show result immediately') + ' '
    });
    this.immediatecb = addelem('input', immediatelabel, {
      type: 'checkbox'
    });
    this.immediatecb.checked = (("immediateresult" in probsetinfo) &&
      probsetinfo.immediateresult);
    const cheatdiv = addelem('div', settingsform);
    const cheatlabel = addelem('label', cheatdiv, {
      innerHTML: tr('Allow cheating/viewing answer') + ' '
    });
    this.cheatcb = addelem('input', cheatlabel, {
      type: 'checkbox'
    });
    this.cheatcb.checked = (("cheat" in probsetinfo) && probsetinfo.cheat);
    const manualdiv = addelem('div', settingsform, {
      classes: ['pscmanual']
    });
    const manuallabel = addelem('label', manualdiv, {
      innerHTML: tr('Require manual grading') + ' '
    });
    this.manualcb = addelem('input', manuallabel, {
      type: 'checkbox'
    });
    this.manualcb.checked = (("manuallygraded" in probsetinfo) &&
      probsetinfo.manuallygraded);
    if (this.makeOptions) {
      this.makeOptions(probsetinfo?.options ?? {});
    }
    this.problemCreatorArea = addelem('div', article, {
      classes: ['problemcreatorarea']
    });
    for (let pn = 0; pn < problems.length; pn++) {
      const problem = problems[pn];
      const answer = answers[pn];
      this.makeProblemCreator(problem, answer, false);
    }
    // start a blank ps creator with a blank problem
    if (problems.length == 0) {
      this.makeProblemCreator({}, {}, true);
    }
    this.renumberProblems();
    const btndiv = addelem('div', article, {
      classes: ['problemsetcreatorbuttondiv']
    });
    const addbtn = addelem('button', btndiv, {
      mypsc: this,
      type: 'button',
      innerHTML: 'add problem',
      onclick: function() {
        this.mypsc.makeProblemCreator({}, {}, true);
        this.mypsc.renumberProblems();
        this.mypsc.makeChanged();
      }
    });
    if (this?.postCreate) { this.postCreate(); }
    const ii = this.getElementsByTagName("input");
    const tata = this.getElementsByTagName("textarea");
    const ss = this.getElementsByTagName("select");
    for (const e of [...ii, ...tata, ...ss]) {
      e.myProbSetCreator = this;
      e.addEventListener('change', function() {
        this.myProbSetCreator.makeChanged();
      });
      e.addEventListener('input', function() {
        this.myProbSetCreator.makeChanged();
      });
    }
  }

  renumberProblems() {
    const pcpc = this.getElementsByClassName("problemcreator");
    for (let i=0; i<pcpc.length; i++) {
      const pc = pcpc[i];
      if (pc?.numfield) {
        pc.numfield.innerHTML = '#' + (i+1).toString();
      }
      if (pc?.numoffield) {
        pc.numoffield.innerHTML = (pcpc.length.toString());
      }
    }
  }
}
