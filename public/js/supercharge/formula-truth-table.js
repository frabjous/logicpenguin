// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import { addelem } from '../common.js';

export function chargeup(probelem) {
    probelem.showansButton = addelem('button', probelem.buttonDiv, {
        innerHTML: 'show answer',
        type: 'button',
        myprob: probelem,
        onclick: function() {
            this.myprob.getSolution();
        }
    });
    return;
}

