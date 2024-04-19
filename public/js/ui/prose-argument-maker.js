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

export function getProseArgumentMaker(parNode,
    argdetails = [], translations = [], conc = -1, opts = {}) {
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

    argDiv.addStatement = function(deets, trans, checked) = function() {
        const block = addelem('div', this, {
            classes: ['statementblock']
        });
        const tbl = addelem('table', block);
        const tbdy = addelem('tbody', tbl);
        const pretr = addelem('tr', tbdy);
        const statementtr = addelem('tr', tbdy);
        const posttr = addelem('tr', tbdy);
        const preltd = addelem('td', pretr);
        const statementltd = addelem('td', statementtr);
        const postltd = addelem('td', posttr);
        const prelbl = addelem('span', preltd, {
            innerHTML: tr('preceding text')
        });
        const statementlbl = addelem('span', statementltd, {
            innerHTML: tr('statement')
        });
        const postlbl = addelem('span', postltd, {
            innerHTML: tr('following text')
        });
        const preitd = addelem('td', pretr);
        const statementitd = addelem('td', statementtr);
        const postitd = addelem('td', posttr);
        block.preinp = addelem('input', preitd, {
            type: 'text'
        });
        if ("pre" in deets) {
            block.preinp.value = deets.pre;
        };
        block.statementinp = addelem('input', statementitd, {
            type: 'text'
        });
        if ("statement" in deets) {
            block.statementinp.value = deets.statement;
        }
        block.postinp = addelem('input', postitd, {
            type: 'text'
        });
        if ("post" in deets) {
            block.postinp.value = deets.post;
        }
        if (("gettrans" in this.opts) && this.opts.gettrans) {
            const transtr = addelem('tr', tbdy);
            const transltd = addelem('td', transtr);
            const translbl = addelem('span', transltd, {
                innerHTML: tr('translation')
            });
            const transitd = addelem('td', transtr);
            block.transinp = FormulaInput.getnew(this.opts);
            transitd.appendChild(block.transinp);
        }
        const radiodiv = addelem('div', block);
        block.concradio = addelem('input', radiodiv, {

        })

    }
    // subdiv for each statement
    for (let sdetails of argdetails) {
        // space between statements
        if (needTN) {
            const tN = document.createTextNode(" ");
            argDiv.appendChild(tN);
        }
        needTN = true;
        // text before main statement
        if (sdetails.pre) {
            addelem('span', argDiv, {
                innerHTML: htmlEscape(sdetails.pre),
                classes: ['proseargpretext']
            });
        }
        // statement itself
        if (sdetails.statement) {
            argDiv.statementSpans.push(
                addelem('span', argDiv, {
                    innerHTML: htmlEscape(sdetails.statement),
                    classes: ['proseargstatement']
                })
            );
        }
        // text after main statement
        if (sdetails.post) {
            addelem('span', argDiv, {
                innerHTML: htmlEscape(sdetails.post),
                classes: ['proseargposttext']
            });
        }
    }
    return argDiv;
}
