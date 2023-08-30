// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/valid-correct-sound.js /////////////////////
// class for creating problems checking validity, factual correctness  //
// and soundness                                                       //
/////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import OldCounterexample from '../problemtypes/gmh-counterexample.js';
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

function sufficesForProblem(prob) {
    return (prob.conc != '' && prob.prems.length > 0)
}

export default class OldCounterexampleCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    makeProblemCreator(problem, answer, isnew) {
        if (!("prems" in problem)) { problem.prems = []; }
        if (!("conc" in problem)) { problem.conc = ''; }
        const pc = super.makeProblemCreator(problem, answer, isnew);
        pc.mip = multiInputField(pc.probinfoarea, 'Premise', problem?.prems ?? [], 2);
        pc.mip.mypc = pc;
        pc.mip.onchange = function() { this.mypc.whenchanged(); }
        pc.mip.oninput = function() { this.mypc.whenchanged(); }
        const concdiv = addelem('div', pc.probinfoarea, {
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
        pc.ctxarea = addelem('div', pc.ansinfoarea);
        pc.ctxmip = multiInputField(pc.ctxarea, 'Counterexample premise', answer?.counterexample?.prems ?? [], 2);
        pc.ctxmip.mypc = pc;
        pc.ctxmip.onchange = function() { this.mypc.whenchanged(); }
        pc.ctxmip.oninput = function() { this.mypc.whenchanged(); }
        pc.ctxconcdiv = addelem('div', pc.ctxarea, {
            classes: ['fielddiv']
        });
        const ctxconclabel = addelem('div', pc.ctxconcdiv, {
            innerHTML: tr('Counterexample conclusion')
        });
        pc.ctxconcinput = addelem('input', pc.ctxconcdiv, {
            value: answer?.counterexample?.conc ?? '',
            mypc: pc,
            oninput: function() { this.mypc.whenchanged(); },
            onchange: function() { this.mypc.whenchanged(); }
        });
        if (("counterexample" in answer) && ("conc" in answer.counterexample)) {
            pc.ctxconcinput.value = answer.counterexample.conc;
        }
        pc.ctxarea.style.display = 'none';
        pc.origanswer = answer;
        pc.origproblem = problem;
        pc.mypsc = this;
        pc.makeAnswerer = function() {
            let ans = this.origanswer;
            const prob = this.getProblem();
            if (this?.answerer) {
                ans = this.getAnswer();
                const a = this.answerer;
                a.parentNode.removeChild(a);
            }
            if (!sufficesForProblem(prob)) { return; }
            this.answerer = addelem('gmh-counterexample', this.ansinfoarea);
            this.answerer.makeProblem(prob, {} , 'save');
            this.answerer.processAnswer = function() {};
            this.answerer.mypc = this;
            this.answerer.makeChanged = function() {
                const newans = this.mypc.getAnswer();
                if (newans.valid) {
                    this.mypc.ctxarea.style.display = 'none';
                } else {
                    this.mypc.ctxarea.style.display = 'block';
                }
                this.restoreAnswer(newans?.valid);
                this.mypc.mypsc.makeChanged();
            };
            this.answerer.restoreAnswer(ans.valid);
            if (this.ctxarea) {
                this.ctxarea.parentNode.appendChild(this.ctxarea);
            }
        }
        pc.whenchanged = function() {
            const nowprob = this.getProblem();
            if (sufficesForProblem(nowprob)) {
                this.ansbelowlabel.style.display = 'block';
                this.ansinfoarea.style.display = 'block';
                if ("lastmade" in this && sameProblem(this.lastmade, nowprob)) {
                    return;
                }
                this.lastmade = nowprob;
                this.makeAnswerer();
                if (this?.answerer?.getAnswer() === false) {
                    this.ctxarea.style.display = 'block';
                } else {
                    this.ctxarea.style.display = 'none';
                }
            } else {
                this.ctxarea.style.display = 'none';
                if (this?.ansbelowlabel) {
                    this.ansbelowlabel.style.display = 'none';
                }
                if (this?.ansinfoarea) {
                    this.ansinfoarea.style.display = 'none';
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
                const rv = {};
                const v = this.answerer.getAnswer();
                rv.valid = v;
                if (v===false) {
                    rv.counterexample = {
                        prems: this.ctxmip.getvalues(),
                        conc: this.ctxconcinput.value
                    }
                }
                return rv;
            }
            return {
                valid: -1
            };
        }
        if (!isnew) {
            if ("conc" in problem) {
                pc.concinput.value = problem.conc;
            }
            pc.whenchanged();
            if (pc.answerer) {
                pc.answerer.restoreAnswer(answer?.valid ?? -1);
            }
        }
        return pc;
    }

     postCreate() {
         this.partialcreditcb.checked = false;
         this.partialcreditcb.disabled = true;
     }

}

customElements.define("gmh-counterexample-creator", OldCounterexampleCreator);

