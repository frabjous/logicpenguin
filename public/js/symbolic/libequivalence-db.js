// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

// This script is meant to be usable both in the browser and via node
// making use of either 'window' or 'process' appropriately

import Formula from './formula.js';
import { syntax, symbols } from './libsyntax.js';
import { arrayUnion } from '../misc.js';

const varCP = syntax.variableRange.codePointAt(0);
const someVariables = [
    String.fromCodePoint(varCP),
    String.fromCodePoint(varCP+1),
    String.fromCodePoint(varCP+2)
];


let equivDB = {};


// create object in window if need be
if ((typeof window != 'undefined') && !window?.equivDB) {
    window.equivDB = equivDB;
}

let useMemory = ((typeof process === 'undefined') ||
    !process?.appsettings ||
    !process?.lpfs);

/// FUNCTIONS ///

function applyswitches(str, switches) {
    let sstr = str;
    for (let sw in switches) {
        let cpoint = 120049 + switches[sw].codePointAt(0);
        let tempchar = String.fromCodePoint(cpoint);
        str = str.replaceAll(sw, tempchar);
    }
    for (let sw in switches) {
        let cpoint = 120049 + switches[sw].codePointAt(0);
        let tempchar = String.fromCodePoint(cpoint);
        str = str.replaceAll(tempchar, switches[sw]);
    }
    return str;
}

