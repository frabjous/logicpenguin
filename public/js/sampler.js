// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// sampler.js ////////////////////////////////////
// Creates a widget for creating arbitrary truth-table or       //
// derivation problems for a given system/notation              //
//////////////////////////////////////////////////////////////////

import LP from '../load.js';
import { addelem, byid } from './common.js';
import SymbolicArgumentInput from './ui/symbolic-argument-input.js';

LP.sampler = function(opts) {
    // try to determine where to put widget
    let parentnode = false;
    if ("parentid" in opts) {
        parentnode = byid(opts.parentid);
    }
    if ("parent" in opts) {
        parentnode = opts.parent;
    }
    if (!(parentnode)) {
        console.log('Cannot create LP sampler element, ' +
            'because no (existing) parent node was specified.');
        return false;
    }
    if (!("notation" in opts)) {
        if (!("system" in opts)) {
            console.error('Cannot create LP sampler element, ' +
                'because neither system nor notation specified.');
            return false;
        }
        opts.notation = opts.system;
    }
    if (!("system" in opts)) {
        opts.system = opts.notation;
    }
    if (!("tflname" in opts)) {
        opts.tflname = 'Truth Functional Logic';
    }
    if (!("folname" in opts)) {
        opts.folname = 'First Order Logic';
    }
    const wrapper = addelem('div', parentnode,
        { classes: ['logicpenguin', 'sampler'] });
    const toppart = addelem('div', wrapper);
    const topleft = addelem('div', toppart);
    const topright = addelem('div', toppart);
    const probarea = addelem('div', wrapper);

    // left side: truth functional logic
    const leftlabel = addelem('h3', topleft, {
        innerHTML: opts.tflname
    });
    // right side, first order logic
    const rightlabel = addelem('h3', topright, {
        innerHTML: opts.folname
    });
    const tflarginp = SymbolicArgumentInput.getnew({
        notation: opts.notation,
        pred: false
    });
    const folarginp = SymbolicArgumentInput.getnew({
        notation: opts.notation,
        pred: true,
        lazy: true
    });

    topleft.appendChild(tflarginp);
    topright.appendChild(folarginp);

}

export default LP;
