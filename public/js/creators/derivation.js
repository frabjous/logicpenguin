// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/derivation.js /////////////////////
// class for creating derivation problems
//////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import { addelem, htmlEscape } from '../common.js';
import { randomString } from '../misc.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import SymbolicArgumentInput from '../ui/symbolic-argument-input.js';
import getHardegreeRuleset from '../checkers/rules/hardegree-rules.js';
import getForallxRules from '../checkers/rules/forallx-rules.js';

let probimport = {};
let probtypeloaded = false;

function getNotationName() {
  let n = window?.contextSettings?.notation ?? 'cambridge';
  if (n == '' || n == 'none') { n = 'cambridge'; }
  return n;
}

function getSystemName() {
  let n = window?.contextSettings?.system ?? 'hardegree';
  if (n == '' || n == 'none') { n = 'hardegree'; }
  return n;
}


function randomId() {
  let rid = randomString(8);
  while (document.getElementById(rid)) {
    rid = randomString(8);
  }
  return rid;
}

function sameProb(a, b) {
  if (a.conc != b.conc) { return false; }
  if (a.prems.length != b.prems.length ) { return false; }
  for (let i=0; i<a.prems.length; i++) {
    if (a.prems[i] != b.prems[i]) { return false; }
  }
  return true;
}

function sufficesForQ(prob, Formula) {
  if (!("conc" in prob)) { return false; }
  if (!("prems" in prob)) { return false; }
  const cf = Formula.from(prob.conc);
  if (!cf.wellformed) { return false; }
  for (const prem of prob.prems) {
    const pf = Formula.from(prem);
    if (!pf.wellformed) { return false; }
  }
  return true;
}

function fixAnsChecks(obj) {
  if ("c" in obj) {
    obj.c = "unchecked";
  }
  if ("parts" in obj && Array.isArray(obj.parts)) {
    for (const part of obj.parts) {
      fixAnsChecks(part);
    }
  }
}

export default class DerivationCreator extends LogicPenguinProblemSetCreator {
  constructor() {
    super();
  }

  disableLangRadios() {
    const msg = tr('This cannot be changed once set. Create a new ' +
                   'problem set if need be.');
    if (this?.sentradio) {
      this.sentradio.disabled = true;
      this.sentradio.title = msg;
      this.sentlabel.title = msg;
    }
    if (this?.predradio) {
      this.predradio.disabled = true;
      this.predradio.title = msg;
      this.predlabel.title = msg;
    }
    if (this?.sentradio?.checked) {
      const cbcb = this.getElementsByClassName("rulecb");
      for (const cb of cbcb) {
        if (cb.pred) {
          cb.checked = false;
          cb.disabled = true;
        }
      }
    }
  }

  gatherOptions() {
    const opts = {
      notation: getNotationName(),
      hints: this.hintscb.checked,
      checklines: this.linecheckingcb.checked,
      pred: this.predradio.checked,
      lazy: (!this.predradio.checked),
      rulepanel: this.rulepanelcb.checked
    }
    if ("identitycb" in this) {
      opts.identity = (this.identitycb.checked);
    }
    if (this.rulepanelsubsetcb.checked) {
      opts.useonlyrules = [];
      const cbcb = this.getElementsByClassName("rulecb");
      for (const cb of cbcb) {
        if (cb.checked) {
          opts.useonlyrules.push(cb.myrule);
        }
      }
    }
    return opts;
  }

