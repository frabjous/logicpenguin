// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// libequivalence-db.js //////////////////////////////////
// functions for creating, loading and saving equivalence lists for      //
// formulas to speed equivalence testing                                 //
///////////////////////////////////////////////////////////////////////////

// This script is meant to be usable both in the browser and via node
// making use of either 'window' or 'process' appropriately

import getFormulaClass from './formula.js';
import { arrayUnion } from '../misc.js';

const equivDB = {};

// create object in window if need be
if ((typeof window != 'undefined') && !window?.equivDB) {
    window.equivDB = equivDB;
}

const useMemory = ((typeof process === 'undefined') ||
    !process?.appsettings ||
    !process?.lpfs);

/// FUNCTIONS ///

function applyswitches(str, switches) {
    for (const sw in switches) {
        if (!(switches[sw]?.codePointAt)) { continue; }
        const cpoint = 120049 + switches[sw].codePointAt(0);
        const tempchar = String.fromCodePoint(cpoint);
        str = str.replaceAll(sw, tempchar);
    }
    for (const sw in switches) {
        if (!(switches[sw]?.codePointAt)) { continue; }
        const cpoint = 120049 + switches[sw].codePointAt(0);
        const tempchar = String.fromCodePoint(cpoint);
        str = str.replaceAll(tempchar, switches[sw]);
    }
    return str;
}

