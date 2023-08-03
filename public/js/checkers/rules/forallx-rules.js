// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////////// forallx-rules.js //////////////////////////////////////
// defines the inference rules for various forallx-style derivation systems//
/////////////////////////////////////////////////////////////////////////////

// Note: all rulesets should be done with Cambridge notation; will be
// swapped out for the correct thingamig

// UConn = Calgary rules with Cambridge notation

import notations from '../../symbolic/notations.js';

const opnames = ['NOT','OR','AND','IFF','IFTHEN','FORALL','EXISTS','FALSUM'];

const rulesrepository = {};

const allRules = {};

allRules.common = {
    "∨I"  : { forms: [ { prems: ["A"], conc: "A ∨ B" }, { prems: ["A"], conc: "B ∨ A" } ] },
    "∧I"  : { forms: [ { prems: ["A", "B"], conc: "A ∧ B" } ] },
    "→I"  : { forms: [ { conc: "A → B", subderivs: [ { needs: ["B"], allows: "A" } ] } ] },
    "↔I"  : { forms: [ { conc: "A ↔ B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["A"], allows: "B" } ] } ] },
    "¬I"  : { forms: [ { conc: "¬A", subderivs: [ { needs: ["⊥"], allows: "A" } ] } ] },
    "∀I"  : { pred: true, forms: [ { prems: ["Aa"], conc: "∀xAx", notinhyps: ["a"], subst: {"x": "a"} } ] },
    "∃I"  : { pred: true, forms: [ { prems: ["Aa"], conc: "∃xAx", subst: {"x":"a"} } ] },
    "=I"  : { pred: true, forms: [ { conc: "c = c", prems: [] } ] },
    "R"   : { forms: [ { prems: ["A"], conc: "A" } ], derived: true },
    "∨E"  : { forms: [ { conc: "C", prems: ["A ∨ B"], subderivs: [ { needs: ["C"], allows: "A" }, { needs: ["C"], allows: "B" } ] } ] },
    "∧E"  : { forms: [ { prems: ["A ∧ B"], conc: "A" }, { prems: ["A ∧ B"], conc: "B" } ] },
    "→E"  : { forms: [ { prems: ["A → C", "A"], conc: "C" } ] },
    "↔E"  : { forms: [ { prems: ["A ↔ B", "A"], conc: "B" }, { prems: ["A ↔ B", "B"], conc: "A" } ] },
    "¬E"  : { forms: [ { prems: ["A", "¬A"], conc: "⊥" } ] },
    "∀E"  : { pred: true, forms: [ { prems: ["∀xAx"], conc: "Aa", subst: {"x":"a"} } ] },
    "∃E"  : { pred: true, forms: [ { conc: "B", prems: ["∃xAx"], notinhyps: ["n"], cannotbein: {"n":["Ax","B"]}, subst: {"x": "n"}, subderivs: [ { needs: ["B"], allows: "An" } ] } ] },
    "=E"  : { pred: true, forms: [ { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","b","a"] }, { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","a","b"] } ] },
    "MT"  : { forms: [ { prems: ["A → B", "¬B"], conc: "¬A" } ], derived: true },
    "Pr"  : { premiserule: true, hidden: true },
    "Hyp" : { assumptionrule: true, hidden: true }
}

allRules.adelaide = {
    "¬I"  : { forms : [ { conc: "¬A", subderivs: [ { needs: ["B", "¬B"], allows: "A" } ] } ] },
    "¬E"  : { forms : [ { conc: "A", subderivs: [ { needs: ["B", "¬B"], allows: "¬A" } ] } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ], derived: true },
    "DNE" : { forms: [ { prems: ["¬¬A"], conc: "A" } ], derived: true },
    "TND" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ] },
    "DeM" : { forms: [ { prems: ["¬(A ∧ B)"], conc: "¬A ∨ ¬B" }, { prems: ["¬A ∨ ¬B"], conc: "¬(A ∧ B)" }, { prems: ["¬(A ∨ B)"], conc: "¬A ∧ ¬B" }, { prems: ["¬A ∧ ¬B"], conc: "¬(A ∨ B)" } ], derived: true },
    "=E"  : { pred: true, forms: [ { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","b","a"] } ] },
    "=ES" : { pred: true, forms: [ { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","a","b"] } ] }
}

allRules.bristol = {
    "¬E"  : { meinongian: true, hint: "An elimination rule for negation does not exist in this system." },
    "⊥I"  : { forms: [ { prems: ["A", "¬A"], conc: "⊥" } ] },
    "⊥E"  : { forms: [ { prems: ["⊥"], conc: "A" } ] },
    "PbC" : { forms: [ { conc: "A", subderivs: [ { needs: ["⊥"], allows: "¬A" } ] } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ], derived: true },
    "LEM" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ], derived: true },
    "DNE" : { forms: [ { prems: ["¬¬A"], conc: "A" } ], derived: true },
    "DeM" : { forms: [ { prems: ["¬(A ∧ B)"], conc: "¬A ∨ ¬B" }, { prems: ["¬A ∨ ¬B"], conc: "¬(A ∧ B)" }, { prems: ["¬(A ∨ B)"], conc: "¬A ∧ ¬B" }, { prems: ["¬A ∧ ¬B"], conc: "¬(A ∨ B)" } ], derived: true },
    "CQ"  : { pred: true, forms: [ { prems: ["∀x¬Ax"], conc: "¬∃xAx" }, { prems: ["∃x¬Ax"], conc: "¬∀xAx" }, { prems: ["¬∀xAx"], conc: "∃x¬Ax" }, { prems: ["¬∃xAx"], conc: "∀x¬Ax" } ], derived: true }
}

allRules.cambridge = {
    "X"   : { forms: [ { prems: ["⊥"], conc: "A" } ] },
    "TND" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ], derived: true },
    "DNE" : { forms: [ { prems: ["¬¬A"], conc: "A" } ], derived: true },
    "DeM" : { forms: [ { prems: ["¬(A ∧ B)"], conc: "¬A ∨ ¬B" }, { prems: ["¬A ∨ ¬B"], conc: "¬(A ∧ B)" }, { prems: ["¬(A ∨ B)"], conc: "¬A ∧ ¬B" }, { prems: ["¬A ∧ ¬B"], conc: "¬(A ∨ B)" } ], derived: true },
    "CQ"  : { pred: true, forms: [ { prems: ["∀x¬Ax"], conc: "¬∃xAx" }, { prems: ["∃x¬Ax"], conc: "¬∀xAx" }, { prems: ["¬∀xAx"], conc: "∃x¬Ax" }, { prems: ["¬∃xAx"], conc: "∀x¬Ax" } ], derived: true }
}

allRules.calgary = {
    "IP"  : { forms: [ { conc: "A", subderivs: [ { needs: ["⊥"], allows: "¬A" } ] } ] },
    "X"   : { forms: [ { prems: ["⊥"], conc: "A" } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ], derived: true },
    "LEM" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ], derived: true },
    "DNE" : { forms: [ { prems: ["¬¬A"], conc: "A" } ], derived: true },
    "DeM" : { forms: [ { prems: ["¬(A ∧ B)"], conc: "¬A ∨ ¬B" }, { prems: ["¬A ∨ ¬B"], conc: "¬(A ∧ B)" }, { prems: ["¬(A ∨ B)"], conc: "¬A ∧ ¬B" }, { prems: ["¬A ∧ ¬B"], conc: "¬(A ∨ B)" } ], derived: true },
    "CQ"  : { pred: true, forms: [ { prems: ["∀x¬Ax"], conc: "¬∃xAx" }, { prems: ["∃x¬Ax"], conc: "¬∀xAx" }, { prems: ["¬∀xAx"], conc: "∃x¬Ax" }, { prems: ["¬∃xAx"], conc: "∀x¬Ax" } ], derived: true }
}

