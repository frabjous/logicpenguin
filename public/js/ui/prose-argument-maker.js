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

export default function getProseArgumentMaker(parNode,
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
    argDiv.blockarea = addelem('div', argDiv);

    argDiv.addStatement = function(deets, trans, concchecked, isnew) {
        // create a block for the statement
        const block = addelem('div', this.blockarea, {
            classes: ['statementblock'],
            id: randomid()
        });
        // create a table for most fields
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
        // create input fields; fill in values
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
        // create translation field if specified by options
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
            block.transinp.value = trans;
            block.transinp.id = block.id + '-transinp';
            block.transinp.myargdiv = this;
        }
        // box to check if conclusion
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
        // button to remove statement
        block.delbtn = addelem('div', radiodiv, {
            innerHTML: '<span class="material-symbols-outlined">delete_forever</span>',
            myargdiv: this,
            myblock: block,
            classes: ['statementdeletebutton'],
            triggerChange: triggerChange,
            title: tr('remove this statement'),
            onclick: function() {
                this.myblock.parentNode.removeChild(this.myblock);
                this.triggerChange();
            }
        })
        // give each input a listener
        const inps = [block.concradio, block.preinp,
            block.statementinp, block.postinp];
        if ("transinp" in block) {
            inps.push(block.transinp);
        }
        for (const inp of inps) {
            inp.onchange = triggerChange;
            inp.oninput = triggerChange;
        }
        if (isnew && this.whenchanged) {
            this.whenchanged();
        }
    }
    // add a statement for each statement detail specified
    for (let i = 0; i < argdetails.length ; i++) {
        const deets = argdetails[i];
        const trans = translations?.[i] ?? '';
        argDiv.addStatement(deets, trans, (i == concnum), false);
    }
    // button for adding statements
    const btndiv = addelem('div', argDiv);
    const addbtn = addelem('button', argDiv, {
        type: 'button',
        myargdiv: argDiv,
        innerHTML: '<span class="material-symbols-outlined">' +
            'add</span> add statement',
        onclick: function() {
            this.myargdiv.addStatement({}, '', false, true);
        }
    })
    // collect statement details
    argDiv.getStatements = function() {
        const bb = this.getElementsByClassName("statementblock");
        const rv = [];
        for (const bl of bb) {
            const details = {};
            if (!("statementinp" in bl)) { continue; }
            details.statement= bl.statementinp.value;
            if (bl.preinp.value != '') {
                details.pre = bl.preinp.value;
            }
            if (bl.postinp.value != '') {
                details.post = bl.postinp.value;
            }
            rv.push(details);
        }
        return rv;
    }
    // get checked conclusion
    argDiv.getConcNum = function() {
        const bb = this.getElementsByClassName("statementblock");
        for (var i=0; i<bb.length; i++) {
            const bl = bb[i];
            if (bl?.concradio?.checked) {
                return i;
            }
        }
        return -1;
    }
    // gather translation info
    argDiv.getTranslations = function() {
        const bb = this.getElementsByClassName("statementblock");
        const rv = [];
        for (const bl of bb) {
            if (!("transinp" in bl)) { continue; }
            rv.push(bl.transinp.value);
        }
        return rv;
    }

    return argDiv;
}
