// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////// checkers/combo-translation-truth-table.js ///////////////
// uses functions from other scripts to check a combination problem   //
////////////////////////////////////////////////////////////////////////

import tr from '../translate.js';
import checkTransProb from './symbolic-translation.js';
import checkArgumentTT from './argument-truth-table.js';
import getFormulaClass from '../symbolic/formula.js';
import { argumentTables } from '../symbolic/libsemantics.js';

let defaultnotation = 'cambridge';
if ((typeof process !== 'undefined') && process?.appsettings?.defaultnotation) {
    defaultnotation = process.appsettings.defaultnotation;
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    // set notation
    let notation = defaultnotation;
    if (options?.notation) {
        notation = options.notation;
    }
    const Formula = getFormulaClass(notation);
    //
    let correct = true;
    const messages = [];
    let offcells = false;
    let qright = null;
    let rowdiff = 0;
    let ttTtl = 5;
    let ttEarned = 0;
    let transptsearned = 0;
    let transptsttl = 1;
    // check conclusion identification
    if (answer.index == givenans.chosenConclusion) {
        transptsearned++;
    } else {
        correct = false;
        messages.push(tr('Wrong statement identified ' +
            'as the conclusion.'));
    }
    // check translations
    for (let i=0; i<answer.translations.length; i++) {
        transptsttl++;
        const righttrans = answer.translations[i];
        if (!givenans.translations
            || givenans.translations.length < (i+1)) {
            continue;
        }
        const giventrans = givenans.translations[i];
        const transq = question?.[i]?.statement ?? '';
        const transcheck = await checkTransProb(
            transq, righttrans, giventrans, partialcredit, 100, cheat, options
        );
        if (transcheck.successstatus == 'correct') {
            transptsearned++;
        } else {
            correct = false;
            transptsearned += (transcheck.points / 100);
            if (giventrans == '') {
                messages.push(tr('Translation not completed.'));
            } else {
                messages.push(tr('“' + giventrans + '” is an incorrect ' +
                'translation (should be: “' + righttrans + '”)'));
            }
        }
    }
    // check tables
    if (givenans.tableAns) {
        const conclusion = givenans?.translations?.[
            (givenans?.chosenConclusion ?? 0)] ?? '';
        let premises = [];
        if (givenans.chosenOrder) {
            premises = givenans.chosenOrder.map((n) => 
                (givenans?.translations?.[n] ?? ''));
        }
        const pwffs = premises.map((p)=>(Formula.from(p)));
        const cwff = Formula.from(conclusion);
        const tablesShouldBe = argumentTables(pwffs, cwff, notation);
        const tcQ = {
            prems: premises,
            conc: conclusion
        }
        const tableCheck = await checkArgumentTT(
             tcQ, tablesShouldBe, givenans.tableAns,
                partialcredit, ttTtl, cheat, { question: true }
        );
        ttEarned = tableCheck.points;
        if ("qright" in tableCheck) {
            qright = tableCheck.qright;
        }
        if (tableCheck.successstatus == 'correct') {
            qright = true;
        } else {
            correct = false;
            messages.push(tr('There are errors with the truth ' +
                'table or answer given there.'));
            if (tableCheck.offcells) {
                offcells = tableCheck.offcells;
            }
            if (tableCheck.rowdiff && tableCheck.rowdiff != 0) {
                messages.push(tr('The truth table uses the wrong ' +
                    'number of rows.'));
                rowdiff = tableCheck.rowdiff;
            }
        }
    }
    let earned = 0;
    if (partialcredit) {
        if (correct) {
            earned = points;
        } else {
            const allpts = ttEarned + transptsearned;
            const avail = ttTtl + transptsttl;
            earned = Math.floor(
                points * (allpts/avail)
            );
        }
    } else {
        // all or nothing
        earned = correct ? points : 0;
    }
    const rv = {
        successstatus: (correct ? "correct" : "incorrect"),
        points: earned
    }
    if (cheat) {
        if (offcells) {
            rv.offcells = offcells;
        }
        if (qright) {
            rv.qright = true;
        } else {
            rv.qright = false;
        }
        if (rowdiff) {
            rv.rowdiff = rowdiff;
        }
        rv.messages = messages;
    }
    return rv;
}

