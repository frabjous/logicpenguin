// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////////// multiple-choice.js ///////////////////////////////
// multiple choice problem type                                       //
////////////////////////////////////////////////////////////////////////

import LogicPenguinProblem from '../problem-class.js';
import { addelem, byid } from '../common.js';
import { randomString } from '../misc.js';

export default class MultipleChoiceExercise extends LogicPenguinProblem {

    constructor() {
        super();
    }

    makeProblem(problem, options, checksave) {

        // question prompt
        this.promptdiv = addelem('div', this, {
            innerHTML: problem.prompt
        });

        // radio inputs with choices
        this.radiocontainer = addelem('div', this, {
            classes: [ 'radiocontainer' ]
        });
        this.radios = [];
        let idbase;
        do {
            idbase = randomString(4);
        } while (byid(idbase));
        this.radiocontainer.id = idbase;
        for (const choice of problem.choices) {
            const d = addelem('div', this.radiocontainer, {});
            const i = addelem('input', d, {
                type: 'radio',
                id: idbase + '-' + choice,
                name: idbase + 'radios',
                myex: this,
                onchange: function() {
                    this.myex.makeChanged();
                    this.myex.processAnswer();
                },
                checked: false
            });
            this.radios.push(i);
            const l = addelem('label', d, {
                innerHTML: choice,
                htmlFor: idbase + '-' + choice
            });
        }
        super.makeProblem(problem, options, checksave);
    }

    getAnswer() {
        // answer is index of checked radio box, or -1 if none are
        if (!this.radios) { return -1; }
        for (let i=0; i<this.radios.length; i++) {
            if (this.radios[i].checked) {
                return i;
            }
        }
        return -1;
    }

    restoreAnswer(ans) {
        // to restore, check only the radio box matching ans
        if (!this.radios) { return false; }
        for (let i=0; i<this.radios.length; i++) {
            this.radios[i].checked = (i == ans);
        }
    }
}

customElements.define("multiple-choice", MultipleChoiceExercise);
