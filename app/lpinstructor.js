// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// lpinstructor.js /////////////////////////////////////
// responds to instructor-only json requests                          //
////////////////////////////////////////////////////////////////////////


const lpinstructor = function(reqobj) {
        // ensure we have all needed data
    const { userid, contextid, consumerkey, launchid } = reqobj;
    if (!launchid || !userid || !contextid || !consumerkey) {
        return {
            error: true,
            errMsg: 'Insufficient information provided to process query.';
        };
    }
    return { error: false, success: true, message: 'got it' }
}

export default lpinstructor;
