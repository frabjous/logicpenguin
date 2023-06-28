// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import { addelem } from '../common.js';

export function argumentBox(prems, conc) {
        let box = document.createElement("table");
        box.classList.add("nlargument");
        // argument box
        let tbody = addelem('tbody', box, {});
        for (let prem of prems) {
            let tr = addelem('tr', tbody, {});
            let td = addelem('td', tr, { innerHTML: prem });
        }
        let ctr = addelem('tr', tbody, {});
        let ctd = addelem('td', ctr, { innerHTML: '∴ ' + conc });
        return box;
}
