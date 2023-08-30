// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/formula-truth-table.js /////////////////////
// class for creating truth table problems for formulas                //
/////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import FormulaTruthTable from '../problemtypes/formula-truth-table.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import FormulaInput from '../ui/formula-input.js';
import { formulaTable } from '../symbolic/libsemantics.js';

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

export default class FormulaTruthTableCreator extends LogicPenguinProblemSetCreator {
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
            innerHTML: tr('Taut/Self-Contr/Contingent question') + ' '
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
        const fmlLabel = addelem('div', pc.probinfoarea, {
            innerHTML: tr('Formula')
        });
        pc.notationname = getNotationName();
        pc.Formula = getFormulaClass(pc.notationname);
        pc.fmlInput = FormulaInput.getnew({
            notation: pc.notationname,
            lazy: true,
            pred: false
        });
        pc.probinfoarea.appendChild(pc.fmlInput);
        pc.fmlInput.mypc = pc;
        pc.fmlInput.oninput = function() { this.mypc.whenchanged(); }
        pc.fmlInput.onchange = function() { this.mypc.whenchanged(); }
        pc.fmlInput.onkeydown = function() { this.mypc.whenchanged(); }
        pc.getProblem = function() { return this.fmlInput.value; }
        pc.getAnswer = function() {
            const f = this.Formula.from(this.getProblem());
            return formulaTable(f, this.notationname);
        }
        pc.makeAnswerer = function() {
            if (this.answerer) {
                const a = this.answerer;
                if (a.parentNode) {
                    a.parentNode.removeChild(a);
                }
            }
            const prob = this.getProblem();
            const f = this.Formula.from(prob);
            if (f.wellformed) {
                this.ansbelowlabel.style.display = 'block';
                this.ansbelowlabel.innerHTML = tr('Answer is shown below');
                this.ansinfoarea.style.display = 'block';
                this.answerer = addelem('formula-truth-table', this.ansinfoarea);
                this.answerer.makeProblem(prob, this.mypsc.gatherOptions(), 'save');
                this.answerer.setIndicator = function() {};
                this.answerer.processAnswer = function() {};
                this.answerer.mypc = this;
                this.answerer.makeChanged = function() {
                    this.mypc.mypsc.makeChanged();
                };
                const ans = this.getAnswer();
                this.answerer.myanswer = ans;
                const bdivs = this.answerer.getElementsByClassName("buttondiv");
                for (const bdiv of bdivs) {
                    bdiv.style.display = 'none';
                }
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
            if (problem && problem != '') {
                pc.fmlInput.value = problem;
            }
            pc.whenchanged();
        }
    }
}

customElements.define("formula-truth-table-creator", FormulaTruthTableCreator);

