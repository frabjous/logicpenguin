// common abbrevs:
// interp: interpretation (aka truth-value assignment)
// tfns = truth functions
// libtf = lib truth-falsity
// tv = truth value
// wff: well formed formula (though often they aren't well formed)

import { syntax, operators } from './libsyntax.js';
import { arrayUnion } from '../misc.js';

export let libtf = {};

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
libtf.evaluate = function(wff, interp) {
    let tfn = (wff.op) ? libtf.tfns[operators[wff.op]] : false;
    if (syntax.isbinaryop(wff.op)) {
        let lres = libtf.evaluate(wff.left, interp);
        let rres = libtf.evaluate(wff.right, interp);
        let tv = tfn(lres.tv, rres.tv);
        return {
            tv: tv,
            row: [...lres.row, tv, ...rres.row],
            opspot: lres.row.length
        }
    }
    if (syntax.ismonop(wff.op)) {
        let rres = libtf.evaluate(wff.right, interp);
        let tv = tfn(rres.tv)
        return { tv: tv, row: [tv, ...rres.row], opspot: 0 }
    }
    if (tfn) { return { tv: tfn(), row: [tfn()], opspot: 0 }; }
    let tv = interp[wff.pletter] ?? false
    return { tv: tv, row:[tv], opspot: 0 }
}


export function formulaTable(fml) {
    let interps = libtf.allinterps([fml]);
    let taut = true;
    let contra = true;
    let opspot = 0;
    let rows = interps.map( (interp) => {
        let e = libtf.evaluate(fml, interp);
        if (e.tv) { contra = false; } else { taut = false; }
        opspot = e.opspot;
        return e.row;
    }) ;
    return { taut, contra, opspot, rows };
}

export function equivTables(fmlA, fmlB) {
    let interps = libtf.allinterps([fmlA,fmlB]);
    let equiv = true;
    let A = {};
    let B = {};
    A.opspot = 0;
    B.opspot = 0;
    A.rows = [];
    B.rows = [];
    for (let interp of interps) {
        let ea = libtf.evaluate(fmlA, interp);
        let eb = libtf.evaluate(fmlB, interp);
        A.opspot = ea.opspot;
        B.opspot = eb.opspot;
        A.rows.push(ea.row);
        B.rows.push(eb.row);
        equiv = (equiv && (ea.tv == eb.tv));
    }
    return { equiv, A, B }
}


export function argumentTables(pwffs, cwff) {

    let interps = libtf.allinterps([...pwffs,cwff]);
    let valid = true;
    let prems = [];
    for (let pr of pwffs) {
        prems.push({ opspot:0, rows: [] });
    }
    let conc = {};
    conc.rows = [];
    conc.opspot = 0;
    for (let interp of interps) {
        let allpremstrue = true;
        for (let i=0; i < pwffs.length; i++) {
            let w = pwffs[i];
            let e = libtf.evaluate(w, interp);
            prems[i].opspot = e.opspot;
            prems[i].rows.push(e.row);
            allpremstrue = (allpremstrue && e.tv);
        }
        let ce = libtf.evaluate(cwff, interp);
        conc.opspot = ce.opspot;
        conc.rows.push(ce.row);
        valid = (valid && (!allpremstrue || ce.tv));
    }
    return { valid, prems, conc }
}

export function comboTables(wffs, index) {
    let tables = [];
    let interps = libtf.allinterps(wffs);
    let valid = true;
    for (let i=0; i<wffs.length; i++) {
        tables.push({ rows:[], opspot: 0 });
    }
    for (let interp of interps) {
        let allpremstrue = true;
        let conctrue = false;
        for (let i=0; i<wffs.length; i++) {
            let wff=wffs[i];
            let e = libtf.evaluate(wff, interp);
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

