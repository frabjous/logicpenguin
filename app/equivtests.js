// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

// TODO: get rid of this or merge it elsewhere

import appsettings from './lpsettings.js';
import lpfs from './lpfs.js';
import Formula from '../public/js/symbolic/formula.js';
import { loadEquivalents } from '../public/js/symbolic/libequivalence-db.js';
import { equivtest, quickDBCheck, bidirectionalDBCheck } from '../public/js/symbolic/libequivalence.js';

const datadir = appsettings.datadir;
const assignmentdir = datadir + '/kck/34254/exercises';
const usersdir = datadir + '/kck/34254/users';

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
function checkindeterminate() {
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
        let whatcheck = (ans + ' :: ' + ianswer.state.ans);
        let results = equivtest(
            Formula.from(ans), Formula.from(ianswer.state.ans)
        );
        if (!results.equiv) {
            console.log(whatcheck, results);
        }
    }
}

async function checkolddata() {

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
        let exnum = parts[0];
        let subdirs = await lpfs.subdirs(usersdir);
        for (let usernum of subdirs) {
            console.log("processing usernum ", usernum);
            let savedir = usersdir + '/' + usernum + '/saved';
            let answersdir = usersdir + '/' + usernum + '/answers';
            let savedfile = savedir + '/' + exnum + '.json';
            let answerfile = answersdir + '/' + exnum + '.json';
            let savedinfo = lpfs.loadjson(savedfile);
            if (!savedinfo) { continue; }
            let answerinfo = lpfs.loadjson(answerfile);
            if (!answerinfo) { continue; }
            for (let elemid in savedinfo) {
                let elemidparts = elemid.split("problems")[1];
                let setnum = parseInt(elemidparts.split('n')[0]);
                let probnum = parseInt(elemidparts.split('n')[1]);
                let rightans = answerinfo?.[setnum]?.[probnum];
                if (!rightans) { continue; }
                let savedans = savedinfo[elemid].ans;
                let sf = Formula.from(savedans);
                if (!sf.wellformed) { continue; }
                if (savedinfo[elemid].ind.successstatus === "indeterminate" || usernum == "41809" || usernum == "58450" || usernum == "80084" ) {
                    continue;
                }
                let savedcorrect = (savedinfo[elemid].ind.successstatus == "correct");
                let checkresult=equivtest(Formula.from(rightans), sf);
                if (savedcorrect != checkresult.equiv) {
                    console.log('comparing ', savedans, ' to ', rightans, ' for ', usernum);
                    console.log(checkresult);
                    console.log(savedinfo[elemid]);
                }
            }
        }

    }

}

checkolddata();
