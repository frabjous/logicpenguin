// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// evaluate-truth.js /////////////////////////////////
// given an interpretation, calculate the truth/falsity of a symbolic //
// statement; implemented as a species of true-false problems         //
////////////////////////////////////////////////////////////////////////

import TrueFalseExercise from './true-false.js';
import { htmlEscape } from '../common.js';
import tr from '../translate.js';

export default class EvaluateTruthExercise extends TrueFalseExercise  {

    constructor() {
        super();
    }

    // just a true/false question with the symbolic class attached to
    // the prompt
    makeProblem(problem, options, checksave) {
        const probwithoptions = {}
        probwithoptions.prompt = htmlEscape(problem);
        probwithoptions.choices = [ tr('True'), tr('False') ];
        super.makeProblem(probwithoptions);
        this.promptdiv.classList.add('symbolic');
        this.myquestion = problem;
    }

}

customElements.define("evaluate-truth", EvaluateTruthExercise);