export function equivProliferate(f, switches = {}, notationname) {
    const Formula = getFormulaClass(notationname);

    const varCP = Formula.syntax.notation.variableRange.codePointAt(0);
    const someVariables = [
        String.fromCodePoint(varCP),
        String.fromCodePoint(varCP+1),
        String.fromCodePoint(varCP+2)
    ];

    let equivs = [];

    // for atomics, return it with switches applied
    if (!f.op) {
        return [
            Formula.from(applyswitches(f.normal, switches)),
        ];
    }
    // for falsum, return it
    if (f.op == Formula.syntax.symbols.FALSUM) {
        return [ f ];
    }
    // for negations it depends what it is a negation of
    if (f.op == Formula.syntax.symbols.NOT) {

        // guard against nonsense if not a negation of anything
        if (!f?.right) { return equivs; }
        const r = f.right;

        // negation of atomic, return it with switches applied
        if (!r.op) {
            return [Formula.from(applyswitches(f.normal, switches))];
        }
        // negation of falsum, just return it
        if (r.op == Formula.syntax.symbols.FALSUM) {
            return [f];
        }
        // guard again nonsense
        if (!r?.right) { return equivs; }

        // for other negations we start by proliferating
        // what it's a negation of
        const baseEquivs = equivProliferate(r, switches, notationname);
        equivs = baseEquivs.map((w) =>
            (Formula.from(Formula.syntax.symbols.NOT + w.wrapifneeded())));

        // negation of negation
        // ¬¬p :: p
        if (r.op == Formula.syntax.symbols.NOT) {
            return arrayUnion(equivs, equivProliferate(r.right, switches, notationname));
        }

        // negation of universal
        if (r.op == Formula.syntax.symbols.FORALL) {
            // ¬∀x :: ∃x¬
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(Formula.syntax.mkexistential(r.boundvar) +
                    Formula.syntax.symbols.NOT + r.right.wrapifneeded()),
                switches, notationname
            ));
            return equivs;
        }

        // negation of existential
        if (r.op == Formula.syntax.symbols.EXISTS) {
            // ¬∃x :: ∀x¬
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(Formula.syntax.mkuniversal(r.boundvar) +
                    Formula.syntax.symbols.NOT + r.right.wrapifneeded()),
                switches, notationname
            ));
            return equivs;
        }

        // need there to be a right side, so let's guard against nonsense
        if (!r.left) { return equivs; }

        // negation of and statement
        if (r.op == Formula.syntax.symbols.AND) {
            // ¬(p ∧ q) :: ¬p ∨ ¬q
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(Formula.syntax.symbols.NOT + r.left.wrapifneeded() +
                    Formula.syntax.symbols.OR + Formula.syntax.symbols.NOT + r.right.wrapifneeded()),
            switches, notationname));
            // ¬(p ∧ q) :: p → ¬q
            equivs = arrayUnion(equivs, equivProliferate(
                Formula.from(r.left.wrapifneeded() + Formula.syntax.symbols.IFTHEN +
                    Formula.syntax.symbols.NOT + r.right.wrapifneeded()),
            switches, notationname));
            return equivs;
        }

        // negation of or statement
        if (r.op == Formula.syntax.symbols.OR) {
            // ¬(p ∨ q) :: ¬p ∧ ¬q
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(Formula.syntax.symbols.NOT + r.left.wrapifneeded() +
                        Formula.syntax.symbols.AND + Formula.syntax.symbols.NOT + r.right.wrapifneeded()),
                switches, notationname));
            return equivs;
        }

        // negated conditionals
        if (r.op == Formula.syntax.symbols.IFTHEN) {
            // ¬(p → q) :: p ∧ ¬q
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(r.left.wrapifneeded() + Formula.syntax.symbols.AND +
                        Formula.syntax.symbols.NOT + r.right.wrapifneeded()),
                    switches, notationname
                )
            );
            return equivs;
        }

        // negated biconditionals
        if (r.op == Formula.syntax.symbols.IFF) {
            // ~(p ↔ q) :: ~p ↔ q
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(Formula.syntax.symbols.NOT + r.left.wrapifneeded() +
                        Formula.syntax.symbols.IFF + r.right.wrapifneeded()),
                    switches, notationname
                )
            );
        }

        // ~(p ↔ q) :: (p ∨ q) ∧ ¬(p & q)
        if (r.op == Formula.syntax.symbols.IFF) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from( r.left.wrapifneeded() + Formula.syntax.symbols.OR +
                        r.right.wrapifneeded()),
                    Formula.from( Formula.syntax.symbols.NOT + '(' +
                        r.left.wrapifneeded() + Formula.syntax.symbols.AND +
                        r.right.wrapifneeded() + ')'),
                        Formula.syntax.symbols.AND,
                        switches, notationname
                )
            );
        }

        return equivs;
    }

    // quantified statements
    if (Formula.syntax.isquant(f.op)) {
        // guard against nonsense
        if (!f?.right) { return equivs; }
        const r = f.right;

        // get bound variable
        const v = f.boundvar ?? false;
        // guard against no bound variable
        if (!v) { return equivs; }

        // real bound var after switches
        let v_to_use = v;
        if (v in switches) {
            v_to_use = switches[v];
        }

        // proliferate on base
        const baseEquivs = equivProliferate(r, switches, notationname);
        equivs = baseEquivs.map((w) => (
            Formula.from(
                Formula.syntax.mkquantifier(v_to_use, f.op) + w.wrapifneeded()
            )
        ));

        // ∀x(P → Fx) :: P → ∀xFx; ∃x(P → Fx) :: P → ∃xFx
        // ∀x(P ∨ Fx) :: P ∨ ∀xFx; ∃x(P ∨ Fx) :: P ∨ ∃xFx
        // ∀x(P ∧ Fx) :: P ∧ ∀xFx; ∃x(P ∧ Fx) :: P ∧ ∃xFx
        // ∀x(P ↔ Fx) :: P ↔ ∀xFx; ∃x(P ↔ Fx) :: P ↔ ∃xFx
        if (Formula.syntax.isbinaryop(r.op) && r?.left && r?.right
            && (r.left.freevars.indexOf(v) == -1)) {
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(r.left.wrapifneeded() + r.op +
                        Formula.syntax.mkquantifier(v, f.op) +
                        r.right.wrapifneeded()),
                switches, notationname)
            );
        }

        // ∀x(Fx ∧ P) :: ∀xFx ∧ P ; ∃x(Fx ∧ P) :: ∃xFx ∧ P
        // ∀x(Fx ∨ P) :: ∀xFx ∨ P ; ∃x(Fx ∨ P) :: ∃xFx ∨ P
        // ∀x(Fx ↔ P) :: ∀xFx ↔ P ; ∃x(Fx ↔ P) :: ∃xFx ↔ P
        if ((r.op == Formula.syntax.symbols.AND || r.op == Formula.syntax.symbols.OR || r.op == Formula.syntax.symbols.IFF) &&
            r?.left && r?.right && (r.right.freevars.indexOf(v) == -1)) {
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(Formula.syntax.mkquantifier(v, f.op) +
                        r.left.wrapifneeded() + r.op +
                        r.right.wrapifneeded()),
                switches, notationname)
            );
        }

        // ∀x(Fx → P) :: ∃xFx → P ; ∃x(Fx → P) :: ∀xFx → P
        if (r.op == Formula.syntax.symbols.IFTHEN && r?.left && r?.right
            && (r.right.freevars.indexOf(v) == -1)) {
            let newop = Formula.syntax.symbols.FORALL;
            if (f.op == newop) {
                newop = Formula.syntax.symbols.EXISTS;
            }
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(Formula.syntax.mkquantifier(v, newop) +
                        r.left.wrapifneeded() + r.op +
                        r.right.wrapifneeded()),
                switches, notationname)
            );
        }

        // ∀x(Fx ∧ Gx) :: ∀xFx ∧ ∀xGx
        // ∃x(Fx ∨ Gx) :: ∃xFx ∨ ∃xGx
        if (((f.op == Formula.syntax.symbols.FORALL && r.op == Formula.syntax.symbols.AND) ||
            (f.op == Formula.syntax.symbols.EXISTS && r.op == Formula.syntax.symbols.OR)) &&
            (r?.left && r?.right)) {
            equivs = arrayUnion(equivs,
                equivProliferate(
                    Formula.from(Formula.syntax.mkquantifier(v, f.op) +
                        r.left.wrapifneeded() + r.op +
                        Formula.syntax.mkquantifier(v, f.op) + r.right.wrapifneeded()),
                    switches, notationname
                )
            )
        }

        // vacuous quantifiers can be removed
        if (r?.freevars && (r.freevars.indexOf(v) == -1)) {
            equivs = arrayUnion(equivs, equivProliferate(r, switches, notationname));
        }

        // Try also with swapped out/switched bound variables
        // if not already apply a switch on that variable
        if (!(v in switches)) {
            for (const somevar of someVariables) {
                // don't redo switch and don't switch free variables
                if (somevar in switches) { continue; }
                if (somevar == v) { continue; }
                if (f.freevars.indexOf(somevar) != -1) { continue; }
                const newswitches = {...switches};
                newswitches[v] = somevar;
                newswitches[somevar] = v;
                equivs = arrayUnion(
                    equivs, equivProliferate(f, newswitches, notationname)
                );
            }
        }

        return equivs;
    }

    // moleculars
    if (f.op == Formula.syntax.symbols.AND || f.op == Formula.syntax.symbols.OR ||
        f.op == Formula.syntax.symbols.IFTHEN || f.op == Formula.syntax.symbols.IFF ) {
        // guard against nonsense
        if (!f?.right || !f?.left) { return equivs; }
        const r = f.right; const l = f.left;

        // start by proliferating the parts and recombining
        // this also handles commutativity of ∨, ∧ and ↔
        equivs = proliferateCombine(f.left, f.right, f.op, switches, notationname);

        // note for adding equivalences to moleculars, always use
        // proliferateCombine on parts to avoid circles

        // ¬p ∨ q :: p → q
        if (f.op == Formula.syntax.symbols.OR && l?.op && l.op == Formula.syntax.symbols.NOT
            && l.right) {
            equivs = arrayUnion(equivs,
                proliferateCombine(l.right, r, Formula.syntax.symbols.IFTHEN, switches, notationname));
        }

        // ¬p → q :: p ∨ q
        if (f.op == Formula.syntax.symbols.IFTHEN && l?.op && l.op == Formula.syntax.symbols.NOT
            && l.right) {
            equivs = arrayUnion(equivs,
                proliferateCombine(l.right, r, Formula.syntax.symbols.OR, switches, notationname));
        }

        // p → q :: ¬q → ¬p
        if (f.op == Formula.syntax.symbols.IFTHEN) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from(Formula.syntax.symbols.NOT + r.wrapifneeded()),
                    Formula.from(Formula.syntax.symbols.NOT + l.wrapifneeded()),
                    Formula.syntax.symbols.IFTHEN, switches, notationname
                )
            );
        }

        // ¬p ↔ q :: p ↔ ¬q
        if (f.op == Formula.syntax.symbols.IFF && l?.op && l.op == Formula.syntax.symbols.NOT
            && l?.right) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    l.right,
                    Formula.from(Formula.syntax.symbols.NOT + r.wrapifneeded()),
                    Formula.syntax.symbols.IFF, switches, notationname
                )
            );
        }

        // p ↔ q :: (p → q) ∧ (q → p)
        // to avoid circles, do not call on double IFFs
        if ((f.op == Formula.syntax.symbols.IFF) &&
            (!(f.right) || f.right.normal.indexOf(Formula.syntax.symbols.IFF) == -1) &&
            (!(f.left) || f.left.normal.indexOf(Formula.syntax.symbols.IFF) == -1)) {
            equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from( l.wrapifneeded() + Formula.syntax.symbols.IFTHEN +
                        r.wrapifneeded()),
                    Formula.from( r.wrapifneeded() +
                        Formula.syntax.symbols.IFTHEN + l.wrapifneeded()),
                        Formula.syntax.symbols.AND,
                        switches, notationname
                )
            );
        }
        // p ↔ q :: (p ∧ q) ∨ ¬(p ∨ q)
        // to avoid circles, do not call on double IFFs
        if ((f.op == Formula.syntax.symbols.IFF) &&
            (!(f.right) || f.right.normal.indexOf(Formula.syntax.symbols.IFF) == -1) &&
            (!(f.left) || f.left.normal.indexOf(Formula.syntax.symbols.IFF) == -1)) {
                equivs = arrayUnion(equivs,
                proliferateCombine(
                    Formula.from( l.wrapifneeded() + Formula.syntax.symbols.AND +
                        r.wrapifneeded()),
                    Formula.from( Formula.syntax.symbols.NOT + '(' + l.wrapifneeded() +
                        Formula.syntax.symbols.OR + r.wrapifneeded() + ')'),
                        Formula.syntax.symbols.OR,
                        switches, notationname
                )
            );
        }

        // p ∧ p :: p and p ∨ p :: p
        if ((f.op == Formula.syntax.symbols.AND || f.op == Formula.syntax.symbols.OR) &&
            l.normal == r.normal) {
            equivs = arrayUnion(equivs, equivProliferate(l, switches, notationname));
        }

        // ¬p → p :: p
        if (f.op == Formula.syntax.symbols.IFTHEN && l?.op && l?.right &&
            l.op == Formula.syntax.symbols.NOT && (l.right.normal == r.normal)) {
            equivs = arrayUnion(equivs, equivProliferate(r, switches, notationname));
        }

        // p → ¬p :: ¬p
        if (f.op == Formula.syntax.symbols.IFTHEN && r?.op && r?.right &&
            r.op == Formula.syntax.symbols.NOT && (l.normal == r.right.normal)) {
            equivs = arrayUnion(equivs, equivProliferate(r, switches, notationname));
        }

        // p ∧ ¬p :: ✖
        if (f.op == Formula.syntax.symbols.AND && r?.op && r?.right &&
            r.op == Formula.syntax.symbols.NOT && (l.normal == r.right.normal)) {
            equivs = arrayUnion(equivs, [Formula.from('✖')]);
        }

        return equivs;

    }
    // shouldn't be here but whatevs
    return equivs;
}

