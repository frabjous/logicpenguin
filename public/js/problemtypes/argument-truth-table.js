// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// argument-truth-table.js ///////////////////////////////
// truth table problems for whole arguments, including asking about    //
// validity or invalidity                                              //
/////////////////////////////////////////////////////////////////////////

import TruthTable from './truth-tables.js';
import LogicPenguinProblem from '../problem-class.js';
import MultipleChoiceExercise from './multiple-choice.js';
import { addelem } from '../common.js';
import getFormulaClass from '../symbolic/formula.js';
import { argumentTables } from '../symbolic/libsemantics.js';

export default class ArgumentTruthTable extends TruthTable {

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

    // get answer for both table and multiple choice problem embedded
    getAnswer() {
        const ans = super.getAnswer();
        if (this.options.question) {
            ans.mcans = this.mcquestion.getAnswer();
            ans.valid = -1;
            if (ans.mcans != -1) {
                ans.valid = (ans.mcans == 0);
            }
        }
        return ans;
    }

    // solves the table
    getSolution() {
        if (!("myanswer" in this)) { return null; }
        const ans = { lefts: [], right: {}, rowhls: []};
        const h = this.myanswer.conc.rows.length;
        // start with everything unhighlighted
        for (let i = 0 ; i < h ; i++) {
            ans.rowhls.push(false);
        }
        for (const prem of this.myanswer.prems) {
            const tdata = {}
            tdata.rows = prem.rows;
            tdata.colhls = []
            const w = prem.rows[0].length;
            for (let i = 0; i < w; i++) {
                tdata.colhls.push(false);
            }
            tdata.colhls[prem.opspot] = true;
            ans.lefts.push(tdata);
        }
        // fill in the rows
        ans.right.rows = this.myanswer.conc.rows;
        ans.right.colhls = [];
        const wC = this.myanswer.conc.rows[0].length;
        for (let i = 0; i < wC; i++) {
            ans.right.colhls.push(false);
        }
        // highlight main operator column
        ans.right.colhls[this.myanswer.conc.opspot] = true;
        // check the right box for the multiple choice question
        if (this.options.question) {
            ans.valid = this.myanswer.valid;
            ans.mcans = (ans.valid) ? 0 : 1;
        }
        // mark as correct but unsaved
        this.restoreState({
            ans: ans,
            ind: {
                successstatus: 'correct',
                savedstatus: 'unsaved',
                points: -1,
                message: ''
            }
        });
        // nothing should be bad
        for (const table of [ ...this.leftTables, this.rightTable]) {
            const trtr = table.tbody.getElementsByTagName("tr");
            for (const tre of trtr) {
                for (const td of tre.ttcells) {
                    td.classList.remove("badcell");
                }
            }
        }
        this.rnchoosediv.classList.remove("badnumber");
        if (this.mcquestion) {
            this.mcquestion.classList.remove("badsubquestion");
        }
        return true;
    }

    makeProblem(problem, options, checksave) {
        // instance of a truth table problem with certain settings
        const fullprob = {
            sep: ' /∴ ',
            leftsep: ' ; ',
            lefts: problem.prems,
            right: problem.conc
        }
        super.makeProblem(fullprob, options, checksave);

        // can stop here if we don't need multiple choice question
        if (!options.question) { return; }

        // create multiple choice subproblem
        this.mcquestion = addelem('multiple-choice', this.subq, {
            classes: [ 'ttsubquestion' ]
        });
        this.subq.classList.remove('hidden');

        this.mcquestion.myMainProb = this;

        this.mcquestion.makeProblem({
            prompt: 'Is this argument valid or invalid?',
            choices: ['valid', 'invalid']
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
        // color cells that are wrong in premises
        if (ind.offcells && ind.offcells.prems && ind.offcells.prems.length > 0) {
            for (let i = 0; i < ind.offcells.prems.length; i++) {
                const theseOffcells = ind.offcells.prems[i];
                if (theseOffcells.length > 0) {
                    const trtr = this.leftTables[i].tbody.getElementsByTagName("tr");
                    for (const [y,x] of theseOffcells) {
                        const tr = trtr[y];
                        if (tr && tr.ttcells[x]) {
                            tr.ttcells[x].classList.add('badcell');
                        }
                    }
                }
            }
        }
        // … and in conclusion
        if (ind?.offcells?.conc && ind.offcells.conc.length > 0) {
            const trtr = this.rightTable.tbody.getElementsByTagName("tr");
            for (const [y,x] of ind.offcells.conc) {
                const tr = trtr[y];
                if (tr && tr.ttcells[x]) {
                    tr.ttcells[x].classList.add('badcell');
                }
            }
        }
        // mark subproblem the right way
        if (("qright" in ind) && (!ind.qright)) {
            this.mcquestion.classList.add("badsubquestion");
        }
        // mark wrong number of rows given
        if (("rowdiff" in ind) && (ind.rowdiff !== 0)) {
            this.rnchoosediv.classList.add("badnumber");
        }
    }

    static sampleProblemOpts(opts) {
        let [parentid, problem, answer, restore, options] =
            LogicPenguinProblem.sampleProblemOpts(opts);
        if ((answer === null) && ("notation" in options)) {
            const Formula = getFormulaClass(options.notation);
            const pwffs = problem.prems.map((p) => (Formula.from(p)));
            const cwff = Formula.from(problem.conc);
            answer = argumentTables(pwffs, cwff, options.notation);
        }
        return [parentid, problem, answer, restore, options];
    }

}

customElements.define("argument-truth-table", ArgumentTruthTable);
