// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/derivation.js /////////////////////
// class for creating derivation problems
//////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import { addelem } from '../common.js';
import { randomString } from '../misc.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import  SymbolicArgumentInput from '../ui/symbolic-argument-input.js';

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

function randomId() {
    let rid = randomString(8);
    while (document.getElementById(rid)) {
        rid = randomString(8);
    }
    return rid;
}

function sufficesForQ(prob, Formula) {
    if (!("conc" in prob)) { return false; }
    if (!("prems" in prob)) { return false; }
    const cf = Formula.from(prob.conc);
    if (!cf.wellformed) { return false; }
    for (const prem of conc.prems) {
        const pf = Formula.from(prem);
        if (!pf.wellformed) { return false; }
    }
    return true;
}

export default class ArgumentTruthTableCreator extends LogicPenguinProblemSetCreator {
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
    }

    gatherOptions() {
        return {
            notation: getNotationName(),
            hints: this.hintscb.checked,
            checklines: this.linecheckingcb.checked,
            pred: this.predradio.checked,
            rulepanel: this.rulepanelcb.checked
        }
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
                psc.disableLangRadios();
                psc.makeChanged();
            },
            checked: (!(opts?.pred))
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
                psc.disableLangRadios();
                psc.makeChanged();
            },
            checked: (opts?.pred)
        });
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
                psc.makeChanged();
            }
        });
        const linecheckingdiv = addelem('div', this.settingsform);
        const linecheckinglabel = addelem('label', questiondiv, {
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
        const hintslabel = addelem('label', questiondiv, {
            innerHTML: tr('Provide hints (if available') + ' '
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
            disableLangRadios();
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

        pc.getProblem = function() { return this.sai.getArgument(); }
        pc.getAnswer = function() {
            if (!("answerer" in this)) { return {}; }
            // close all subderivs
            for (const sd of this.answerer.getElementsByTagName('sub-derivation')) {
                sd.classList.add('closed');
            }
            const ans = this.answerer.getAnswer();
            // set autocheck to false
            ans.autocheck = false;
            return ans;
        }
        pc.makeAnswerer = function() {
            if (this.answerer) {
                const a = this.answerer;
                if (a.parentNode) {
                    a.parentNode.removeChild(a);
                }
            }
            const prob = this.getProblem();
            if (sufficesForQ(prob, this.Formula)) {
                this.ansbelowlabel.style.display = 'block';
                this.ansbelowlabel.innerHTML = tr('Provide answer below');
                this.ansinfoarea.style.display = 'block';
                this.answerer = addelem('argument-truth-table',
                    this.ansinfoarea);
                this.answerer.makeProblem(prob, this.mypsc.gatherOptions(),
                    'save');
                this.answerer.setIndicator = function() {};
                this.answerer.processAnswer = function() {};
                this.answerer.mypc = this;
                this.answerer.makeChanged = function() {
                    this.mypc.mypsc.makeChanged();
                };
                const ans = this.getAnswer();
                const bdivs =
                    this.answerer.getElementsByClassName("buttondiv");
                for (const bdiv of bdivs) {
                    bdiv.style.display = 'none';
                }
                this.answerer.myanswer = ans;
                this.answerer.getSolution();

            } else {
                this.ansbelowlabel.style.display = 'none';
                this.ansinfoarea.style.display = 'none';
            }

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
            pc.whenchanged();
        }
    }
}

customElements.define("argument-truth-table-creator", ArgumentTruthTableCreator);



