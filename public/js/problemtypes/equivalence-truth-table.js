// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import TruthTable from './truth-tables.js';
import MultipleChoiceExercise from './multiple-choice.js';
import { addelem } from '../common.js';

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
        let ans = super.getAnswer();
        if (this.options.question) {
            ans.mcans = this.mcquestion.getAnswer();
            ans.equiv   = (ans.mcans == 0);
        }
        return ans;
    }

    getSolution() {
        if (!("myanswer" in this)) { return null; }
        let ans = { lefts: [{}], right: {}, rowhls: []};
        ans.lefts[0].rows = this.myanswer.A.rows;
        ans.lefts[0].colhls = [];
        let h = this.myanswer.A.rows.length;
        let wA = this.myanswer.A.rows[0].length;
        for (let i = 0 ; i < h ; i++) {
            ans.rowhls.push(false);
        }
        for (let i=0; i<wA; i++) {
            ans.lefts[0].colhls.push(false);
        }
        ans.lefts[0].colhls[this.myanswer.A.opspot] = true;
        ans.right.rows = this.myanswer.B.rows;
        ans.right.colhls = [];
        let wB = this.myanswer.B.rows[0].length;
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
        this.rnchoosediv.classList.remove("badnumber");
        if (this.mcquestion) {
            this.mcquestion.classList.remove("badsubquestion");
        }
        return true;
    }

    makeProblem(problem, options, checksave) {
        let fullprob = {
            sep: ' and ',
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
        if (ind?.offcells?.A && ind.offcells.A.length > 0) {
            let trtr = this.leftTables[0].tbody.getElementsByTagName("tr");
            for (let [y,x] of ind.offcells.A) {
                let tr = trtr[y];
                if (tr && tr.ttcells[x]) {
                    tr.ttcells[x].classList.add('badcell');
                }
            }
        }
        if (ind?.offcells?.B && ind.offcells.B.length > 0) {
            let trtr = this.rightTable.tbody.getElementsByTagName("tr");
            for (let [y,x] of ind.offcells.B) {
                let tr = trtr[y];
                if (tr && tr.ttcells[x]) {
                    tr.ttcells[x].classList.add('badcell');
                }
            }
        }
        if (("qright" in ind) && (!ind.qright)) {
            this.mcquestion.classList.add("badsubquestion");
        }
        if (("rowdiff" in ind) && (ind.rowdiff !== 0)) {
            this.rnchoosediv.classList.add("badnumber");
        }
    }

}

customElements.define("equivalence-truth-table", EquivalenceTruthTable);
