// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// checkers/truth-tables.js ////////////////////////////
// a common function for seeing whether a table matches, used by the  //
// checkers for truth-table type problems                             //
////////////////////////////////////////////////////////////////////////

/*
 * if rowdiff positive, they didn't use enough rows, check all their rows
 * rows to check = real rows - diff
 *
 * if rowdiff negative, they gave too many rows, check all answer rows
 * 
 */

// returns how many rows it is off by, an array of cell coordinates
// that are wrong, and the number of cells checked

export function fullTableMatch(ansrows, givenrows) {
    const offcells = [];
    // positive row diff => they didn't use enough rows
    // negative row diff => they used too many rows
    const rowdiff = (ansrows.length - givenrows.length);
    // determine overlapping row number to check
    let rowstocheck = ansrows.length;
    if (rowdiff > 0) {
        rowstocheck = ansrows.length - rowdiff;
    }
    for (let i = 0; i < rowstocheck; i++) {
        for (let j = 0; j<ansrows[0].length; j++) {
            const cellans = ansrows[i][j];
            const givencellans = givenrows[i][j];
            if (cellans !== givencellans) {
                offcells.push([i,j]);
            }
        }
    }
    const numchecked = (rowstocheck * ansrows[0].length);
    return {rowdiff, offcells, numchecked};
}


