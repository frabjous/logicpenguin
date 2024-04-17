// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/symbolic-translation.js ////////////////////
// class for creating problems for translating natural language        //
// statements into symbolic notation                                   //
/////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
//import TranslationExercise from '../problemtypes/symbolic-translation.js';
import { addelem } from '../common.js';
import { randomString } from '../misc.js';
import tr from '../translate.js';
import FormulaInput from '../ui/formula-input.js';

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

function sufficesForProblem(prob) {
    return (prob != '');
}

export default class TranslationExerciseCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    disableRadios() {
        const ii = this.getElementsByTagName("input");
        for (const inp of ii) {
            if (inp.type != 'radio') {
                continue;
            }
            inp.disabled = true;
            inp.title = tr('You cannot change this this after it is set ' +
                'or problems are created. Create a new problem set ' +
                'if need be.');
        }
    }

    gatherOptions() {
        return {
            pred: (this?.predradio?.checked),
            lazy: (!(this?.predradio?.checked)),
            notation: (this?.notation ?? 'Cambridge'),
            nofalsum: (!(this?.falsumcb?.checked))
        }
    }

    makeOptions(opts) {
        this.notation = getNotationName();
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
            checked: (("pred" in opts) && (opts.pred == false)),
            mypsc: this,
            onchange: function() {
                const psc = this.mypsc;
                psc.disableRadios();
                psc.makeChanged();
            }
        });
        const predlabel = addelem('label', toptionsdiv);
        const predspan = addelem('span', predlabel, {
            innerHTML: tr('predicate')
        });
        this.predradio = addelem('input', {
            type: "radio",
            id: radioname + 'predcb',
            name: radioname,
            mypsc: this,
            checked: (("pred" in opts) && opts.pred),
            onchange: function() {
                const psc = this.mypsc;
                psc.disableRadios();
                psc.makeChanged();
            }
        });
        if ("pred" in opts) {
            this.disableRadios();
        }
        const falsumlabel = addelem('label', topoptionsdiv, {
            innerHTML: tr('Allow falsum in translation')
        });
        this.falsumcb = addelem('input', falsumlabel, {
            type: "checkbox",
            checked: (("nofalsum" in opts) && (opts.nofalsum == false)),
            mypsc: this,
            onchange: function() {
                const psc = this.mypsc;
                psc.makeChanged();
            }
        });
    }

    makeProblemCreator(problem, answer, isnew) {
        if (!problem) { problem = ''; }
        if (!answer) { answer = ''; }
        const pc = super.makeProblemCreator(problem, answer, isnew);
        pc.mypsc = this;
        const totranslabel = addelem('div', pc.probinfoarea, {
            innerHTML: tr('Statement to translate')
        });
        pc.totransinput = addelem('textarea', pc.probinfoarea, {
            value: problem,
            mypc: pc,
            oninput: function() { this.mypc.whenChanged(); },
            onchange: function() { this.mypc.whenChanged(); }
        });
        pc.whenchanged = function() {
            const nowprob = this.getProblem();
            if (!sufficesForProbem(nowprob)) { continue; }
            if (this.answerer) {
                continue;
            }
            this.makeAnswerer('');
            this.mypsc.makeChanged();
        };
        pc.makeAnswerer = function(ans) {
            this.answerer = addelem('div', this.ansinfoarea, {
                mypc: this
            });
            this.answered.label = addelem('div', this.answerer, {
                innerHTML: tr('Translation') + ':'
            });
            this.answerer.fmlinput = FormulaInput.getnew({
                notation: this.mypsc.notation,
                pred: (this?.mypsc?.predradio?.checked),
                lazy: (!!(this?.mypsc?.predradio?.checked))
            });
            this.answerer.fmlinput.value = ans;
            this.answerer.fmlinput.mypc = this;
            this.answered.fmlinput.onchange = function() {
                this?.mypc?.mypsc.makeChanged();
            }
            this.answered.fmlinput.oninput = function() {
                this?.mypc?.mypsc.makeChanged();
            }
            // once answers are possible, can no longer change type
            if (this.mypsc.disableRadios) { this.mypsc.disableRadios(); }
        }
        if (answer && answer != '') {
            pc.makeAnswerer(answer);
        }
        pc.getProblem = function() {
            return this.totransinput.value;
        }
        pc.getAnswer = function() {
            if (!(this.answerer)) { return ''; }
            return this.answerer.fmlinput.value;
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

customElements.define("symbolic-translation-creator", TranslationExerciseCreator);


