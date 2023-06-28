// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

// TODO: make this configurable and import it

import { syntax, symbols, operators, symbolcat } from './libsyntax.js';
import { arrayUnion } from '../misc.js';

export default class Formula {
    // start by recording what string got parsed
    constructor(s) {
        // input string is what were given, except with soft
        // parentheses, extra spaces and matching outer parens removed
        this.parsedstr = s
        this._syntaxerrors = {};
    }
    // we keep a repository of Formulas that have been parsed or are
    // being parsed, etc. to avoid duplicating them in memory, or
    // having to redo work that was already done
    static repository = {};
    // main function for fetching from the repository or adding to it
    // if necessary
    static from = function(s) {
        let toparse = syntax.stripmatching(
            syntax.allsoftparens(syntax.inputfix(s)).trim()
        );
        if (Formula.repository[toparse]) {
            return Formula.repository[toparse];
        }
        Formula.repository[toparse] = new Formula(toparse);
        return Formula.repository[toparse];
    }
    ///////////////////////
    // getter functions //
    /////////////////////
    // all propositional letters / predicates in a Formula
    get allpletters() {
        if ("_allpletters" in this) { return this._allpletters; }
        let l = (this.left) ? this.left.allpletters : [];
        let r = (this.right) ? this.right.allpletters : [];
        if (this.pletter) { r.push(this.pletter); }
        this._allpletters = arrayUnion(l, r);
        return this._allpletters;
    }
    // gets the variable a quantifier main-opped formula binds, if any
    get boundvar() {
        if ("_boundvar" in this) {
            return this._boundvar;
        }
        if (!syntax.isquant(this.op)) {
            this._boundvar = false;
            return this._boundvar;
        }
        if (syntax.isvar(this.parsedstr[1])) {
            this._boundvar = this.parsedstr[1];
            return this._boundvar;
        }
        this._boundvar = false;
        this.syntaxError('a quantifier is used without a ' +
            'variable in the range ' + syntax.variableRange +
            ' following it');
        return this._boundvar;
    }
    get depth() {
        if ("_depth" in this) {
            return this._depth;
        }
        if (syntax.isbinaryop(this.op)) {
            this._depth = Math.max(this.left.depth, this.right.depth) + 1;
            return this._depth;
        }
        if (syntax.ismonop(this.op)) {
            this._depth = this.right.depth;
            return this.depth;
        }
        this._depth = 0;
        return this._depth;
    }
    get freevars() {
        if ("_freevars" in this) {
            return this._freevars;
        }
        if (syntax.isbinaryop(this.op)) {
            let lfv = (this.left) ? this.left.freevars : [];
            let rfv = (this.right) ? this.right.freevars : [];
            this._freevars = arrayUnion(lfv, rfv);
            return this._freevars;
        }
        if (syntax.isquant(this.op)) {
            let rfv = (this.right) ? this.right.freevars : [];
            let filtered = rfv;
            if (this.boundvar) {
                filtered = filtered.filter((v) => (v != this.boundvar));
            }
            this._freevars = filtered;
            return this._freevars;
        }
        if (syntax.ismonop(this.op)) {
            this._freevars = ((this.right) ? this.right.freevars : []);
            return this._freevars;
        }
        if (this.op) {
            this._freevars = [];
            return this._freevars;
        }
        // atomic; too simple for functions **
        this._freevars = this.terms.split('').filter(syntax.isvar);
        return this._freevars;
    }
    // reads formula to left of main operator
    get left() {
        if ("_left" in this) {
            return this._left;
        }
        // if nothing on left, or no main op, return something falsy
        if (this.opspot < 1) {
            if (syntax.isbinaryop(this.op)) {
                // SHOULD have a left, but does not
                this.syntaxError('nothing to the left of ' +
                    this.op);
            }
            this._left = false;
            return this._left;
        }
        let leftstring =
            this.parsedstr.substring(0,this.opspot).trim();
        // use repository if already one for string in question
        this._left = Formula.from(leftstring);
        return this._left;
    }
    // normal form is the canonical representation of Formula as a
    // string should be identical for identical formulae
    get normal() {
        if ("_normal" in this) {
            return this._normal;
        }
        // add parentheses if needed
        let leftstr = '';
        if (this.left) {
            if (syntax.isbinaryop(this.left.op)) {
                leftstr = this.left.wrapit();
            } else {
                leftstr = this.left.normal;
            }
        }
        let rightstr = '';
        if (this.right) {
            if (syntax.isbinaryop(this.right.op)) {
                rightstr = this.right.wrapit();
            } else {
                rightstr = this.right.normal;
            }
        }
        // binary op
        if (syntax.isbinaryop(this.op)) {
            this._normal = leftstr + ' ' + this.op + ' ' + rightstr;
            return this._normal;
        }
        // monadic op
        if (syntax.ismonop(this.op)) {
            let o = this.op;
            if (syntax.isquant(o)) {
                let v = this.boundvar ?? '';
                o = o + v;
            }
            this._normal = o + rightstr;
            return this._normal;
        }
        // zero-adic op, which just is the result we're after
        if (this.op) {
            this._normal = this.op;
            return this._normal;
        }
        // otherwise, atomic
        let terms = this.terms ?? '';
        let pletter = this.pletter ?? '';
        // too simplistic for function terms**
        if (syntax.usecommas) { terms = terms.split('').join(','); }
        if (terms && syntax.termparens) { terms = '(' + terms + ')'; };
        this._normal = pletter + terms;
        return this._normal;
    }
    // gets main operator by determining the main operator
    // spot and gets that character
    get op() {
        // if nothing to parse, mainop is falsey
        if (!this.parsedstr) { return false; }
        if ("_op" in this) { return this._op; }
        let opspot = this.opspot;
        // if not found, treat main op as falsy
        if (opspot == -1) { return false; }
        //get main op from spot and record it for later
        this._op = this.parsedstr[opspot];
        return this._op;
    }
    // gets the spot of the main operator, either from what was
    // previously stored as _opspot, or by scanning
    get opspot() {
        // return previously calculated spot if exists
        if ("_opspot" in this) {
            return this._opspot;
        }
        // -1 means no operator found so far
        this._opspot = -1;
        let currdepth = 0;
        // the main op depth *should* always be zero; but might
        // not be if formula is unbalanced, but we soldier on
        // in case it's a "recoverable error"
        let mainopdepth = -1;
        for (let i=0; i<this.parsedstr.length; i++) {
            // get this character
            const c = this.parsedstr.at(i);
            if (c == '(') {
                // increase depth with left parenthesis
                currdepth++;
            } else if (c == ')') {
                // decrease depth with right parenthesis
                currdepth--;
            }
            if (currdepth < 0) {
                this.syntaxError("unbalanced parentheses");
            }
            // possible main op must have depth 0, which
            // should always be true since we stripped parens
            if (syntax.isop(c)) {
                // if "more main" or first one found, then it
                // becomes our candidate
                if ((currdepth < mainopdepth) || (mainopdepth == -1)) {
                    this._opspot = i;
                    mainopdepth = currdepth;
                } else if (currdepth == mainopdepth) {
                    // or it depends on adicity
                    let newopcat = symbolcat[operators[c]];
                    let oldopcat = symbolcat[operators[this.parsedstr[this._opspot]]];
                    if (newopcat == 2 && oldopcat == 2) {
                        this.syntaxError('two binary operators occur ' +
                            'without enough parentheses to ' +
                            'determine which has wider scope');
                    }
                    if (newopcat > oldopcat) {
                        this._opspot = i;
                        mainopdepth = currdepth;
                    }
                }
            }
        }
        if (mainopdepth > 0) {
            this.syntaxError('unbalanced parentheses');
        }
        return this._opspot;
    }
    // "pletter" is a generic term covering both predicates and the
    // letter used in propositional atomic formulas (=0-place predicate)
    get pletter() {
        if ("_pletter" in this) {
            return this._pletter;
        }
        // nonatomic formulas do not have pletters, period, but that's OK
        if (this.op) {
            this._pletter = false;
            return this._pletter;
        }
        // look for first character which is a predicate
        let match = this.parsedstr.match(
            new RegExp('[' + syntax.pletterRange + ']'));
        // has no pletter, which is not ok
        if (!match) {
            this._pletter = false;
            this.syntaxError('an atomic (sub)formula must use a letter in '
                + 'the range ' + syntax.pletterRange +
                ' and this does not');
            return this._pletter;
        }
        // position should be 0, or 2 in the case of =
        this._pletter = match[0];
        let pos = match.index;
        if (pos != 0 && this._pletter != '=') {
            this.syntaxError('unexpected characters appear before the ' +
                'letter ' + this._pletter);
        }
        if (pos != 2 && this._pletter == '=') {
            this.syntaxError('the identity relation symbol = occurs ' +
                'in an unexpected place');
        }
        return this._pletter;
    }
    get right() {
        // do not reparse
        if ("_right" in this) {
            return this._right;
        }
        // if no main op, return something falsy
        if (this.opspot == -1 || symbolcat[operators[this.op]] == 0) {
            this._right = false;
            return this._right;
        }
        // for quantifiers one must remove the variable too
        let skip = syntax.isquant(this.op) ? 2 : 1;
        // break the string
        let rightstring =
            this.parsedstr.substring(this.opspot+skip).trim();
        if (rightstring == '') {
            this.syntaxError('nothing to the right of the operator ' +
                this.op);
            this._right = false;
            return this._right;
        }
        this._right = Formula.from(rightstring);
        return this._right;
    }
    get syntaxerrors() {
        if (!("_syntaxerrors" in this)) { return ''; }
        let rv = '';
        let needsep = false;
        for (let reason in this._syntaxerrors) {
            if (this._syntaxerrors[reason]) {
                if (needsep) {
                    rv += '; ';
                }
                rv += reason;
                needsep = true;
            }
        }
        return rv;
    }
    // gets the terms of a formula; usually important only for atomics
    get terms() {
        // note: nonatomics have terms which come from just stripping
        // everything else
        if ("_terms" in this) {
            return this._terms;
        }
        // remove first (should be only) predicate in atomics
        let nopred = this.parsedstr;
        if (!this.op) {
            // replace (as opposed to replaceAll, to remove first only)
            nopred = nopred.replace(this.pletter,'').trim();
        }
        // strip outer parens, record having done so
        let nopredstripped = syntax.stripmatching(nopred);
        if (nopred != nopredstripped) {
            this._termshadparens = true;
        }
        // strip commas
        let nocommas = nopredstripped.replaceAll(',','');
        if (nocommas != nopredstripped) {
            this._termshadcommas = true;
        }
        // strip everything else**
        let r = new RegExp('[^' + syntax.variableRange +
            syntax.constantsRange + ']','g');
        this._terms = nocommas.replace(r,'');
        // atomic formulas should not have junk
        if ((!this.op) && (nocommas != this._terms)) {
            this.syntaxError('unexpected symbols occur within an ' +
                'atomic (sub)formula');
        }
        return this._terms;
    }
    // determines if formula is well-formed
    get wellformed() { // should also bubble syntax errors to top
        if ("_wellformed" in this) {
            return this._wellformed;
        }
        // binary molecular
        if (syntax.isbinaryop(this.op)) {
            if (!("_wellformed" in this)) { this._wellformed = true; }
            let lresult = this.left.wellformed;
            let rresult = this.right.wellformed;
            Object.assign(this._syntaxerrors, this.left._syntaxerrors,
                this.right._syntaxerrors);
            this._wellformed = (this._wellformed && lresult && rresult);
            return this._wellformed;
        }
        // monadic operator; either quantifier or other
        if (syntax.ismonop(this.op)) {
            // assume it's all ok to start
            if (!("_wellformed" in this)) { this._wellformed = true; }
            let rresult = this.right.wellformed;
            if (!rresult) {
                this._wellformed = false;
            }
            Object.assign(this._syntaxerrors, this.right._syntaxerrors);
            let garbagebefore = (this.opspot != 0);
            if (garbagebefore) {
                this.syntaxError('unexpected character(s) appear before ' +
                    'the operator ' + this.op);
                this._wellformed = false;
                // boundvar error may be misleading in case of garbage
                // so we won't wait for that
                return this._wellformed;
            }
            if (syntax.isquant(this.op)) {
                let varresult = (this.boundvar !== false);
                if (!varresult) {
                    this._wellformed = false;
                }
            }
            return this._wellformed;
        }
        // if made it here with an operator, operator should be
        // verum or falsum
        if (this.op) {
            // should consist of operator alone
            if (this.parsedstr != this.op) {
                this.syntaxError('unexpected character(s) appear ' +
                    'surrounding the symbol ' + this.op);
                this._wellformed = false;
                return this._wellformed;
            }
            // a zero-adic mainop by itself is well formed
            this._wellformed = true;
            return this._wellformed;
        }
        // should be atomic if we got here; assume OK to start
        this._wellformed = true;
        // atomic formula must have pletter
        if (this.pletter === false) {
            this._wellformed = false;
        }
        // must have terms, possibly empty
        // (I don't this this really catches anything, but forces
        // terms to be processed at least for atomics)
        if (this.terms === false) {
            this._wellformed = false;
        }
        // shouldn't have any errors from checking pletter and terms
        for (let prob in this._syntaxerrors) {
            this._wellformed = false;
            break
        }
        // if got here all was OK
        return this._wellformed;
    }
    // OTHER METHODS
    // important: instantiate should not change original Formula ("this")
    instantiate(variable, term) {
        if (syntax.isbinaryop(this.op)) {
            if (!this.left || !this.right) { return ''; }
            let l = Formula.from(this.left.instantiate(variable, term));
            let r = Formula.from(this.right.instantiate(variable, term));
            return l.wrapifneeded() + ' ' + this.op +
                ' ' + r.wrapifneeded();
        }
        if (syntax.ismonop(this.op)) {
            if (!this.right) { return ''; }
            // we only replace free instances, so we don't replace within
            // subformula with same variable
            if (syntax.isquant(this.op) && (this.boundvar == variable)) {
                return this.normal;
            }
            let r = Formula.from(this.right.instantiate(variable, term));
            return this.op +
                ((syntax.isquant(this.op)) ? (this.boundvar ?? '') : '' )
                + r.wrapifneeded();
        }
        if (this.op) { return this.normal; }
        // should be atomic
        let pletter = this.pletter ?? '';
        let terms = this.terms ?? ''
        // too simplistic for function terms**
        terms = terms.replaceAll(variable, term);
        if (syntax.usecommas) { terms = terms.split('').join(','); }
        if (terms && syntax.termparens) { terms = '(' + terms + ')'; };
        return pletter + terms;
    }
    syntaxError(reason) {
        this._syntaxerrors[reason] = true;
        this._wellformed = false;
    }
    wrapifneeded() {
        if (this.op && syntax.isbinaryop(this.op)) {
            return this.wrapit();
        }
        return this.normal;
    }
    wrapit() {
        switch (this.depth % 3) {
            case 0:
                return '{' + this.normal + '}';
                break;
            case 1:
                return '(' + this.normal + ')';
                break;
            case 2:
                return '[' + this.normal + ']';
                break;
            default: // shouldn't be here
                return this.normal;
        }
        return this.normal; // shouldn't be here either
    }
}
