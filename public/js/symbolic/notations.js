// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// notations.js ///////////////////////////
// Defines the various notation choices and returns the  //
// one asked for                                         //
///////////////////////////////////////////////////////////

// NOTE: the logic penguin math font makes ✖ look like
// a double-stroked X

// IMPORTANT NOTE: Something should always be set for FORALL
// even if it uses Russellian notation (x); that will be
// suppressed.E.g., the "copi" set below has it set to "Π",
// even though it is not used. It can be set to anything
// not overlapping the other symbols.

// In particular, quantifierForm should always contain
// a 'Q' for the quantifier symbols and an x for where
// the variable goes. If a question mark appears after the
// Q, then the symbol chosen for FORALL will be suppressed
// and need not appear in the formula when parsed.

const notations = {
    "bristol": {
        OR      : '∨',
        AND     : '&',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '⊥',
        constantsRange: 'a-t',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-W',
        schematicLetters: 'XX𝓍𝒸𝒸',
        useTermParensCommas: false,
        variableRange: 'x-zu-w'
    },
    "calgary": {
        OR      : '∨',
        AND     : '∧',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '⊥',
        constantsRange: 'a-r',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: '𝒜𝒜𝓍𝒸𝒸',
        useTermParensCommas: true,
        variableRange: 'x-zs-w'
    },
    "cambridge": {
        OR      : '∨',
        AND     : '∧',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '⊥',
        constantsRange: 'a-r',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: '𝑨𝑨𝒙𝒄𝒄',
        useTermParensCommas: false,
        variableRange: 'x-zs-w'
    },
    "copi": {
        OR      : '∨',
        AND     : '•',
        IFTHEN  : '⊃',
        IFF     : '≡',
        NOT     : '~',
        FORALL  : 'Π',
        EXISTS  : '∃',
        FALSUM  : '↯',
        constantsRange: 'a-w',
        predicatesRange: '=≠A-Z',
        quantifierForm: '(Q?x)',
        schematicLetters: 'pℱ𝓍𝒸𝒸',
        useTermParensCommas: false,
        variableRange: 'x-z'
    },
    "leeds": {
        OR      : '∨',
        AND     : '∧',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '⊥',
        constantsRange: 'a-w',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: '𝒳ℱ𝓍𝒸𝒸',
        useTermParensCommas: false,
        variableRange: 'x-z'
    },
    "loraincounty": {
        OR      : '∨',
        AND     : '&',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '~',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '⊥',
        constantsRange: 'a-w',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: '𝒜𝒜𝓍𝒸𝒸',
        useTermParensCommas: false,
        variableRange: 'x-z'
    },
    "hardegree": {
        OR      : '∨',
        AND     : '&',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '~',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '✖',
        constantsRange: 'a-w',
        predicatesRange: '=≠A-Z',
        quantifierForm: 'Qx',
        schematicLetters: '𝒜𝒜𝓍𝒶𝓃',
        useTermParensCommas: false,
        variableRange: 'x-z'
    },
    "magnus": {
        OR      : '∨',
        AND     : '&',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '※',
        constantsRange: 'a-w',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: '𝒜𝒜𝓍𝒸𝒸',
        useTermParensCommas: false,
        variableRange: 'x-z'
    },
    "msu": {
        OR      : '∨',
        AND     : '&',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '※',
        constantsRange: 'a-r',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: '𝒜𝒜𝓍𝒸𝒸',
        useTermParensCommas: true,
        variableRange: 'x-zs-w'
    },
    "slu": {
        OR      : '∨',
        AND     : '∧',
        IFTHEN  : '→',
        IFF     : '↔',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '⊥',
        constantsRange: 'a-r',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: '𝒜𝒜𝓍𝒸𝒸',
        useTermParensCommas: false,
        variableRange: 'x-zs-w'
    },
    "ubc": {
        OR      : '∨',
        AND     : '&',
        IFTHEN  : '⊃',
        IFF     : '≡',
        NOT     : '¬',
        FORALL  : '∀',
        EXISTS  : '∃',
        FALSUM  : '※',
        constantsRange: 'a-w',
        quantifierForm: 'Qx',
        predicatesRange: '=≠A-Z',
        schematicLetters: 'ΦΦ𝓍𝒸𝒸',
        useTermParensCommas: false,
        variableRange: 'x-z'
    }
}

notations.adelaide = notations.slu;
notations.pitt = notations.slu;
notations.r3 = notations.slu;
notations.uconn = notations.slu;

export default notations;
