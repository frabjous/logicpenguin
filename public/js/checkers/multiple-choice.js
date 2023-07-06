// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// checkers/multiple-choice.js /////////////////////////
// function that determines if a multiple choice question is correct  //
// or incorrect                                                       //
////////////////////////////////////////////////////////////////////////

// partial credit isn't really possible with multiple choice, alas

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    const correct = (answer === givenans);
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        points: ( correct ? points : 0 )
    }
}

