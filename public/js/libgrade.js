// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////////////////////////////////////////////////////////////
// functions common to both server and in-browser grading             //
////////////////////////////////////////////////////////////////////////

const libgrade = {}

libgrade.checkers = {};

libgrade.checkAnswer = async function(problemtype, question, answer,
    givenans, partialcredit, points, cheats, options) {

    // check if grader already loaded; load it if not
    if (!("problemtype" in libgrade.checkers)) {
        const imported = await import('./checkers/' + problemtype + '.js');
        libgrade.checkers[problemtype] = imported.default;
    }

    // if it's not a function, we cannot grade with it
    if (!(typeof libgrade.checkers[problemtype] == 'function')) {
        return false;
    }

    // apply check function and return result
    return await libgrade.checkers[problemtype](question, answer,
        givenans, partialcredit, points, cheats, options);
}

export default libgrade;
