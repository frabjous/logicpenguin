// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////////// hardegree-rules.js //////////////////////////////////
// defines the inference rules of Hardegree's system                     //
///////////////////////////////////////////////////////////////////////////

import notations from '../../symbolic/notations.js';

const opnames = ['NOT','OR','AND','IFF','IFTHEN','FORALL','EXISTS','FALSUM'];

const hardegreeRules = {
    "→I"  : { meinongian: true, hint: "To establish a →-statement, use CD in a subderivation for it, even if you have to write in a SHOW-line yourself." },
    "∨I"  : { forms: [ { prems: ["A"], conc: "A ∨ B" }, { prems: ["A"], conc: "B ∨ A" } ] },
    "&I"  : { forms: [ { prems: ["A", "B"], conc: "A & B" } ] },
    "↔I"  : { forms: [ { prems: ["A → B", "B → A"], conc: "A ↔ B" } ] },
    "✖I"  : { forms: [ { prems: ["A", "~A"], conc: "✖" } ] },
    "∀I"  : { pred: true, meinongian: true, hint: "To establish a ∀-statement, use UD in a subderivation for it, even if you have to write in a SHOW-line yourself." },
    "∃I"  : { pred: true, forms: [ { prems: ["Aa"], conc: "∃xAx", subst: {"x":"a"} } ] },
    "=I"  : { pred: true, identity: true, forms: [ { prems: [], conc: 'a = a' } ]},
    "≠I" : { pred: true, identity: true, forms: [ { prems: ['~(a = b)'], conc: 'a ≠ b'} ] },
    "Ass" : { assumptionrule: true },
    "→O"  : { forms: [ { prems: ["A → C", "A"], conc: "C" }, { prems: ["A → C", "~C"], conc: "~A" } ] },
    "∨O"  : { forms: [ { prems: ["A ∨ B", "~A"], conc: "B" }, { prems: ["A ∨ B", "~B"], conc: "A" } ] },
    "&O"  : { forms: [ { prems: ["A & B"], conc: "A" }, { prems: ["A & B"], conc: "B" } ] },
    "↔O"  : { forms: [ { prems: ["A ↔ B"], conc: "A → B" }, { prems: ["A ↔ B"], conc: "B → A" } ] },
    "✖O"  : { forms: [ { prems: ["✖"], conc: "A" } ] },
    "∀O"  : { pred: true, forms: [ { prems: ["∀xAx"], conc: "Aa", subst: {"x":"a"} } ] },
    "∃O"  : { pred: true, forms: [ { prems: ["∃xAx"], conc: "An", mustbenew: ["n"], subst: {"x":"n"} } ] },
    "=O" : { pred: true, identity: true, forms: [ { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","b","a"] }, { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","a","b"] } ] },
    "≠O" : { pred: true, identity: true, forms: [ { prems: ['a ≠ b'], conc: '~(a = b)'} ] },
    "R"   : { forms: [ { prems: ["A"], conc: "A" } ] },
    "~→O" : { forms: [ { prems: ["~(A → B)"], conc: "A & ~B" } ] },
    "~∨O" : { forms: [ { prems: ["~(A ∨ B)"], conc: "~A" }, { prems: ["~(A ∨ B)"], conc: "~B" } ] },
    "~&O" : { forms: [ { prems: ["~(A & B)"], conc: "A → ~B" } ] },
    "~↔O" : { forms: [ { prems: ["~(A ↔ B)"], conc: "~A ↔ B" } ] },
    "~✖O" : { meinongian: true, hint: "There is no rule for negations of ✖. A statement like ~✖ is a trivial tautology and the only things that follow from it are things you can prove another way." },
    "~∀O" : { pred: true, forms: [ { prems: ["~∀xAx"], conc: "∃x~Ax" } ] },
    "~∃O" : { pred: true, forms: [ { prems: ["~∃xAx"], conc: "∀x~Ax" } ] },
    "~=O" : { pred: true, identity: true, meinongian: true, hint: "A negation of an identity can be used with ≠I." },
    "~≠O" : { pred: true, identity: true, forms: [ { prems: ["~(a ≠ b)"], conc: "a = b" } ] },
    "DN"  : { forms: [ { prems: ["A"], conc: "~~A" }, { prems: ["~~A"], conc: "A" } ] },
    "CD"  : { showrule: true, forms: [ { conc: "A → B", subderivs: [ { "needs": ["B"], "allows": "A" } ] } ] },
    "ID"  : { showrule: true, forms: [ { conc: "A", subderivs: [ { "needs": ["✖"], "allows": "~A" } ] }, { conc: "~A", subderivs: [ { "needs": ["✖"], "allows": "A" } ] } ] },
    "&D"  : { showrule: true, isnew: true, forms: [ { conc: "A & B", subderivs: [ { "needs": ["A", "B"] } ] } ] },
    "↔D"  : { showrule: true, isnew: true, forms: [ { conc: "A ↔ B", subderivs: [ { "needs": ["A → B", "B → A"] } ] } ] },
    "DD"  : { showrule: true, forms: [ { conc: "A", subderivs: [ { "needs": ["A"], mustbedirect: true } ] } ] },
    "UD"  : { pred: true, showrule: true, forms: [ { conc: "∀xAx", subst: {"x":"n"}, subderivs: [ { "needs": ["An"], wantsasnew: ["n"], subshowrequired: true } ] } ] },
    "∃D"  : { pred: true, showrule: true, isnew: true, forms: [ { conc: "∃xAx", subderivs: [ { "needs": ["✖"], "allows": "~∃xAx" } ] } ] },
    "=D" : { showrule: true, pred: true, identity: true, isnew: true, meinongian: true, hint: "Identity statements can be shown with =I and other rules." },
    "≠D" : { identity: true, showrule: true, forms: [ { conc: "a ≠ b", subderivs: [ { "needs": ["✖"], "allows": "a = b" } ] } ], isnew: true },
    "~D"  : { showrule: true, forms: [ { conc: "~A", subderivs: [ { "needs": ["✖"], "allows": "A" } ] } ], isnew: true, hidden: true },
    "∨D"  : { showrule: true, forms: [ { conc: "A ∨ B", subderivs: [ { "needs": ["✖"], "allows": "~(A ∨ B)" } ] } ], isnew: true, hidden: true },
    "Rep" : { isnew: true, hidden: true, forms: [ { prems: ["A"], conc: "A" } ] },
    "Pr"  : { premiserule: true },
    "As"  : { assumptionrule: true, hidden: true },
    "~→I" : { hidden: true, meinongian: true, hint: "Although in-rules would be nice, only out-rules exist for negations." },
    "~∨I" : { hidden: true, meinongian: true, hint: "Although in-rules would be nice, only out-rules exist for negations." },
    "~&I" : { hidden: true, meinongian: true, hint: "Although in-rules would be nice, only out-rules exist for negations." },
    "~↔I" : { hidden: true, meinongian: true, hint: "Although in-rules would be nice, only out-rules exist for negations." },
    "~✖I" : { hidden: true, meinongian: true, hint: "Although in-rules would be nice, only out-rules exist for negations." },
    "~∀I" : { pred: true, hidden: true, meinongian: true, hint: "Although in-rules would be nice, only out-rules exist for negations." },
    "~∃I" : { pred: true, hidden: true, meinongian: true, hint: "Although in-rules would be nice, only out-rules exist for negations." }
}

function substituteSymbols(s, notationname) {
    const innotation = notations["hardegree"];
    const outnotation = notations[notationname];
    for (const op of opnames) {
        s = s.replaceAll(innotation[op], outnotation[op]);
    }
    return s;
}

export default function getHardegreeRuleset(notationname) {
    // don't bother if we are just returning the name
    if (notationname == 'hardegree') { return hardegreeRules; }
    // bind change function to new notation
    const change = ((s) => (substituteSymbols(s, notationname)));
    // start a new rule set and populate with changed rules
    const ruleset = {};
    for (const rulename in hardegreeRules) {
        const newrulename = change(rulename);
        const rule = hardegreeRules[rulename];
        if ("hint" in rule) {
            rule.hint = change(rule.hint);
        }
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
        ruleset[newrulename] = rule;
    }
    return ruleset;
}
