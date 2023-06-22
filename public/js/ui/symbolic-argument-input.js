import { addelem, htmlEscape } from '../common.js';
import Formula from '../symbolic/formula.js';
import FormulaInput from './formula-input.js';
import tr from '../translate.js';

export default class SymbolicArgumentInput {

    static addPremise() {
        if (!this.premisecell) { return; }
        let pr = addelem('div', this.premisecell, {
            classes: ['symbargpremise']
        });
        pr.myinput = FormulaInput.getnew( (this.options ?? {}) );
        pr.myinput.onchange = function() {
            this.classList.remove('error');
        }
        pr.appendChild(pr.myinput);
        pr.myarg = this;
        return pr;
    }

    static clearme() {
        let pp = this.getElementsByClassName("symbargpremise");
        while (pp.length > 0) {
            let p = pp[ pp.length - 1];
            p.parentNode.removeChild(p);
        }
        this.addPremise();
        let cc = this.getElementsByClassName("symbargconc");
        if (cc && cc.length > 0 && cc[0].myinput) {
            cc[0].myinput.value = '';
        }
    }

    static getArgument() {
        let arg = { prems: [], conc: '' };
        let pp = this.getElementsByClassName("symbargpremise");
        for (let p of pp) {
            if (p.myinput && p.myinput.value != '') {
                let f = Formula.from(p.myinput.value);
                if (!f.wellformed) {
                    p.myinput.classList.add('error');
                    return false;
                }
                arg.prems.push(f.normal);
            }
        }
        let cc = this.getElementsByClassName("symbargconc");
        if (!cc || cc.length < 1) { return false; }
        let c = cc[0];
        if (!c.myinput || c.myinput.value == '') {
            return false;
        }
        let s = c.myinput.value;
        let cf = Formula.from(s);
        if (!cf.wellformed) {
            c.myinput.classList.add('error');
            return false;
        }
        arg.conc = cf.normal;
        return arg;
    }

    static getnew(options = {}) {
        let elem = document.createElement("div");
        elem.classList.add('symbolicargumentinput');
        elem.options = options;
        let table = addelem('table', elem);
        let tbody = addelem('tbody', table);
        let premrow = addelem('tr', tbody);
        let premlabel = addelem('td', premrow, {
            innerHTML: tr('premises')
        });
        elem.premisecell = addelem('td', premrow);
        let buttonrow = addelem('tr', tbody);
        let buttonlabel = addelem('td', buttonrow);
        let buttoncell = addelem('td', buttonrow);
        let plusbutton = addelem('button', buttoncell, {
            type: 'button',
            innerHTML: '+',
            classes: ['symbarginputbutton'],
            onclick: function(e) {
                this.myelem.addPremise();
            }
        });
        plusbutton.myelem = elem;
        let minusbutton = addelem('button', buttoncell, {
            type: 'button',
            innerHTML: '−',
            classes: ['symbarginputbutton'],
            onclick: function(e) {
                this.myelem.removePremise();
            }
        });
        minusbutton.myelem = elem;
        elem.addPremise = SymbolicArgumentInput.addPremise;
        elem.removePremise = SymbolicArgumentInput.removePremise;
        elem.addPremise();
        let concrow = addelem('tr', tbody);
        let conclabel = addelem('td', concrow,{
            innerHTML: tr('conclusion')
        });
        let conccell = addelem('td', concrow);
        let concdiv = addelem('div', conccell,{
            classes: ['symbargconc']
        });
        concdiv.myinput = FormulaInput.getnew(options);
        concdiv.myinput.onchange = function() {
            this.classList.remove('error');
        }
        concdiv.appendChild(concdiv.myinput);
        elem.getArgument = SymbolicArgumentInput.getArgument;
        elem.clearme = SymbolicArgumentInput.clearme;
        return elem;
    }

    static removePremise() {
        let pp = this.getElementsByClassName("symbargpremise");
        if (!pp) { return; }
        if (pp.length < 1) { return; }
        let goner = pp[ pp.length - 1 ];
        goner.parentNode.removeChild(goner);
    }

}
