// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let correct = (answer === givenans);
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        points: ( correct ? points : 0 )
    }
}
