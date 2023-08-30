// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////////////libsemantics.js//////////////////////////////////
// calculates truth values based on truth functions, completes        //
// truth tables and similar                                           //
////////////////////////////////////////////////////////////////////////

// common abbrevs:
// interp: interpretation (aka truth-value assignment)
// tfns = truth functions
// libtf = lib truth-falsity
// tv = truth value
// wff: well formed formula (though often they aren't well formed)

import getSyntax from './libsyntax.js';
import { arrayUnion } from '../misc.js';

export const libtf = {};

// truth functions of classical logic
libtf.tfns = {
    OR     : (a,b) => (a || b),
    AND    : (a,b) => (a && b),
    IFTHEN : (a,b) => (!a || b),
    IFF    : (a,b) => (a == b),
    NOT    : (a)   => (!a),
    FALSUM : ()    => (false)
}

// get all interpretations/truth-value assignments
libtf.allinterps = function(wffs) {
    // start with an empty interpretation
    let interps = [{}];
    let previnterps = [];
    let allpletters = [];
    for (let wff of wffs) {
        allpletters = arrayUnion(allpletters, wff.allpletters);
    }
    // loop over letters in wff
    for (let pletter of allpletters) {
        // for each old interpretation, create two new ones
        // one where this letter is true and one where it is false
        previnterps = interps;
        interps = [];
        for ( let interp of previnterps ) {
            interps.push(
                { ...interp, [pletter]: true },
                { ...interp, [pletter]: false }
            );
        }
    }
    return interps;
}

// evaluates a formula on an interpretation; keeping track of the
// "full truth table row" and where the main op is in it
libtf.evaluate = function(wff, interp, notationname) {
    const syntax = getSyntax(notationname);
    const tfn = (wff.op) ? libtf.tfns[syntax.operators[wff.op]] : false;
    if (syntax.isbinaryop(wff.op)) {
        const lres = libtf.evaluate(wff.left, interp, notationname);
        const rres = libtf.evaluate(wff.right, interp, notationname);
        const tv = tfn(lres.tv, rres.tv);
        return {
            tv: tv,
            row: [...lres.row, tv, ...rres.row],
            opspot: lres.row.length
        }
    }
    if (syntax.ismonop(wff.op)) {
        const rres = libtf.evaluate(wff.right, interp, notationname);
        const tv = tfn(rres.tv)
        return { tv: tv, row: [tv, ...rres.row], opspot: 0 }
    }
    if (tfn) { return { tv: tfn(), row: [tfn()], opspot: 0 }; }
    const tv = interp[wff.pletter] ?? false
    return { tv: tv, row:[tv], opspot: 0 }
}

// fills in a truth table for one formula and determines if it
// is a contradiction or tautology
export function formulaTable(fml, notationname) {
    const interps = libtf.allinterps([fml]);
    let taut = true;
    let contra = true;
    let opspot = 0;
    const rows = interps.map( (interp) => {
        const e = libtf.evaluate(fml, interp, notationname);
        if (e.tv) { contra = false; } else { taut = false; }
        opspot = e.opspot;
        return e.row;
    }) ;
    return { taut, contra, opspot, rows };
}

// fills in truth table for two formulas and checks their
// equivalence
export function equivTables(fmlA, fmlB, notationname) {
    const interps = libtf.allinterps([fmlA,fmlB]);
    let equiv = true;
    const A = {};
    const B = {};
    A.opspot = 0;
    B.opspot = 0;
    A.rows = [];
    B.rows = [];
    for (const interp of interps) {
        const ea = libtf.evaluate(fmlA, interp, notationname);
        const eb = libtf.evaluate(fmlB, interp, notationname);
        A.opspot = ea.opspot;
        B.opspot = eb.opspot;
        A.rows.push(ea.row);
        B.rows.push(eb.row);
        equiv = (equiv && (ea.tv == eb.tv));
    }
    return { equiv, A, B }
}

// fills in the truth tables for the premises and conclusion of
// an argument and determines its validity
export function argumentTables(pwffs, cwff, notationname) {

    const interps = libtf.allinterps([...pwffs,cwff]);
    let valid = true;
    const prems = [];
    for (const pr of pwffs) {
        prems.push({ opspot:0, rows: [] });
    }
    const conc = {};
    conc.rows = [];
    conc.opspot = 0;
    for (const interp of interps) {
        let allpremstrue = true;
        for (let i=0; i < pwffs.length; i++) {
            const w = pwffs[i];
            const e = libtf.evaluate(w, interp, notationname);
            prems[i].opspot = e.opspot;
            prems[i].rows.push(e.row);
            allpremstrue = (allpremstrue && e.tv);
        }
        const ce = libtf.evaluate(cwff, interp, notationname);
        conc.opspot = ce.opspot;
        conc.rows.push(ce.row);
        valid = (valid && (!allpremstrue || ce.tv));
    }
    return { valid, prems, conc }
}

// determines truth tables for a problem in which the student
// did their own translations and determines validity
export function comboTables(wffs, index, notationname) {
    const tables = [];
    const interps = libtf.allinterps(wffs);
    let valid = true;
    for (let i=0; i<wffs.length; i++) {
        tables.push({ rows:[], opspot: 0 });
    }
    for (let interp of interps) {
        let allpremstrue = true;
        let conctrue = false;
        for (let i=0; i<wffs.length; i++) {
            const wff=wffs[i];
            const e = libtf.evaluate(wff, interp, notationname);
            tables[i].opspot = e.opspot;
            tables[i].rows.push(e.row);
            if (i==index) { // conclusion
                conctrue = e.tv;
            } else { //premise
                allpremstrue = (allpremstrue && e.tv);
            }
        }
        valid = (valid && (!allpremstrue || conctrue));
    }
    return [tables, valid];
}

