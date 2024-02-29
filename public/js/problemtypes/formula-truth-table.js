// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// formula-truth-table.js //////////////////////////////
// truth table problems for individual formulas                       //
// also ask if they're tautologies, self-contradictions or contingent //
////////////////////////////////////////////////////////////////////////

import TruthTable from './truth-tables.js';
import LogicPenguinProblem from '../problem-class.js';
import MultipleChoiceExercise from './multiple-choice.js';
import { addelem } from '../common.js';
import getFormulaClass from '../symbolic/formula.js';
import { formulaTable } from '../symbolic/libsemantics.js';

export default class FormulaTruthTable extends TruthTable {

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
            ans.taut = -1;
            ans.contra = -1;
            if (ans.mcans != -1) {
                ans.taut   = (ans.mcans == 0);
                ans.contra = (ans.mcans == 2);
            }
        }
        return ans;
    }

    // gives right answer
    getSolution() {
        if (!("myanswer" in this)) { return null; }
        const ans = { lefts: [], right: {}, rowhls: []};
        ans.right.rows = this.myanswer.rows;
        ans.right.colhls = [];
        const h = this.myanswer.rows.length;
        const w = this.myanswer.rows[0].length;
        for (let i = 0; i < h; i++) {
            ans.rowhls.push(false);
        }
        for (let i = 0; i < w; i++) {
            ans.right.colhls.push(false);
        }
        ans.right.colhls[this.myanswer.opspot] = true;
        if (this.options.question) {
            ans.taut = this.myanswer.taut;
            ans.contra = this.myanswer.contra;
            ans.mcans = 1;
            if (ans.taut) { ans.mcans = 0 };
            if (ans.contra) { ans.mcans = 2 };
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
        this.rnchoosediv.classList.remove("badnumber");
        if (this.mcquestion) {
            this.mcquestion.classList.remove("badsubquestion");
        }
        return true;
    }

    makeProblem(problem, options, checksave) {
        // implemented as a version of truth-table problems generally
        const fullprob = {
            lefts: [],
            right: problem
        }
        super.makeProblem(fullprob, options, checksave);

        // can stop here if we don't need multiple choice question
        if (!options.question) { return; }

        this.mcquestion = addelem('multiple-choice', this.subq, {
            classes: [ 'ttsubquestion' ]
        });
        this.subq.classList.remove('hidden');

        this.mcquestion.myMainProb = this;

        this.mcquestion.makeProblem({
            prompt: 'What kind of statement is this?',
            choices: ['tautology', 'contingent', 'self-contradiction']
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
        // mark cells right or wrong
        if (ind.offcells && ind.offcells.length > 0) {
            const trtr = this.rightTable.tbody.getElementsByTagName("tr");
            for (const [y,x] of ind.offcells) {
                const tr = trtr[y];
                if (tr && tr.ttcells[x]) {
                    tr.ttcells[x].classList.add('badcell');
                }
            }
        }
        // mark overall question right or wrong
        if (("qright" in ind) && (!ind.qright)) {
            this.mcquestion.classList.add("badsubquestion");
        }
        // mark number of cells wrong if wrong
        if (("rowdiff" in ind) && (ind.rowdiff !== 0)) {
            this.rnchoosediv.classList.add("badnumber");
        }
    }

    static sampleProblemOpts(opts) {
        let [parentid, problem, answer, restore, options] =
            LogicPenguinProblem.sampleProblemOpts(opts);
        if ((answer === null) && ("notation" in options)) {
            const Formula = getFormulaClass(options.notation);
            const f = Formula.from(problem);
            answer = formulaTable(f, options.notation);
        }
        return [parentid, problem, answer, restore, options];
    }

}

customElements.define("formula-truth-table", FormulaTruthTable);
