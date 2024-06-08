// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////////////// formula.js ///////////////////////////////////
// defines the Formula class and its main methods                      //
/////////////////////////////////////////////////////////////////////////


import getSyntax from './libsyntax.js';
import { arrayUnion } from '../misc.js';

const formulaClasses = {};

function generateFormulaClass(notationname) {
    class Formula {

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

        // each Formula class has a syntax defined by its notationname
        static syntax = getSyntax(notationname);

        // main function for fetching from the repository or adding to it
        // if necessary
        static from = function(s) {
            const toparse = Formula.syntax.stripmatching(
                Formula.syntax.allsoftparens(Formula.syntax.inputfix(s)).trim()
            );
            if (Formula.repository[toparse]) {
                return Formula.repository[toparse];
            }
            Formula.repository[toparse] = new Formula(toparse);
            return Formula.repository[toparse];
        }

        ///////////////////////
        // getter functions  //
        ///////////////////////
        // all propositional letters / predicates in a Formula
        get allpletters() {
            // return old result if already calculated
            if ("_allpletters" in this) { return this._allpletters; }
            // get left and right letters
            const l = (this.left) ? this.left.allpletters : [];
            const r = (this.right) ? this.right.allpletters : [];
            // add the one for this if atomic
            if (this.pletter) { r.push(this.pletter); }
            // combine them
            this._allpletters = arrayUnion(l, r);
            return this._allpletters;
        }

        // gets the variable a quantifier main-opped formula binds, if any
        get boundvar() {
            // return old result if already calculated
            if ("_boundvar" in this) {
                return this._boundvar;
            }
            // only quantified formulas have bound variables
            if (!Formula.syntax.isquant(this.op)) {
                this._boundvar = false;
                return this._boundvar;
            }
            // look for string matching quantifier at start
            const q = this.parsedstr.match(Formula.syntax.qaRegEx);
            // if one is found look for variable
            if (q) {
                const v = q[0].match(Formula.syntax.varRegEx);
                // if variable found, return it
                if (v) {
                    this._boundvar = v[0];
                    return this._boundvar;
                }
            }
            // no quantifier or variable was found, but not returned
            // already means this is poorly formed
            this._boundvar = false;
            this.syntaxError('a quantifier is used without a ' +
                'variable in the range ' + Formula.syntax.notation.variableRange +
                ' following it or has stray characters before it');
            return this._boundvar;
        }

        // gets how many parentheses levels this descends into
        get depth() {
            // return old result if found already
            if ("_depth" in this) {
                return this._depth;
            }
            // binary operators add a layer
            if (Formula.syntax.isbinaryop(this.op)) {
                this._depth = Math.max(this.left.depth, this.right.depth) + 1;
                return this._depth;
            }
            // monadic operators do not
            if (Formula.syntax.ismonop(this.op)) {
                this._depth = this.right.depth;
                return this.depth;
            }
            // zero-place operators and atomic formulae have no depth
            this._depth = 0;
            return this._depth;
        }

        // gets all free variables in a formula
        get freevars() {
            // return old result if already calculated
            if ("_freevars" in this) {
                return this._freevars;
            }
            // for moleculars, combine the two sides
            if (Formula.syntax.isbinaryop(this.op)) {
                const lfv = (this.left) ? this.left.freevars : [];
                const rfv = (this.right) ? this.right.freevars : [];
                this._freevars = arrayUnion(lfv, rfv);
                return this._freevars;
            }
            // for quantifiers, return everything minus the one bound
            // by this quantifier
            if (Formula.syntax.isquant(this.op)) {
                const rfv = (this.right) ? this.right.freevars : [];
                let filtered = rfv;
                if (this.boundvar) {
                    filtered = filtered.filter((v) => (v != this.boundvar));
                }
                this._freevars = filtered;
                return this._freevars;
            }
            // for other monadic ops, just return what it applies to
            if (Formula.syntax.ismonop(this.op)) {
                this._freevars = ((this.right) ? this.right.freevars : []);
                return this._freevars;
            }
            // for zero-place ops, return empty array
            if (this.op) {
                this._freevars = [];
                return this._freevars;
            }
            // atomic; too simple for functions **
            this._freevars = this.terms.filter(
                (x) => (Formula.syntax.isvar(x))
            );
            return this._freevars;
        }

        // reads formula to left of main operator
        get left() {
            // return saved value if already calculated
            if ("_left" in this) {
                return this._left;
            }
            // if nothing on left, or no main op, return something falsy
            if (this.opspot < 1) {
                if (Formula.syntax.isbinaryop(this.op)) {
                    // SHOULD have a left, but does not
                    this.syntaxError('nothing to the left of ' +
                        this.op);
                }
                this._left = false;
                return this._left;
            }
            // cut string at the operator spot
            const leftstring =
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
            // get left and right sides and
            // add parentheses if needed (when binary)
            let leftstr = '';
            if (this.left) {
                if (Formula.syntax.isbinaryop(this.left.op)) {
                    leftstr = this.left.wrapit();
                } else {
                    leftstr = this.left.normal;
                }
            }
            let rightstr = '';
            if (this.right) {
                if (Formula.syntax.isbinaryop(this.right.op)) {
                    rightstr = this.right.wrapit();
                } else {
                    rightstr = this.right.normal;
                }
            }
            // binary op
            if (Formula.syntax.isbinaryop(this.op)) {
                this._normal = leftstr + ' ' + this.op + ' ' + rightstr;
                return this._normal;
            }
            // monadic op
            if (Formula.syntax.ismonop(this.op)) {
                let o = this.op;
                if (Formula.syntax.isquant(o)) {
                    let v = this.boundvar ?? '';
                    o = Formula.syntax.mkquantifier(v, o);
                }
                // wrap parens after monadic op with identity
                if (!(this?.right?.op) && (this?.right?.pletter == '=' ||
                    this?.right?.pletter == '≠')) {
                        this._normal = o+ '(' + rightstr + ')';
                        return this._normal;
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
            const terms = this.terms ?? [];
            const pletter = this.pletter ?? '';
            // check if there should be commas between
            let joiner = '';
            if (Formula.syntax.notation.useTermParensCommas) {
                joiner = ',';
            }
            // join terms into single string
            let termsstr = this.terms.join(joiner);
            // add parentheses around terms if need be
            if ((Formula.syntax.notation.useTermParensCommas) &&
                (this.terms.length > 0)) {
                termsstr = '(' + termsstr + ')';
            }
            // put them together
            let atomicstr = pletter + termsstr;
            // identity is different
            if ((terms.length == 2) &&
                (pletter == '=' || pletter == '≠')) {
                atomicstr = this.terms[0] + ' ' + pletter + ' '
                    + this.terms[1];
            }
            // return value
            this._normal = atomicstr;
            return this._normal;
        }

        // gets main operator by determining the main operator
        // spot and gets that character
        get op() {
            // if nothing to parse, mainop is falsey
            if (!this.parsedstr) { return false; }
            // return saved val
            if ("_op" in this) { return this._op; }
            const opspot = this.opspot;
            // if not found, treat main op as falsy
            if (opspot == -1) { return false; }
            // if there is operator right there, return it
            if (this.parsedstr[opspot] in Formula.syntax.operators) {
                this._op = this.parsedstr[opspot];
                return this._op;
            }
            // otherwise, try to parse remainder as starting with
            // a quantifier
            const remainder = this.parsedstr.substring(this.opspot);
            const m = remainder.match(Formula.syntax.qaRegEx);
            // if remainder
            if (m) {
                // if it contains the existential quantifier it is
                // an existential
                if (m[0].search(Formula.syntax.symbols.EXISTS) >= 0) {
                    this._op = Formula.syntax.symbols.EXISTS;
                    return this._op;
                }
                // if it doesn't it must be universal
                this._op = Formula.syntax.symbols.FORALL;
                return this._op;
            }
            // shouldn't be here, but just in case
            this._op = false;
            return this._op;
        }

        // gets the spot of the main operator, either from what was
        // previously stored as _opspot, or by scanning
        get opspot() {
            // return previously calculated spot if exists
            if ("_opspot" in this) {
                return this._opspot;
            }
            // set whether parentheses around quantifiers
            const parensinqs = (Formula.syntax.notation
                .quantifierForm.indexOf('(') != -1);

            // -1 means no operator found so far
            this._opspot = -1;
            let currdepth = 0;
            // the main op depth *should* always be zero; but might
            // not be if formula is unbalanced, but we soldier on
            // in case it's a "recoverable error"
            let mainopdepth = -1;
            let mainopcat = -1;
            for (let i=0; i<this.parsedstr.length; i++) {
                // get this character, and the remainder of the string
                const c = this.parsedstr.at(i);
                const remainder = this.parsedstr.substring(i);
                // letter before to check if right after a predicate
                const b = ((i==0) ? '' : this.parsedstr.at(i-1));
                if (c == '(') {
                    // increase depth with left parenthesis
                    currdepth++;
                } else if (c == ')') {
                    // decrease depth with right parenthesis
                    currdepth--;
                }
                // if more right parens than left, that's a problem
                if (currdepth < 0) {
                    this.syntaxError("unbalanced parentheses (extra right parenthesis)");
                }
                // check if we're right at an operator, or if not,
                // if we're at the start of a quantifier
                let isop = Formula.syntax.isop(c);
                let startswithq = remainder.match(Formula.syntax.qaRegEx);
                // don't count ∃ as an operator if matching (∃x) at the
                // parenthesis as well
                if (parensinqs && c == Formula.syntax.symbols.EXISTS &&
                    !startswithq) { isop = false; }
                // quantifiers starting with parentheses really have
                // one less depth
                const realdepth = (
                    (startswithq && parensinqs) ? currdepth -1 : currdepth
                );
                // determine operator, either the symbol, or the quantifier
                let thisop = c;
                if (startswithq) {
                    let m = startswithq[0];
                    if (m.search(Formula.syntax.symbols.EXISTS) >= 0) {
                        thisop = Formula.syntax.symbols.EXISTS;
                    } else {
                        thisop = Formula.syntax.symbols.FORALL;
                    }
                }
                // doesn't really start with a quantifier if we have (x)
                // right after a predicate
                if (startswithq && parensinqs &&
                    thisop == Formula.syntax.symbols.FORALL &&
                    Formula.syntax.pletterRegEx.test(b)) {
                    startswithq = false;
                    isop = false;
                }
                // found something at this spot
                if (isop || startswithq) {
                    // if "more main" or first one found, then it
                    // becomes our candidate
                    const newopcat = Formula.syntax.symbolcat[
                        Formula.syntax.operators[thisop]
                    ];
                    if ((realdepth < mainopdepth) || (mainopdepth == -1)) {
                        this._opspot = i;
                        mainopdepth = realdepth;
                        mainopcat = newopcat;
                    } else if (realdepth == mainopdepth) {
                        // or it depends on adicity
                        if (newopcat == 2 && mainopcat == 2) {
                            this.syntaxError('two binary operators occur ' +
                                'without enough parentheses to ' +
                                'determine which has wider scope');
                        }
                        // greater adicity means greater scope by default
                        if (newopcat > mainopcat) {
                            this._opspot = i;
                            mainopdepth = realdepth;
                            mainopcat = newopcat;
                        }
                    }
                }
            }
            // since we removed matching parentheses, we'd only
            // not be at depth zero if there was an extra left
            // parenthesis
            if (mainopdepth > 0) {
                this.syntaxError('unbalanced parentheses (unclosed left parenthesis)');
            }
            return this._opspot;
        }

        // "pletter" is a generic term covering both predicates and the
        // letter used in propositional atomic formulas (=0-place predicate)
        get pletter() {
            // return value if saved
            if ("_pletter" in this) {
                return this._pletter;
            }
            // nonatomic formulas do not have pletters, period, but that's OK
            if (this.op) {
                this._pletter = false;
                return this._pletter;
            }
            // look for first character which is a predicate
            const match = this.parsedstr.match(Formula.syntax.pletterRegEx);
            // has no pletter, which is not ok
            if (!match) {
                this._pletter = false;
                this.syntaxError('an atomic (sub)formula must use a letter in '
                    + 'the range ' + Formula.syntax.notation.predicatesRange +
                    ' and this does not');
                return this._pletter;
            }
            // position should be 0, or 2 in the case of =; may need to
            // change this to accommodate complex terms
            this._pletter = match[0];
            const pos = match.index;
            if (pos != 0 && this._pletter != '=' && this._pletter != '≠') {
                this.syntaxError('unexpected characters appear before the ' +
                    'letter ' + this._pletter);
            }
            if (pos != 2 && this._pletter == '=') {
                this.syntaxError('the identity relation symbol = occurs ' +
                    'in an unexpected place');
            }
            if (pos != 2 && this._pletter == '≠') {
                this.syntaxError('the nonidentity symbol ≠ occurs ' +
                    'in an unexpected place');
            }

            return this._pletter;
        }

        // gets formula right of main operator
        get right() {
            // do not reparse
            if ("_right" in this) {
                return this._right;
            }
            // if no main op, return something falsy
            if (this.opspot == -1 || Formula.syntax.symbolcat[
                Formula.syntax.operators[this.op]] == 0) {
                this._right = false;
                return this._right;
            }
            // by default we remove one character
            let skip = 1;
            // for quantifiers one must remove the whole thing
            if (Formula.syntax.isquant(this.op)) {
                // determine how many characters to remove
                let m = this.parsedstr.match(Formula.syntax.qaRegEx);
                if (m) { skip = m[0].length; }
            }
            // break the string
            const rightstring =
                this.parsedstr.substring(this.opspot+skip).trim();
            // if nothing left, that's a problem
            if (rightstring == '') {
                this.syntaxError('nothing to the right of the operator ' +
                    this.op);
                this._right = false;
                return this._right;
            }
            // get formula
            this._right = Formula.from(rightstring);
            return this._right;
        }

        // puts all syntax errors into a single string
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
            // remove spaces
            nopred = nopred.replaceAll(' ','');
            // strip outer parens, record having done so
            const nopredstripped = Formula.syntax.stripmatching(nopred);
            if (nopred != nopredstripped) {
                this._termshadparens = true;
            }
            // strip commas
            const nocommas = nopredstripped.replaceAll(',','');
            if (nocommas != nopredstripped) {
                this._termshadcommas = true;
            }
            // strip everything else**
            const r = new RegExp('[^' + Formula.syntax.notation.variableRange +
                Formula.syntax.notation.constantsRange + ']','g');
            const termstr = nocommas.replace(r,'');
            // atomic formulas should not have junk
            if ((!this.op) && (nocommas != termstr)) {
                this.syntaxError('unexpected symbols occur within an ' +
                    'atomic (sub)formula');
            }
            this._terms = termstr.match(Formula.syntax.termsRegEx);
            if (!this._terms) { this._terms = []; }
            return this._terms;
        }

        // determines if formula is well-formed
        get wellformed() { // should also bubble syntax errors to top
            if ("_wellformed" in this) {
                return this._wellformed;
            }
            // binary molecular
            if (Formula.syntax.isbinaryop(this.op)) {
                if (!("_wellformed" in this)) { this._wellformed = true; }
                const lresult = this.left.wellformed;
                const rresult = this.right.wellformed;
                Object.assign(this._syntaxerrors, this.left._syntaxerrors,
                    this.right._syntaxerrors);
                this._wellformed = (this._wellformed && lresult && rresult);
                return this._wellformed;
            }
            // monadic operator; either quantifier or other
            if (Formula.syntax.ismonop(this.op)) {
                // assume it's all ok to start
                if (!("_wellformed" in this)) { this._wellformed = true; }
                const rresult = this.right.wellformed;
                if (!rresult) {
                    this._wellformed = false;
                }
                Object.assign(this._syntaxerrors, this.right._syntaxerrors);
                const garbagebefore = (this.opspot != 0);
                if (garbagebefore) {
                    this.syntaxError('unexpected character(s) appear before ' +
                        ((Formula.syntax.isquant(this.op)) ? 'a quantifier' :
                        ('the operator ' + this.op)));
                    this._wellformed = false;
                    // boundvar error may be misleading in case of garbage
                    // so we won't wait for that
                    return this._wellformed;
                }
                if (Formula.syntax.isquant(this.op)) {
                    const varresult = (this.boundvar !== false);
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
            // identity should have exactly two terms
            if ((this.pletter == '=' || this.pletter == '≠')
                    && this.terms.length != 2) {
                this.syntaxError('uses the identity predicate “=” or ' +
                    'nonindentity predicate “≠” without exactly one ' +
                    'term on each side');
            }
            // shouldn't have any errors from checking pletter and terms
            for (let prob in this._syntaxerrors) {
                this._wellformed = false;
                break;
            }
            // if got here all was OK
            return this._wellformed;
        }

        // OTHER METHODS
        // important: instantiate should not change original Formula ("this")
        instantiate(variable, term) {
            if (Formula.syntax.isbinaryop(this.op)) {
                if (!this.left || !this.right) { return ''; }
                const l = Formula.from(this.left.instantiate(variable, term));
                const r = Formula.from(this.right.instantiate(variable, term));
                return l.wrapifneeded() + ' ' + this.op +
                    ' ' + r.wrapifneeded();
            }
            if (Formula.syntax.ismonop(this.op)) {
                if (!this.right) { return ''; }
                // we only replace free instances, so we don't replace within
                // subformula with same variable
                if (Formula.syntax.isquant(this.op) && (this.boundvar == variable)) {
                    return this.normal;
                }
                // instantiate in right side
                const r = Formula.from(this.right.instantiate(variable, term));
                // put quantifier with different variable back on right side
                if (Formula.syntax.isquant(this.op)) {
                    if (!(this.right.op) && (this.right.pletter == '=' ||
                        this.right.pletter == '≠')) {
                            return Formula.syntax.mkquantifier(
                                this.boundvar, this.op
                            ) + '(' + r.normal + ')';
                    }
                    return Formula.syntax.mkquantifier(
                        this.boundvar, this.op
                    ) + r.wrapifneeded();
                }
                // monadic operator not a quantifier is just it plus right side.
                // except if identity
                if (!(this.right.op) && (this.right.pletter == '=' ||
                    this.right.pletter == '≠')) {
                        return this.op + '(' + r.normal + ')';
                    }
                return this.op + r.wrapifneeded();
            }
            // zero place op, nothing to do
            if (this.op) { return this.normal; }
            // should be atomic
            const pletter = this.pletter ?? '';
            const terms = (this.terms ?? []).map(
                (t) => ((t == variable) ? term : t)
            );
            // too simplistic for function terms**
            let joiner = '';
            if (Formula.syntax.notation.useTermParensCommas) {
                joiner = ',';
            }
            let termstr = terms.join(joiner);
            if ((Formula.syntax.notation.useTermParensCommas)
                && (terms.length > 0)) {
                termstr = '(' + termstr + ')';
            }
            let atomicstr = pletter + termstr;
            // identity is different
            if (terms.length == 2 && (pletter == '=' || pletter == '≠' )) {
                atomicstr = terms[0] + ' ' + pletter + ' ' + terms[1];
            }
            return atomicstr;
        }

        // here fget and fstart are formulas
        // checks whether fget can result from fstart by replacing
        // zero or more occurrences of oldterm with newterm;
        // used for checking substitution of identicals
        static differsAtMostBy(fget, fstart, newterm, oldterm) {
            // false if one has an operator and
            // the other does not
            if ((fget.op && !fstart.op) || (fstart.op && !fget.op)) {
                return false;
            }
            // if neither is atomic
            if (fget.op && fstart.op) {
                // must have same operator
                if (fget.op != fstart.op) {
                    return false;
                }
                // if the op is 0-place, being the same is sufficient
                if (Formula.syntax.ispropconst(fget.op)) {
                    return true;
                }
                // quantifiers must use same variable
                if (Formula.syntax.isquant(fget.op) &&
                    (fget.boundvar != fstart.boundvar)) {
                    return false;
                }
                // must have compatible right sides
                if (!Formula.differsAtMostBy(fget.right, fstart.right,
                    newterm, oldterm)) {
                    return false;
                }
                // if monadic operators, the above is enough
                if (Formula.syntax.ismonop(fget.op)) {
                    return true;
                }
                // if made it here, must be binary operator, and
                // have compatible left sides, which is also enough
                return Formula.differsAtMostBy(fget.left, fstart.left,
                    newterm, oldterm);
            }
            // must be atomic if made it here
            // have to have same predicate
            if (fget.pletter != fstart.pletter) { return false; }
            // move on to terms, first check same length
            if (fget.terms.length != fstart.terms.length) {
                return false;
            }
            // check each term
            for (let i=0; i < fget.terms.length; i++) {
                const fgetterm = fget.terms[i];
                const fstartterm = fstart.terms[i];
                // check differently if it's the one we can substitute for
                // always OK for them to be the same
                if (fgetterm == fstartterm) { continue; }
                // if we made it here, they're different, which is only
                // allowed when it's the term we're substituting for
                if (fstartterm != oldterm) {
                    return false;
                }
                // since they're different, the new one must be the
                // replacement
                if (fgetterm != newterm) {
                    return false;
                }
                // getting here is OK, move on to check next
            }
            // atomics are same except substitution, which is OK
            return true;
        }

        // function for checking if something is an instance
        // of a quantified formula
        static isInstanceOf(i, f) {
            // formula must apply the quantifier to something
            if (!f.right) { return false; }
            // filter to terms that are not variables
            let tt = i.terms;
            tt = tt.filter((t) => (!Formula.syntax.isvar(t)));
            // see if instance can be got by replacing the formula's
            // bound variable with that term
            for (let c of tt) {
                if (i.normal == f.right.instantiate(f.boundvar, c)) {
                    return true;
                }
            }
            // fell through so it is not an instance
            return false;
        }

        // adds a syntax error to the collection of errors
        syntaxError(reason) {
            this._syntaxerrors[reason] = true;
            this._wellformed = false;
        }

        // puts parentheses around formulae with binary operators
        wrapifneeded() {
            if (this.op && Formula.syntax.isbinaryop(this.op)) {
                return this.wrapit();
            }
            return this.normal;
        }

        // puts parentheses around anything, picking nice ones based
        // on its depth
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
    // return the class
    return Formula;
}

// main function, either retrieves a Formula class from those
// already generated, or generates a new one and returns it
export default function getFormulaClass(notationname) {
    if (notationname in formulaClasses) {
        return formulaClasses[notationname];
    }
    const fClass = generateFormulaClass(notationname);
    formulaClasses[notationname] = fClass;
    return fClass;
}
