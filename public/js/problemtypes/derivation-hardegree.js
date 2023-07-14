// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-hardegree.js //////////////////////////////
// Kalish-Montague style derivations using Hardegree's rule set       //
////////////////////////////////////////////////////////////////////////

import DerivationExercise from './derivation-base.js';
import { addelem, htmlEscape } from '../common.js';
import tr from '../translate.js';

//TODO; allow any rule set
import rules from '../checkers/rules/hardegree-rules.js';

// TODO: use schematic letters from notatiton, etc.

export default class DerivationHardegree extends DerivationExercise {

    constructor() {
        super();
    }

    addSubDerivHook(subderiv) {
        const l = subderiv.addLine(subderiv.target, true);
        if (!this.isRestoring) {
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
        // e for ∃
        if ((e.key == 'e') && (this.options.pred)) {
            e.preventDefault();
            elem.insertHere(this.symbols.EXISTS);
        }
        // a for ∀, if notation uses quantifier
        if ((e.key == 'a') && (this.options.pred) &&
            (this.notation.quantifierForm.search('Q\\?') == -1)) {
            e.preventDefault();
            elem.insertHere(this.symbols.FORALL);
        }
        // should be determined by rule set
        if (/^[oiucdnp]$/.test(e.key)) {
            e.preventDefault();
            elem.insertHere(e.key.toUpperCase());
        }
    }

    makeProblem(problem, options, checksave) {
        super.makeProblem(problem, options, checksave);
    }

    makeRulePanel() {
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
            const time = (new Date()).getTime();
            const iblurred = targ?.myline?.input?.lastblurred ?? 0;
            const blurred = Math.max(targ.lastblurred, iblurred);
            if (time  - blurred > 500) { return; }
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
            onclick: function(e) { this.myrp.insertRuleCite(e); }
        });
        // thead cell for displaying the actual rule
        rp.ruleformcell = addelem('th', thr, {
            colSpan: "6",
            myrp: rp,
            classes: [ 'ruledisplay' ],
            tabIndex: -1,
            onclick: function(e) { this.myrp.insertRuleCite(e); }
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
            if (ctr % 8 == 0) {
                tre = addelem('tr', tbody, {});
            }
            const td = addelem('td', tre, {
                myrule: rule,
                myrp: rp,
                tabIndex: -1,
                classes: ['ruleselect'],
                title: tr('click to view form'),
                onclick: function(e) {
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
        rp.displayrule = function(rule) {
            const ruleinfo = this.ruleset[rule];
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
                        innerHTML: '<span>' + tr('SHOW') + ':</span> <span>' + htmlEscape(DerivationHardegree.schematic(thisform.conc)) + '</span>'
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
                                    innerHTML: htmlEscape(DerivationHardegree.schematic(n))
                                });
                            }
                            break;
                        }
                        if (subderiv.allows) {
                            const assumptionblock = addelem('div', mainsubderiv, {
                                classes: ['ruledisplayassumption', 'symbolic'],
                                innerHTML: htmlEscape(DerivationHardegree.schematic(subderiv.allows))
                            });
                        }
                        for (const n of subderiv.needs) {
                            const showl = addelem('div', mainsubderiv, {
                                classes: ['ruledisplayshowline'],
                                innerHTML: '<span>' + tr('SHOW') + ':</span> <span class="symbolic">'+ htmlEscape(DerivationHardegree.schematic(n)) + '</span>'
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
                        innerHTML: htmlEscape(DerivationHardegree.schematic(prem))
                    });
                }
                const concrow = addelem('tr', argtblb, {});
                const conccell = addelem('td', concrow, {
                    classes: ['ruledisplayconclusion','symbolic'],
                    innerHTML: htmlEscape(DerivationHardegree.schematic(thisform.conc))
                });
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

    ruleset = rules;

    // TODO: use notation
    static schematic(s) {
        return s.replace(/A/g,'𝒜')
            .replace(/B/g,'ℬ')
            .replace(/C/g,'𝒞')
            .replace(/𝒜x/g,'𝒜')
            .replace(/x/g,'𝓍')
            .replace(/a/g,' [𝒶/𝓍]')
            .replace(/n/g,' [𝓃/𝓍]');
    }
}

customElements.define("derivation-hardegree", DerivationHardegree);
