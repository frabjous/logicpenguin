
import { fullTableMatch } from './truth-tables.js';

function shouldBe(rows, opspot) {
    let taut = true;
    let contra = true;
    let comp = true;
    for (let r of rows) {
        if (r[opspot] === -1) {
            comp = false;
            taut = false;
            contra = false;
            break;
        }
        if (r[opspot] !== true) {
            taut = false;
        }
        if (r[opspot] !== false) {
            contra = false;
        }
    }
    return { taut, contra, comp };
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let correct = true;
    // check table portion
    let offive = 0;
    let tmResult = fullTableMatch(answer.rows, givenans.right.rows);
    if ((tmResult.offcells.length == 0) && (tmResult.rowdiff == 0)) {
        offive = 5;
    } else {
        correct = false;
        // todo? tweak this?
        let shouldachecked = (answer.rows.length * answer.rows[0].length);
        if (tmResult.numchecked > 0) {
            offive = (( tmResult.numchecked -
                tmResult.offcells.length ) / shouldachecked) * 4;
        }
        if (tmResult.rowdiff < 0) { offive--; }
        if (tmResult.rowdiff > 0) { offive = offive * (
            (answer.rows.length - tmResult.rowdiff )/ answer.rows.length);
        }
        if (offive < 0) { offive = 0 };
    }
    // check answer
    let qright = false;
    let awarded = 0;
    if (options.question) {
        let oftwo = 0;
        if ((answer.contra == givenans.contra) && (answer.taut == givenans.taut) && (givenans.mcans !== -1)) {
            oftwo = 2;
            qright = true;
        } else {
            let theyshouldthink = shouldBe(givenans.right.rows, answer.opspot);
            if (theyshouldthink.comp) {
                if ((theyshouldthink.contra == givenans.contra) &&
                    (theyshouldthink.taut == givenans.taut) && (givenans.mcans !== -1)) {
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
            awarded = Math.floor((offive/5)*points);
        } else {
            awarded = (correct) ? points: 0;
        }
    }
    let rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: awarded
    }
    if (cheat && !correct) {
        rv.offcells = tmResult.offcells;
        if (options.question) {
            rv.qright = qright;
        }
        rv.rowdiff = tmResult.rowdiff;
    }
    return rv;
}

/*
 * answer:
 * taut, contra, opspot, rows
 *
 * lefts []
 * right { rows, howhls }
 * 
 */
