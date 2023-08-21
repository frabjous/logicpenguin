// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/true-false.js ///////////////////////////
// class for creating true/false questions                          //
//////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import TrueFalseExercise from '../problemtypes/true-false.js';
import { addelem } from '../common.js';

export default class TrueFalseCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    makeProblemCreator(problem, answer, isnew) {
        const pc = super(problem, answer, isnew);
        const promptlabel = addelem('div', pc.probinfoarea, {
            innerHTML: 'Prompt'
        });
        pc.whenchanged = function() {
            if (this?.probleminput && this.probleminput.value != '') {
                if (this?.ansbelowlabel) {
                    this.ansbelowlabel.style.display = 'block';
                    let ans = -1;
                    if (this.getAnswer) {
                        ans = this.getAnswer();
                    }
                    this.ansinfoarea.innerHTML = '';
                    this.answerer = addelem('true-false', this.ansinfoarea);
                    this.answerer.makeProblem({
                        prompt: this.probleminput.value
                    }, {}, 'save');
                    if (ans !== -1) {
                        this.answerer.restoreAnswer(ans);
                    }
                }
            } else {
                if (this?.ansbelowlabel) {
                    this.ansbelowlabel.style.display = 'none';
                }
                if (this?.ansinfoarea) {
                    this.ansinfoarea.innerHTML = '';
                }
            }
        }
        pc.probleminput = addelem('textarea', pc.probinfoarea, {
            value: (problem?.prompt ?? ''),
            mypc: pc,
            oninput: function() { this.mypc.whenchanged(); }
            onchange: function() { this.mypc.whenchanged(); }
        });
        pc.getProblem = function() {
            return { prompt: this.probleminput.value }
        }
        pc.getAnswer = function() {
            if (this.answerer) {
                return this.answerer.getAnswer();
            }
            return -1;
        }
        if (!isnew) {
            pc.probleminput = answer.prompt,
            pc.whenchanged();
            if (this.answerer) {
                this.answerer.restoreAnswer(answer);
            }
        }
        return pc;
    }

}

customElements.define("true-false-creator", TrueFalseCreator);
