// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/multiple-choice.js //////////////////////
// class for creating multiple choice questions                     //
//////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import MultipleChoiceExercise from '../problemtypes/true-false.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import multiInputField from '../ui/multifield.js';

function sameProblem(p, q) {
    if (p?.prompt != q?.prompt) { return false; }
    if (p?.choices?.length != q?.choices?.length) { return false; }
    for (let i=0; i<p?.choices?.length; i++) {
        if (p?.choices?.[i] != q?.choices?.[i]) { return false; }
    }
    return true;
}

function sufficesForProblem(prob) {
    return (prob.prompt != '' && prob.choices.length > 0)
}

export default class MultipleChoiceCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    makeProblemCreator(problem, answer, isnew) {
        const pc = super.makeProblemCreator(problem, answer, isnew);
        const promptlabel = addelem('div', pc.probinfoarea, {
            innerHTML: tr('Prompt')
        });
        pc.promptinput = addelem('textarea', pc.probinfoarea, {
            value: (problem?.prompt ?? ''),
            mypc: pc,
            oninput: function() { this.mypc.whenchanged(); },
            onchange: function() { this.mypc.whenchanged(); }
        });
        pc.mip = multiInputField(pc.probinfoarea, 'Choice', problem?.choices ?? [], 2);
        pc.mip.mypc = pc;
        pc.mip.onchange = function() { this.mypc.whenchanged(); }
        pc.mip.oninput = function() { this.mypc.whenchanged(); }

        pc.whenchanged = function() {
            const nowprob = this.getProblem();
            if (sufficesForProblem(nowprob)) {
                this.ansbelowlabel.style.display = 'block';
                if ("lastmade" in this && sameProblem(this.lastmade, nowprob)) {
                    return;
                }
                this.lastmade = nowprob;
                this.ansinfoarea.innerHTML = '';
                const nowans = this.getAnswer();
                this.answerer = addelem('multiple-choice', this.ansinfoarea);
                this.answerer.makeProblem({
                    nowprob, {}, 'save'
                });
                this.answerer.processAnswer = function() {};
                this.answerer.mypc = this;
                this.answerer.makeChanged = function() {
                    this.mypc.mypsc.makeChanged();
                };
                if (nowans !== -1 && nowans < nowprob.choices.length) {
                    this.answerer.restoreAnswer(nowans);
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
        pc.getProblem = function() {
            return {
                prompt: this.promptinput.value,
                choices: this.mip.getvalues()
            }
        }
        pc.getAnswer = function() {
            if (this.answerer) {
                return this.answerer.getAnswer();
            }
            return -1;
        }
        if (!isnew) {
            if ("prompt" in problem) {
                pc.promptput.value = problem.prompt;
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

customElements.define("multiple-choice-creator", MultipleChoiceCreator);

