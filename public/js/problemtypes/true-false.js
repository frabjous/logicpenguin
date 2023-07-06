// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// true-false.js ////////////////////////////////////////
// true or false type questions; a sub-class of multiple choice        //
/////////////////////////////////////////////////////////////////////////

import MultipleChoiceExercise from './multiple-choice.js';
import tr from '../translate.js';

export default class TrueFalseExercise extends MultipleChoiceExercise {
    constructor(probleminfo) {
        super();
    }

    // problem is just a multiple choice problem with two options
    makeProblem(problem, options, checksave) {
        const probwithoptions = {}
        probwithoptions.prompt = problem.prompt;
        probwithoptions.choices = [ tr('True'), tr('False') ];
        super.makeProblem(probwithoptions, options, checksave);
        this.myquestion = problem;
    }

    getAnswer() {
        // True if index 0; return true if that's what's checked
        // Or -1 if neither is checked
        const checkedindex = super.getAnswer();
        if (checkedindex === -1) { return -1; }
        return (checkedindex == 0);
    }

    restoreAnswer(ans) {
        // first box = True; so checked when ans=true
        // second box = False, so checked when ans=false
        // if ans==-1 neither should get checked
        if (!this.radios[0] || !this.radios[1]) { return; }
        this.radios[0].checked = (ans === true);
        this.radios[1].checked = (ans === false);
    }
}

customElements.define("true-false", TrueFalseExercise);
