// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-loraincounty.js /////////////////////////////////////
// Fitch-style derivations using the loraincounty rule set                      //
///////////////////////////////////////////////////////////////////////////////

import DerivationFitch from './derivation-fitch-base.js';

export default class DerivationLorainCounty extends DerivationFitch {

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
        if ((e.key == 'E') && (this.options.pred)) {
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
            }
            if (atStart || spaceBefore) {
                e.preventDefault();
                elem.insertHere(this.symbols.EXISTS);
            }
            // otherwise uppercase E unless part of DeM, obnoxious
        }
        if (e.key == 'e' && elem.selectionStart != 0) {
            const charBefore = elem.value[ (elem.selectionStart - 1) ];
            if ([ this.symbols.OR, this.symbols.AND, this.symbols.IFF,
                this.symbols.FORALL, this.symbols.EXISTS, this.symbols.NOT,
                this.symbols.IFTHEN, '='].indexOf(charBefore) > 0) {
                e.preventDefault();
                elem.insertHere('E');
            }
        }
        // a for ∀, if notation uses quantifier
        if ((e.key == 'a') && (this.options.pred) &&
            (this.notation.quantifierForm.search('Q\\?') == -1)) {
            const charBefore = elem.value[ (elem.selectionStart - 1) ];
            // don't change after r for Trans
            if (charBefore != 'r') {
                e.preventDefault();
                elem.insertHere(this.symbols.FORALL);
            }
        }
        // letters used in names of rules should be uppercase
        if (/^[iwkhqt]$/.test(e.key)) {
            e.preventDefault();
            elem.insertHere(e.key.toUpperCase());
        }
    }

    makeProblem(problem, options, checksave) {
        // always use LorainCounty ruleset
        options.ruleset = 'loraincounty';
        // default to LorainCounty notation
        if (!("notation" in options)) {
            options.notation = 'loraincounty';
        }
        // default to rules first
        if (!("rulesFirst" in options)) {
            options.rulesFirst = true;
        }
        super.makeProblem(problem, options, checksave);
    }

}

customElements.define("derivation-loraincounty", DerivationLorainCounty);
