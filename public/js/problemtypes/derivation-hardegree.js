// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-hardegree.js //////////////////////////////
// Kalish-Montague style derivations using Hardegree's rule set       //
////////////////////////////////////////////////////////////////////////

import LogicPenguinProblem from '../problem-class.js';
import DerivationExercise from './derivation-base.js';
import { addelem, htmlEscape } from '../common.js';
import tr from '../translate.js';

// TODO: perhaps rebase on derivation-km-base.js and allow any ruleset?
import getRules from '../checkers/rules/hardegree-rules.js';
import notations from '../symbolic/notations.js';

export default class DerivationHardegree extends DerivationExercise {

  constructor() {
    super();
  }

  addSubDerivHook(subderiv) {
    const l = subderiv.addLine(subderiv.target, true);
    if (!this.isRestoring && !this.settingUp) {
      l.input.focus();
    }
  }

  getAnswer() {
    return super.getAnswer();
  }

  getSolution() {
    return super.getSolution();
  }

  // in justifications, certain letters auto-uppercase
  justKeydownExtra(e, elem) {
    if (e.ctrlKey || e.altKey) { return; }
    // e for ∃ except in Rep
    if (((e.key == 'e') || (e.key == 'E')) && (this.options.pred)) {
      const pos = elem.selectionStart;
      let bef = '';
      if (pos > 0) {
        bef = elem.value.at(pos-1);
      }
      if (bef != 'R') {
        e.preventDefault();
        elem.insertHere(this.symbols.EXISTS);
      }
    }
    // a for ∀, if notation uses quantifier
    if ((e.key == 'a') && (this.options.pred) &&
        (this.notation.quantifierForm.search('Q\\?') == -1)) {
      e.preventDefault();
      elem.insertHere(this.symbols.FORALL);
    }
    // should be determined by rule set
    if (/^[oiucdn]$/.test(e.key)) {
      e.preventDefault();
      elem.insertHere(e.key.toUpperCase());
    }
    // keep p as lowercase in Rep, otherwise uppercase
    if (e.key == 'p') {
      const pos = elem.selectionStart;
      let bef = '';
      if (pos > 1) {
        bef = elem.value.at(pos-2) + elem.value.at(pos-1);
      }
      if (bef != 'Re') {
        e.preventDefault();
        elem.insertHere('P');
      }
    }
    if (e.key == 'a' && !this?.options?.pred && elem.selectionStart == 0) {
      e.preventDefault();
      elem.insertHere('A');
    }
    // make s lowercase for Ass
    if (/^[S]$/.test(e.key)) {
      if (!("forallSwap" in e)  || (!e.forallSwap)) {
        e.preventDefault();
        elem.insertHere(e.key.toLowerCase());
      }
    }
  }

  makeProblem(problem, options, checksave) {
    const notationname = options?.notation ?? 'hardegree';
    this.rules = getRules(notationname);
    this.ruleset = this.rules;
    this.schematicLetters = notations[notationname].schematicLetters;
    this.schematic = ((s) => (DerivationHardegree.schematic(s, this.schematicLetters)));
    this.useShowLines = true;
    // different icon for adding subderivation
    this.icons.addsubderiv = 'variable_add';
    super.makeProblem(problem, options, checksave);
  }

