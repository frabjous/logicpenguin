// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////////// fitch-rules.js ///////////////////////////////////////
// defines the inference rules for various fitch-style derivation systems //
////////////////////////////////////////////////////////////////////////////

import notations from '../../symbolic/notations.js';

const opnames = ['NOT','OR','AND','IFF','IFTHEN','FORALL','EXISTS','FALSUM'];

const commonForallxRules = {
    "∨I"  : { forms: [ { prems: ["A"], conc: "A ∨ B" }, { prems: ["A"], conc: "B ∨ A" } ] },
    "∧I"  : { forms: [ { prems: ["A", "B"], conc: "A ∧ B" } ] },
    "→I"  : { forms: [ { conc: "A → B", subderivs: [ { needs: ["B"], "allows": "A" } ] } ] },
    "↔I"  : { forms: [ { conc: "A ↔ B", subderivs: [ { needs: ["B"], "allows": "A" }, { needs: ["A"], "allows": "B" } ] } ] },
    "¬I"  : { forms: [ { conc: "¬A", subderivs: [ { needs: ["⊥"], allows: "A" } ] } ] },
    "∀I"  : { pred: true, forms: [ { prems: ["Aa"], conc: "∀xAx", mustbenew: ["a"], subst: {"a": "x"} } ] },
    "∃I"  : { pred: true, forms: [ { prems: ["Aa"], conc: "∃xAx", subst: {"x":"a"} } ] },
    "=I"  : { pred: true, forms: [ { conc: "a = a", prems: [] } ] },
    "R"   : { forms: [ { prems: ["A"], conc: "A" } ], derived: true },
    "∨E"  : { forms: [ { conc: "C", prems: ["A ∨ B"], subderivs: [ { needs: ["C"], allows: "A" }, { needs: ["C"], allows: "B" } ] } ] },
    "∧E"  : { forms: [ { prems: ["A ∧ B"], conc: "A" }, { prems: ["A ∧ B"], conc: "B" } ] },
    "→E"  : { forms: [ { prems: ["A → C", "A"], conc: "C" } ] },
    "↔E"  : { forms: [ { prems: ["A ↔ B", "A"], conc: "B" }, { prems: ["A ↔ B", "B"], conc: "A" } ] },
    "¬E"  : { forms: [ { prems: ["A", "¬A"], conc: "⊥" } ] },
    "∀E"  : { pred: true, forms: [ { prems: ["∀xAx"], conc: "Aa", subst: {"x":"a"} } ] },
    "∃E"  : { pred: true, forms: [ { "conc": "B", prems: ["∃xAx"], mustbenew: ["n"], subst: {"x": "n"}, subderivs: [ { needs: ["B"], allows: "An" } ] } ] },
    "=E"  : { pred: true, forms: [ { prems: ["Aa", "a = b"], conc: "Ab" }, { prems: ["Aa", "b = a"], conc: "Ab" } ] },
    "MT"  : { forms: [ { prems: ["A → B", "¬B"], conc: "¬A" } ], derived: true },
    "X"   : { forms: [ { prems: ["⊥"], conc: "A" } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "¬A"], conc: "B" }, { prems: ["A ∨ B", "¬B"], conc: "A" } ], derived: true },
    "DNE" : { forms: [ { prems: ["¬¬A"], conc: "A" } ], derived: true },
    "DeM" : { forms: [ { prems: ["¬(A ∧ B)"], conc: "¬A ∨ ¬B" }, { prems: ["¬A ∨ ¬B"], conc: "¬(A ∧ B)" }, { prems: ["¬(A ∨ B)"], conc: "¬A ∧ ¬B" }, { prems: ["¬A ∧ ¬B"], conc: "¬(A ∨ B)" } ], derived: true },
    "CQ"  : { pred: true, forms: [ { prems: ["∀x¬Ax"], conc: "¬∃xAx" }, { prems: ["∃x¬Ax"], conc: "¬∀xAx" }, { prems: ["¬∀xAx"], conc: "∃x¬Ax" }, { prems: ["¬∃xAx"], conc: "∀x¬Ax" } ], derived: true },
    "Pr"  : { premiserule: true, hide: true },
    "Hyp" : { assumptionrule: true, hide: true }
}

const cambridgeRules = {
    "TND" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ] }
}

const calgaryRules = {
    "IP"  : { forms: [ { conc: "A", subderivs: [ { needs: ["⊥"], allows: "¬A" } ] } ] },
    "LEM" : { forms: [ { conc: "B", subderivs: [ { needs: ["B"], allows: "A" }, { needs: ["B"], allows: "¬A" } ] } ], derived: true }
}

function substituteSymbols(s, notationname) {
    const innotation = notations["cambridge"];
    const outnotation = notations[notationname];
    for (const op of opnames) {
        s = s.replaceAll(innotation[op], outnotation[op]);
    }
    return s;
}

export default function getFitchRules(rulesetname, notationname = null) {
    // rulesetname same as notationname unless specified
    if (notationname === null) {
        notationname = rulesetname;
    }
    // start with common rules
    const ruleset = commonForallxRules;
    // add calgary rules if need be
    if (rulesetname == 'cambridge') {
        for (const rule in cambridgeRules) {
            ruleset[rule] = cambridgeRules[rule];
        }
    }
    if (rulesetname == 'calgary') {
        for (const rule in calgaryRules) {
            ruleset[rule] = calgaryRules[rule];
        }
    }
    // don't bother with notation change if we are just returning the same
    if (notationname == 'cambridge' || notationname == 'calgary') {
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
    return newruleset;
}
