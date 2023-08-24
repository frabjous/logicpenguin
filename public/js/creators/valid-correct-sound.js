// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/valid-correct-sound.js /////////////////////
// class for creating problems checking validity, factual correctness  //
// and soundness                                                       //
/////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import ValidCorrectSound from '../problemtypes/valid-correct-sound.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import multiInputField from '../ui/multifield.js';

function sameProblem(p, q) {
    if (p?.conc != q?.conc) { return false; }
    if (p?.prems?.length != q?.prems?.length) { return false; }
    for (let i=0; i<p?.prems?.length; i++) {
        if (p?.prems?.[i] != q?.prems?.[i]) { return false; }
    }
    return true;
}

function serverAnswerToUserAnswer(servans) {
    if (servans.correct === true && servans.valid === true) {
        servans.sound = true;
        return servans;
    }
    if (servans.correct === false || servans.valid === false) {
        servans.sound = false;
        return servans;
    }
    servans.sound = -1;
    return servans;
}

function sufficesForProblem(prob) {
    return (prob.conc != '' && prob.prems.length > 0)
}

export default class ValidCorrectSoundCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    makeProblemCreator(problem, answer, isnew) {
        const pc = super.makeProblemCreator(problem, answer, isnew);
        pc.mip = multiInputField(pc.probinfoarea, 'Premise', problem?.prems ?? [], 2);
        pc.mip.mypc = pc;
        pc.mip.onchange = function() { this.mypc.whenchanged(); }
        pc.mip.oninput = function() { this.mypc.whenchanged(); }
        const concdiv = addelem('div', pc.probinfoarea,
            classes: ['fielddiv']
        });
        const conclabel = addelem('div', concdiv, {
            innerHTML: tr('Conclusion')
        });
        pc.concinput = addelem('input', concdiv, {
            value: (problem?.conc ?? ''),
            mypc: pc,
            oninput: function() { this.mypc.whenchanged(); },
            onchange: function() { this.mypc.whenchanged(); }
        });

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
                this.answerer.makeProblem( nowprob, {}, 'save');
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
                conc: this.concinput.value,
                prems: this.mip.getvalues()
            }
        }
        pc.getAnswer = function() {
            if (this.answerer) {
                const userans = this.answerer.getAnswer();
                delete(userans.sound);
                return userans;
            }
            return -1;
        }
        if (!isnew) {
            if ("conc" in problem) {
                pc.concinput.value = problem.conc;
            }
            pc.whenchanged();
            if (pc.answerer) {
                pc.answerer.restoreAnswer(serverAnswerToUserAnswer(answer));
            }
        }
        return pc;
    }

     postCreate() {
         this.partialcreditcb.checked = false;
         this.partialcreditcb.disabled = true;
     }

}

customElements.define("valid-correct-sound-creator", ValidCorrectSoundCreator);


