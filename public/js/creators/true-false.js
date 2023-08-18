// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// creators/true-false.js ///////////////////////////
// class for creating true/false questions                          //
//////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';

export default class TrueFalseCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }
}

customElements.define("true-false-creator", TrueFalseCreator);
