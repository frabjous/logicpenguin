// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////// symbolic-argument-input.js ////////////////////////////////
// creates an input box for an entire argument, where premises can be  //
// added or removed, etc.                                              //
/////////////////////////////////////////////////////////////////////////

import { addelem, htmlEscape } from '../common.js';
import getFormulaClass from '../symbolic/formula.js';
import FormulaInput from './formula-input.js';
import tr from '../translate.js';

export default class SymbolicArgumentInput {

    static addPremise() {
        if (!this.premisecell) { return; }
        const pr = addelem('div', this.premisecell, {
            classes: ['symbargpremise']
        });
        const opts = this.options ?? {};
        // get notation name from Formula class if need be
        if (!"notation" in opts) {
            opts.notation = this.Formula.syntax.notationname;
        }
        pr.myinput = FormulaInput.getnew( (this.options ?? {}) );
        pr.myinput.myelem = this;
        pr.appendChild(pr.myinput);
        pr.myinput.oninput = function() {
            this.classList.remove('error');
            if (this?.myelem?.oninput) {
                this.myelem.oninput();
            }
        }
        pr.myinput.onchange = function() {
            if (this?.myelem?.onchange) {
                this.myelem.onchange();
            }
        }
        pr.myinput.onkeydown = function() {
            if (this?.myelem?.oninput) {
                this.myelem.oninput();
            }
        }
        pr.myarg = this;
        return pr;
    }

    static clearme() {
        // remove all premises
        const pp = this.getElementsByClassName("symbargpremise");
        while (pp.length > 0) {
            let p = pp[ pp.length - 1];
            p.parentNode.removeChild(p);
        }
        // add a blank premise back
        this.addPremise();
        // clear conclusion field
        const cc = this.getElementsByClassName("symbargconc");
        if (cc && cc.length > 0 && cc[0].myinput) {
            cc[0].myinput.value = '';
        }
    }

    // read the argument
    static getArgument() {
        const arg = { prems: [], conc: '' };
        const pp = this.getElementsByClassName("symbargpremise");
        // read premises
        for (const p of pp) {
            if (p.myinput && p.myinput.value != '') {
                const f = this.Formula.from(p.myinput.value);
                // make non-well formed formulas an error
                if (!f.wellformed) {
                    p.myinput.classList.add('error');
                    return false;
                }
                arg.prems.push(f.normal);
            }
        }
        // read conclusion
        const cc = this.getElementsByClassName("symbargconc");
        if (!cc || cc.length < 1) { return false; }
        const c = cc[0];
        // conclusion cannot be empty
        if (!c.myinput || c.myinput.value == '') {
            return false;
        }
        const s = c.myinput.value;
        const cf = this.Formula.from(s);
        // check its conclusion for being well-formed
        if (!cf.wellformed) {
            c.myinput.classList.add('error');
            return false;
        }
        arg.conc = cf.normal;
        return arg;
    }

    static getnew(options = {}) {
        // use cambridge if no notation given
        options.notation = options.notation ?? 'cambridge';

        // create base element
        const elem = document.createElement("div");
        elem.classList.add('symbolicargumentinput');
        elem.options = options;

        // assign Formula class based on notation
        const Formula = getFormulaClass(options.notation);
        elem.Formula = Formula;

        // create table
        const table = addelem('table', elem);
        const tbody = addelem('tbody', table);

        // create expandable row for premises
        const premrow = addelem('tr', tbody);
        const premlabel = addelem('td', premrow, {
            innerHTML: tr('premises')
        });
        elem.premisecell = addelem('td', premrow);
        const buttonrow = addelem('tr', tbody, {
            classes: ['symbolicarginputbuttonrow']
        });
        const buttonlabel = addelem('td', buttonrow);
        const buttoncell = addelem('td', buttonrow);

        // create plus and minus buttons
        const plusbutton = addelem('button', buttoncell, {
            title: 'add premise',
            type: 'button',
            innerHTML: '+',
            classes: ['symbarginputbutton'],
            onclick: function(e) {
                this.myelem.addPremise();
                if (this.myelem.onchange) { this.myelem.onchange(); }
            }
        });
        plusbutton.myelem = elem;
        const minusbutton = addelem('button', buttoncell, {
            title: 'remove premise',
            type: 'button',
            innerHTML: '−',
            classes: ['symbarginputbutton'],
            onclick: function(e) {
                this.myelem.removePremise();
                if (this.myelem.onchange) { this.myelem.onchange(); }
            }
        });
        minusbutton.myelem = elem;

        // functions for adding and removing premises
        elem.addPremise = SymbolicArgumentInput.addPremise;
        elem.removePremise = SymbolicArgumentInput.removePremise;

        // start with a blank premise
        elem.addPremise();

        // create row for conclusion
        const concrow = addelem('tr', tbody);
        const conclabel = addelem('td', concrow,{
            innerHTML: tr('conclusion')
        });
        const conccell = addelem('td', concrow);
        const concdiv = addelem('div', conccell,{
            classes: ['symbargconc']
        });

        // conclusion input field
        concdiv.myinput = FormulaInput.getnew(options);
        concdiv.appendChild(concdiv.myinput);
        concdiv.myinput.myelem = elem;
        concdiv.myinput.oninput = function() {
            this.classList.remove('error');
            if (this?.myelem?.oninput) {
                this.myelem.oninput();
            }
        }
        concdiv.myinput.onchange = function() {
            if (this?.myelem?.onchange) {
                this.myelem.onchange();
            }
        }
        concdiv.myinput.onkeydown = function() {
            if (this?.myelem?.oninput) {
                this.myelem.oninput();
            }
        }
        // assign get argument and clearing functions
        elem.getArgument = SymbolicArgumentInput.getArgument;
        elem.clearme = SymbolicArgumentInput.clearme;

        // return the element
        return elem;
    }

    static removePremise() {
        const pp = this.getElementsByClassName("symbargpremise");
        if (!pp) { return; }
        if (pp.length < 1) { return; }
        const goner = pp[ pp.length - 1 ];
        goner.parentNode.removeChild(goner);
    }

}
