// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import { symbols, symbolcat, syntax } from '../symbolic/libsyntax.js';
import { addelem, htmlEscape } from '../common.js';
import tr from '../translate.js';

export default class FormulaInput {

    static autoChange(findbefore, repbefore, ins, findafter, repafter) {
        let before = this.value.substr(0,this.selectionStart)
            .replace(findbefore, repbefore);
        let after= this.value.substr(this.selectionEnd);
        if (findafter) {
            after = after.replace(findafter, repafter);
        }
        let pos = before.length + ins.length;
        this.value = before + ins + after;
        this.focus();
        this.setSelectionRange(pos, pos);
    }

    static blur(e) {
        // record when this
        this.lastblurred = (new Date()).getTime();
        // don't react to widget changes
        if (e?.relatedTarget?.classList?.contains('symbolwidgetbutton') ||
            e?.relatedTarget?.classList?.contains('derivchartlabel') ||
            e?.relatedTarget?.classList?.contains('ruleselect')
        ) {
            return;
        }
        if ((e?.relatedTarget?.classList?.contains('derivationlinenumber') ||
            e?.relatedTarget?.classList?.contains('rulenamedisplay') ||
            e?.relatedTarget?.classList?.contains('ruledisplay'))
            && this.classList.contains("justification")) {
            return;
        }
        // hide symbol insertion widget focused for this
        if (window.symbolwidget) {
            window.symbolwidget.hide();
        }
        if (e?.relatedTarget?.classList?.contains('rulenamedisplay') ||
            e?.relatedTarget?.classList?.contains('ruledisplay')) {
            e.blockhide = true;
        }
        this.value = this.inputfix(this.value);
        // use blurHook to have blurring do other things
        if (this.blurHook) {
            this.blurHook(e);
        }
        return;
    }

    static focus(e) {

        // don't react to widget changes
        if (e?.relatedTarget?.classList?.contains('symbolwidgetbutton')) {
            return;
        }

        // don't react to widget changes
        for (let widgettype of [
            'symbolwidgetbutton',
            'derivationlinenumber'
        ]) {
            if (e?.relatedTarget?.classList?.contains(widgettype)) {
                return;
            }
        }
        this.oldvalue = this.value;
        if (this.readOnly) { return; }
        if (window.symbolwidget) {
            window.symbolwidget.showfor(this);
        }
        if (this.focusHook) {
            this.focusHook(e);
        }
    }

    static getnew(options = {}) {
        let elem = document.createElement("input");
        elem.type = "text";
        for (let opt in options) {
            elem[opt] = options[opt];
        }
        elem.classList.add("formulainput","symbolic");
        elem.addEventListener("blur", FormulaInput.blur);
        elem.addEventListener("focus", FormulaInput.focus);
        elem.addEventListener("keydown", FormulaInput.keydown);
        elem.insOp = FormulaInput.insOp;
        elem.insertHere = FormulaInput.insertHere;
        elem.autoChange = FormulaInput.autoChange;
        elem.inputfix = syntax.inputfix;
        return elem;
    }

    static insOp(op) {
        let symb = symbols[op];
        if (symbolcat[op] >= 2) {
            this.autoChange(/\s+$/,'',' ' + symb + ' ',/^\s+/,'');
        } else {
            this.insertHere(symb);
        }
    }

    static insertHere(c) {
        let pos = this.selectionStart;
        this.setRangeText(c);
        this.focus();
        this.setSelectionRange(pos+1, pos+1);
    }

