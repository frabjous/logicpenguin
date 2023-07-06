// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////justification-parse.js//////////////////////////////
// parses a justification field into line numbers, ranges and rules //
//////////////////////////////////////////////////////////////////////

export function justParse(j) {
    // put spaces before and after numbers
    j = j.replace(/([0-9]+)/g, ' $1 ');
    // remove spaces around potential ranges; make en-dash
    j = j.replace(/ *[-–—−]+ */g, '–');
    // break into pieces at spaces and commas
    // warning: there's a thin space in this regex
    const pieces = j.split(/[,  ]+/g);
    // interpret each piece and sort it accordingly
    const nums = [];
    const ranges = [];
    const citedrules = [];
    for (const piece of pieces) {
        // ignore empty pieces
        if (piece == '') { continue; }
        // question marks stand in for deleted line numbers
        if (piece == '?') {
            nums.push('?');
            continue;
        }
        // if only contains numerals, it is a line number
        if (/^[0-9]+$/.test(piece)) {
            nums.push(parseInt(piece));
            continue;
        }
        // if it only contains numbers and en-dashes it is a
        // range
        if (/^[0-9?]+–[0-9?]+$/.test(piece)) {
            // start is whatever is before the dash
            let start = piece.replace(/–.*/,'');
            if (!(/[?]/.test(start))) {
                start = parseInt(start);
            }
            // end is whatever comes after the fash
            let end = piece.replace(/.*–/,'');
            if (!(/[?]/.test(end))) {
                end = parseInt(end);
            }
            // sort numbers in case put wrong way around?
            if (end < start) {
                ranges.push([end, start]);
            } else {
                ranges.push([start, end]);
            }
            continue;
        }
        // if you get to here, it should be a rule name
        citedrules.push(piece);
    }
    return { nums, ranges, citedrules };
}