  makeRulePanel() {
    const rules = this.rules;
    // create panel
    const rp = document.createElement("div");
    rp.classList.add("rulepanel","logicpenguin","minimized");
    rp.ruleset = this.rules;
    rp.rulemap = {};
    // create title div
    const d = addelem('div', rp, {
      innerHTML: 'rules chart',
      myrp: rp,
      tabIndex: -1,
      classes: ['derivchartlabel'],
      // preventing default helps keep other stuff from
      // blurring
      onmousedown: function(e) { e.preventDefault(); },
      onclick: function(e) {
        e.preventDefault();
        this.myrp.target.focus();
        if (this.myrp.classList.contains("minimized")) {
          this.myrp.classList.remove("minimized");
          this.myrp.hidewidg.innerHTML = 'expand_more';
          this.title = tr('hide the chart');
          return;
        }
        this.myrp.classList.add("minimized");
        this.myrp.hidewidg.innerHTML = 'expand_less';
        this.title = tr('expand the chart');
      }
    });
    // create widget for minimizing, maximizing the panel
    rp.hidewidg = addelem('div', d, {
      myrp: rp,
      innerHTML: 'expand_less',
      classes: ['derivhidewidget','material-symbols-outlined']
    });
    // create the table of rules
    const table = addelem('table', rp, { classes: ['ruleclicktable'] });
    const thead = addelem('thead', table, {});
    const thr = addelem('tr', thead, {});
    rp.insertRuleCite = function(e) {
      if (!this.currentrule || !this.target) { return; }
      let targ = this.target;
      targ = targ?.myline?.mysubderiv?.myprob?.lastfocusedJ;
      if (!targ) { return; }
      const oldval = targ.value;
      targ.insertRuleCite(rp.currentrule);
      targ.focus();
      targ.oldvalue = oldval;
    }
    // thead cell for rule name
    rp.rulenamecell = addelem('th', thr, {
      colSpan: "2",
      myrp: rp,
      classes: [ 'rulenamedisplay' ],
      tabIndex: -1,
      onmousedown: function(e) { e.preventDefault(); },
      onclick: function(e) {
        e.preventDefault();
        this.myrp.insertRuleCite(e);
      }
    });
    // thead cell for displaying the actual rule
    rp.ruleformcell = addelem('th', thr, {
      colSpan: "6",
      myrp: rp,
      classes: [ 'ruledisplay' ],
      tabIndex: -1,
      onmousedown: function(e) { e.preventDefault(); },
      onclick: function(e) {
        e.preventDefault();
        this.myrp.insertRuleCite(e);
      }
    });
    // put divs inside in case we need to do extra styling
    rp.innernamecell = addelem('div',rp.rulenamecell,{});
    rp.innerformcell = addelem('div',rp.ruleformcell,{});
    const tbody = addelem('tbody', table, {});
    let tre;
    let ctr=0;
    // add each rule
    const identity = (!!(this?.options?.identity));
    for (const rule in rules) {
      if (rules[rule].hidden) { continue; }
      if ((!identity) && rules[rule].identity) {
        continue;
      }
      if (ctr % ((identity) ? 10 : 8) == 0) {
        tre = addelem('tr', tbody, {});
      }
      const td = addelem('td', tre, {
        myrule: rule,
        myrp: rp,
        tabIndex: -1,
        classes: ['ruleselect'],
        title: tr('click to view form'),
        onmousedown: function(e) {
          e.preventDefault();
        },
        onclick: function(e) {
          e.preventDefault();
          this.myrp.target.focus();
          if (this.classList.contains("meinongian")) { return; }
          this.myrp.displayrule(this.myrule);
        }
      });
      const d = addelem('div', td, {
        innerHTML: htmlEscape(rule)
      });
      if (rules[rule].meinongian) {
        td.classList.add("meinongian");
        d.innerHTML+='<span class="material-symbols-outlined">block</span>';
        td.title = tr(rules[rule].hint);
      }
      rp.rulemap[rule] = td;
      ctr++;
    }
    // add dummy cell in last row of rules, spanning what's left
    const remcells = (8-(ctr % 8));
    if (remcells > 0 && remcells < 8) {
      const filler = addelem('td', tre, {
        classes: ["blank"],
        colSpan: remcells.toString()
      });
    }
    // METHODS
    rp.resetState = function() {
      for (const rule in this.rulemap) {
        this.rulemap[rule].classList.remove("excluded");
      }
    }
    rp.schematic = this.schematic;
    rp.displayrule = function(rule) {
      const ruleinfo = this?.ruleset?.[rule];
      if (!ruleinfo) { return; }
      this.currentrule = rule;
      rp.innernamecell.innerHTML = htmlEscape(rule);
      // clear out old
      this.innerformcell.innerHTML = '';
      // some rules are special
      if (ruleinfo.assumptionrule) {
        const textblock = addelem('div', this.innerformcell, {
          classes: ['ruledisplayform'],
          innerHTML: '<strong>' + tr('Assumption') +
            '</strong><br>(' + tr('only allowed within') +
            '<br>' + tr('certain kinds of') +
            '<br>' + tr('derivations for certain') +
            '<br>' + tr('kinds of showlines') + ')'
        });
        return;
      }
      if (ruleinfo.premiserule) {
        const textblock = addelem('div', this.innerformcell, {
          classes: ['ruledisplayform'],
          innerHTML: '<strong>' + tr('Premise') + '</strong><br>(' +
            tr('these are taken as “given”') +
            '<br>' + tr('for the problem and are') +
            '<br>' + tr('filled in for you') + ')'
        });
        return;
      }
      if (ruleinfo.showrule) {
        for (const thisform of ruleinfo.forms) {
          const formblock = addelem('div', this.innerformcell, {
            classes: ['ruledisplayform']
          });
          const showblock = addelem('div', formblock, {
            classes: ['ruledisplayshowline'],
            innerHTML: '<span>' + tr('SHOW') + ':</span> <span>' + htmlEscape(this.schematic(thisform.conc)) + '</span>'
          });
          const mainsubderiv = addelem('div', formblock, {
            classes: ['ruledisplaysubderiv'] });
          let wantsnew = false;
          for (const subderiv of thisform.subderivs) {
            if (subderiv.wantsasnew) { wantsnew = true; }
            if (subderiv.mustbedirect) {
              for (const n of subderiv.needs) {
                addelem('div', mainsubderiv, {
                  classes: [ 'ruledisplaydrop', 'symbolic' ],
                  innerHTML: htmlEscape(this.schematic(n))
                });
              }
              break;
            }
            if (subderiv.allows) {
              const assumptionblock = addelem('div', mainsubderiv, {
                classes: ['ruledisplayassumption', 'symbolic'],
                innerHTML: htmlEscape(this.schematic(subderiv.allows))
              });
            }
            for (const n of subderiv.needs) {
              const showl = addelem('div', mainsubderiv, {
                classes: ['ruledisplayshowline'],
                innerHTML: '<span>' + tr('SHOW') + ':</span> <span class="symbolic">'+ htmlEscape(this.schematic(n)) + '</span>'
              });
              const innersbd = addelem('div', mainsubderiv, {
                classes: ['ruledisplaysubderiv','withblank', 'symbolic']});
            }
          }
          if (wantsnew) {
            const newnote = addelem('div', formblock, {
              classes: ['rulenote'],
              innerHTML: tr('𝓃 must be a new name')
            });
          }
        }
        return;
      }
      // reg rule ; box for each form
      for (const thisform of ruleinfo.forms) {
        const formblock = addelem('div', this.innerformcell, {
          classes: ['ruledisplayform']
        });
        const argtbl = addelem('table', formblock, {
          classes: ['ruledisplayargtbl']
        });
        const argtblb = addelem('tbody', argtbl, {});
        for (const prem of thisform.prems) {
          const tre = addelem('tr', argtblb, {});
          const pcell = addelem('td', tre, {
            classes: ['ruledisplaypremise', 'symbolic'],
            innerHTML: htmlEscape(this.schematic(prem))
          });
        }
        const concrow = addelem('tr', argtblb, {});
        const conccell = addelem('td', concrow, {
          classes: ['ruledisplayconclusion','symbolic'],
          innerHTML: htmlEscape(this.schematic(thisform.conc))
        });
        if (("differsatmostby" in thisform) &&
            (thisform.conc == thisform.differsatmostby[0])) {
          conccell.innerHTML = htmlEscape(
            this.schematic(thisform.differsatmostby[1]) + ' [' +
            this.schematic(thisform.differsatmostby[3]) +
            '/' +
            this.schematic(thisform.differsatmostby[2]) +
            ']');
        }
        if (thisform.mustbenew) {
          addelem('div', formblock, {
            classes:['rulenote'],
            innerHTML: tr('𝓃 must be a new name')
          });
        }
      }
    }
    return rp;
  }

