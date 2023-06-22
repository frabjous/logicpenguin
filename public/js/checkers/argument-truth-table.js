
import { fullTableMatch } from './truth-tables.js';

function shouldBe(prems, conc) {
    let valid = true;
    for (let i = 0; i < conc.rows.length; i++) {
        let allprems = true;
        for (let prem of prems) {
            let thisop = prem.rows[i][prem.opspot];
            if (thisop === -1) { return { valid: valid, comp: false }; };
            if (!thisop) {
                allprems = false;
                break;
            }
        }
        if (!allprems) { continue; }
        let concop = conc.rows[i][conc.opspot];
        if (concop === -1) { return { valid: valid, comp: false }; }
        if (!concop) {
            valid = false;
            break;
        }
    }
    return { valid, comp: true }
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let correct = true;
    // check table portion
    let offive = 0;
    let tmPremResults = [];
    for (let i = 0 ; i < answer.prems.length; i++) {
        tmPremResults.push(fullTableMatch(answer.prems[i].rows,
            givenans.lefts[i].rows));
    }
    let tmConcResult = fullTableMatch(answer.conc.rows, givenans.right.rows);

    let numOffCells = tmConcResult.offcells.length;
    for (let tmResult of tmPremResults) {
        numOffCells += tmResult.offcells.length;
    }
    if ((tmConcResult.rowdiff == 0) && (numOffCells == 0)) {
        offive = 5;
    } else {
        correct = false;
        let shouldachecked = answer.conc.rows[0].length *
            answer.conc.rows.length;
        for (let pr of answer.prems) {
            shouldachecked += (pr.rows.length * pr.rows[0].length);
        }
        let numch = tmConcResult.numchecked;
        for (let tmResult of tmPremResults) {
            numch += tmResult.numchecked;
        }
        if (numch > 0) {
            offive = (( numch - numOffCells ) / shouldachecked) * 4;
        }
        if (tmConcResult.rowdiff < 0) { offive--; }
        if (tmConcResult.rowdiff > 0) { offive = offive * (
            ( answer.conc.rows.length - tmConcResult.rowdiff ) /
                answer.conc.rows.length);
        }
        if (offive < 0) { offive = 0; }
    }
    // check answer
    let qright = false;
    let awarded = 0;
    if (options.question) {
        let oftwo = 0;
        if ((answer.valid == givenans.valid) && (givenans.mcans !== -1)) {
            oftwo = 2;
            qright = true;
        } else {
            let prems = [];
            for (let i =0 ; i < givenans.lefts.length ; i++) {
                let prem = givenans.lefts[i];
                prems.push({ rows: prem.rows, opspot: answer.prems[i].opspot });
            }
            let theyshouldthink = shouldBe(prems,
                { rows: givenans.right.rows, opspot: answer.conc.opspot }
            );
            if (theyshouldthink.comp) {
                if (theyshouldthink.valid == givenans.valid) {
                    oftwo = 2;
                } else {
                    oftwo = 0;
                    correct = false;
                }
            } else {
                oftwo = 0;
                correct = false;
            }
        }
        if (partialcredit) {
            awarded = Math.floor(((oftwo + offive)/7) * points);
        } else {
            awarded = (correct) ? points : 0;
        }
    } else {
        if (partialcredit) {
            awarded = Math.floor((offive/5) * points);
        } else {
            awarded = (correct) ? points: 0;
        }
    }
    let rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: awarded
    }
    if (cheat && !correct) {
        rv.offcells = {}
        rv.offcells.prems = [];
        for (let tmResult of tmPremResults) {
            rv.offcells.prems.push(tmResult.offcells);
        }
        rv.offcells.conc = tmConcResult.offcells;
        if (options.question) {
            rv.qright = qright;
        }
        rv.rowdiff = tmConcResult.rowdiff;
    }
    return rv;
}

