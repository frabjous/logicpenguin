// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// derivation-msu.js /////////////////////////////////////
// Fitch-style derivations using the msu rule set                      //
/////////////////////////////////////////////////////////////////////////

import DerivationFitch from './derivation-fitch-base.js';

export default class DerivationMSU extends DerivationFitch {

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
        // always use MSU ruleset
        options.ruleset = 'msu';
        // default to MSU notation
        if (!("notation" in options)) {
            options.notation = 'msu';
        }
        // default to rules first
        if (!("rulesFirst" in options)) {
            options.rulesFirst = true;
        }
        super.makeProblem(problem, options, checksave);
    }

}

customElements.define("derivation-msu", DerivationMSU);
