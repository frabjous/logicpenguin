// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/valid-correct-sound.js /////////////////////
// class for creating problems for translating natural language        //
// statements into symbolic notation                                   //
/////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import TranslationExercise from '../problemtypes/symbolic-translation.js';
import { addelem } from '../common.js';
import { randomString } from '../misc.js';
import tr from '../translate.js';
import multiInputField from '../ui/multifield.js';

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

function sameProblem(p, q) {
    return (p == q);
}

function sufficesForProblem(prob) {
    return (prob != '');
}

export default class TranslationExerciseCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    gatherOptions(opts) {
        return {
            pred: (this?.predradio?.checked),
            lazy: (!(this?.predradio?.checked)),
            notation: (this?.notation ?? 'Cambridge'),
            nofalsum: (!(this?.falsumcb?.checked))
        }
    }

    makeOptions(opts) {
        const toptionsdiv = addelem('div', this.settingsform);
        const radioname = this.newRadioName();
        const sentlabel = addelem('label', toptionsdiv);
        const sentspan = addelem('span', sentlabel, {
            innerHTML: tr('sentential')
        });
        this.sentradio = addelem('input', sentlabel, {
            type: "radio",
            id: radioname + 'sentcb',
            name: radioname,
            checked: (("pred" in opts) && (opts.pred == false))
        });
        const predlabel = addelem('label', toptionsdiv);
        const predspan = addelem('span', predlabel, {
            innerHTML: tr('predicate')
        });
        this.predradio = addelem('input', {
            type: "radio",
            id: radioname + 'predcb',
            name: radioname,
            checked: (("pred" in opts) && opts.pred)
        });
        const canttelllabel = addelem('label', canttelldiv, {
            innerHTML: tr('Allow “can’t tell”') + ' '
        });
        this.canttellcb = addelem('input', canttelllabel, {
            checked: ("allowcanttell" in opts && opts.allowcanttell),
            type: 'checkbox',
            mypsc: this,
            onchange: function() {
                const psc = this.mypsc;
                const pcpc = psc.getElementsByClassName("problemcreator");
                for (const pc of pcpc) {
                    pc.makeAnswerer();
                }
                psc.makeChanged();
            }
        });
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
            this.answerer = addelem('valid-correct-sound', this.ansinfoarea);
            this.answerer.makeProblem(prob, this.mypsc.gatherOptions() , 'save');
            this.answerer.processAnswer = function() {};
            this.answerer.mypc = this;
            this.answerer.makeChanged = function() {
                const newans = this.getAnswer();
                this.restoreAnswer(serverAnswerToUserAnswer(newans));
                this.mypc.mypsc.makeChanged();
            };
            this.answerer.restoreAnswer(ans);
        }
        pc.whenchanged = function() {
            const nowprob = this.getProblem();
            if (sufficesForProblem(nowprob)) {
                this.ansbelowlabel.style.display = 'block';
                if ("lastmade" in this && sameProblem(this.lastmade, nowprob)) {
                    return;
                }
                this.lastmade = nowprob;
                this.ansinfoarea.innerHTML = '';
                this.makeAnswerer();
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
            return {
                valid: -2,
                correct: -2
            };
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

    newRadioName() {
        let rn = randomString(6);
        while (this.getElementById(rn + 'sentcb')) {
            rn = randomString(6);
        }
        return rn;
    }

}

customElements.define("valid-correct-sound-creator", ValidCorrectSoundCreator);


