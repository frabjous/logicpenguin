import LogicPenguinProblem from '../problem-class.js';
import { addelem, byid } from   '../common.js';
import { randomString } from    '../misc.js';
import tr from                  '../translate.js';
import { argumentBox } from     '../ui/argumentbox.js';

export default class OldCounterexample extends LogicPenguinProblem {

    constructor() {
        super();
    }

    makeProblem(problem, options, checksave) {
        // attach options
        this.options = options;

        this.argumentbox = argumentBox(problem.prems, problem.conc);
        this.append(this.argumentbox);

        // separate with a blank line
        addelem('p', this, {});

        // radio inputs with choices
        this.radiotable = addelem('table', this, {
            classes: [ 'radiotable' ]
        });
        let randomid;
        do { randomid = randomString(4); }
            while (document.getElementById(randomid));
        this.radiotable.id = randomid;

        let rtbody = addelem('tbody', this.radiotable, {});
        let xtr = addelem('tr',rtbody,{});
        let tdc = addelem('td', xtr, {
            innerHTML: 'Can a counterexample be constructed?'
        });
        let tdr = addelem('td', xtr);
        this.radios = {};
        this.radios.yes = addelem('input', tdr, {
            type: 'radio',
            name: randomid + 'rb',
            id: randomid + 'rb-yes',
            myprob: this,
            onchange: function() {
                this.myprob.makeChanged();
                this.myprob.processAnswer();
            }
        });
        let ylabel = addelem('label', tdr, {
            innerHTML: tr('Yes'),
            htmlFor: randomid + 'rb-yes'
        });
        this.radios.no = addelem('input',tdr,{
            type: 'radio',
            name: randomid + 'rb',
            id: randomid + 'rb-no',
            myprob: this,
            onchange: function() {
                this.myprob.makeChanged();
                this.myprob.processAnswer();
            }
        });
        let nlabel = addelem('label', tdr, {
            innerHTML: tr('No'),
            htmlFor: randomid + 'rb-no'
        });
        this.radios.myval = function() {
            if (this.yes.checked) { return true; }
            if (this.no.checked) { return false; }
            return -1;
        }
        this.comment = addelem('div',this, {
            classes: ['counterexample']
        });
        super.makeProblem(problem);
    }

    getAnswer() {
        if (this.radios.yes.checked) { return false; }
        if (this.radios.no.checked) { return true; }
        return -1;
    }

    restoreAnswer(ans) {
        this.radios.yes.checked = (ans === false);
        this.radios.no.checked = (ans === true);
    }

    setIndicator(ind) {
        super.setIndicator(ind);
        if (ind.counterexample) {
            this.showCounterexample(ind.counterexample);
        } else {
            if (this.comment) { this.comment.innerHTML = ''; }
        }
    }

    showCounterexample(counterexample) {
        if (!this.comment) { return; }
        this.comment.innerHTML = '';
        addelem('span', this.comment, {
            innerHTML: 'Counterexample: ',
            classes: [ 'counterexamplelabel' ]
        });
        let ctxBox = argumentBox(counterexample.prems,
            counterexample.conc);
        this.comment.append(ctxBox);
    }

}

customElements.define("gmh-counterexample", OldCounterexample);