  static schematic(s, letters) {
    const lta = [...letters];
    const scA = lta[0];
    let scB = 'ℬ';
    let scC = '𝒞';
    if (scA == 'p') {
      scB = 'q';
      scC = 'r';
    }
    if (scA == '𝑨') {
      scB = '𝑩';
      scC = '𝑪';
    }
    if (scA == 'φ') {
      scB = 'ψ';
      scC = 'χ';
    }
    const scx = lta[2];
    const sca = lta[3];
    const scn = lta[4];
    let scb = '𝒷';
    if (sca == '𝒄') {
      scb = '𝒅';
    }
    if (sca=='𝒸') {
      scb = '𝒹';
    }
    if (/[ab] [=≠] [ba]/.test(s)) {
      return s.replace(/a/g, sca)
        .replace(/b/g, scb);
    }
    if (s == 'a') {
      return sca;
    }
    if (s == 'b') {
      return scb;
    }
    return s.replace(/Ax/g, scA + scx)
      .replace(/A/g, scA)
      .replace(/B/g, scB)
      .replace(/C/g, scC)
      .replace(/x/g, scx)
      .replace(/a/g,' [' + sca + '/' + scx + ']')
      .replace(/b/g,' [' + scb + '/' + scx + ']')
      .replace(/d/g,' [' + scb + '/' + scx + ']')
      .replace(/n/g,' [' + scn + '/' + scx + ']');
  }

