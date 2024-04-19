// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// prose-argument-maker.js /////////////////////////////
// creates an interface for creating prose arguments with a conclusion //
// translations and pre and post text                                  //
/////////////////////////////////////////////////////////////////////////

import { addelem, htmlEscape } from '../common.js';
import { randomString } from '../misc.js'
import tr from '../translate.js'
import FormulaInput from '../ui/formula-input.js';


function newPAMid() {
    let newid = 'proseargmaker' + randomString(8);
    while (document?.getElementById(newid)) {
        newid = 'proseargmaker' + randomString(8);
    }
    return newid;
}

function randomid() {
    let rv = randomString(8);
    while (document.getElementById(rv)) {
        rv = randomString(8);
    }
    return rv;
}

function triggerChange() {
    if (this?.myargdiv?.whenchanged) {
        this.myargdiv.whenchanged();
    }
}

export function getProseArgumentMaker(parNode,
    argdetails = [], translations = [], concnum = -1, opts = {}) {
    // insert a blank statement if no argument already
    if (argdetails.length == 0) {
        argdetails.push({ statement: '' });
    }
    // create a div for the argument
    const argDiv = addelem('div', parNode, {
        classes: ['proseargumentmaker'],
        opts: opts,
        id: newPAMid()
    });

    argDiv.addStatement = function(deets, trans, concchecked) = function() {
        const block = addelem('div', this, {
            classes: ['statementblock'],
            id: randomid()
        });
        const tbl = addelem('table', block);
        const tbdy = addelem('tbody', tbl);
        const pretr = addelem('tr', tbdy);
        const statementtr = addelem('tr', tbdy);
        const posttr = addelem('tr', tbdy);
        const preltd = addelem('td', pretr);
        const statementltd = addelem('td', statementtr);
        const postltd = addelem('td', posttr);
        const prelbl = addelem('label', preltd, {
            innerHTML: tr('preceding text'),
            htmlFor: block.id + '-preinp'
        });
        const statementlbl = addelem('label', statementltd, {
            innerHTML: tr('statement'),
            htmlFor: block.id + '-statementinp'
        });
        const postlbl = addelem('label', postltd, {
            innerHTML: tr('following text'),
            htmlFor: block.id + '-postinp'
        });
        const preitd = addelem('td', pretr);
        const statementitd = addelem('td', statementtr);
        const postitd = addelem('td', posttr);
        block.preinp = addelem('input', preitd, {
            type: 'text',
            id: block.id + '-preinp',
            myargdiv: this
        });
        if ("pre" in deets) {
            block.preinp.value = deets.pre;
        };
        block.statementinp = addelem('input', statementitd, {
            type: 'text',
            id: block.id + '-statementinp',
            myargdiv: this
        });
        if ("statement" in deets) {
            block.statementinp.value = deets.statement;
        }
        block.postinp = addelem('input', postitd, {
            type: 'text',
            id: block.id + '-postinp',
            myargdiv: this
        });
        if ("post" in deets) {
            block.postinp.value = deets.post;
        }
        if (("gettrans" in this.opts) && this.opts.gettrans) {
            const transtr = addelem('tr', tbdy);
            const transltd = addelem('td', transtr);
            const translbl = addelem('label', transltd, {
                innerHTML: tr('translation'),
                htmlFor: block.id + '-transinp'
            });
            const transitd = addelem('td', transtr);
            block.transinp = FormulaInput.getnew(this.opts);
            transitd.appendChild(block.transinp);
            block.transinp.id = block.id + '-transinp';
            block.transinp.myargdiv = this;
        }
        const radiodiv = addelem('div', block);
        block.concradio = addelem('input', radiodiv, {
            type: 'radio',
            name: this.id + 'radios',
            id: block.id + '-concinp',
            checked: concchecked,
            myargdiv: this
        });
        block.conclabel = addelem('label', radiodiv, {
            innerHTML: tr('this is the conclusion'),
            htmlFor: block.id + '-concinp'
        });
        const inps = [block.concradio, block.preinp,
            block.statement,inp, block.postinp];
        if ("transinp" in block) {
            inps.push(block.transinp);
        }
        for (const inp of inps) {
            inp.onchange = triggerChange;
            inp.oninput = triggerChange;
        }
    }
    for (let i = 0; i < argdetails.length ; i++) {
        const deets = argdetails[i];
        const trans = translations?.[i] ?? '';
        argDiv.addStatement(deets, trans, (i == concnum));
    }

    return argDiv;
}
