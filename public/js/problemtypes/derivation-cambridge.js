// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-cambridge.js /////////////////////////////////////
// Fitch-style derivations using the cambridge rule set                      //
///////////////////////////////////////////////////////////////////////////////

//import LogicPenguinProblem from '../problem-class.js';
import DerivationFitch from './derivation-fitch-base.js';
//import { addelem, htmlEscape } from '../common.js';
//import tr from '../translate.js';

export default class DerivationCambridge extends DerivationFitch {

    constructor() {
        super();
    }

    getAnswer() {
        return super.getAnswer();
    }

    getSolution() {
        return super.getSolution();
    }

    makeProblem(problem, options, checksave) {
        options.ruleset = 'cambridge';
        if (!("notation" in options)) {
            options.notation = 'cambridge';
        }
        if (!("rulesFirst" in options)) {
            options.rulesFirst = true;
        }
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
                if (("parts" in pt) && ("showline" in pt) &&
                    ("s" in pt.showline)) {
                    problem.conc = pt.showline.s;
                    break;
                }
            }
        }

        // use cambridge notation if not set
        if (!("notation" in options)) {
            options.notation = 'cambridge';
        }

        // partial problems treated differently
        const partial = (answer && answer?.partial);
        if (!("rulepanel" in options) && !partial) {
            options.rulepanel = true;
        }
        // if we have an answer (And not partial), then enable hints/cheats
        if (answer && !partial) {
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

customElements.define("derivation-cambridge", DerivationCambridge);