export function equivProliferate(f, switches = {}) {
    let equivs = [];

    // for atomics, return it with switches applied
    if (!f.op) {
        return [ 
            Formula.from(applyswitches(f.normal, switches)),
        ];
    }
    // for falsum, return it
    if (f.op == symbols.FALSUM) {
        return [ f ];
    }
    // for negations it depends what it is a negation of
    if (f.op == symbols.NOT) {

        // guard against nonsense if not a negation of anything
        if (!f?.right) { return equivs; }
        let r = f.right;

        // negation of atomic, return it with switches applied
        if (!r.op) {
            return [Formula.from(applyswitches(f.normal, switches))];
        }
        // negation of falsum, just return it
        if (r.op == symbols.FALSUM) {
            return [f];
        }
        // guard again nonsense
        if (!r?.right) { return equivs; }

        // for other negations we start by proliferating
        // what it's a negation of
        let baseEquivs = equivProliferate(r, switches);
        equivs = baseEquivs.map((w) => 
            (Formula.from(symbols.NOT + w.wrapifneeded())));

        // negation of negation
        // ¬¬p :: p
        if (r.op == symbols.NOT) {
            return arrayUnion(equivs, equivProliferate(r.right, switches));
        }

        // negation of universal
        if (r.op == symbols.FORALL) {
            // ¬∀x :: ∃x¬
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(syntax.mkexistential(r.boundvar) +
                    symbols.NOT + r.right.wrapifneeded()),
                switches
            ));
            return equivs;
        }

        // negation of existential
        if (r.op == symbols.EXISTS) {
            // ¬∃x :: ∀x¬
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(syntax.mkuniversal(r.boundvar) +
                    symbols.NOT + r.right.wrapifneeded()),
                switches
            ));
            return equivs;
        }

        // need there to be a right side, so let's guard against nonsense
        if (!r.left) { return equivs; }

        // negation of and statement
        if (r.op == symbols.AND) {
            // ¬(p ∧ q) :: ¬p ∨ ¬q
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(symbols.NOT + r.left.wrapifneeded() +
                    symbols.OR + symbols.NOT + r.right.wrapifneeded()),
            switches));
            // ¬(p ∧ q) :: p → ¬q
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(r.left.wrapifneeded() + symbols.IFTHEN +
                    symbols.NOT + r.right.wrapifneeded()),
            switches));
            return equivs;
        }

        // negation of or statement
        if (r.op == symbols.OR) {
            // ¬(p ∨ q) :: ¬p ∧ ¬q
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(symbols.NOT + r.left.wrapifneeded() +
                        symbols.AND + symbols.NOT + r.right.wrapifneeded()),
                switches));
            return equivs;
        }

        // negated conditionals
        if (r.op == symbols.IFTHEN) {
            // ¬(p → q) :: p ∧ ¬q
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(r.left.wrapifneeded() + symbols.AND +
                        symbols.NOT + r.right.wrapifneeded()),
                    switches
                )
            );
            return equivs;
        }

        // negated biconditionals
        if (r.op == symbols.IFF) {
            // ~(p ↔ q) :: ~p ↔ q
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(symbols.NOT + r.left.wrapifneeded() +
                        symbols.IFF + r.right.wrapifneeded()),
                    switches
                )
            );
        }

        // ~(p ↔ q) :: (p ∨ q) ∧ ¬(p & q)
        if (r.op == symbols.IFF) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from( r.left.wrapifneeded() + symbols.OR +
                        r.right.wrapifneeded()),
                    Formula.from( symbols.NOT + '(' +
                        r.left.wrapifneeded() + symbols.AND +
                        r.right.wrapifneeded() + ')'),
                        symbols.AND,
                        switches
                )
            );
        }

        return equivs;
    }

    // quantified statements
    if (syntax.isquant(f.op)) {
        // guard against nonsense
        if (!f?.right) { return equivs; }
        let r = f.right;

        // get bound variable
        let v = f.boundvar

        // real bound var after switches
        let v_to_use = v;
        if (v in switches) {
            v_to_use = switches[v];
        }

        // proliferate on base
        let baseEquivs = equivProliferate(r, switches);
        equivs = baseEquivs.map((w) => (
            Formula.from(
                syntax.mkquantifier(v_to_use, f.op) + w.wrapifneeded()
            )
        ));

        // ∀x(P → Fx) :: P → ∀xFx; ∃x(P → Fx) :: P → ∃xFx
        // ∀x(P ∨ Fx) :: P ∨ ∀xFx; ∃x(P ∨ Fx) :: P ∨ ∃xFx
        // ∀x(P ∧ Fx) :: P ∧ ∀xFx; ∃x(P ∧ Fx) :: P ∧ ∃xFx
        // ∀x(P ↔ Fx) :: P ↔ ∀xFx; ∃x(P ↔ Fx) :: P ↔ ∃xFx
        if (syntax.isbinaryop(r.op) && r?.left && r?.right
            && (r.left.freevars.indexOf(v) == -1)) {
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(r.left.wrapifneeded() + r.op +
                        syntax.mkquantifier(v, f.op) +
                        r.right.wrapifneeded()),
                switches)
            );
        }

        // ∀x(Fx ∧ P) :: ∀xFx ∧ P ; ∃x(Fx ∧ P) :: ∃xFx ∧ P
        // ∀x(Fx ∨ P) :: ∀xFx ∨ P ; ∃x(Fx ∨ P) :: ∃xFx ∨ P
        // ∀x(Fx ↔ P) :: ∀xFx ↔ P ; ∃x(Fx ↔ P) :: ∃xFx ↔ P
        if ((r.op == symbols.AND || r.op == symbols.OR || r.op == symbols.IFF) &&
            r?.left && r?.right && (r.right.freevars.indexOf(v) == -1)) {
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(syntax.mkquantifier(v, f.op) +
                        r.left.wrapifneeded() + r.op +
                        r.right.wrapifneeded()),
                switches)
            );
        }

        // ∀x(Fx → P) :: ∃xFx → P ; ∃x(Fx → P) :: ∀xFx → P
        if (r.op == symbols.IFTHEN && r?.left && r?.right
            && (r.right.freevars.indexOf(v) == -1)) {
            let newop = symbols.FORALL;
            if (f.op == newop) {
                newop = symbols.EXISTS;
            }
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(syntax.mkquantifier(v, newop) +
                        r.left.wrapifneeded() + r.op +
                        r.right.wrapifneeded()),
                switches)
            );
        }

        // ∀x(Fx ∧ Gx) :: ∀xFx ∧ ∀xGx
        // ∃x(Fx ∨ Gx) :: ∃xFx ∨ ∃xGx
        if (((f.op == symbols.FORALL && r.op == symbols.AND) ||
            (f.op == symbols.EXISTS && r.op == symbols.OR)) &&
            (r?.left && r?.right)) {
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(syntax.mkquantifier(v, f.op) +
                        r.left.wrapifneeded() + r.op +
                        syntax.mkquantifier(v, f.op) + r.right.wrapifneeded()),
                    switches
                )
            )
        }

        // vacuous quantifiers can be removed
        if (r?.freevars && (r.freevars.indexOf(v) == -1)) {
            equivs = arrayUnion(equivs, equivProliferate(r, switches));
        }

        // Try also with swapped out/switched bound variables
        // if not already apply a switch on that variable
        if (!(v in switches)) {
            for (let somevar of someVariables) {
                // don't redo switch and don't switch free variables
                if (somevar in switches) { continue; }
                if (somevar == v) { continue; }
                if (f.freevars.indexOf(somevar) != -1) { continue; }
                let newswitches = {...switches};
                newswitches[v] = somevar;
                newswitches[somevar] = v;
                equivs = arrayUnion(
                    equivs, equivProliferate(f, newswitches)
                );
            }
        }

        return equivs;
    }

    // moleculars
    if (f.op == symbols.AND || f.op == symbols.OR ||
        f.op == symbols.IFTHEN || f.op == symbols.IFF ) {
        // guard against nonsense
        if (!f?.right || !f?.left) { return equivs; }
        let r = f.right; let l = f.left;

        // start by proliferating the parts and recombining
        // this also handles commutativity of ∨, ∧ and ↔
        equivs = proliferateCombine(f.left, f.right, f.op, switches);

        // note for adding equivalences to moleculars, always use
        // proliferateCombine on parts to avoid circles

        // ¬p ∨ q :: p → q
        if (f.op == symbols.OR && l?.op && l.op == symbols.NOT
            && l.right) {
            equivs = arrayUnion(equivs,
                proliferateCombine(l.right, r, symbols.IFTHEN, switches));
        }

        // ¬p → q :: p ∨ q
        if (f.op == symbols.IFTHEN && l?.op && l.op == symbols.NOT
            && l.right) {
            equivs = arrayUnion(equivs,
                proliferateCombine(l.right, r, symbols.OR, switches));
        }

        // p → q :: ¬q → ¬p
        if (f.op == symbols.IFTHEN) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from(symbols.NOT + r.wrapifneeded()),
                    Formula.from(symbols.NOT + l.wrapifneeded()),
                    symbols.IFTHEN, switches
                )
            );
        }

        // ¬p ↔ q :: p ↔ ¬q
        if (f.op == symbols.IFF && l?.op && l.op == symbols.NOT
            && l?.right) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    l.right,
                    Formula.from(symbols.NOT + r.wrapifneeded()),
                    symbols.IFF, switches
                )
            );
        }

        // p ↔ q :: (p → q) ∧ (q → p)
        if (f.op == symbols.IFF) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from( l.wrapifneeded() + symbols.IFTHEN +
                        r.wrapifneeded()), 
                    Formula.from( r.wrapifneeded() +
                        symbols.IFTHEN + l.wrapifneeded()),
                        symbols.AND,
                        switches
                )
            );
        }

        // p ↔ q :: (p ∧ q) ∨ ¬(p ∨ q)
        if (f.op == symbols.IFF) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from( l.wrapifneeded() + symbols.AND +
                        r.wrapifneeded()),
                    Formula.from( symbols.NOT + '(' + l.wrapifneeded() +
                        symbols.OR + r.wrapifneeded() + ')'),
                        symbols.OR,
                        switches
                )
            );
        }

        // p ∧ p :: p and p ∨ p :: p
        if ((f.op == symbols.AND || f.op == symbols.OR) &&
            l.normal == r.normal) {
            equivs = arrayUnion(equivs, equivProliferate(l, switches));
        }

        // ¬p → p :: p
        if (f.op == symbols.IFTHEN && l?.op && l?.right && 
            l.op == symbols.NOT && (l.right.normal == r.normal)) {
            equivs = arrayUnion(equivs, equivProliferate(r, switches));
        }

        // p → ¬p :: ¬p
        if (f.op == symbols.IFTHEN && r?.op && r?.right && 
            r.op == symbols.NOT && (l.normal == r.right.normal)) {
            equivs = arrayUnion(equivs, equivProliferate(r, switches));
        }

        // p ∧ ¬p :: ✖
        if (f.op == symbols.AND && r?.op && r?.right &&
            r.op == symbols.NOT && (l.normal == r.right.normal)) {
            equivs = arrayUnion(equivs, [Formula.from('✖')]);
        }

        return equivs;

    }
    // shouldn't be here but whatevs
    return equivs;
}