allRules.loraincounty = {
    "¬I"     : { forms : [ { conc: "¬A", subderivs: [ { needs: ["B", "¬B"], allows: "A" } ] } ] },
    "∨E"     : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ] },
    "¬E"     : { forms : [ { conc: "A", subderivs: [ { needs: ["B", "¬B"], allows: "¬A" } ] } ] },
    "CD"     : { forms: [ { prems: ["A ∨ B", "A → C", "B -> C"], conc: "C" } ], derived: true },
    "DD"     : { forms: [ { prems: ["A → B", "A → C", "¬B ∨ ¬C"], conc: "¬A" } ], derived: true },
    "HS"     : { forms: [ { prems: ["A → B", "B → C"], conc: "A → C" } ], derived: true },
    "DeM"    : { replacementrule: true, forms: [ { a: "¬(A ∨ B)", b: "¬A ∧ ¬ B" }, { a: "¬(A ∧ B)", b: "¬A ∨ ¬B" } ], derived: true },
    "Idem∨"  : { forms: [ { prems: ["A ∨ A"], conc: "A" } ], derived: true },
    "Idem∧"  : { forms: [ { prems: ["A"], conc: "A ∧ A" } ], derived: true },
    "WK"     : { forms: [ { prems: ["A"], conc: "B → A" } ], derived: true },
    "Comm∧"  : { replacementrule: true, forms: [ { a: "A ∧ B", b: "B ∧ A" } ], derived: true },
    "Comm∨"  : { replacementrule: true, forms: [ { a: "A ∨ B", b: "B ∨ A" } ], derived: true },
    "Comm↔"  : { replacementrule: true, forms: [ { a: "A ↔ B", b: "B ↔ A" } ], derived: true },
    "DN"     : { replacementrule: true, forms: [ { a: "A", b: "¬¬A" } ], derived: true },
    "MC"     : { replacementrule: true, forms: [ { a: "A → B", b: "¬A ∨ B" }, { a: "A ∨ B", b: "¬A → B" } ], derived: true },
    "ex"     : { replacementrule: true, forms: [ { a: "(A → B) ∧ (B → A)", b: "A ↔ B" } ], derived: true },
    "Trans"  : { replacementrule: true, forms: [ { a: "A → B", b: "¬B → ¬C" } ], derived: true },
    "Assoc∧" : { replacementrule: true, forms: [ { a: "(A ∧ B) ∧ C", b: "A ∧ (B ∧ C)" } ], derived: true },
    "Assoc∨" : { replacementrule: true, forms: [ { a: "(A ∨ B) ∨ C", b: "A ∨ (B ∨ C)" } ], derived: true },
    "Assoc↔" : { replacementrule: true, forms: [ { a: "(A ↔ B) ↔ C", b: "A ↔ (B ↔ C)" } ], derived: true },
    "QN"     : { replacementrule: true, forms: [ { a: "¬∀xAx", b: "∃x¬Ax" }, { a: "¬∃xAx", b: "∀x¬Ax" } ], derived: true, pred: true }
}

