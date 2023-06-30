// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// libsyntax.js ////////////////////////
// defines a function that can be used to generate a
// "syntax" object for an appropriate notation
//////////////////////////////////////////////////////////

import notations from './notations.js';
const syntaxes = {};

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

function generateSyntax(notationname) {
    // initialize return value
    let syntax = {};

    // grab the symbols from the notations
    if (notationname in notations) {
        syntax.symbols = notations[notationname];
    } else {
        // use Cambridge notation if a bad notation name given
        syntax.symbols = notations['cambridge'];
    }

    // shorter name for symbols
    let symbols = syntax.symbols;

    // reverse list of symbols to get operators
    syntax.operators = Object.fromEntries(
        Object.entries(symbols).map(([x,y]) => ([y,x])));

    let qRegExStr = symbols.quantifierForm
        .replaceAll('(',"\\(").replaceAll(')',"\\)")
        .replaceAll('Q?',symbols.EXISTS + '?').
        .replaceAll('Q','[' + symbols.EXISTS + symbols.FORALL + ']');

    // generate regexes for the symbols

    // quantifier
    syntax.qRegEx = new RegExp(qRegExStr);
    // global version
    syntax.gqRegEx = new RegExp(qRegExStr, 'g');
    // anchored to start
    syntax.qaRegEx = new RegExp('^' + qRegExStr);

    // variable regex
    syntax.varRegEx = new RegExp('^[' + symbols.variableRange + ']$');

    // SYNTACTIC CATEGORIES
    // assign categories (adicity) of operators
    export const symbolcat = {
        OR      : 2,
        AND     : 2,
        IFTHEN  : 2,
        IFF     : 2,
        NOT     : 1,
        FORALL  : 1,
        EXISTS  : 1,
        FALSUM  : 0
    }
    const maxopadicity = 2;

    ////////////////// FUNCTIONS

    syntax.allsoftparens = function(s) {
        // should also remove parentheses around quantifier
        s=s.replace(/[\{\[]/g,'(').replace(/[}\]]/g,')');
        if (syntax.useQParens) {
            // TODO: will (x) be a problem?; it won't remove it
            s=s.replace(syntax.gqRegEx, '$1$2');
        }
        return s;
    }

    syntax.isbinaryop = function(c) {
        return (syntax.isop(c) && (symbolcat[operators[c]] == 2));
    }

    syntax.ismonop = function(c) {
        return (syntax.isop(c) && (symbolcat[operators[c]] == 1));
    }

    syntax.isquant = function(c) {
        return (c == symbols.FORALL || c == symbols.EXISTS);
    }

    syntax.ispropconst = function(c) {
        return (syntax.isop(c) && (symbolcat[operators[c]] == 0));
    }

    // check if operator
    syntax.isop = function(c) {
        return (c in operators);
    }

    syntax.isvar = function(c) {
        return syntax.varRegEx.test(c);
    }

    // syntax: make quantifiers
    syntax.mkquantifier = function(v, q) {
        let r = q + v;
        if (syntax.useQParens) {
            r = '(' + r + ')';
        }
        return r;
    }

    syntax.mkuniversal = function(v) {
        return syntax.mkquantifier(v, symbols.FORALL);
    }

    syntax.mkexistential = function(v) {
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
}
