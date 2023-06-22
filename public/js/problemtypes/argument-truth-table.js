
import TruthTable from './truth-tables.js';
import MultipleChoiceExercise from './multiple-choice.js';
import { addelem } from '../common.js';

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

    getAnswer() {
        let ans = super.getAnswer();
        if (this.options.question) {
            ans.mcans = this.mcquestion.getAnswer();
            ans.valid   = (ans.mcans == 0);
        }
        return ans;
    }

    getSolution() {
        if (!("myanswer" in this)) { return null; }
        let ans = { lefts: [], right: {}, rowhls: []};
        let h = this.myanswer.conc.rows.length;
        for (let i = 0 ; i < h ; i++) {
            ans.rowhls.push(false);
        }
        for (let prem of this.myanswer.prems) {
            let tdata = {}
            tdata.rows = prem.rows;
            tdata.colhls = []
            let w = prem.rows[0].length;
            for (let i = 0; i < w; i++) {
                tdata.colhls.push(false);
            }
            tdata.colhls[prem.opspot] = true;
            ans.lefts.push(tdata);
        }
        ans.right.rows = this.myanswer.conc.rows;
        ans.right.colhls = [];
        let wC = this.myanswer.conc.rows[0].length;
        for (let i = 0; i < wC; i++) {
            ans.right.colhls.push(false);
        }
        ans.right.colhls[this.myanswer.conc.opspot] = true;
        if (this.options.question) {
            ans.valid = this.myanswer.valid;
            ans.mcans = (ans.valid) ? 0 : 1;
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
        for (let table of [ ...this.leftTables, this.rightTable]) {
            let trtr = table.tbody.getElementsByTagName("tr");
            for (let tre of trtr) {
                for (let td of tre.ttcells) {
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
        let fullprob = {
            sep: ' /∴ ',
            leftsep: ' ; ',
            lefts: problem.prems,
            right: problem.conc
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
        // color marked cells
        if (ind.offcells && ind.offcells.prems && ind.offcells.prems.length > 0) {
            for (let i = 0; i < ind.offcells.prems.length; i++) {
                let theseOffcells = ind.offcells.prems[i];
                if (theseOffcells.length > 0) {
                    let trtr = this.leftTables[i].tbody.getElementsByTagName("tr");
                    for (let [y,x] of theseOffcells) {
                        let tr = trtr[y];
                        if (tr && tr.ttcells[x]) {
                            tr.ttcells[x].classList.add('badcell');
                        }
                    }
                }
            }
        }
        if (ind?.offcells?.conc && ind.offcells.conc.length > 0) {
            let trtr = this.rightTable.tbody.getElementsByTagName("tr");
            for (let [y,x] of ind.offcells.conc) {
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

customElements.define("argument-truth-table", ArgumentTruthTable);