allRules.magnus = {
    "¬I"   : { forms : [ { conc: "¬A", subderivs: [ { needs: ["B", "¬B"], allows: "A" } ] } ] },
    "∨E"   : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ] },
    "¬E"   : { forms : [ { conc: "A", subderivs: [ { needs: ["B", "¬B"], allows: "¬A" } ] } ] },
    "DeM"  : { replacementrule: true, forms: [ { a: "¬(A ∨ B)", b: "¬A ∧ ¬ B" }, { a: "¬(A ∧ B)", b: "¬A ∨ ¬B" } ], derived: true },
    "DIL"  : { forms: [ { prems: ["A ∨ B", "A → C", "B → C"], conc: "C" } ], derived: true },
    "HS"   : { forms: [ { prems: ["A → B", "B → C"], conc: "A → C" } ], derived: true },
    "Comm" : { replacementrule: true, forms: [ { a: "A ∧ B", b: "B ∧ A" }, { a: "A ∨ B", b: "B ∨ A" }, { a: "A ↔ B", b: "B ↔ A" } ], derived: true },
    "DN"   : { replacementrule: true, forms: [ { a: "A", b: "¬¬A" } ], derived: true },
    "MC"   : { replacementrule: true, forms: [ { a: "A → B", b: "¬A ∨ B" }, { a: "A ∨ B", b: "¬A → B" } ], derived: true },
    "↔ex"  : { replacementrule: true, forms: [ { a: "(A → B) ∧ (B → A)", b: "A ↔ B" } ], derived: true },
    "QN"   : { replacementrule: true, forms: [ { a: "¬∀xAx", b: "∃x¬Ax" }, { a: "¬∃xFx", b: "∀x¬Ax" } ], derived: true, pred: true }
}

allRules.msu = {
    "↔I"  : { forms: [ { prems: ["A → B", "B → A"], conc: "A ↔ B" } ] },
    "¬I"  : { forms : [ { conc: "¬A", subderivs: [ { needs: ["B", "¬B"], allows: "A" } ] } ] },
    "∨E"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ] },
    "¬E"  : { forms : [ { conc: "A", subderivs: [ { needs: ["B", "¬B"], allows: "¬A" } ] } ] },
    "DN"  : { forms: [ { prems: ["A"], conc: "¬¬A" } ] },
    "MT"  : { meinongian: true, hidden: true },
    "Pr"  : { premiserule: true, hidden: true },
    "PR"  : { premiserule: true, hidden: true },
    "AS"  : { assumptionrule: true, hidden: true }
}

