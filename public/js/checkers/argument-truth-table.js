// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////// checkers/argument-truth-tables.js //////////////////////////
// checks whether a truth table answer for arguments is correct or not //
/////////////////////////////////////////////////////////////////////////

import { fullTableMatch } from './truth-tables.js';

// determines whether it should be valid or invalid depending on the
// table given
function shouldBe(prems, conc) {
    let valid = true;
    for (let i = 0; i < conc.rows.length; i++) {
        let allprems = true;
        for (const prem of prems) {
            const thisop = prem.rows[i][prem.opspot];
            if (thisop === -1) { return { valid: valid, comp: false }; };
            if (!thisop) {
                allprems = false;
                break;
            }
        }
        if (!allprems) { continue; }
        const concop = conc.rows[i][conc.opspot];
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
    //
    // the table itself gives points out of five
    let offive = 0;
    const tmPremResults = [];
    // check table for each premise and conclusion
    for (let i = 0 ; i < answer.prems.length; i++) {
        tmPremResults.push(fullTableMatch(answer.prems[i].rows,
            givenans.lefts[i].rows));
    }
    const tmConcResult = fullTableMatch(answer.conc.rows, givenans.right.rows);

    let numOffCells = tmConcResult.offcells.length;
    for (const tmResult of tmPremResults) {
        numOffCells += tmResult.offcells.length;
    }
    if ((tmConcResult.rowdiff == 0) && (numOffCells == 0)) {
        offive = 5;
    } else {
        correct = false;
        // compare number of cells checked to correct number
        let shouldachecked = answer.conc.rows[0].length *
            answer.conc.rows.length;
        for (const pr of answer.prems) {
            shouldachecked += (pr.rows.length * pr.rows[0].length);
        }
        let numch = tmConcResult.numchecked;
        for (const tmResult of tmPremResults) {
            numch += tmResult.numchecked;
        }
        if (numch > 0) {
            offive = (( numch - numOffCells ) / shouldachecked) * 4;
        }
        // account for missing or extra rows on score
        if (tmConcResult.rowdiff < 0) { offive--; }
        if (tmConcResult.rowdiff > 0) { offive = offive * (
            ( answer.conc.rows.length - tmConcResult.rowdiff ) /
                answer.conc.rows.length);
        }
        if (offive < 0) { offive = 0; }
    }

    // if there is a multiple choice answer it is worth 2 compared to
    // the 5

    // check answer
    let qright = false;
    let awarded = 0;
    if (options.question) {
        let oftwo = 0;
        // award if actual right answer
        if ((answer.valid == givenans.valid) && (givenans.mcans !== -1)) {
            oftwo = 2;
            qright = true;
        } else {
            // determine what answer their table reflects
            const prems = [];
            for (let i =0 ; i < givenans.lefts.length ; i++) {
                const prem = givenans.lefts[i];
                prems.push({ rows: prem.rows, opspot: answer.prems[i].opspot });
            }
            const theyshouldthink = shouldBe(prems,
                { rows: givenans.right.rows, opspot: answer.conc.opspot }
            );
            // if points for multiple choice if it's the right answer for
            // their table
            if (theyshouldthink.comp) {
                if (theyshouldthink.valid == givenans.valid) {
                    oftwo = 2;
                } else {
                    oftwo = 0;
                    correct = false;
                }
            // otherwise none of the two
            } else {
                oftwo = 0;
                correct = false;
            }
        }
        // determine partial credit out of 7
        if (partialcredit) {
            awarded = Math.floor(((oftwo + offive)/7) * points);
        } else {
            awarded = (correct) ? points : 0;
        }
    } else {
        // if no multiple choice it's out of 5
        if (partialcredit) {
            awarded = Math.floor((offive/5) * points);
        } else {
            awarded = (correct) ? points: 0;
        }
    }
    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: awarded
    }
    // only add offcells to response if they are allowed to cheat
    // at this point
    if (cheat && !correct) {
        rv.offcells = {}
        rv.offcells.prems = [];
        for (const tmResult of tmPremResults) {
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