  makeOptions(opts) {
    const langdiv = addelem('div', this.settingsform);
    langdiv.id = randomId();
    this.sentlabel = addelem('label', langdiv, {
      innerHTML: tr('sentential'),
      htmlFor: langdiv.id + 'radiosent'
    });
    this.sentradio = addelem('input', langdiv, {
      type: 'radio',
      id: langdiv.id + 'radiosent',
      name: langdiv.id + 'radios',
      mypsc: this,
      onchange: function() {
        const psc = this.mypsc;
        psc.newStarter();
        psc.disableLangRadios();
        psc.makeChanged();
      },
      checked: (("pred" in opts) && !opts.pred)
    });
    this.predlabel = addelem('label', langdiv, {
      innerHTML: tr('predicate'),
      htmlFor: langdiv.id + 'radiopred'
    });
    this.predradio = addelem('input', langdiv, {
      type: 'radio',
      id: langdiv.id + 'radiopred',
      name: langdiv.id + 'radios',
      mypsc: this,
      onchange: function() {
        const psc = this.mypsc;
        psc.newStarter();
        psc.disableLangRadios();
        psc.makeChanged();
      },
      checked: (opts?.pred)
    });
    if (getSystemName() == 'hardegree') {
      const identitydiv = addelem('div', this.settingsform);
      const identitylabel = addelem('label', identitydiv, {
        innerHTML: tr('Include identity rules') + ' '
      });
      this.identitycb = addelem('input', identitylabel,{
        checked: (opts?.identity),
        type: 'checkbox',
        mypsc: this,
        onchange: function() {
          const psc = this.mypsc;
          psc.makeChanged();
        }

      });
    }
    const linecheckingdiv = addelem('div', this.settingsform);
    const linecheckinglabel = addelem('label', linecheckingdiv, {
      innerHTML: tr('Allow line auto-checking') + ' '
    });
    this.linecheckingcb = addelem('input', linecheckinglabel, {
      checked: opts?.checklines,
      type: 'checkbox',
      mypsc: this,
      onchange: function() {
        const psc = this.mypsc;
        psc.makeChanged();
      }
    });
    const hintsdiv = addelem('div', this.settingsform);
    const hintslabel = addelem('label', hintsdiv, {
      innerHTML: tr('Provide hints (if available)') + ' '
    });
    this.hintscb = addelem('input', hintslabel, {
      checked: opts?.hints,
      type: 'checkbox',
      mypsc: this,
      onchange: function() {
        const psc = this.mypsc;
        psc.makeChanged();
      }
    });
    if ("pred" in opts) {
      this.disableLangRadios();
    }
    const rulepaneldiv = addelem('div', this.settingsform);
    const rulepanellabel = addelem('label', rulepaneldiv, {
      innerHTML: tr('Show rule panel') + ' '
    });
    this.rulepanelcb = addelem('input', rulepanellabel, {
      checked: ((!("rulepanel" in opts)) || opts?.rulepanel),
      type: 'checkbox',
      mypsc: this,
      onchange: function() {
        const psc = this.mypsc;
        if (this.checked) {
          if (psc.rulepanelsubsetcb) {
            psc.rulepanelsubsetcb.disabled = false;
          } else {
            psc.rulepanelsubsetcb.checked = false;
            psc.rulepanelsubsetcb.onchange();
            psc.rulepanelsubsetcb.disabled = true;
          }
        }
        psc.makeChanged();
      }
    });
    const rulepanelsubsetdiv = addelem('div', this.settingsform);
    const rulepanelsubsetlabel = addelem('label', rulepanelsubsetdiv, {
      innerHTML: tr('Show only certain rules in panel') + ' '
    });
    this.rulepanelsubsetcb = addelem('input', rulepanelsubsetlabel, {
      checked: (this.rulepanelcb.checked && (
        ("excluderules" in opts) ||
        ("useonlyrules" in opts)
      )),
      type: 'checkbox',
      mypsc: this,
      onchange: function() {
        const psc = this.mypsc;
        if (this.checked && psc?.rulesubsetselectordiv) {
          psc.rulesubsetselectordiv.showme(true);
        } else {
          psc.rulesubsetselectordiv.showme(false);
        }
        psc.makeChanged();
      }
    });
    this.rulesubsetselectordiv = addelem('div', this.settingsform, {
      classes: ['rulesubsetselector']
    });
    this.rulesubsetselectordiv.showme = function (b) {
      if (b) {
        this.style.display = 'block';
      } else {
        this.style.display = 'none';
      }
    }
    this.rulesubsetselectordiv.showme(
      this.rulepanelsubsetcb.checked
    );
    const systemname = getSystemName();
    // TODO: make this more flexible?
    let ruleset = {};
    if (systemname == 'hardegree') {
      ruleset = getHardegreeRuleset(getNotationName());
    } else {
      ruleset = getForallxRules(systemname, getNotationName());
    }
    for (const rulename in ruleset) {
      if (ruleset[rulename].hidden) { continue; }
      const rlbl = addelem('label', this.rulesubsetselectordiv, {
        innerHTML: htmlEscape(rulename)
      });
      const rcb = addelem('input', rlbl, {
        type: 'checkbox',
        mypsc: this,
        myrule: rulename,
        classes: ["rulecb"],
        pred: (ruleset?.[rulename]?.pred),
        onchange: function() {
          this.mypsc.makeChanged();
        },
        checked: (!(
          (("excluderules" in opts) &&
           opts.excluderules.indexOf(rulename) >= 0) ||
          (("useonlyrules" in opts) &&
           opts.useonlyrules.indexOf(rulename) == -1)
        ))
      })
    }
  }

