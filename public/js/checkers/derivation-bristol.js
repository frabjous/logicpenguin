// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// checkers/derivation-bristol.js /////////////////////
// bristol-specific derivation checker, uses derivation-check.js    //
////////////////////////////////////////////////////////////////////////

import getRules from './rules/forallx-rules.js';
import DerivationCheck from './derivation-check.js';
import { justParse } from '../ui/justification-parse.js';

// default notation from settings, but bristol otherwise
let defaultnotation = 'bristol';
if ((typeof process != "undefined") && (process?.appsettings?.defaultnotation)) {
    defaultnotation = process.appsettings.defaultnotation;
}

// try to determine which lines are actual progress
function progresslinesin(deriv, errors, rules) {
    let ttl = 0;
    // skip empty subderivations
    if (!("parts" in deriv)) { return 0; }
    for (let pt of deriv.parts) {
        // recursively apply to subdirevations
        if ("parts" in pt) {
            ttl+= progresslinesin(pt, errors, rules);
        }
        // skip lines without line numbers or justifications
        if ((!("n" in pt)) || (!("j" in pt))) {
            continue;
        }
        // lines with errors are not progress
        if (pt.n in errors) {
            let badfound = false;
            for (let cat in errors[pt.n]) {
                if (cat != 'dependency') {
                    badfound = true;
                    break;
                }
            }
            if (badfound) { continue; }
        }
        // determine kind of out rule
        const { nums, ranges, citedrules } = justParse(pt.j);
        if (citedrules.length < 1) { continue; }
        const rule = citedrules[0];
        // skip nonexistent rules
        if (!(rule in rules)) {
            continue;
        }
        // do not premises, assumptions, in-rules to avoid cheese
        if (!(rules[rule].premiserule) &&
            !(rules[rule].assumptionrule) &&
            !(/I$/.test(rule))) {
            ttl++;
        }
    }
    return ttl;
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    // clone the answer to avoid messing it up when checking it
    const ansclone = JSON.parse(JSON.stringify(givenans));
    const notationname = (options?.notation ?? defaultnotation);
    const rules = getRules('bristol', notationname);
    const checkResult = new DerivationCheck(
        notationname, rules, ansclone, question.prems,
        question.conc, partialcredit, false
    ).report();
    // only correct if no errors
    const correct = (Object.keys(checkResult.errors).length == 0);
    let portion = 1;
    // try to determine partial credit by checking progress vs needed
    // progress
    if (partialcredit && !correct) {
        // get maximum credit from derivation check
        const initialportion = checkResult.pointsportion;
        portion = initialportion;
        // check number of good lines versus answer's good lines
        const goalprogress = progresslinesin(answer, {}, rules);
        const actualprogress = progresslinesin(givenans, checkResult.errors, rules);
        const progportion = (actualprogress / goalprogress);
        // if mostly wrong, we give points on the number of good steps
        if (initialportion < 0.5) {
            let buildup = actualprogress * 0.1;
            if (buildup > 0.5) { buildup = 0.5; }
            portion = Math.max(initialportion, buildup);
        }
        // maximum of 0.8 for incomplete derivations
        if (progportion < 0.8) {
            portion = (portion * progportion);
        }
        points = Math.floor(portion * points);
    } else {
        points = (correct) ? points : 0;
    }
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        errors: checkResult.errors,
        points: points
    }
}
