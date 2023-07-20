// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-fitch-base.js ////////////////////////////////////
// common ground of all Fitch-style derivation, built on derivation-base.js  //
///////////////////////////////////////////////////////////////////////////////

import LogicPenguinProblem from '../problem-class.js';
import DerivationExercise from './derivation-base.js';
import { addelem, htmlEscape } from '../common.js';
import tr from '../translate.js';

import getRules from '../checkers/rules/fitch-rules.js';
import notations from '../symbolic/notations.js';

export default class DerivationFitch extends DerivationExercise {

    constructor() {
        super();
    }

    addSubDerivHook(subderiv) {
        // focus on just added line if not restoring
        if (!this.isRestoring) {
            const ll = subderiv.getElementsByClassName("derivationline");
            if (!ll) { return; }
            ll[0].input.focus();
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
        // e for ∃, simetimes
        if (((e.key == 'e') || (e.key == 'E')) && (this.options.pred)) {
            const atStart = (elem.selectionStart == 0);
            let spaceBefore = false;
            if (!atStart) {
                const charBefore = this.value[ (elem.selectionStart - 1) ];
                spaceBefore = (
                    (charBefore == ',') ||
                    (charBefore == ' ') ||
                    (charBefore == ' ') || // thin space
                    (charBefore == ' ') || // nonbreaking space
                    (charBefore == ' ')); // narrow nonbreaking space
            }
            if (atStart || spaceBefore) {
                e.preventDefault();
                elem.insertHere(this.symbols.EXISTS);
            }
            // otherwise uppercase E unless part of DeM, obnoxious
        } else if (e.key == 'e') {
            const atStart = (elem.selectionStart == 0);
            let charBefore = '';
            if (!atStart) {
                charBefore = this.value[ (elem.selectionStart - 1) ];
            }
            if (charBefore != 'D') {
                e.preventDefault();
                elem.insertHere('E');
            }
        }
        // a for ∀, if notation uses quantifier
        if ((e.key == 'a') && (this.options.pred) &&
            (this.notation.quantifierForm.search('Q\\?') == -1)) {
            e.preventDefault();
            elem.insertHere(this.symbols.FORALL);
        }
        // letters used in names of rules should be uppercase
        if (/^[cdilmnpqrstx]$/.test(e.key)) {
            e.preventDefault();
            elem.insertHere(e.key.toUpperCase());
        }
    }

    makeProblem(problem, options, checksave) {
        const rulesetname = options?.ruleset ?? 'cambridge';
        const notationname = options?.notation ?? rulesetname;
        // default to rulesFirst for forallx
        if ("rulesFirst" in options) {
            this.rulesFirst = options.rulesFirst;
        } else {
            options.rulesFirst = true;
            this.rulesFirst = true;
        }
        this.rules = getRules(notationname, rulesetname);
        this.ruleset = this.rules;
        this.rulesetname = rulesetname;
        this.schematicLetters = notations[notationname].schematicLetters;
        this.classList.add('fitch-style-derivation');
        this.useShowLines = false;
        super.makeProblem(problem, options, checksave);
    }

    makeRulePanel() {
        const rules = this.rules;
        // create panel
        const rp = document.createElement("div");
        rp.classList.add("rulepanel","logicpenguin","minimized");
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
            colSpan: "7",
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
        for (const rule in rules) {
            if (rules[rule].hidden) { continue; }
            if (ctr % 9 == 0) {
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
        const remcells = (9-(ctr % 9));
        if (remcells > 0 && remcells < 9) {
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
        // TODO: fix this
        //rp.schematic = this.schematic;
        rp.displayrule = function(rule) { console.log('displaying rule', rule); };
        /* 
        rp.displayrule = function(rule) {
            const ruleinfo = this.ruleset[rule];
            if (!ruleinfo) { return; }
            this.currentrule = rule;
            rp.innernamecell.innerHTML = htmlEscape(rule);
            // clear out old
            this.innerformcell.innerHTML = '';
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
                if (thisform.mustbenew) {
                    addelem('div', formblock, {
                        classes:['rulenote'],
                        innerHTML: tr('𝓃 must be a new name')
                    });
                }
            }
        }
        */
        return rp;
    }

    // TODO: needs work
    schematic(s) {
        const letters = this.schematicLetters;
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
        const scx = lta[2];
        const sca = lta[3];
        let scb = '𝒷';
        let scc = '𝒸';
        if (sca == '𝒂') {
            scb = '𝒃';
            scc = '𝒄';
        }
        const scn = lta[4];
        return s.replace(/A/g, scA)
            .replace(/B/g, scB)
            .replace(/C/g, scC)
            .replace(/x/g, scx)
            .replace(/a/g,' [' + sca + '/' + scx + ']')
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
                if (("parts" in pt) && ("wants" in pt)) {
                    problem.conc = pt.wants;
                    break;
                }
            }
        }

        // if lowercase letter in conclusion, then it's predicate logic
        if (((!("pred" in options)) || (options.pred === null)) &&
            (/[a-z]/.test( problem.conc ))) {
            options.pred = true;
        } else {
            options.lazy = true;
        }

        // partial problems treated differently
        const partial = (answer && answer?.partial);
        if (!("rulepanel" in options) && !partial) {
            options.rulepanel = true;
        }
        // Enable hints/cheats if not partial
        if (!partial) {
            if ((!("hints" in options)) || (options.hints === null)) {
                options.hints = true;
            }
            if ((!("checklines" in options)) || (options.checklines === null)) {
                options.checklines = true;
            }
            if ((!("cheat" in options)) || (options.cheat === null)) {
                options.cheat = true;
            } else {
                options.cheat = false;
            }
        } else {
            options.cheat = false;
        }

        return [parentid, problem, answer, restore, options];
    }

}

customElements.define("derivation-fitch-base", DerivationFitch);
