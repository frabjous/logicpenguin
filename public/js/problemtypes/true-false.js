
import MultipleChoiceExercise from './multiple-choice.js';
import tr from '../translate.js';

export default class TrueFalseExercise extends MultipleChoiceExercise {
    constructor(probleminfo) {
        super();
    }
    makeProblem(problem, options, checksave) {
        let probwithoptions = {}
        probwithoptions.prompt = problem.prompt;
        probwithoptions.choices = [ tr('True'), tr('False') ];
        super.makeProblem(probwithoptions, options, checksave);
        this.myquestion = problem;
    }
    getAnswer() {
        // True if index 0; return true if that's what's checked
        // Or -1 if neither is checked
        let checkedindex = super.getAnswer();
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
