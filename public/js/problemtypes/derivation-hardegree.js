
import DerivationExercise from './derivation-base.js';
import { addelem, htmlEscape } from '../common.js';
import tr from '../translate.js';
import rules from '../checkers/rules/hardegree-rules.js';
import { symbols } from '../symbolic/libsyntax.js';

export default class DerivationHardegree extends DerivationExercise {

    constructor() {
        super();
    }

    addSubDerivHook(subderiv) {
        let l = subderiv.addLine(subderiv.target, true);
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

    justKeydownExtra(e, elem) {
        if (e.ctrlKey || e.altKey) { return; }
        if ((e.key == 'e') && (this.options.pred)) {
            e.preventDefault();
            elem.insertHere(symbols.EXISTS);
        }
        if ((e.key == 'a') && (this.options.pred)) {
            e.preventDefault();
            elem.insertHere(symbols.FORALL);
        }
        if (/^[oiucdnp]$/.test(e.key)) {
            e.preventDefault();
            elem.insertHere(e.key.toUpperCase());
        }
    }

    makeProblem(problem, options, checksave) {
        super.makeProblem(problem, options, checksave);
    }

    makeRulePanel() {
        const rp = document.createElement("div");
        rp.classList.add("rulepanel","logicpenguin","minimized");
        rp.rulemap = {};
        const d = addelem('div', rp, {
            innerHTML: 'rules chart',
            myrp: rp,
            tabIndex: -1,
            classes: ['derivchartlabel'],
            onclick: function(e) {
                this.myrp.target.focus();
                if (this.myrp.classList.contains("minimized")) {
                    this.myrp.classList.remove("minimized");
                    this.myrp.hidewidg.innerHTML = 'expand_more';
                    this.title = 'hide the chart';
                    return;
                }
                this.myrp.classList.add("minimized");
                this.myrp.hidewidg.innerHTML = 'expand_less';
                this.title = 'expand the chart';
            }
        });
        rp.hidewidg = addelem('div', d, {
            myrp: rp,
            innerHTML: 'expand_less',
            classes: ['derivhidewidget','material-symbols-outlined']
         });
        const table = addelem('table', rp, { classes: ['ruleclicktable'] });
        const thead = addelem('thead', table, {});
        const thr = addelem('tr', thead, {});
        rp.insertRuleCite = function(e) {
            if (!this.currentrule || !this.target) { return; }
            let targ = this.target;
            if (!targ) { return; }
            let time = (new Date()).getTime();
            let iblurred = targ?.myline?.input?.lastblurred ?? 0;
            let blurred = Math.max(targ.lastblurred, iblurred);
            if (time  - blurred > 500) { return; }
            targ = targ.myline.mysubderiv.myprob.lastfocusedJ;
            let oldval = targ.value;
            targ.insertRuleCite(rp.currentrule);
            targ.focus();
            targ.oldvalue = oldval;
        }
        rp.rulenamecell = addelem('th', thr, {
            colSpan: "2",
            myrp: rp,
            classes: [ 'rulenamedisplay' ],
            tabIndex: -1,
            onclick: function(e) { this.myrp.insertRuleCite(e); }
        });
        rp.ruleformcell = addelem('th', thr, {
            colSpan: "6",
            myrp: rp,
            classes: [ 'ruledisplay' ],
            tabIndex: -1,
            onclick: function(e) { this.myrp.insertRuleCite(e); }
        });
        rp.innernamecell = addelem('div',rp.rulenamecell,{});
        rp.innerformcell = addelem('div',rp.ruleformcell,{});
        const tbody = addelem('tbody', table, {});
        let tre;
        let ctr=0;
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
                title: 'click to view form',
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
                td.title = rules[rule].hint;
            }
            rp.rulemap[rule] = td;
            ctr++;
        }
        let remcells = (8-(ctr % 8));
        if (remcells > 0 && remcells < 8) {
            let filler = addelem('td', tre, {
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
            if (ruleinfo.assumptionrule) {
                let textblock = addelem('div', this.innerformcell, {
                    classes: ['ruledisplayform'],
                    innerHTML: tr('<strong>Assumption</strong><br>(only allowed within<br>certain kinds of<br>derivations for certain<br>kinds of showlines)')
                });
                return;
            }
            if (ruleinfo.premiserule) {
                let textblock = addelem('div', this.innerformcell, {
                    classes: ['ruledisplayform'],
                    innerHTML: tr('<strong>Premise</strong><br>(these are taken as “given”<br>for the problem and are<br>filled in for you)')
                });
                return;
            }
            if (ruleinfo.showrule) {
                for (let thisform of ruleinfo.forms) {
                    let formblock = addelem('div', this.innerformcell, {
                        classes: ['ruledisplayform']
                    });
                    let showblock = addelem('div', formblock, {
                        classes: ['ruledisplayshowline'],
                        innerHTML: '<span>SHOW:</span> <span>'+ htmlEscape(DerivationHardegree.schematic(thisform.conc)) + '</span>'
                    });
                    let mainsubderiv = addelem('div', formblock, {
                        classes: ['ruledisplaysubderiv'] });
                    let wantsnew = false;
                    for (let subderiv of thisform.subderivs) {
                        if (subderiv.wantsasnew) { wantsnew = true; }
                        if (subderiv.mustbedirect) {
                            for (let n of subderiv.needs) {
                                addelem('div', mainsubderiv, {
                                    classes: [ 'ruledisplaydrop', 'symbolic' ],
                                    innerHTML: htmlEscape(DerivationHardegree.schematic(n))
                                });
                            }
                            break;
                        }
                        if (subderiv.allows) {
                            let assumptionblock = addelem('div', mainsubderiv, {
                                classes: ['ruledisplayassumption', 'symbolic'],
                                innerHTML: htmlEscape(DerivationHardegree.schematic(subderiv.allows))
                            });
                        }
                        for (let n of subderiv.needs) {
                            let showl = addelem('div', mainsubderiv, {
                                classes: ['ruledisplayshowline'],
                                innerHTML: '<span>SHOW:</span> <span class="symbolic">'+ htmlEscape(DerivationHardegree.schematic(n)) + '</span>'
                            });
                            let innersbd = addelem('div', mainsubderiv, {
                                classes: ['ruledisplaysubderiv','withblank', 'symbolic']});
                        }
                    }
                    if (wantsnew) {
                        let newnote = addelem('div', formblock, {
                            classes: ['rulenote'],
                            innerHTML: tr('𝓃 must be a new name')
                        });
                    }
                }
                return;
            }
            // reg rule ; box for each form
            for (let thisform of ruleinfo.forms) {
                let formblock = addelem('div', this.innerformcell, {
                    classes: ['ruledisplayform']
                });
                let argtbl = addelem('table', formblock, {
                    classes: ['ruledisplayargtbl']
                });
                let argtblb = addelem('tbody', argtbl, {});
                for (let prem of thisform.prems) {
                    let tre = addelem('tr', argtblb, {});
                    let pcell = addelem('td', tre, {
                        classes: ['ruledisplaypremise', 'symbolic'],
                        innerHTML: htmlEscape(DerivationHardegree.schematic(prem))
                    });
                }
                let concrow = addelem('tr', argtblb, {});
                let conccell = addelem('td', concrow, {
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
