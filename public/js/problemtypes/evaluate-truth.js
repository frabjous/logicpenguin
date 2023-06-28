// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import TrueFalseExercise from './true-false.js';
import { htmlEscape } from '../common.js';
import tr from '../translate.js';

export default class EvaluateTruthExercise extends TrueFalseExercise  {

    constructor() {
        super();
    }

    makeProblem(problem, options, checksave) {
        let probwithoptions = {}
        probwithoptions.prompt = htmlEscape(problem);
        probwithoptions.choices = [ tr('True'), tr('False') ];
        super.makeProblem(probwithoptions);
        this.promptdiv.classList.add('symbolic');
        this.myquestion = problem;
    }

}

customElements.define("evaluate-truth", EvaluateTruthExercise);
