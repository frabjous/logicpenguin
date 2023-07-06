// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////// checkers/gmh-counterexample.js ///////////////////////////
// checks an old-style counterexample multiple choice problem       //
//////////////////////////////////////////////////////////////////////

// partial credit not really an option

// returns a counterexample if one is given for the argument as well
// to display as a comment

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    const correct = (answer.valid == givenans);
    const counterexample = answer.counterexample ?? false;
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        counterexample: counterexample,
        points: (correct ? points : 0)
    }
}
