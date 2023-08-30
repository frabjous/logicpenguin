// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/argument-truth-table.js /////////////////////
// class for creating truth table problems for arguments                //
//////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import ArgumentTruthTable from '../problemtypes/argument-truth-table.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import  SymbolicArgumentInput from '../ui/symbolic-argument-input.js';
import { argumentTables } from '../symbolic/libsemantics.js';

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

export default class ArgumentTruthTableCreator extends LogicPenguinProblemSetCreator {
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
        pc.Formula = getFormulaClass(pc.notationname);
        pc.sai = SymbolicArgumentInput.getnew({
            notation: pc.notationname,
            lazy: true,
            pred: false
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
            const arg = this.getProblem();
            const cf = this.Formula.from(arg.conc);
            const pfs = arg.prems.map((f) => (this.Formula.from(f)))l
            return argumentTables(pfs, cf, this.notationname);
        }
        pc.makeAnswerer = function() {
            if (this.answerer) {
                const a = this.answerer;
                if (a.parentNode) {
                    a.parentNode.removeChild(a);
                }
            }
            const prob = this.getProblem();
            if (prob) {
                this.ansbelowlabel.style.display = 'block';
                this.ansbelowlabel.innerHTML = tr('Answer is shown below');
                this.ansinfoarea.style.display = 'block';
                this.answerer = addelem('argument-truth-table', this.ansinfoarea);
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

customElements.define("argument-truth-table-creator", ArgumentTruthTableCreator);



