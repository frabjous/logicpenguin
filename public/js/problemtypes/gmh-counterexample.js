// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// gmh-counterexample.js //////////////////////////////
// asks if a given categorical-type argument has counterexamples;    //
// will hopefully replaced with a better way of asking for           //
// counterexamples                                                   //
///////////////////////////////////////////////////////////////////////

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

        // create a table for the answer options
        const rtbody = addelem('tbody', this.radiotable, {});
        const xtr = addelem('tr',rtbody,{});
        const tdc = addelem('td', xtr, {
            innerHTML: tr('Can a counterexample be constructed?')
        });
        const tdr = addelem('td', xtr);

        // create yes or no radio options
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
        const ylabel = addelem('label', tdr, {
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
        const nlabel = addelem('label', tdr, {
            innerHTML: tr('No'),
            htmlFor: randomid + 'rb-no'
        });
        this.radios.myval = function() {
            if (this.yes.checked) { return true; }
            if (this.no.checked) { return false; }
            return -1;
        }

        // comment is where we might show an actual counterexample
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

    // setting the indicator should also show a counterexample
    // if indeed one can be constructed
    setIndicator(ind) {
        super.setIndicator(ind);
        if (ind.counterexample) {
            this.showCounterexample(ind.counterexample);
        } else {
            if (this.comment) { this.comment.innerHTML = ''; }
        }
    }

    // the counterexamples are implemented as argument boxes
    showCounterexample(counterexample) {
        if (!this.comment) { return; }
        this.comment.innerHTML = '';
        addelem('span', this.comment, {
            innerHTML: 'Counterexample: ',
            classes: [ 'counterexamplelabel' ]
        });
        const ctxBox = argumentBox(counterexample.prems,
            counterexample.conc);
        this.comment.append(ctxBox);
    }

}

customElements.define("gmh-counterexample", OldCounterexample);
