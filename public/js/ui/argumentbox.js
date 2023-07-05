// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////////////////////////////////////////////////////////////
// creates a little table for a natural language argument            //
///////////////////////////////////////////////////////////////////////

import { addelem } from '../common.js';

export function argumentBox(prems, conc) {
        const box = document.createElement("table");
        box.classList.add("nlargument");
        // argument box
        const tbody = addelem('tbody', box, {});
        for (const prem of prems) {
            const tr = addelem('tr', tbody, {});
            const td = addelem('td', tr, { innerHTML: prem });
        }
        const ctr = addelem('tr', tbody, {});
        const ctd = addelem('td', ctr, { innerHTML: '∴ ' + conc });
        return box;
}
