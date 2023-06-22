
// warning: there's a thin space in this regex
export function justParse(j) {
    // put spaces before and after numbers
    j = j.replace(/([0-9]+)/g, ' $1 ');
    // remove spaces around potential ranges
    j = j.replace(/ *[-–—−]+ */g, '–');
    let pieces = j.split(/[,  ]+/g);
    let nums = [];
    let ranges = [];
    let citedrules = [];
    for (let piece of pieces) {
        if (piece == '') { continue; }
        if (piece == '?') {
            nums.push('?');
            continue;
        }
        if (/^[0-9]+$/.test(piece)) {
            nums.push(parseInt(piece));
            continue;
        }
        if (/^[0-9?]+–[0-9?]+$/.test(piece)) {
            let start = piece.replace(/–.*/,'');
            if (!(/[?]/.test(start))) {
                start = parseInt(start);
            }
            let end = piece.replace(/.*–/,'');
            if (!(/[?]/.test(end))) {
                end = parseInt(end);
            }
            if (end < start) {
                ranges.push([end, start]);
            } else {
                ranges.push([start, end]);
            }
            continue;
        }
        citedrules.push(piece);
    }
    return { nums, ranges, citedrules };
}
