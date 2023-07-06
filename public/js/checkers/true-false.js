// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// checkers/true-false.js ///////////////////////////////
// checks if a true-false problem answer is correct                   //
////////////////////////////////////////////////////////////////////////

// partial credit is not really possible with true/false

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    const correct = (answer === givenans);
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        points: ( correct ? points : 0 )
    }
}
