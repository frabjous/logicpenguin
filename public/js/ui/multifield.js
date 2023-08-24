// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// multifield.js ///////////////////////////////////////
// general function for creating a div with multiple input fields    //
// and labels                                                        //
///////////////////////////////////////////////////////////////////////

import { addelem } from '../common.js';

function getvalues() {
    const ii = this.getElementsByTagName("input");
    const rv = [];
    for (const inp of ii) {
        if (inp.value != '') {
            rv.push(inp.value);
        }
    }
    return rv;
}

export default function multiInputField(parnode, lbl, vals = [], numblank = 1) {
    const div = addelem('div', parnode, {
        classes: ['multifieldinput']
    });
    div.mylbl = lbl;
    div.inputdiv = addelem('div', div);
    div.btndiv = addelem('div', div, { classes: ['buttondiv'] });
    div.addinput = function(v) {
        const cdiv = addelem('div', this.inputdiv, { classes: ['fielddiv'] });
        const n = this.getElementsByClassName('fielddiv').length;
        const clbl = addelem('div', cdiv, {
            innerHTML: this.mylbl + ' ' + n.toString()
        });
        const inp = addelem('input', cdiv, {
            type: 'text',
            value: v,
            mydiv: this,
            oninput: function() {
                if (this.mydiv.oninput) {
                    this.mydiv.oninput();
                }
            },
            onchange: function() {
                if (this.mydiv.onchange) {
                    this.mydiv.onchange();
                }
            }
        });
    }
    div.removeinput = function() {
        const ii = this.getElementsByClassName("fielddiv");
        if (ii.length == 0) { return; }
        const remme = ii[ii.length - 1];
        remme.parentNode.removeChild(remme);
    }
    const rembtn = addelem('button', div.btndiv, {
        type: 'button',
        innerHTML: '<span class="material-symbols-outlined">' +
            'remove</span>',
        mydiv: div,
        onclick: function() {
            const div = this.mydiv;
            div.removeinput();
            if (div.onchange) { div.onchange(); }
        }
    });
    const addbtn = addelem('button', div.btndiv, {
        type: 'button',
        innerHTML: '<span class="material-symbols-outlined">' +
            'add</span>',
        mydiv: div,
        onclick: function() {
            const div = this.mydiv;
            div.addinput('');
            if (div.onchange) { div.onchange(); }
        }
    });
    for (const val of vals) {
        div.addinput(val);
    }
    if (vals.length == 0) {
        for (let i=0; i<numblank; i++) {
            div.addinput('');
        }
    }
    div.getvalues = getvalues;
    return div;
}


