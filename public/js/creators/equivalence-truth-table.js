// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/equivalence-truth-table.js //////////////////
// class for creating truth table problems for pairs of formulas        //
//////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import EquivalenceTruthTable from '../problemtypes/equivalence-truth-table.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import FormulaInput from '../ui/formula-input.js';
import { equivTables } from '../symbolic/libsemantics.js';

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

export default class EquivalenceTruthTableCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    gatherOptions() {
        return {
            notation: getNotationName(),
            question: this.questioncb.checked
        }
    }

    makeOptions(opts) {
        const questiondiv = addelem('div', this.settingsform);
        const questionlabel = addelem('label', questiondiv, {
            innerHTML: tr('Equivalence question') + ' '
        });
        this.questioncb = addelem('input', questionlabel, {
            checked: ("question" in opts && opts.question),
            type: 'checkbox',
            mypsc: this,
            onchange: function() {
                const psc = this.mypsc;
                const pcpc = psc.getElementsByClassName("problemcreator");
                for (const pc of pcpc) {
                    pc.makeAnswerer();
                }
                psc.makeChanged();
            }
        });
    }

    makeProblemCreator(problem, answer, isnew) {
        const pc = super.makeProblemCreator(problem, answer, isnew);
        pc.notationname = getNotationName();
        const fmlLabelA = addelem('div', pc.probinfoarea, {
            innerHTML: tr('Formula A')
        });
        pc.Formula = getFormulaClass(pc.notationname);
        pc.fmlInputA = FormulaInput.getnew({
            notation: pc.notationname,
            lazy: true,
            pred: false
        });
        pc.probinfoarea.appendChild(pc.fmlInputA);
        const fmlLabelB = addelem('div', pc.probinfoarea, {
            innerHTML: tr('Formula B')
        });
        pc.fmlInputB = FormulaInput.getnew({
            notation: pc.notationname,
            lazy: true,
            pred: false
        });
        pc.probinfoarea.appendChild(pc.fmlInputB);

        pc.fmlInputA.mypc = pc;
        pc.fmlInputB.mypc = pc;
        pc.fmlInputA.oninput = function() { this.mypc.whenchanged(); }
        pc.fmlInputB.oninput = function() { this.mypc.whenchanged(); }
        pc.fmlInputA.onchange = function() { this.mypc.whenchanged(); }
        pc.fmlInputB.onchange = function() { this.mypc.whenchanged(); }
        pc.fmlInputA.onkeydown = function() { this.mypc.whenchanged(); }
        pc.fmlInputB.onkeydown = function() { this.mypc.whenchanged(); }
        pc.getProblem = function() { return { 
            l: this.fmlInputA.value,
            r: this.fmlInputB.value
        }}
        pc.getAnswer = function() {
            const pr = this.getProblem();
            const f = this.Formula.from(pr.l);
            const g = this.Formula.from(pr.r);
            return equivTables(f, g, this.notationname);
        }
        pc.makeAnswerer = function() {
            if (this.answerer) {
                const a = this.answerer;
                if (a.parentNode) {
                    a.parentNode.removeChild(a);
                }
            }
            const prob = this.getProblem();
            const fA = this.Formula.from(prob.l);
            const fB = this.Formula.from(prob.r);
            if (fA.wellformed && fB.wellformed) {
                this.ansbelowlabel.style.display = 'block';
                this.ansbelowlabel.innerHTML = tr('Answer is shown below');
                this.ansinfoarea.style.display = 'block';
                this.answerer = addelem('equivalence-truth-table', this.ansinfoarea);
                this.answerer.makeProblem(prob, this.mypsc.gatherOptions(), 'save');
                this.answerer.setIndicator = function() {};
                this.answerer.processAnswer = function() {};
                this.answerer.mypc = this;
                this.answerer.makeChanged = function() {
                    this.mypc.mypsc.makeChanged();
                };
                const ans = this.getAnswer();
                const bdivs = this.answerer.getElementsByClassName("buttondiv");
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
            if (problem?.l && problem?.r) {
                pc.fmlInputA.value = problem.l;
                pc.fmlInputB.value = problem.r;
            }
            pc.whenchanged();
        }
    }
}

customElements.define("equivalence-truth-table-creator", EquivalenceTruthTableCreator);


