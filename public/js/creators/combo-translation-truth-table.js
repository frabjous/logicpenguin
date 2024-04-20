// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////// creators/combo-translation-truth-table.js /////////////////////
// class for creating truth table problems for arguments                //
//////////////////////////////////////////////////////////////////////////

import LogicPenguinProblemSetCreator from '../create-class.js';
import ArgumentTruthTable from '../problemtypes/argument-truth-table.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import getProseArgumentMaker from '../ui/prose-argument-maker.js';
import { argumentTables } from '../symbolic/libsemantics.js';

function getNotationName() {
    let n = window?.contextSettings?.notation ?? 'cambridge';
    if (n == '' || n == 'none') { n = 'cambridge'; }
    return n;
}

function sufficesForQ(prob, ans, Formula) {
    if (prob.length < 2) { return false; }
    if (ans.translations.length != prob.length) { return false; }
    for (const pr of prob) {
        if (pr.statement == '') { return false; }
    }
    for (const t of ans.translations) {
        const f = Formula.from(t);
        if (!f.wellformed) { return false; }
    }
    if (ans.index < 0) { return false; }
    return true;
}

export default class ComboTransTruthTableCreator extends LogicPenguinProblemSetCreator {
    constructor() {
        super();
    }

    gatherOptions() {
        return {
            notation: getNotationName(),
            pred: false,
            lazy: true,
            question: true,
            nofalsum: true
        }
    }

    makeProblemCreator(problem, answer, isnew) {
        const pc = super.makeProblemCreator(problem, answer, isnew);
        pc.notationname = getNotationName();
        pc.Formula = getFormulaClass(pc.notationname);
        pc.pam = getProseArgumentMaker(pc.probinfoarea, problem,
            (answer?.translations ?? []), (answer?.index ?? -1), {
            notation: pc.notationname,
            gettrans: true,
            question: true,
            lazy: true,
            pred: false
        });
        pc.pam.mypc = pc;
        pc.pam.whenchanged = function() {
            this.mypc.whenchanged();
        }

        pc.getProblem = function() { return this.pam.getStatements(); }
        pc.getAnswer = function() {
            const rv = {};
            rv.index = pc.pam.getConcNum();
            rv.translations = pc.pam.getTranslations();
            const cf = this.Formula.from((rv.translations?.[rv.index] ?? ''));
            const pfs = [];
            for (let i=0; i<rv.translations.length; i++) {
                if (i==rv.index) { continue; }
                const pf = this.Formula.from((rv.trenslations[i]));
                pfs.push(pf);
            }
            rv.tables = argumentTables(pfs, cf, this.notationname);
            return rv;
        }
        pc.makeAnswerer = function() {
            // remove prexistent answerer
            if (this.answerer) {
                const a = this.answerer;
                if (a.parentNode) {
                    a.parentNode.removeChild(a);
                }
            }
            // get problem and answer
            const prob = this.getProblem();
            const ans = this.getAnswer();
            // create new answerer if appropriate
            if (sufficesForQ(prob, ans, this.Formula)) {
                this.ansbelowlabel.style.display = 'block';
                this.ansbelowlabel.innerHTML = tr('Truth table answer is shown below');
                this.ansinfoarea.style.display = 'block';
                this.answerer = addelem('argument-truth-table', this.ansinfoarea);
                // create truth table problem info
                const ttprob = {};
                ttprob.prems = [];
                for (let i=0; i<ans.translations.length; i++) {
                    if (i==ans.index) {
                        ttprob.conc = ans.translations[i];
                    } else {
                        ttprob.prems.push(ans.translations[i]);
                    }
                }
                this.answerer.makeProblem(ttprob, this.mypsc.gatherOptions(), 'save');
                this.answerer.setIndicator = function() {};
                this.answerer.processAnswer = function() {};
                this.answerer.mypc = this;
                this.answerer.makeChanged = function() {
                    this.mypc.mypsc.makeChanged();
                };
                const bdivs = this.answerer.getElementsByClassName("buttondiv");
                for (const bdiv of bdivs) {
                    bdiv.style.display = 'none';
                }
                this.answerer.myanswer = ans;
                this.answerer.getSolution();
            } else {
                this.ansbelowlabel.style.display = 'none';
                this.ansinfoarea.style.display = 'none';
            }

        }
        pc.whenchanged = function() {
            this.makeAnswerer();
            this.mypsc.makeChanged();
        }
        if (!isnew) {
            if ("prems" in problem && problem.prems.length > 0) {
                const pr = pc.sai.getElementsByClassName("symbargpremise")[0]
                    .getElementsByTagName("input")?.[0];
                if (pr) { pr.value = problem.prems[0]; }
                for (let i=1; i<problem.prems.length; i++) {
                    const npr = pc.sai.addPremise();
                    npr.myinput.value = problem.prems[i];
                }
            }
            if ("conc" in problem && problem.conc != '') {
                const c = pc.sai.getElementsByClassName("symbargconc")[0]
                    .getElementsByTagName("input")?.[0];
                if (c) { c.value = problem.conc; }
            }
            pc.whenchanged();
        }
    }
}

customElements.define("combo-translation-truth-table-creator",
    ComboTransTruthTableCreator);
