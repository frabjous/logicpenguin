// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-magnus.js /////////////////////////////////////
// Fitch-style derivations using the magnus rule set                      //
///////////////////////////////////////////////////////////////////////////////

import DerivationFitch from './derivation-fitch-base.js';

export default class DerivationMagnus extends DerivationFitch {

    constructor() {
        super();
    }

    getAnswer() {
        return super.getAnswer();
    }

    getSolution() {
        return super.getSolution();
    }

    // in justifications, certain letters auto-uppercase
    justKeydownExtra(e, elem) {
        if (e.ctrlKey || e.altKey) { return; }
        // e for ∃, simetimes
        if (((e.key == 'e') || (e.key == 'E')) && (this.options.pred)) {
            const atStart = (elem.selectionStart == 0);
            let spaceBefore = false;
            if (!atStart) {
                const charBefore = elem.value[ (elem.selectionStart - 1) ];
                // poorly named because we also want numbers before
                spaceBefore = (
                    (charBefore == ',') ||
                    (charBefore == ' ') ||
                    (charBefore == ' ') || // thin space
                    (charBefore == ' ') || // nonbreaking space
                    (charBefore == ' ') || // narrow nonbreaking space
                    (/[0-9]/.test(charBefore)));
                if (charBefore != 'D' && charBefore != this.symbols.IFF) {
                    e.preventDefault();
                    elem.insertHere('E');
                }
            }
            if (atStart || spaceBefore) {
                e.preventDefault();
                elem.insertHere(this.symbols.EXISTS);
            }
            // otherwise uppercase E unless part of DeM or ↔ex, obnoxious
        } else if (e.key == 'e') {
            console.log("here", (new Date()).getTime());
            const atStart = (elem.selectionStart == 0);
            let charBefore = '';
            if (!atStart) {
                charBefore = elem.value[ (elem.selectionStart - 1) ];
            }
            if (charBefore != 'D' && charBefore != this.symbols.IFF) {
                e.preventDefault();
                elem.insertHere('E');
            }
        }
        // a for ∀, if notation uses quantifier
        if ((e.key == 'a') && (this.options.pred) &&
            (this.notation.quantifierForm.search('Q\\?') == -1)) {
            e.preventDefault();
            elem.insertHere(this.symbols.FORALL);
        }
        // letters used in names of rules should be uppercase
        if (/^[cdilhnpqrst]$/.test(e.key)) {
            e.preventDefault();
            elem.insertHere(e.key.toUpperCase());
        }
    }

    makeProblem(problem, options, checksave) {
        // always use Magnus ruleset
        options.ruleset = 'magnus';
        // default to Magnus notation
        if (!("notation" in options)) {
            options.notation = 'magnus';
        }
        // default to rules first
        if (!("rulesFirst" in options)) {
            options.rulesFirst = true;
        }
        super.makeProblem(problem, options, checksave);
    }

}

customElements.define("derivation-magnus", DerivationMagnus);
