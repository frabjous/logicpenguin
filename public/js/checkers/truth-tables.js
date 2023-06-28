// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/*
 * if rowdiff positive, they didn't use enough rows, check all their rows
 * rows to check = real rows - diff
 *
 * if rowdiff negative, they gave too many rows, check all answer rows
 * 
 */

export function fullTableMatch(ansrows, givenrows) {
    let offcells = [];
    // positive row diff => they didn't use enough rows
    // negative row diff => they used too many rows
    let rowdiff = (ansrows.length - givenrows.length);
    // determine overlapping row number to check
    let rowstocheck = ansrows.length;
    if (rowdiff > 0) {
        rowstocheck = ansrows.length - rowdiff;
    }
    for (let i = 0; i < rowstocheck; i++) {
        for (let j = 0; j<ansrows[0].length; j++) {
            let cellans = ansrows[i][j];
            let givencellans = givenrows[i][j];
            if (cellans !== givencellans) {
                offcells.push([i,j]);
            }
        }
    }
    let numchecked = (rowstocheck * ansrows[0].length);
    return {rowdiff, offcells, numchecked};
}


