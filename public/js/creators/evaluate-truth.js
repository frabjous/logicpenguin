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

export default class EvaluateTruthExerciseCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    makeProblemCreator(problem, answer, isnew) {
        const pc = super.makeProblemCreator(problem, answer, isnew);
        const fmlLabel = addelem('div', pc.probinfoarea, {
            innerHTML: 'Formula'
        });
        this.notationname = 
        
    }

}
