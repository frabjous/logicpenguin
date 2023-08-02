// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// justification-input.js //////////////////////////////
// creates input fields for justfication fields                       //
////////////////////////////////////////////////////////////////////////

import FormulaInput from './formula-input.js';
import { justParse } from './justification-parse.js';

export default class JustificationInput extends FormulaInput {

    constructor() {
        super();
    }

    static getnew(opts) {
        let elem = super.getnew(opts);
        // change classes to match different style
        elem.classList.remove("formulainput");
        elem.classList.remove("symbolic");
        elem.classList.add("justification");
        // modify various functions
        elem.insOp = JustificationInput.insOp;
        elem.inputfix = JustificationInput.justFix;
        elem.insertLineNum = JustificationInput.insertLineNum;
        elem.insertRuleCite = JustificationInput.insertRuleCite;
        // add an additional key listener
        elem.addEventListener("keydown", JustificationInput.keydownExtra);
        return elem;
    }

    // stick a number at the end and reorganize
    static insertLineNum(n) {
        this.value = this.inputfix(n + ',' + this.value);
    }

    static insertRuleCite(rule) {
        this.value = this.inputfix(this.value);
        // if has numbers before, remove current rule coming afterwards
        if (/[0-9][ ]+[^0-9]*$/.test(this.value)) {
            this.value = this.value.replace(/ .*/,'');
        } else {
            // if numbers at the end, remove what is before them
            if (/[0-9]/.test(this.value)) {
                this.value = this.value.replace(/^[^0-9]*/,'');
            } else {
                this.value = '';
            }
        }
        // if has numbers after, remove current rule coming before
        this.value = this.inputfix(this.value + ', ' + rule);
        // make changed
        if (this?.myline?.mysubderiv?.myprob.makeChanged) {
            this?.myline?.mysubderiv?.myprob.makeChanged(false, true);
        }
    }

    // unlike regular formula inputs, spaces are only put before operators
    static insOp(op) {
        const symbols = this.symbols;
        const symb = symbols[op];
        this.autoChange(/\s+$/,'', symb, /^\s+/, '');
        // if there was a negation before it, it's ok to eliminate that space
/*        this.autoChange(
            new RegExp(symbols.NOT + '\\s+','g'),symbols.NOT,'', /^\s+/, '');
        // autoChange will trigger makeChanged */
    }

    // parse the justification, and make it appear pretty
    static justFix(val) {
        if (val == '') { return ''; }
        let { nums, ranges, citedrules } = justParse(val);

        // sort stuff
        nums = nums.sort((a, b) => (a - b));
        ranges = ranges.sort(([a,b],[c,d]) => ((a-c==0) ? b-d : a-c));
        citedrules = citedrules.sort();

        // join stuff; note the ", " use a thin space
        val = nums.map((n)=>(n.toString())).join(', ');
        if (ranges.length > 0) {
            if (val != '') { val += ', '; }
            val += ranges.map(([s,e]) =>
                (s.toString() + '–' + e.toString())).join(', ');
        }
        if (citedrules.length > 0) {
            // allow rules first for, e.g., forallx nonsense
            if (this?.rulesFirst) {
                val = citedrules.join(', ') + ((val=='') ? '' : ' ' + val);
            } else {
                if (val != '') { val += ' '; };
                val += citedrules.join(', ');
            }
        }
        return val;
    }

    // look for problem specific key listener extras
    static keydownExtra(e) {
        if (this?.myline?.mysubderiv?.myprob?.justKeydownExtra) {
            this.myline.mysubderiv.myprob.justKeydownExtra(e, this);
        }
    }
}