allRules.pitt = {
    "⊥I"  : { forms: [ { prems: ["A", "¬A"], conc: "⊥" } ] },
    "¬E"  : { forms: [ { conc: "A", subderivs: [ { needs: ["⊥"], allows: "¬A" } ] } ] },
    "⊥E"  : { forms: [ { prems: ["⊥"], conc: "A" } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ], derived: true },
    "LEM" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ], derived: true },
    "DNE" : { forms: [ { prems: ["¬¬A"], conc: "A" } ], derived: true },
    "DeM" : { forms: [ { prems: ["¬(A ∧ B)"], conc: "¬A ∨ ¬B" }, { prems: ["¬A ∨ ¬B"], conc: "¬(A ∧ B)" }, { prems: ["¬(A ∨ B)"], conc: "¬A ∧ ¬B" }, { prems: ["¬A ∧ ¬B"], conc: "¬(A ∨ B)" } ], derived: true },
    "CQ"  : { pred: true, forms: [ { prems: ["∀x¬Ax"], conc: "¬∃xAx" }, { prems: ["∃x¬Ax"], conc: "¬∀xAx" }, { prems: ["¬∀xAx"], conc: "∃x¬Ax" }, { prems: ["¬∃xAx"], conc: "∀x¬Ax" } ], derived: true }
}

allRules.r3 = {
    "¬I"   : { forms : [ { conc: "¬A", subderivs: [ { needs: ["B", "¬B"], allows: "A" } ] } ] },
    "∨E"   : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ] },
    "¬E"   : { forms : [ { conc: "A", subderivs: [ { needs: ["B", "¬B"], allows: "¬A" } ] } ] },
    "DeM"  : { replacementrule: true, forms: [ { a: "¬(A ∨ B)", b: "¬A ∧ ¬ B" }, { a: "¬(A ∧ B)", b: "¬A ∨ ¬B" } ], derived: true },
    "DIL"  : { forms: [ { prems: ["A ∨ B", "A → C", "B → C"], conc: "C" } ], derived: true },
    "HS"   : { forms: [ { prems: ["A → B", "B → C"], conc: "A → C" } ], derived: true },
    "Comm" : { replacementrule: true, forms: [ { a: "A ∧ B", b: "B ∧ A" }, { a: "A ∨ B", b: "B ∨ A" }, { a: "A ↔ B", b: "B ↔ A" } ], derived: true },
    "DN"   : { replacementrule: true, forms: [ { a: "A", b: "¬¬A" } ], derived: true },
    "MC"   : { replacementrule: true, forms: [ { a: "A → B", b: "¬A ∨ B" }, { a: "A ∨ B", b: "¬A → B" } ], derived: true },
    "TAUT" : { replacementrule: true, forms: [ { a: "P ∨ P", b: "P" }, { a: "P ∧ P", b: "P" } ], derived: true },
    "↔ex"  : { replacementrule: true, forms: [ { a: "(A → B) ∧ (B → A)", b: "A ↔ B" } ], derived: true },
    "QN"   : { replacementrule: true, forms: [ { a: "¬∀xAx", b: "∃x¬Ax" }, { a: "¬∃xFx", b: "∀x¬Ax" } ], derived: true, pred: true }
}

allRules.slu = {
    "⊥I"  : { forms: [ { prems: ["A", "¬A"], conc: "⊥" } ] },
    "⊥E"  : { forms: [ { prems: ["⊥"], conc: "A" } ] },
    "¬E"  : { meinongian: true, hint: "An elimination rule for negation does not exist in this system." },
    "TND" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ], derived: true },
    "DNE" : { forms: [ { prems: ["¬¬A"], conc: "A" } ], derived: true },
    "DeM" : { forms: [ { prems: ["¬(A ∧ B)"], conc: "¬A ∨ ¬B" }, { prems: ["¬A ∨ ¬B"], conc: "¬(A ∧ B)" }, { prems: ["¬(A ∨ B)"], conc: "¬A ∧ ¬B" }, { prems: ["¬A ∧ ¬B"], conc: "¬(A ∨ B)" } ], derived: true },
    "CQ"  : { pred: true, forms: [ { prems: ["∀x¬Ax"], conc: "¬∃xAx" }, { prems: ["∃x¬Ax"], conc: "¬∀xAx" }, { prems: ["¬∀xAx"], conc: "∃x¬Ax" }, { prems: ["¬∃xAx"], conc: "∀x¬Ax" } ], derived: true }
}

