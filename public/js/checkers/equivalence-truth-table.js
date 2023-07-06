// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// checkers/equivalence-truth-table.js ///////////////
// Determines if an equivalence truth table answer is correct        //
///////////////////////////////////////////////////////////////////////

import { fullTableMatch } from './truth-tables.js';

// determines whether according to the table they gave, they should
// be equivalent
function shouldBe(rowsA, opspotA, rowsB, opspotB) {
    let equiv = true;
    let comp = true;
    for (let i = 0 ; i < rowsA.length ; i++) {
        const rowA = rowsA[i];
        const rowB = rowsB[i];
        const tvA = rowA[opspotA];
        const tvB = rowB[opspotB];
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

// partial credit is out of 5 for the table itself, and out of 2 for
// the multiple choice answer if given; multiple choice points are
// awarded if it is either correct or should be correct given their
// table

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let correct = true;
    // check table portion
    let offive = 0;
    const tmResultA = fullTableMatch(answer.A.rows, givenans.lefts[0].rows);
    const tmResultB = fullTableMatch(answer.B.rows, givenans.right.rows);
    if ((tmResultA.rowdiff == 0) &&
        (tmResultA.offcells.length == 0) &&
        (tmResultB.offcells.length == 0)) {
        offive = 5;
    } else {
        correct = false;
        // compare number checked to how many they should have checked
        // and how many are wrong
        const shouldachecked = ((answer.A.rows.length
                * answer.A.rows[0].length) + (answer.B.rows.length *
                    answer.B.rows[0].length));
        const totchecked = tmResultA.numchecked + tmResultB.numchecked;
        const totwrong = tmResultA.offcells.length + tmResultB.offcells.length;
        if (totchecked > 0) {
            offive = (( totchecked - totwrong ) / shouldachecked) * 4;
        }
        // accommodate score based on wrong number of rows
        if (tmResultA.rowdiff < 0) { offive--; }
        if (tmResultA.rowdiff > 0) { offive = offive * (
            ( answer.A.rows.length - tmResultA.rowdiff ) /
                answer.A.rows.length);
        }
        if (offive < 0) { offive = 0 };
    }
    // check multiple choice answer answer
    let qright = false;
    let awarded = 0;
    if (options.question) {
        let oftwo = 0;
        if ((answer.equiv == givenans.equiv) && (givenans.mcans !== -1)) {
            oftwo = 2;
            qright = true;
        } else {
            const theyshouldthink = shouldBe(
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
    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: awarded
    }
    // only send off cells back to browser if they are allowed to 
    // cheat at this point
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

