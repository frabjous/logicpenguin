
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
