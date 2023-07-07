// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// checkers/symbolic-translation.js ///////////////////
// tests whether a translation exercise is correct by testing it for //
// equivalence with correct answer; note: may give indeterminate     //
// answers in polyadic predicate logic                               //
///////////////////////////////////////////////////////////////////////

import getFormulaClass from '../symbolic/formula.js';
import tr from '../translate.js';
import { equivtest } from '../symbolic/libequivalence.js';

// try to read default notation from process settings if running
// on a server
let defaultnotation = 'cambridge';
if ((typeof process != 'undefined') &&
    process?.appsettings?.defaultnotation) {
    defaultnotation = process.appsettings.defaultnotation;
}

function checkTranslation(ansstr, givenstr, pred = true,
    notationname = defaultnotation) {
    let maxfrac = 1;
    // answer is totally right if strings match
    if (ansstr == givenstr) { return {
        correct: true,
        determinate: true,
        ptfrac: maxfrac
    }};
    // load formula class for the notation
    const Formula = getFormulaClass(notationname);
    // parse strings
    const ans = Formula.from(ansstr);
    const given = Formula.from(givenstr);
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
        if (given.terms.length != 0) {
            maxfrac = maxfrac - 0.1;
            message += ((message == '') ? '' : '; ') +
                tr('Sentential Logic translation incorrectly uses ' +
                    'terms (' + given.terms.join(', ') +
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
    const equivtestresult = equivtest(ans, given, notationname);
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
    // call function above
    const result = checkTranslation(answer, givenans,
        (options?.pred ?? true), (options?.notation ?? defaultnotation));
    // determine partial credit
    let awarded = (result.correct) ? points : 0;
    if (partialcredit) {
        awarded = Math.floor( points * parseFloat(result.ptfrac.toFixed(5)) );
    }
    // set up return value
    const rv = {
        successstatus: ((result.determinate) ?
            ((result.correct) ? "correct" : "incorrect" )
                : "indeterminate"),
        points: awarded
    }
    // only return detailed message if hints set
    if (result.message && options.hints) {
        rv.transmessage = result.message;
    }
    return rv;
 }
