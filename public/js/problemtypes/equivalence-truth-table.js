// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// equivalence-truth-table.js //////////////////////////
// Truth table problems for two statement where you have to tell if    //
// they are or are not logically equivalent                            //
/////////////////////////////////////////////////////////////////////////

import TruthTable from './truth-tables.js';
import LogicPenguinProblem from '../problem-class.js';
import MultipleChoiceExercise from './multiple-choice.js';
import { addelem } from '../common.js';
import tr from '../translate.js';
import getFormulaClass from '../symbolic/formula.js';
import { equivTables } from '../symbolic/libsemantics.js';

export default class EquivalenceTruthTable extends TruthTable {

    constructor() {
        super();
    }

    // both tt and mc question must be complete to be complete
    checkIfComplete() {
        if (!super.checkIfComplete()) {
            return false;
        }
        if (this.options.question &&
            (this.mcquestion.getAnswer() === -1)) {
            return false;
        }
        return true;
    }

    getAnswer() {
        const ans = super.getAnswer();
        if (this.options.question) {
            ans.mcans = this.mcquestion.getAnswer();
            ans.equiv = -1;
            if (ans.mcans != -1) {
                ans.equiv = (ans.mcans == 0);
            }
        }
        return ans;
    }

    // fills in correct answer
    getSolution() {
        if (!("myanswer" in this)) { return null; }
        // fill in left table
        const ans = { lefts: [{}], right: {}, rowhls: []};
        ans.lefts[0].rows = this.myanswer.A.rows;
        ans.lefts[0].colhls = [];
        const h = this.myanswer.A.rows.length;
        const wA = this.myanswer.A.rows[0].length;
        for (let i = 0 ; i < h ; i++) {
            ans.rowhls.push(false);
        }
        for (let i=0; i<wA; i++) {
            ans.lefts[0].colhls.push(false);
        }
        ans.lefts[0].colhls[this.myanswer.A.opspot] = true;
        // fill in right table
        ans.right.rows = this.myanswer.B.rows;
        ans.right.colhls = [];
        const wB = this.myanswer.B.rows[0].length;
        for (let i = 0; i < wB; i++) {
            ans.right.colhls.push(false);
        }
        ans.right.colhls[this.myanswer.B.opspot] = true;
        if (this.options.question) {
            ans.equiv = this.myanswer.equiv;
            ans.mcans = (ans.equiv) ? 0 : 1;
        }
        this.restoreState({
            ans: ans,
            ind: {
                successstatus: 'correct',
                savedstatus: 'unsaved',
                points: -1,
                message: ''
            }
        });

        // remove bad cells
        const tdtd = this.getElementsByTagName("td");
        for (const td of tdtd) {
            td.classList.remove("badcell");
        }

        // change multiple choice question class
        this.rnchoosediv.classList.remove("badnumber");
        if (this.mcquestion) {
            this.mcquestion.classList.remove("badsubquestion");
        }
        return true;
    }

    makeProblem(problem, options, checksave) {
        // a subspecies of truth table problems generally with
        // certain options
        const fullprob = {
            sep: ' ' + tr('and') + ' ',
            lefts: [problem.l],
            right: problem.r
        }
        super.makeProblem(fullprob, options, checksave);

        // can stop here if we don't need mcquestion
        if (!options.question) { return; }

        this.mcquestion = addelem('multiple-choice', this.subq, {
            classes: [ 'ttsubquestion' ]
        });
        this.subq.classList.remove('hidden');

        this.mcquestion.myMainProb = this;

        this.mcquestion.makeProblem({
            prompt: 'Are these statements logically equivalent?',
            choices: ['yes', 'no']
        },{});

        // override subquestion's usual behavior
        this.mcquestion.processAnswer = function() {
            if (this.myMainProb.checkIfComplete()) {
                this.myMainProb.processAnswer();
            }
            return;
        }

        this.mcquestion.makeChanged = function() {
            this.classList.remove("badsubquestion");
            this.myMainProb.makeChanged();
        }

    }

    restoreAnswer(ans) {
        super.restoreAnswer(ans);
        if (this.options.question) {
            this.mcquestion.restoreAnswer(ans.mcans);
        }
    }

    setIndicator(ind) {
        super.setIndicator(ind);
        // color wrong cells
        if (ind?.offcells?.A && ind.offcells.A.length > 0) {
            const trtr = this.leftTables[0].tbody.getElementsByTagName("tr");
            for (const [y,x] of ind.offcells.A) {
                const tr = trtr[y];
                if (tr && tr.ttcells[x]) {
                    tr.ttcells[x].classList.add('badcell');
                }
            }
        }
        if (ind?.offcells?.B && ind.offcells.B.length > 0) {
            const trtr = this.rightTable.tbody.getElementsByTagName("tr");
            for (const [y,x] of ind.offcells.B) {
                const tr = trtr[y];
                if (tr && tr.ttcells[x]) {
                    tr.ttcells[x].classList.add('badcell');
                }
            }
        }

        // mark multiple choice question right or wrong
        if (("qright" in ind) && (!ind.qright)) {
            this.mcquestion.classList.add("badsubquestion");
        }

        // indicate wrong number of rows given
        if (("rowdiff" in ind) && (ind.rowdiff !== 0)) {
            this.rnchoosediv.classList.add("badnumber");
        }
    }

    static sampleProblemOpts(opts) {
        let [parentid, problem, answer, restore, options] =
            LogicPenguinProblem.sampleProblemOpts(opts);
        if ((answer === null) && ("notation" in options)) {
            const Formula = getFormulaClass(options.notation);
            const fa = Formula.from(problem.l);
            const fb = Formula.from(problem.r);
            answer = equivTables(fa, fb, options.notation);
        }
        return [parentid, problem, answer, restore, options];
    }

}

customElements.define("equivalence-truth-table", EquivalenceTruthTable);