function issymmetric(op, Formula) {
    return (op == Formula.syntax.symbols.OR || op == Formula.syntax.symbols.AND ||
        op == Formula.syntax.symbols.IFF);
}

export function loadEquivalents(wffstr, notationname) {
    const Formula = getFormulaClass(notationname);
    //if memory, check the equivDB object, otherwise generate it
    //using equivProliferate
    if (useMemory) {
        if (!(wffstr in equivDB)) {
            let equivs = equivProliferate(Formula.from(wffstr), {}, notationname);
            equivDB[wffstr] = equivs.map((f)=>(f.normal));
        }
        return equivDB[wffstr];
    }
    // if using file database, try to load file
    const equivdir = process.appsettings.datadir + '/equivalents/' + notationname;
    const fn = equivdir + '/' + wffstr + '.json';
    let equivs = process.lpfs.loadjson(fn);
    // if no file, then start afresh
    if (!equivs) { equivs = []; }
    if (equivs.length == 0) {
        let equivsff = equivProliferate(Formula.from(wffstr), {}, notationname);
        equivs = equivsff.map((f) =>(f.normal));
        if (equivs.length != 0) {
            saveEquivalents(wffstr, equivs, notationname);
        }
    }
    return equivs;
}

function proliferateCombine(f, g, op, switches, notationname) {
    const Formula = getFormulaClass(notationname);
    let results = [];
    const fequivs = equivProliferate(f, switches, notationname);
    const gequivs = equivProliferate(g, switches, notationname);
    for (const fe of fequivs) {
        for (const ge of gequivs) {
            results = arrayUnion(results,
                [Formula.from(fe.wrapifneeded() + op + ge.wrapifneeded())]
            );
            if (issymmetric(op, Formula)) {
                results = arrayUnion(results,
                    [Formula.from(ge.wrapifneeded() + op + fe.wrapifneeded())]
                );
            }
        }
    }
    return results;
}

export function saveEquivalents(wffstr, equivs, notationname) {
    // don't crash if called incorrectly
    if ((typeof process == 'undefined') ||
        (!("appsettings" in process)) ||
        (!("datadir" in process.appsettings)) ||
        (!("lpfs" in process)) ||
        (!("savejson" in process.lpfs))) { return false; }
    // determine location to save
    const dirname = process.appsettings.datadir + '/equivalents/' +
        notationname;
    const fn =  dirname + '/' + wffstr + '.json';
    // ensure directory exists before saving
    process.lpfs.ensuredir(dirname);
    return process.lpfs.savejson(fn, equivs);
}

