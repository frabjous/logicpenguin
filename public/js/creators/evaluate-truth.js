// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/evaluate-truth.js /////////////////////////////
// class for creating problems where the truth of a formula is evaluated  //
////////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import EvaluateTruthExercise from '../problemtypes/evaluate-truth.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import FormulaInput from '../ui/formula-input.js';
import { libtf } from '../symbolic/libsemantics.js';

const defaultInterp = {
    A: true,
    B: true,
    C: true,
    X: false,
    Y: false,
    Z: false
}

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

export default class EvaluateTruthExerciseCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    gatherOptions() {
        return {
            notation: getNotationName(),
            interp: defaultInterp
        }
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
        pc.ansinfoarea.classList.add('padabove');
        pc.getProblem = function() { return this.fmlInput.value; }
        pc.getAnswer = function() {
            const f = this.Formula.from(this.getProblem());
            return libtf.evaluate(f, defaultInterp, this.notationname).tv;
        }
        pc.whenchanged = function() {
            this.ansbelowlabel.style.display = 'none';
            const prob = this.getProblem();
            const f = this.Formula.from(prob);
            if (f.wellformed) {
                const ans = this.getAnswer();
                this.ansinfoarea.style.display = 'block';
                this.ansinfoarea.innerHTML = tr('Answer') + ': ' +
                    ((ans) ? tr('true') : tr('false'))
            } else {
                this.ansinfoarea.style.display = 'none';
            }
        }
        if (!isnew) {
            if (problem && problem != '') {
                pc.fmlInput.value = problem;
            }
            pc.whenchanged();
        }
    }

    postCreate() {
        this.partialcreditcb.checked = false;
        this.partialcreditcb.disabled = true;
    }

}

customElements.define("evaluate-truth-creator", EvaluateTruthExerciseCreator);
