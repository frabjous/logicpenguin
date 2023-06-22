import LogicPenguinProblem from '../problem-class.js';
import { addelem, byid, htmlEscape } from '../common.js';
import tr from '../translate.js';
import { randomString } from '../misc.js';
import FormulaInput from '../ui/formula-input.js';

export default class TranslationExercise extends LogicPenguinProblem {

    constructor() {
        super();
    }

    makeProblem(problem, options, checksave) {
        this.options = options;
        // question prompt
        this.origdiv = addelem('div', this, {
            innerHTML: problem
        });
        // answer area
        this.anscontainer = addelem('div', this, {});
        let idbase;
        do {
            idbase = randomString(4);
        } while (byid(idbase));
        this.anslabel = addelem('label', this.anscontainer, {
            innerHTML: tr('Your translation: '),
            htmlFor: idbase
        });
        // actual answer input
        this.ansinput = FormulaInput.getnew(options);
        this.anscontainer.appendChild(this.ansinput);
        this.ansinput.id = idbase;
        this.ansinput.myprob = this;
        this.ansinput.blurHook = function() {
            if (this.value == this.oldvalue) {
                return;
            }
            this.oldvalue = this.value;
            this.myprob.makeChanged();
            if (this.value != '') {
                this.myprob.processAnswer();
            }
        }
        // comment area
        this.comment = addelem('div', this, {
            classes: ['transcomment', 'hidden']
        });
        // buttons
        this.buttonDiv = addelem('div', this, {
            classes: ['buttondiv']
        });
        this.checkSaveButton = addelem('button', this.buttonDiv, {
            innerHTML: checksave,
            myprob: this,
            onclick: function() {
                if (!this.myprob.classList.contains("checking")) {
                    this.myprob.processAnswer();
                }
            }
        });
        super.makeProblem(problem, options, checksave);
    }

    getAnswer() {
        if (!this.ansinput) { return ''; }
        return this.ansinput.value;
    }

    getSolution() {
        if (!("myanswer" in this)) { return null; }
        let ans = this.myanswer;
        this.restoreState({
            ans: ans,
            ind: {
                successstatus: 'correct',
                savedstatus: 'unsaved',
                points: -1,
                message: ''
            }
        });
        this.setComment('');
    }

    restoreAnswer(ans) {
        if (!this.ansinput) { return false; }
        this.ansinput.value = ans;
    }

    setComment(str) {
        if (!str || str=='') {
            this.comment.innerHTML = '';
            this.comment.classList.add("hidden");
            return;
        }
        this.comment.classList.remove("hidden");
        str = str.at(0).toUpperCase() + str.substr(1);
        if (str.at(-1) != '.' && str.at(-1) != '?' &&
            str.at(-1) != '!') {
            str += '.';
        }
        this.comment.innerHTML = str;
    }

    setIndicator(ind) {
        super.setIndicator(ind);
        if (ind.transmessage && ind.transmessage != '') {
            this.setComment(htmlEscape(ind.transmessage));
        } else {
            this.setComment('');
        }
    }
}

customElements.define("symbolic-translation", TranslationExercise);
