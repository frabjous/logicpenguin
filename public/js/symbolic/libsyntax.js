// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// libsyntax.js ////////////////////////
// defines a function that can be used to generate a
// "syntax" object for an appropriate notation
//////////////////////////////////////////////////////////

import notations from './notations.js';
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

// TODO fix this so it doesn't script things up with parens
allsoftparens = function(s, syntax) {
    // should also remove parentheses around quantifier
    s=s.replace(/[\{\[]/g,'(').replace(/[}\]]/g,')');
    if (syntax.useQParens) {
        // TODO: will (x) be a problem?; it won't remove it
        s=s.replace(syntax.gqRegEx, '$1$2');
    }
    return s;
}

isbinaryop = function(c, syntax) {
    return (syntax.isop(c) && (symbolcat[operators[c]] == 2));
}

ismonop = function(c, syntax) {
    return (syntax.isop(c) && (symbolcat[operators[c]] == 1));
}

isquant = function(c, syntax) {
    return (c == symbols.FORALL || c == symbols.EXISTS);
}

ispropconst = function(c, syntax) {
    return (syntax.isop(c) && (symbolcat[operators[c]] == 0));
}

// check if operator
isop = function(c, syntax) {
    return (c in syntax.operators);
}

isvar = function(c, syntax) {
    return syntax.varRegEx.test(c);
}

// syntax: make quantifiers
mkquantifier = function(v, q) {
    let r = q + v;
    if (syntax.useQParens) {
        r = '(' + r + ')';
    }
    return r;
}

mkuniversal = function(v) {
    return syntax.mkquantifier(v, symbols.FORALL);
}

mkexistential = function(v) {
    return syntax.mkquantifier(v, symbols.EXISTS);
}

// changes to input string you'd be all right applying even to
// input fields, here we remove redundant spaces
syntax.inputfix = function(s) {
    // remove spaces
    let rv = s.replace(/\s/g,'');
    // spaces only surround binary operators …
    for (const op in symbolcat) {
        if (symbolcat[op] == 2) {
            rv = rv.replaceAll(symbols[op], ' ' + symbols[op] + ' ');
        }
    }
    // … and identity
    rv = rv.replaceAll('=',' = ');
    return rv;
}

syntax.stripmatching = function(s) {
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
    return syntax.stripmatching(s.substring(1,s.length-1));
}

export function isInstanceOf(i, f) {
    let tt = i.terms.split('');
    tt = tt.filter((t) => (!syntax.isvar(t)));
    for (let c of tt) {
        if (i.normal == f.right.instantiate(f.boundvar, c)) {
            return true;
        }
    }
    return false;
}


//////////// Main function for generating new syntax
function generateSyntax(notationname) {
    // initialize return value
    const syntax = {};

    // grab the symbols from the notations
    if (notationname in notations) {
        syntax.notation = notations[notationname];
    } else {
        // use Cambridge notation if a bad notation name given
        syntax.notation = notations['cambridge'];
    }

    // symbols are those things in notation also in symbolcat
    const symbols = {}
    for (let sym in symbols) {
        if (sym in symbolcat) { justsymbols[sym] = symbols[sym]; }
    }
    syntax.symbols = symbols;

    // reverse list of symbols to get operators
    syntax.operators = Object.fromEntries(
        Object.entries(symbols).map(([x,y]) => ([y,x])));
    let operators = syntax.operators;
    
    //
    // Syntax Regular Expressions (RegExp)
    //

    // generate regex description for quantifiers from
    // quantifierForm
    let qRegExStr = symbols.quantifierForm
        .replaceAll('(',"\\(").replaceAll(')',"\\)")
        .replaceAll('Q?',symbols.EXISTS + '?').
        .replaceAll('Q','[' + symbols.EXISTS + symbols.FORALL + ']');

    // regular quantifier regex
    syntax.qRegEx = new RegExp(qRegExStr);
    // global version
    syntax.gqRegEx = new RegExp(qRegExStr, 'g');
    // anchored to start
    syntax.qaRegEx = new RegExp('^' + qRegExStr);

    // variable regex
    syntax.varRegEx = new RegExp('^[' + symbols.variableRange + ']$');

    // SYNTACTIC CATEGORIES
    // assign categories (adicity) of operators

    ///////////////////////
    // SYNTAX FUNCTIONS
    ///////////////////////

}
//
// Export
//
// returns the appropriate 'syntax' for the notation
// in question
export default function getSyntax(notationname) {
    // if already generated, return that one
    if (notationname in syntaxes) {
        return syntaxes[notationname];
    }
    // generate the syntax from the notation
    let syntax = generateSyntax(notationname);
    // save the syntax in syntaxes so it doesn't
    // have to be regenerated each time it is called
    syntaxes[notationname] = syntax;
    return syntax;
}

