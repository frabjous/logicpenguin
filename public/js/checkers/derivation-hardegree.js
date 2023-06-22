
import rules from './rules/hardegree-rules.js';
import DerivationCheck from './derivation-check.js';
import { justParse } from '../ui/justification-parse.js';

function progresslinesin(deriv, errors) {
    let ttl = 0;
    if (!("parts" in deriv)) { return 0; }
    for (let pt of deriv.parts) {
        if ("parts" in pt) {
            ttl+= progresslinesin(pt, errors);
            if ("showline" in pt) {
                pt = pt.showline;
            } else {
                continue;
            }
        }
        // skip lines without line numbers or justifications
        if ((!("n" in pt)) || (!("j" in pt))) {
            continue;
        }
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
        let { nums, ranges, citedrules } = justParse(pt.j);
        if (citedrules.length < 1) { continue; }
        let rule = citedrules[0];
        // skip nonexistent rules
        if (!(rule in rules)) {
            continue;
        }
        // count show lines, assumptions and out rules
        // do not count in rules to avoid cheesing it up
        if ((rules[rule].assumptionrule) ||
            (rules[rule].showrule) ||
            (/O/.test(rule))) {
            ttl++;
        }
    }
    return ttl;
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let ansclone = JSON.parse(JSON.stringify(givenans));
    let checkResult = new DerivationCheck(
        rules, ansclone, question.prems, question.conc, partialcredit, true
    ).report();
    let correct = (Object.keys(checkResult.errors).length == 0);
    let portion = 1;
    if (partialcredit && !correct) {
        let initialportion = checkResult.pointsportion;
        portion = initialportion;
        // check number of good lines versus answer's good lines
        let goalprogress = progresslinesin(answer, {});
        let actualprogress = progresslinesin(givenans, checkResult.errors);
        let progportion = (actualprogress / goalprogress);
        if (initialportion < 0.5) {
            let buildup = actualprogress * 0.1;
            if (buildup > 0.5) { buildup = 0.5; }
            portion = Math.max(initialportion, buildup);
        }
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