  makeProblemCreator(problem, answer, isnew) {
    const pc = super.makeProblemCreator(problem, answer, isnew);
    pc.notationname = getNotationName();
    pc.Formula = getFormulaClass(pc.notationname);
    pc.sai = SymbolicArgumentInput.getnew({
      notation: pc.notationname,
      lazy: (!(this.predradio.checked)),
      pred: this.predradio.checked
    });
    pc.sai.mypc = pc;
    pc.sai.onchange = function() {
      this.mypc.whenchanged();
    }
    pc.sai.oninput = function() {
      this.mypc.whenchanged();
    }

    pc.probinfoarea.appendChild(pc.sai);

    pc.getProblem = function() {
      const sga = this.sai.getArgument();
      if (!sga) { return { prems: [], conc: '' }; }
      return sga;
    }
    pc.getAnswer = function() {
      if (!("answerer" in this)) { return {}; }
      // close all subderivs
      for (const sd of this.answerer.getElementsByTagName('sub-derivation')) {
        sd.classList.add('closed');
      }
      const ans = this.answerer.getAnswer();
      // set autocheck to false
      ans.autocheck = false;
      fixAnsChecks(ans);
      return ans;
    }
    pc.makeAnswerer = async function(answer) {
      const prob = this.getProblem();
      const issame = (("oldanswererprob" in this) &&
                      sameProb(prob, this.oldanswererprob));
      this.oldanswererprob = prob;
      if (!("origprob" in this)) {
        this.origprob = prob;
        if (answer) {
          this.origanswer = answer;
        } else {
          this.origanswer = false;
        }
      }
      if (issame) { return; }
      if (this.answerer) {
        const a = this.answerer;
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
      }
      if (!sufficesForQ(prob, this.Formula)) {
        this.ansbelowlabel.style.display = 'none';
        this.ansinfoarea.style.display = 'none';
        return;
      }
      this.ansbelowlabel.style.display = 'block';
      this.ansbelowlabel.innerHTML = tr('Provide answer below');
      this.ansinfoarea.style.display = 'block';
      if (!probtypeloaded) {
        try {
          probimport = await import('../problemtypes/' +
            this.mypsc.problemtype + '.js');
          probtypeloaded = true;
        } catch(err) {
          const msg = tr('Unable to load exercise-type') +
            ' ' + this.mypsc.problemtype +
            '. ' + err.toString();
          if (window.errormessage) {
            window.errormessage(msg);
          } else {
            console.error(msg);
          }
          return;
        }
      }
      this.answerer = addelem(this.mypsc.problemtype,
                              this.ansinfoarea);
      const aopts = this.mypsc.gatherOptions();
      aopts.checklines = true;
      this.answerer.makeProblem(prob, aopts, 'save');
      try {
        const charger = await import('../supercharge/' +
          this.mypsc.problemtype + '.js');
        if (charger.chargeup) {
          charger.chargeup(this.answerer);
        }
      } catch(err) {};
      //this.answerer.setIndicator = function() {};
      this.answerer.processAnswer = function() {};
      this.answerer.mypc = this;
      this.answerer.myquestion = prob;
      this.answerer.myanswer = {};
      // temporarily set makeChanged to nothing
      // while restoring
      const bdivs =
        this.answerer.getElementsByClassName("buttondiv");
      for (const bdiv of bdivs) {
        bdiv.style.display = 'none';
      }
      if (answer) { this.answerer.restoreAnswer(answer); }
      else if (sameProb(prob, this.origprob)) {
        if (this.origanswer) {
          this.answerer.restoreAnswer(this.origanswer);
        }
      }
      // now allow changes to affect set
      this.answerer.oldMakeChanged = this.answerer.makeChanged;
      this.answerer.makeChanged = function(rnc, allt) {
        this.oldMakeChanged(rnc, allt);
        this.mypc.mypsc.makeChanged();
      };

    }
    pc.whenchanged = function() {
      this.makeAnswerer();
      this.mypsc.makeChanged();
    }
    if (!isnew) {
      if ("prems" in problem && problem.prems.length > 0) {
        const pr = pc.sai.getElementsByClassName("symbargpremise")[0]
          .getElementsByTagName("input")?.[0];
        if (pr) { pr.value = problem.prems[0]; }
        for (let i=1; i<problem.prems.length; i++) {
          const npr = pc.sai.addPremise();
          npr.myinput.value = problem.prems[i];
        }
      }
      if ("conc" in problem && problem.conc != '') {
        const c = pc.sai.getElementsByClassName("symbargconc")[0]
          .getElementsByTagName("input")?.[0];
        if (c) { c.value = problem.conc; }
      }
      pc.makeAnswerer(answer);
    }
  }

  newStarter() {
    const pcpc = this.getElementsByClassName("problemcreator");
    if (pcpc.length == 1) {
      pcpc[0].parentNode.removeChild(pcpc[0]);
      this.makeProblemCreator({}, {}, true);
      this.renumberProblems();
      this.makeChanged();
    }
  }

  postCreate() {
    const pcpc = this.getElementsByClassName("problemcreator");
    if (pcpc.length < 2) { return; }
    if (!this.predradio.checked) { this.sentradio.checked = true; }
    this.disableLangRadios();
  }
}

customElements.define("derivation-creator", DerivationCreator);



