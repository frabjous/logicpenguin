// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import appsettings from './lpsettings.js';
import lpfs from './lpfs.js';
import Formula from '../public/js/symbolic/formula.js';
import { loadEquivalents } from '../public/js/symbolic/libequivalence-db.js';
import { equivtest, quickDBCheck, bidirectionalDBCheck } from '../public/js/symbolic/libequivalence.js';

const datadir = appsettings.datadir;
const assignmentdir = datadir + '/kck/34254/exercises';

let makedb = async function() {
    const jsonfiles = await lpfs.filesin(assignmentdir);

    for (let jsonfile of jsonfiles) {
        let parts = jsonfile.split('-info');
        if (parts.length < 2) {
            continue;
        }
        let probleminfo = lpfs.loadjson(assignmentdir + '/' + jsonfile);
        if (!probleminfo) {
            console.error('Could not load json in ' + jsonfile);
            process.exit(1);
        }
        if (!("problemsets" in probleminfo)) {
            console.error('No problem sets in ' + jsonfile);
            process.exit(1);
        }
        let hastrans = false;
        for (let pset of probleminfo.problemsets) {
            if (pset?.problemtype == 'symbolic-translation') {
                hastrans = true;
                break;
            }
        }
        if (!hastrans) { continue; }
        let ansfile = assignmentdir + '/' + parts[0] + '-answers.json';
        let ansans = lpfs.loadjson(ansfile);
        if (!ansans) {
            console.error('Could not read json in ' + ansfile);
            process.exit(1);
        }
        for (let ansset of ansans) {
            for (let t of ansset) {
                console.log('processing wff', t);
                loadEquivalents(t);
            }
        }
    }
}
/*
console.log(equivtest(
    Formula.from('∀x[(Gx & Px) → ∃yLxy]'),
    Formula.from('∀x∃y((Px & Gx) → Lxy)')
));
*/
//makedb();
//
let indeterminate = lpfs.loadjson('/home/kck/tmp/indeterminate-answers.json');
for (let ianswer of indeterminate) {
    if (ianswer.exnum == '7g') { continue;}
    let userdir = appsettings.datadir + '/' + ianswer.consumerkey + '/' +
        ianswer.contextid + '/users/' + ianswer.userid;
    let answersdir = userdir + '/answers';
    let elemidparts = ianswer.elemid.split("problems")[1];
    let setnum = parseInt(elemidparts.split('n')[0]);
    let probnum = parseInt(elemidparts.split('n')[1]);
    let fn = answersdir + '/' + ianswer.exnum + '.json';
    let ansans = lpfs.loadjson(fn);
    if (!ansans) {
        continue;
    }
    let ans = ansans[setnum][probnum];
    console.log(comparing, ans, ianswer.state.ans);
}
