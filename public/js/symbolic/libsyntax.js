// INITIALIZE
export let syntax = {};

// TODO: make this configurable and import it
export const symbols = {
    OR      : '∨',
    AND     : '&',
    IFTHEN  : '→',
    IFF     : '↔',
    NOT     : '~',
    FORALL  : '∀',
    EXISTS  : '∃',
    FALSUM  : '✖' // change later most likely
}
syntax.symbols = symbols;

syntax.termparens = false;
syntax.usecommas = false;

// reverse list of symbols to get operators
export const operators = Object.fromEntries(
    Object.entries(symbols).map(([x,y]) => ([y,x])));

syntax.constantsRange = 'a-t';
syntax.variableRange = 'u-z';
syntax.pletterRange = '=A-Z';
const useQParens = true; // for testing; remove
let qRegExStr = '([' + symbols.FORALL + symbols.EXISTS + '])([' +
    syntax.variableRange + '])';
if (useQParens) {
    qRegExStr = '\\(' + qRegExStr + '\\)';
}
// quantifier regeex
syntax.qRegEx = new RegExp(qRegExStr);
// global version
syntax.gqRegEx = new RegExp(qRegExStr, 'g');
// anchored version

// variable regex
syntax.varRegEx = new RegExp('^[' + syntax.variableRange + ']$');

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
    if (useQParens) {
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