function issymmetric(op) {
    return (op == symbols.OR || op == symbols.AND ||
        op == symbols.IFF);
}

export function loadEquivalents(wffstr) {
    //if memory, check the equivDB object, otherwise generate it
    //using equivProliferate
    if (useMemory) {
        if (!(wffstr in equivDB)) {
            let equivs = equivProliferate(Formula.from(wffstr), {});
            equivDB[wffstr] = equivs.map((f)=>(f.normal));
        }
        return equivDB[wffstr];
    }
    // if using file database, try to load file
    let equivdir = process.appsettings.datadir + '/equivalents';
    let fn = equivdir + '/' + wffstr + '.json';
    let equivs = process.lpfs.loadjson(fn);
    // if no file, then start afresh
    if (!equivs) { equivs = []; }
    if (equivs.length == 0) {
        let equivsff = equivProliferate(Formula.from(wffstr), {});
        equivs = equivsff.map((f) =>(f.normal));
        if (equivs.length != 0) {
            saveEquivalents(wffstr, equivs);
        }
    }
    return equivs;
}

function proliferateCombine(f, g, op, switches) {
    let results = [];
    let fequivs = equivProliferate(f, switches);
    let gequivs = equivProliferate(g, switches);
    for (let fe of fequivs) {
        for (let ge of gequivs) {
            results = arrayUnion(results,
                [Formula.from(fe.wrapifneeded() + op + ge.wrapifneeded())]
            );
            if (issymmetric(op)) {
                results = arrayUnion(results,
                    [Formula.from(ge.wrapifneeded() + op + fe.wrapifneeded())]
                );
            }
        }
    }
    return results;
}

export function saveEquivalents(wffstr, equivs) {
    // don't crash if called incorrectly
    if ((typeof process == 'undefined') ||
        (!("appsettings" in process)) ||
        (!("datadir" in process.appsettings)) ||
        (!("lpfs" in process)) ||
        (!("savejson" in process.lpfs))) { return false; }
    let fn = process.appsettings.datadir + '/equivalents/' +
        wffstr + '.json';
    return process.lpfs.savejson(fn, equivs);
}