allRules.ubc = {
    "↔I"   : { forms: [ { conc: "A ↔ B", prems: [ "A → B", "B → A" ] } ] },
    "¬I"   : { forms : [ { conc: "¬A", subderivs: [ { needs: ["B", "¬B"], allows: "A" } ] } ] },
    "∨E"   : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ] },
    "¬E"   : { forms : [ { conc: "A", subderivs: [ { needs: ["B", "¬B"], allows: "¬A" } ] } ] },
    "DeM"  : { replacementrule: true, forms: [ { a: "¬(A ∨ B)", b: "¬A ∧ ¬ B" }, { a: "¬(A ∧ B)", b: "¬A ∨ ¬B" } ], derived: true },
    "DIL"  : { forms: [ { prems: ["A ∨ B", "A → C", "B → C"], conc: "C" } ], derived: true },
    "HS"   : { forms: [ { prems: ["A → B", "B → C"], conc: "A → C" } ], derived: true },
    "Comm" : { replacementrule: true, forms: [ { a: "A ∧ B", b: "B ∧ A" }, { a: "A ∨ B", b: "B ∨ A" }, { a: "A ↔ B", b: "B ↔ A" } ], derived: true },
    "DN"   : { replacementrule: true, forms: [ { a: "A", b: "¬¬A" } ], derived: true },
    "MC"   : { replacementrule: true, forms: [ { a: "A → B", b: "¬A ∨ B" }, { a: "A ∨ B", b: "¬A → B" } ], derived: true },
    "↔ex"  : { replacementrule: true, forms: [ { a: "(A → B) ∧ (B → A)", b: "A ↔ B" } ], derived: true },
    "QN"   : { replacementrule: true, forms: [ { a: "¬∀xAx", b: "∃x¬Ax" }, { a: "¬∃xAx", b: "∀x¬Ax" } ], derived: true, pred: true }
}

allRules.leeds = allRules.magnus;
allRules.uconn = allRules.calgary;

function substituteSymbols(s, notationname) {
    const innotation = notations["cambridge"];
    const outnotation = notations[notationname];
    for (const op of opnames) {
        s = s.replaceAll(innotation[op], outnotation[op]);
    }
    return s;
}

export default function getForallxRules(rulesetname, notationname = null) {
    // rulesetname same as notationname unless specified
    if (notationname === null) {
        notationname = rulesetname;
    }
    const comboname = rulesetname + '--' + notationname;
    if (comboname in rulesrepository) {
        return rulesrepository[comboname];
    }

    // start with common rules; but copy them to allow multiple of
    // same base
    const ruleset = JSON.parse(JSON.stringify(allRules.common));
    // add other rules if need be
    if (rulesetname in allRules) {
        // make a copy to avoid messing up if multiple on same page
        const rulestoadd = JSON.parse(JSON.stringify(allRules[rulesetname]));
        for (const rule in rulestoadd) {
            ruleset[rule] = rulestoadd[rule];
        }
    }
    // don't bother with notation change if we are just returning the same
    if (['cambridge','calgary','slu','pitt','adelaide','uconn'].indexOf(notationname) >= 0) {
        rulesrepository[comboname] = ruleset;
        return ruleset;
    }
    // bind change function to new notation
    const change = ((s) => (substituteSymbols(s, notationname)));
    // start a new rule set and populate with changed rules
    const newruleset = {};
    for (const rulename in ruleset) {
        const newrulename = change(rulename);
        const rule = ruleset[rulename];
        if ("forms" in rule) {
            for (const form of rule.forms) {
                if ("conc" in form) {
                    form.conc = change(form.conc);
                }
                if ("prems" in form) {
                    for (let i=0; i<form.prems.length; i++) {
                        form.prems[i] = change(form.prems[i]);
                    }
                }
                if ("a" in form) {
                    form.a = change(form.a);
                }
                if ("b" in form) {
                    form.b = change(form.b);
                }
                if ("subderivs" in form) {
                    for (const subderiv of form.subderivs) {
                        if ("needs" in subderiv) {
                            for (let i=0; i<subderiv.needs.length; i++) {
                                subderiv.needs[i] = change(subderiv.needs[i]);
                            }
                        }
                        if ("allows" in subderiv) {
                            subderiv.allows = change(subderiv.allows);
                        }
                    }
                }
            }
        }
        newruleset[newrulename] = rule;
    }
    rulesrepository[comboname] = newruleset;
    return newruleset;
}
