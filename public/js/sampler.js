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

function makeDerivation() {
    if (!this?.myarginput) { return; }
    const arg = this.myarginput.getArgument();
    if (!arg) { return; }
    if (!("pred" in this.myopts)) {
        this.myopts.pred = this.myarginput.pred;
    }
    if (!("lazy" in this.myopts)) {
        if ("lazy" in this.myarginput) {
            this.myopts.lazy = this.myarginput.lazy;
        }
    }
    if (!("notation" in this.myopts)) {
        if ("notation" in this.myarginput) {
            this.myopts.notation = this.myarginput.notation;
        }
    }
    LP.samplerProblem({
        problem: arg,
        problemtype: this.myproblemtype,
        options: this.myopts
    });
}


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
        opts.tflname = 'Truth-functional logic';
    }
    if (!("folname" in opts)) {
        opts.folname = 'First-order logic';
    }
    const wrapper = addelem('div', parentnode,
        { classes: ['logicpenguin', 'sampler'] });
    const toppart = addelem('div', wrapper);
    const topleft = addelem('div', toppart);
    const topright = addelem('div', toppart);
    const probarea = addelem('div', wrapper);
    probarea.id = 'logicpenguinsampleproblem';

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
    tflarginp.pred = false;
    const folarginp = SymbolicArgumentInput.getnew({
        notation: opts.notation,
        pred: true,
        lazy: true
    });
    folarginp.pred = true;

    topleft.appendChild(tflarginp);
    topright.appendChild(folarginp);

    const tflderivbtn = addelem('button', topleft, {
        type: 'button',
        title: 'create derivation problem',
        innerHTML: 'derivation',
        myarginput: tflarginp,
        myopts: opts,
        myproblemtype: 'derivation-' + opts.system,
        onclick: makeDerivation
    });

    const folderivbtn = addelem('button', topright, {
        type: 'button',
        title: 'create derivation problem',
        innerHTML: 'derivation',
        myarginput: folarginp,
        myopts: opts,
        myproblemtype: 'derivation-' + opts.system,
        onclick: makeDerivation
    });
    const argTTbtn = addelem('button', topleft, {
        type: 'button',
        title: 'argument truth-table problem',
        innerHTML: 'argument TT',
        myopts: opts,
        myarginput: tflarginp,
        onclick: function() {
            const arg = this.myarginput.getArgument();
            if (!arg) { return; }
            this.myopts.problemtype = 'argument-truth-table';
            this.myopts.problem = arg;
            this.myopts.question = true;
            LP.samplerProblem(this.myopts);
        }
    });
    const br = addelem('br', topleft);
    const formulaTTbtn = addelem('button', topleft, {
        type: 'button',
        title: 'formula truth-table problem (first premise)',
        innerHTML: 'formula TT',
        myopts: opts,
        myarginput: tflarginp,
        onclick: function() {
            const arg = this.myarginput.getArgument();
            let prem = '';
            if (arg) {
                prem = arg.prems[0];
            } else {
                const ii = this.myarginput.getElementsByTagName("input");
                if (!ii) { return; }
                if (ii[0].classList.contains('error')) { return; }
                prem = ii[0].value;
            }
            this.myopts.problemtype = 'formula-truth-table';
            this.myopts.problem = prem;
            this.myopts.question = true;
            LP.samplerProblem(this.myopts);
        }
    });
    const equivTTbtn = addelem('button', topleft, {
        type: 'button',
        title: 'equivalence truth-table problem (first premise and conclusion)',
        innerHTML: 'equivalence TT',
        myopts: opts,
        myarginput: tflarginp,
        onclick: function() {
            const arg = this.myarginput.getArgument();
            if (!arg) { return; }
            // sanity check
            if (arg.prems.length < 1) { return; }
            this.myopts.problemtype = 'equivalence-truth-table';
            this.myopts.problem = {
                l: arg.prems[0],
                r: arg.conc
            };
            this.myopts.question = true;
            LP.samplerProblem(this.myopts);
        }
    });


}

LP.samplerProblem = function(opts) {
    opts.parentid = 'logicpenguinsampleproblem';
    byid(opts.parentid).innerHTML = '';
    LP.embed(opts);
}

LP.loadCSS('sampler');
export default LP;
