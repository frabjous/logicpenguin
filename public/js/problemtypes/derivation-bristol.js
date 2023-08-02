// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-bristol.js /////////////////////////////////////
// Fitch-style derivations using the bristol rule set                      //
/////////////////////////////////////////////////////////////////////////////

import DerivationFitch from './derivation-fitch-base.js';

export default class DerivationBristol extends DerivationFitch {

    constructor() {
        super();
    }

    getAnswer() {
        return super.getAnswer();
    }

    getSolution() {
        return super.getSolution();
    }

    makeProblem(problem, options, checksave) {
        // always use Bristol ruleset
        options.ruleset = 'bristol';
        // default to Bristol notation
        if (!("notation" in options)) {
            options.notation = 'bristol';
        }
        // default to rules first
        if (!("rulesFirst" in options)) {
            options.rulesFirst = true;
        }
        super.makeProblem(problem, options, checksave);
    }

}

customElements.define("derivation-bristol", DerivationBristol);