  static sampleProblemOpts(opts) {
    let [parentid, problem, answer, restore, options] =
      LogicPenguinProblem.sampleProblemOpts(opts);

    // if no problem, try to reconstruct from answer
    if ((problem === null) && answer) {
      problem = { prems: [], conc: '' };
      // go through parts of main derivation in answer
      for (const pt of answer?.parts) {
        // put premises in problem.prems
        if (("j" in pt) && (pt.j == 'Pr') && ("s" in pt)) {
          problem.prems.push(pt.s);
        }
        if (("parts" in pt) && ("showline" in pt) &&
            ("s" in pt.showline)) {
          problem.conc = pt.showline.s;
          break;
        }
      }
    }

    // use hardegree notation if not set
    if (!("notation" in options)) {
      options.notation = 'hardegree';
    }

    // partial problems treated differently
    const partial = (!!answer?.partial);
    if (!("rulepanel" in options) && !partial) {
      options.rulepanel = true;
    }
    // Enable hints/cheats if not partial
    if (partial) {
      options.cheat = false;
    } else {
      if ((!("hints" in options)) || (options.hints === null)) {
        options.hints = true;
      }
      if ((!("checklines" in options)) || (options.checklines === null)) {
        options.checklines = true;
      }
      if (!("cheat" in options)) {
        options.cheat = true;
      }
    }
    // if no answer, but hints or cheats are allowed, make the
    // answer "true"
    if ((!answer) && (options.cheat || options.hints)) {
      answer = true;
    }
    // if lowercase letter in conclusion, then it's predicate logic
    if (((!("pred" in options)) || (options.pred === null)) &&
        (/[a-z]/.test( problem.conc ))) {
      options.pred = true;
    } else {
      options.lazy = true;
    }
    // if partial, restore what was given as "answer"
    if (partial && (restore === null) && answer) {
      restore = answer;
    }
    return [parentid, problem, answer, restore, options];
  }

}

customElements.define("derivation-hardegree", DerivationHardegree);
