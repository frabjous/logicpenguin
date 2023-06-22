import Formula from '../symbolic/formula.js';
import tr from '../translate.js';
import { equivtest } from '../symbolic/libequivalence.js';

function checkTranslation(ansstr, givenstr, pred = true) {
    let maxfrac = 1;
    // answer is totally right if strings match
    if (ansstr == givenstr) { return {
        correct: true,
        determinate: true,
        ptfrac: maxfrac
    }};
    // parse strings
    let ans = Formula.from(ansstr);
    let given = Formula.from(givenstr);
    // initialize variables
    let message = '';
    let correct = true;
    let determinate = true;
    // ensure well formed
    if (!given.wellformed) {
        maxfrac = 0.8;
        message += tr('the formula given is not syntactically well ' +
            'formed (' + given.syntaxerrors + ')');
        correct = false;
    }
    // ensure no free vars when pred = true
    if (pred) {
        if (given.freevars.length != 0) {
            maxfrac = maxfrac - 0.1;
            message += ((message == '') ? '' : '; ') +
                tr('translation uses a variable (' +
                given.freevars.join(', ') + ') not bound by a quantifier');
            correct = false;
        }
    } else {
        // should not have terms
        if (given.terms.length != '') {
            maxfrac = maxfrac - 0.1;
            message += ((message == '') ? '' : '; ') +
                tr('Sentential Logic translation incorrectly uses ' +
                    'terms (' + given.terms.split('').join(', ') +
                    ') or quantifiers');
            correct = false;
        }
    }
    // check if evaluate to the same once syntactic errors or
    // harmless differences taken into account
    if (ans.normal == given.normal) {
        return { correct, determinate, message, ptfrac: maxfrac };
    }
    // check for equivalence
    let equivtestresult = equivtest(ans, given);
    // todo? better partial credit for translations;
    // currently awards up to 20% just for being well-formed??
    if (equivtestresult.determinate) {
        determinate = true;
        if (!equivtestresult.equiv) {
            correct = false;
            message += ((message == '') ? '' : '; ') +
                'formula provided is not equivalent to the correct ' +
                'translation';
            maxfrac = Math.max(0, maxfrac - 0.8);
        }
    } else {
        maxfrac = Math.max(0, maxfrac - 0.8);
        message += ((message == '') ? '' : '; ') +
            'equivalence checker could not determine whether or not ' +
            'the formula provided is equivalent to the intended one';
        if (correct) {
            determinate = false;
            correct = false;
        }
    }
    return { correct, determinate, message, ptfrac: maxfrac }
}

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let result = checkTranslation(answer, givenans,
        (options?.pred ?? true));
    let awarded = (result.correct) ? points : 0;
    if (partialcredit) {
        awarded = Math.floor( points * parseFloat(result.ptfrac.toFixed(5)) );
    }
    let rv = {
        successstatus: ((result.determinate) ?
            ((result.correct) ? "correct" : "incorrect" )
                : "indeterminate"),
        points: awarded
    }
    if (result.message && options.hints) {
        rv.transmessage = result.message;
    }
    return rv;
 }
