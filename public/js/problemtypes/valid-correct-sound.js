// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////// valid-correct-sound.js //////////////////////////////////
// given a categorical-style argument, determine whether it is valid or //
// invalid, factually correct or not, and sound or unsound              //
//////////////////////////////////////////////////////////////////////////

import LogicPenguinProblem from '../problem-class.js';
import { addelem, byid } from   '../common.js';
import { randomString } from    '../misc.js';
import tr from                  '../translate.js';
import { argumentBox } from     '../ui/argumentbox.js';

export default class ValidCorrectSound extends LogicPenguinProblem {

    constructor() {
        super();
    }

    checkIfComplete() {
        const ans = this.getAnswer();
        if ((ans.correct != -2) && (ans.valid != -2) && (ans.sound != -2)) {
            this.processAnswer();
        }
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
            classes: [ 'vcsradiotable' ]
        });
        let randomid;
        do { randomid = randomString(4); }
            while (document.getElementById(randomid));
        this.radiotable.id = randomid;

        const rtbody = addelem('tbody', this.radiotable, {});
        this.radiosets = {};
        for (const q of ['Factually correct?', 'Valid?', 'Sound?']) {
            const squishq = q.toLowerCase().replace(/[^a-z]/g,'');
            const xtr = addelem('tr',rtbody,{});
            const tdc = addelem('td', xtr, {innerHTML: tr(q)});
            const tdr = addelem('td', xtr);
            this.radiosets[squishq] = {};
            this.radiosets[squishq].yes = addelem('input', tdr, {
                type: 'radio',
                name: randomid + '-' + squishq,
                id: randomid + '-' + squishq + '-yes',
                classes: [ 'vcsradio' ],
                myprob: this,
                onchange: function() {
                    this.myprob.makeChanged();
                    this.myprob.checkIfComplete();
                }
            });
            const ylabel = addelem('label', tdr, {
                innerHTML: tr('Yes'),
                htmlFor: randomid + '-' + squishq + '-yes'
            });
            this.radiosets[squishq].no = addelem('input',tdr,{
                type: 'radio',
                name: randomid + '-' + squishq,
                id: randomid + '-' + squishq + '-no',
                classes: [ 'vcsradio' ],
                myprob: this,
                onchange: function() {
                    this.myprob.makeChanged();
                    this.myprob.checkIfComplete();
                }
            });
            const nlabel = addelem('label', tdr, {
                innerHTML: tr('No'),
                htmlFor: randomid + '-' + squishq + '-no'
            });
            if (this.options.allowcanttell) {
                this.radiosets[squishq].canttell = addelem('input',tdr,{
                    type: 'radio',
                    name: randomid + '-' + squishq,
                    id: randomid + '-' + squishq + '-canttell',
                    classes: [ 'vcsradio' ],
                    myprob: this,
                    onchange: function() {
                        this.myprob.makeChanged();
                        this.myprob.checkIfComplete();
                    }
                });
                const ctlabel = addelem('label', tdr, {
                    innerHTML: tr('Can’t Tell'),
                    htmlFor: randomid + '-' + squishq + '-canttell'
                });
            }
            this.radiosets[squishq].myval = function() {
                if (this.yes.checked) { return true; }
                if (this.no.checked) { return false; }
                if (this?.canttell?.checked) { return -1; }
                return -2;
            }
        }
        super.makeProblem(problem, options, checksave);
    }

    getAnswer() {
        return {
            correct: this.radiosets.factuallycorrect.myval(),
            valid: this.radiosets.valid.myval(),
            sound: this.radiosets.sound.myval()
        }
    }

    restoreAnswer(ans) {
        for (const subq of ['correct','valid','sound']) {
            const squish = (subq=='correct') ? 'factuallycorrect' : subq;
            const thisans = ans[subq];
            this.radiosets[squish].yes.checked = (thisans === true);
            this.radiosets[squish].no.checked = (thisans === false);
            if (this.options.allowcanttell) {
                this.radiosets[squish].canttell.checked =
                    (thisans === -1);
            }
        }
    }
}

customElements.define("valid-correct-sound", ValidCorrectSound);
