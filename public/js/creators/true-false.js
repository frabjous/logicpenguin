// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/true-false.js ///////////////////////////
// class for creating true/false questions                          //
//////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import TrueFalseExercise from '../problemtypes/true-false.js';
import { addelem } from '../common.js';
import tr from '../translate.js';

export default class TrueFalseCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    makeProblemCreator(problem, answer, isnew) {
        const pc = super.makeProblemCreator(problem, answer, isnew);
        const promptlabel = addelem('div', pc.probinfoarea, {
            innerHTML: tr('Prompt')
        });
        pc.whenchanged = function() {
            if (this?.probleminput && this.probleminput.value != '') {
                if (this?.ansbelowlabel) {
                    this.ansbelowlabel.style.display = 'block';
                    // avoid problem of regenerating problem just
                    // when moving between
                    if ("lastmade" in this && this.probleminput.value == this.lastmade) {
                        return;
                    }
                    this.lastmade = this.probleminput.value;
                    let ans = -1;
                    if (this.getAnswer) {
                        ans = this.getAnswer();
                    }
                    this.ansinfoarea.innerHTML = '';
                    this.answerer = addelem('true-false', this.ansinfoarea);
                    this.answerer.makeProblem({
                        prompt: this.probleminput.value
                    }, {}, 'save');
                    this.answerer.processAnswer = function() {};
                    this.answerer.mypc = this;
                    this.answerer.makeChanged = function() {
                        this.mypc.mypsc.makeChanged();
                    };
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
            oninput: function() { this.mypc.whenchanged(); },
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
            if ("prompt" in problem) {
                pc.probleminput.value = problem.prompt;
            }
            pc.whenchanged();
            if (pc.answerer) {
                pc.answerer.restoreAnswer(answer);
            }
        }
        return pc;
    }

     postCreate() {
         this.partialcreditcb.checked = false;
         this.partialcreditcb.disabled = true;
     }

}

customElements.define("true-false-creator", TrueFalseCreator);