    static keydown(e) {
        // register value on enter
        if (e.key == 'Enter') {
            e.preventDefault();
            this.value = this.inputfix(this.value);
            // use blurHook to have blurring do other things
            if (this.blurHook) {
                this.blurHook(e);
            }
            if (this.enterHook) {
                this.enterHook(e);
                return;
            }
        }
        if (e.key == 'Tab') {
            e.preventDefault();
            this.value = this.inputfix(this.value);
            if (e.shiftKey && this.shiftTabHook) {
                this.shiftTabHook(e);
                return;
            }
            if (this.tabHook) {
                this.tabHook(e);
                return;
            }
        }
        if (e.key == 'ArrowUp' && this.arrowUpHook) {
            e.preventDefault();
            this.arrowUpHook(e);
            return;
        }
        if (e.key == 'ArrowDown' && this.arrowDownHook) {
            e.preventDefault();
            this.arrowDownHook(e);
            return;
        }
        if (e.key == 'ArrowLeft' && e.shiftKey && this.shiftArrowLeftHook) {
            e.preventDefault();
            this.shiftArrowLeftHook(e);
            return;
        }
        if (e.key == 'ArrowRight' && e.shiftKey && this.shiftArrowRightHook) {
            e.preventDefault();
            this.shiftArrowRightHook(e);
            return;
        }

        if (this.readOnly) { return; }
        // block extra spaces
        if (e.key == ' ') {
            if (/\s$/.test(this.value.substr(0,this.selectionStart))) {
                e.preventDefault();
                return;
            }
        }

        // make as changed; solves problems later
        if (this?.myline?.mysubderiv?.myprob.makeChanged) {
            this?.myline?.mysubderiv?.myprob.makeChanged();
        }

        if (e.key == 'v' || e.key == 'V' || e.key == '∨') {
            // don't do when pasting
            if (e.ctrlKey) { return; }
            e.preventDefault();
            this.insOp('OR');
            return;
        }
        // insert biconditional or conditional
        if (e.key == '>' || e.key == '→' || e.key == '⇒' ||
            e.key == '⊃') {
            e.preventDefault();
            if (/<-*$/.test(this.value.substr(0,this.selectionStart))) {
                this.autoChange(/\s*<[=-]*$/,'','',/^\s*/,'');
                this.insOp('IFF');
            } else {
                this.autoChange(/\s*[=-]*$/,'','',/^\s*/,'');
                this.insOp('IFTHEN');
            }
            return;
        }
        if (e.key == '=') {
            if (/=$/.test(this.value.substr(0,this.selectionStart))) {
                e.preventDefault();
                this.autoChange(/\s*=$/,'','',/^\s*/,'');
                this.insOp('IFF');
            }
        }
        // double ampersands = conjunction
        if (e.key == '&') {
            if (/&\s*/.test(this.value.substr(0, this.selectionStart))) {
                e.preventDefault();
                this.autoChange(/\s*&\s*$/,'','', null, null);
                this.insOp('AND');
                return;
            }
        }
        // insert conjunction
        if (e.key == '^' || e.key == '.' || e.key == '&' || e.key == '*' ||
            e.key == '•' || e.key == '·'  || e.key == '∧') {
            e.preventDefault();
            this.insOp('AND');
            return;
        }

        if (e.key == '~' || e.key == '¬' || e.key == '!') {
            e.preventDefault();
            this.insOp('NOT');
            return;
        }
        if (e.key == '≡') {
            e.preventDefault();
            this.insOp('IFF');
            return;
        }
        if (e.key == '#' || e.key == '✖' || e.key == '×'
            || e.key == '⊥' || e.key == '⨳') {
            e.preventDefault();
            this.insOp('FALSUM');
            return;
        }
        if (e.key == 'X') {
            if (this.value.at(this.selectionStart - 1) == 'X') {
                e.preventDefault();
                this.autoChange(/\s*X$/, '', ' ' + symbols.FALSUM, null, null);
            }
            return;
        }
        if (e.key == '/') {
            if (this.value.at(this.selectionStart - 1) == '\\') {
                e.preventDefault();
                this.autoChange(/\\$/, '', '', null, null);
                this.insOp('OR');
            }
            return;
        }
        if (e.key == '|') {
            if (this.value.at(this.selectionStart - 1) == '|') {
                e.preventDefault();
                this.autoChange(/\|$/, '', '', null, null);
                this.insOp('OR');
            }
            return;
        }
        // hyphens not preceding '>' or numbers are negations?
        if (!(/[0-9?-]/.test(e.key)) &&
            (this.value.at(this.selectionStart - 1) == '-') &&
            e.key.length == 1) {
            e.preventDefault();
            let len = this.value.substr(0,this.selectionStart)
                .match(/-+$/g)[0].length;
            let nots = symbols.NOT.repeat(len);
            this.autoChange(/-+$/,'', nots + e.key, null, null);
        }
        if (this.pred) {
            if (e.key == 'A') {
                e.preventDefault();
                this.insOp('FORALL');
            }
            if (e.key == 'E') {
                e.preventDefault();
                this.insOp('EXISTS');
            }
            if (e.key == 's') {
                if (this.value.at(this.selectionStart - 1) == '∀') {
                    e.preventDefault();
                    this.autoChange(/∀$/,'A','s',null,null);
                }
            }
        }
        if (!e.ctrlKey && !e.altKey && !this.pred && !this.justify && this.lazy
        && !this.classList.contains("justification")) {
            if (/^[a-z]$/.test(e.key)) {
                e.preventDefault();
                this.insertHere(e.key.toUpperCase());
            }
            return;
        }
    }
}

// add insert widget to the window element
if (window && document) {
    window.symbolwidget = document.createElement("div");
    window.symbolwidget.classList.add("symbolinsertwidget",
        "symbolic", "logicpenguin");
    window.symbolwidget.buttonfor = {};
    let table = addelem('table',window.symbolwidget,{});
    let tbody = addelem('tbody',table,{});
    let tre = addelem('tr',tbody,{});
    for (let op in symbols) {
        let td = addelem('td', tre, {});
        window.symbolwidget.buttonfor[op] = td;
        td.myOp = op;
        td.innerHTML = htmlEscape(symbols[op]);
        td.title = htmlEscape(tr('Insert ') + symbols[op]);
        td.tabIndex = -1;
        td.classList.add('symbolwidgetbutton');
        td.onclick = function() {
            if (!window.symbolwidget.targetInput) { return; }
            window.symbolwidget.targetInput.insOp(this.myOp);
        }
    }
    window.symbolwidget.showfor = function(elem) {
        document.body.appendChild(this);
        this.targetInput = elem;
        if (this.buttonfor['FALSUM']) {
            if (elem.nofalsum) {
                this.buttonfor['FALSUM'].classList.add("hidden");
            } else {
                this.buttonfor['FALSUM'].classList.remove("hidden");
            }
        }
        for (let q of ['FORALL', 'EXISTS']) {
            if (this.buttonfor[q]) {
                if (elem.pred) {
                    this.buttonfor[q].classList.remove("hidden");
                } else {
                    this.buttonfor[q].classList.add("hidden");
                }
            }
        }
    }
    window.symbolwidget.hide = function() {
        this.targetInput = false;
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }
}
