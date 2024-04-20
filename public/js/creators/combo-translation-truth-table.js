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
import { getProseArgument } from '../ui/prose-argument.js';
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
        const ststlabel = addelem('div', pc.probinfoarea, {
            innerHTML: '<strong>Statements</strong>'
        })
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
        pc.getBaseAnswer = function() {
            const rv = {};
            rv.index = pc.pam.getConcNum();
            rv.translations = pc.pam.getTranslations();
            return rv;
        }
        pc.getTTAnswer = function(concindex, translations) {
            const cf = this.Formula.from((translations?.[concindex] ?? ''));
            const pfs = [];
            for (let i=0; i<translations.length; i++) {
                if (i==concindex) { continue; }
                const pf = this.Formula.from((translations[i]));
                pfs.push(pf);
            }
            return argumentTables(pfs, cf, this.notationname);

        }
        pc.getAnswer = function() {
            const rv = this.getBaseAnswer();
            const argTables = this.getTTAnswer(rv.index, rv.translations);
            let premsused = 0;
            rv.tables = [];
            rv.valid = argTables.valid;
            for (let i=0; i<rv.translations.length; i++) {
                if (i==rv.index) {
                    rv.tables.push(argTables.conc);
                    continue;
                }
                rv.tables.push(argTables.prems[premsused]);
                premsused++;
            }
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
            if (this.showpara) {
                const p = this.showpara;
                if (p.parentNode) {
                    p.parentNode.removeChild(p);
                }
            }
            // get problem and answer
            const prob = this.getProblem();
            const ans = this.getAnswer();
            // create new answerer if appropriate
            if (sufficesForQ(prob, ans, this.Formula)) {
                this.ansbelowlabel.style.display = 'block';
                this.ansinfoarea.style.display = 'block';
                this.ansbelowlabel.innerHTML = tr('Answer is shown below');
                this.showpara = addelem('div', this.ansinfoarea);
                const prosearg = getProseArgument(this.showpara, prob);
                if (prosearg?.statementSpans?.[ans.index]) {
                    prosearg.statementSpans[ans.index].classList.add('isconclusion');
                }
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
                this.answerer.myanswer = this.getTTAnswer(ans.index, ans.translations);
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
            pc.makeAnswerer();
        }
    }
}

customElements.define("combo-translation-truth-table-creator",
    ComboTransTruthTableCreator);
