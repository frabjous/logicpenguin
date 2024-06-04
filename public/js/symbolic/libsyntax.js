// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// libsyntax.js ////////////////////////
// defines a function that can be used to generate a    //
// "syntax" object for an appropriate notation          //
//////////////////////////////////////////////////////////

// import notations
import notations from './notations.js';

// this object will hold all generated "syntax" objects
const syntaxes = {};

// adicities for operators
const symbolcat = {
    OR      : 2,
    AND     : 2,
    IFTHEN  : 2,
    IFF     : 2,
    NOT     : 1,
    FORALL  : 1,
    EXISTS  : 1,
    FALSUM  : 0
}

// changes all soft parentheses
function allsoftparens(s) {
    return s.replace(/[\{\[]/g,'(').replace(/[}\]]/g,')');
}

// tests if the character is a binary operator
function isbinaryop(c) {
    return (this.isop(c) && (symbolcat[this.operators[c]] == 2));
}

// tests if the character is a monadic operator
function ismonop(c) {
    return (this.isop(c) && (symbolcat[this.operators[c]] == 1));
}

// tests if a single character is a quantifier symbol;
// note this is the just the symbols, without the variable or parentheses
function isquant(c) {
    return (c == this.symbols.FORALL || c == this.symbols.EXISTS);
}

// tests if a character is a propositional constant/zero-place operator
function ispropconst(c) {
    return (this.isop(c) && (symbolcat[this.operators[c]] == 0));
}

// check if symbols is an operator
function isop(c) {
    return (c in this.operators);
}

// tests if a given character is a variable
function isvar(c) {
    return this.varRegEx.test(c);
}

// this: make quantifier with proper notation
function mkquantifier(v, q) {
    // determine whether or not to use parentheses for quantifiers
    const useParens = (this.notation.quantifierForm.charAt(0) == '(');
    // determine whether the universal quantifier is hidden
    const hideUniv = (this.notation.quantifierForm.search('Q\\?') >= 0);
    // by default we have a quantifier and variale
    let r = q + v;
    // remove quantifier if it is universal and no quantifier
    // symbol is used
    if (hideUniv && q == this.symbols.FORALL) {
        r = v;
    }
    // add parentheses if appropriate
    if (useParens) {
        r = '(' + r + ')';
    }
    //return result
    return r;
}

function mkuniversal(v) {
    return this.mkquantifier(v, this.symbols.FORALL);
}

function mkexistential(v) {
    return this.mkquantifier(v, this.symbols.EXISTS);
}

// changes to input string you'd be all right applying even to
// input fields, here we remove redundant spaces
function inputfix(s) {
    // remove spaces
    let rv = s.replace(/\s/g,'');
    // spaces only surround binary operators …
    for (const op in symbolcat) {
        if (symbolcat[op] == 2) {
            rv = rv.replaceAll(this.symbols[op],
                ' ' + this.symbols[op] + ' ');
        }
    }
    // … and identity
    rv = rv.replaceAll('=',' = ');
    rv = rv.replaceAll('≠',' ≠ ');
    return rv;
}

function stripmatching(s) {
    let depth = 0;
    if (s.length < 2) { return s; }
    for (let i=0; i< (s.length - 1); i++) {
        if (s[i] == '(') { depth++; }
        if (s[i] == ')') { depth--; }
        // depth will be 0 if opener was not '('
        // or we got back to zero before end
        if (depth == 0) { return s; }
    }
    if (s.at(-1) != ')') {
        // first paren never got matched
        // not well formed here but oh well
        return s;
    }
    // matching; return strip recursively
    return this.stripmatching(s.substring(1, s.length - 1));
}

//////////// Main function for generating new syntax
function generateSyntax(notationname) {
    // initialize return value
    const syntax = {};

    // grab the symbols from the notations
    if (notationname in notations) {
        syntax.notation = notations[notationname];
        syntax.notationname = notationname;
    } else {
        // use Cambridge notation if a bad notation name given
        syntax.notation = notations['cambridge'];
        syntax.notationname = 'cambridge';
    }

    // symbols are those things in notation also in symbolcat
    const symbols = {}
    for (let sym in syntax.notation) {
        if (sym in symbolcat) { symbols[sym] = syntax.notation[sym]; }
    }
    syntax.symbols = symbols;

    // reverse list of symbols to get operators
    const operators = Object.fromEntries(
        Object.entries(symbols).map(([x,y]) => ([y,x])));
    syntax.operators = operators;
    //
    // Syntax Regular Expressions (RegExp)
    //

    // generate regex description for quantifiers from
    // quantifierForm
    syntax.qRegExStr = syntax.notation.quantifierForm
        .replaceAll('(',"\\(").replaceAll(')',"\\)")
        .replaceAll('Q?',symbols.EXISTS + '?')
        .replaceAll('Q','[' + symbols.EXISTS + symbols.FORALL + ']')
        .replaceAll('x','[' + syntax.notation.variableRange + ']');

    // regular quantifier regex
    syntax.qRegEx = new RegExp(syntax.qRegExStr);
    // global version
    syntax.gqRegEx = new RegExp(syntax.qRegExStr, 'g');
    // anchored to start
    syntax.qaRegEx = new RegExp('^' + syntax.qRegExStr);
    // variable regex
    syntax.varRegEx = new RegExp('[' + syntax.notation.variableRange + ']');
    // variable regex, anchored
    syntax.varaRegEx = new RegExp('^[' + syntax.notation.variableRange + ']$');
    // terms regex
    syntax.termsRegEx = new RegExp('[' + syntax.notation.variableRange +
        syntax.notation.constantsRange + ']', 'g');
    // predicate letter/ propositional letter regEx
    syntax.pletterRegEx = new RegExp ('[' + syntax.notation
        .predicatesRange + ']');
    // constants and nonconstants regexex
    syntax.cRegEx = new RegExp('^[' + syntax.notation.constantsRange + ']$');
    syntax.ncRegEx = new RegExp( '[^' + syntax.notation.constantsRange + ']', 'g');

    // BIND SYNTAX FUNCTIONS TO THIS SYNTAX
    syntax.allsoftparens = allsoftparens;
    syntax.inputfix = inputfix;
    syntax.isbinaryop = isbinaryop;
    syntax.ismonop = ismonop;
    syntax.isquant = isquant;
    syntax.ispropconst = ispropconst;
    syntax.isop = isop;
    syntax.isvar = isvar;
    syntax.mkquantifier = mkquantifier;
    syntax.mkuniversal = mkuniversal;
    syntax.mkexistential = mkexistential;
    syntax.stripmatching = stripmatching;
    syntax.symbolcat = symbolcat;
    return syntax;
}
//
// EXPORTED FUNCTION
//
// returns the appropriate 'syntax' for the notation
// in question
export default function getSyntax(notationname) {
    // if already generated, return that one
    if (notationname in syntaxes) {
        return syntaxes[notationname];
    }
    // generate the syntax from the notation
    const syntax = generateSyntax(notationname);
    // save the syntax in syntaxes so it doesn't
    // have to be regenerated each time it is called
    syntaxes[notationname] = syntax;
    return syntax;
}
