
import { fullTableMatch } from './truth-tables.js';

function shouldBe(rowsA, opspotA, rowsB, opspotB) {
    let equiv = true;
    let comp = true;
    for (let i = 0 ; i < rowsA.length ; i++) {
        let rowA = rowsA[i];
        let rowB = rowsB[i];
        let tvA = rowA[opspotA];
        let tvB = rowB[opspotB];
        if ((tvA === -1) || (tvB === -1)) {
            comp = false;
            equiv = false;
            break;
        }
        if (tvA !== tvB) {
            equiv = false;
        }
    }
    return { equiv, comp };
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let correct = true;
    // check table portion
    let offive = 0;
    let tmResultA = fullTableMatch(answer.A.rows, givenans.lefts[0].rows);
    let tmResultB = fullTableMatch(answer.B.rows, givenans.right.rows);
    if ((tmResultA.rowdiff == 0) &&
        (tmResultA.offcells.length == 0) &&
        (tmResultB.offcells.length == 0)) {
        offive = 5;
    } else {
        correct = false;
        // todo? tweak this?
        let shouldachecked = ((answer.A.rows.length
                * answer.A.rows[0].length) + (answer.B.rows.length *
                    answer.B.rows[0].length));
        let totchecked = tmResultA.numchecked + tmResultB.numchecked;
        let totwrong = tmResultA.offcells.length + tmResultB.offcells.length;
        if (totchecked > 0) {
            offive = (( totchecked - totwrong ) / shouldachecked) * 4;
        }
        if (tmResultA.rowdiff < 0) { offive--; }
        if (tmResultA.rowdiff > 0) { offive = offive * (
            ( answer.A.rows.length - tmResultA.rowdiff ) /
                answer.A.rows.length);
        }
        if (offive < 0) { offive = 0 };
    }
    // check answer
    let qright = false;
    let awarded = 0;
    if (options.question) {
        let oftwo = 0;
        if ((answer.equiv == givenans.equiv) && (givenans.mcans !== -1)) {
            oftwo = 2;
            qright = true;
        } else {
            let theyshouldthink = shouldBe(
                givenans.lefts[0].rows, answer.A.opspot,
                givenans.right.rows, answer.B.opspot
            );
            if (theyshouldthink.comp) {
                if (theyshouldthink.equiv == givenans.equiv) {
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
        rv.offcells = {
            A: tmResultA.offcells,
            B: tmResultB.offcells
        }
        if (options.question) {
            rv.qright = qright;
        }
        rv.rowdiff = tmResultA.rowdiff;
    }
    return rv;
}

