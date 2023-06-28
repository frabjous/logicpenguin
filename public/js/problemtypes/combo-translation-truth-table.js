// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import LogicPenguinProblem from '../problem-class.js';
import ArgumentTruthTable from './argument-truth-table.js';
import TranslationExercise from './symbolic-translation.js';
import { addelem, htmlEscape } from '../common.js';
import { getProseArgument } from '../ui/prose-argument.js';
import tr from '../translate.js';

export default class ComboTransTruthTable extends LogicPenguinProblem {

    constructor() {
        super();
    }

    addstepdirections(instr) {
        if (!this.stepDiv) { return; }
        // add element with step instructions
        let e = addelem('div', this.stepDiv, {
            classes: [ 'combostepinstructions' ],
            innerHTML: '<strong>' + tr('Step') + ' ' +
                (this.onstep.toString()) + ':</strong> ' +
                htmlEscape(tr(instr))
        });
        // increment counter for next step
        this.onstep = this.onstep + 1;
        return e;
    }

    chooseAsConclusion(n) {
        // leave choose mode
        this.argumentDiv.classList.remove('choosemode');
        this.chosenConclusion = n;
        // mark statement as chosen
        this.argumentDiv.statementSpans[n].classList.add("chosen");
        // remove click listeners
        for (let stsp of this.argumentDiv.statementSpans) {
            stsp.onclick = function() {};
        }
        // new instructions
        let inse = this.addstepdirections('Translate the conclusion.');
        // add translation problem
        this.concProb = addelem('combo-translation', this.stepDiv, {});
        this.concProb.myprob = this;
        this.concProb.makeProblem(
            this.niceStatement(this.myproblem[n].statement),
            {}, 'proceed'
        );
        // set initial variables
        this.concProb.isConclusion = true;
        this.concProb.wentPast = false;
        this.concProb.myindex = n;
        this.makeChanged();
        // make visible
        inse.scrollIntoView();
    }

    chooseAsPremise(n) {
        // leave choose mode
        this.argumentDiv.classList.remove('choosemode');
        this.chosenOrder.push(n);
        // mark statement as chosen
        this.argumentDiv.statementSpans[n].classList.add("chosen");
        // remove click listeners
        for (let stsp of this.argumentDiv.statementSpans) {
            stsp.onclick = function() {};
        }
        // new instruction
        let inse = this.addstepdirections('Translate the premise.');
        // new translation problem
        this.premProbs.push(addelem('combo-translation', this.stepDiv, {}));
        let thisPP = this.premProbs[ this.premProbs.length - 1 ];
        thisPP.makeProblem(
            this.niceStatement(this.myproblem[n].statement),
            {}, 'proceed'
        );
        // set initial variables
        thisPP.isConclusion = false;
        thisPP.wentPast = false;
        thisPP.myindex = n;
        thisPP.myprob = this;
        this.makeChanged();
        // make visible
        inse.scrollIntoView();
    }

    chooseNextPremise() {
        // auto-choose last premise
        if (!this.isRestoring &&
            this.premProbs.length + 2 >= this.myproblem.length) {
            for (let i=0; i<this.myproblem.length; i++) {
                if (!this.argumentDiv.statementSpans[i]
                    .classList.contains('chosen')) {
                    this.chooseAsPremise(i);
                }
            }
            return;
        }
        // else go into choose mode
        this.argumentDiv.classList.add('choosemode');
        // instructions
        let firstnext = 'next';
        if (this.premProbs.length == 0) { firstnext = 'first'; };
        this.addstepdirections('Click on the premise you wish to translate ' +
            firstnext + '.');
        // add click listeners
        for (let stsp of this.argumentDiv.statementSpans) {
            if (!stsp.classList.contains('chosen')) {
                stsp.onclick = function() {
                    this.myprob.chooseAsPremise(this.myindex);
                }
            }
        }
        // scroll argument into view
        this.scrollIntoView();
    }

    getAnswer() {
        let ans = {};
        // read selection order
        if ("chosenConclusion" in this) {
            ans.chosenConclusion = this.chosenConclusion;
        }
        if (this.chosenOrder) {
            ans.chosenOrder = this.chosenOrder;
        }
        // read translations
        if (this.translations) {
            ans.translations = this.translations;
        }
        // read truth table
        if (this.hasTable && this.ttProb) {
            ans.tableAns = this.ttProb.getAnswer();
        }
        return ans;
    }

    getSolution() {
        if (!("myanswer" in this)) { return null; }
        this.startOver();
        let ans = {};
        ans.chosenConclusion = this.myanswer.index;
        ans.chosenOrder = [];
        for (var x=0; x<this.myanswer.translations.length; x++) {
            if (x != this.myanswer.index) {
                ans.chosenOrder.push(x);
            }
        }
        ans.translations = this.myanswer.translations;
        ans.tableAns = { lefts: [], right: {} };
        // don't highlight rows
        ans.tableAns.rowhls =
            this.myanswer.tables[0].rows.map((r) => (false));
        // create table data for each table in answer
        for (let j=0; j<this.myanswer.tables.length; j++) {
            let table = this.myanswer.tables[j];
            let newtab = {};
            newtab.rows = table.rows;
            // only highlight opspot column
            newtab.colhls = [];
            for (var i=0; i<newtab.rows[0].length; i++) {
                newtab.colhls.push((i==table.opspot));
            }
            if (j==this.myanswer.index) {
                ans.tableAns.right = newtab;
            } else {
                ans.tableAns.lefts.push(newtab);
            }
        }
        ans.tableAns.mcans = ((this.myanswer.valid) ? 0 : 1);
        ans.tableAns.valid = this.myanswer.valid;
        ans.valid = this.myanswer.valid;
        this.restoreState({
            ans: ans,
            ind: {
                successstatus: 'correct',
                savedstatus: 'unsaved',
                points: -1,
                message: ''
            }
        });
    }

    makeChanged() {
        if (this.isRestoring) { return; }
        super.makeChanged();
        this.setComment('');
    }

    makeProblem(problem, options, checksave) {
        this.myproblem = problem;
        this.options = options;
        this.checksave = checksave;

        // some initial options
        this.chosenOrder = [];
        this.premProbs = [];
        this.translations = problem.map((p) => (''));
        this.hasTable = false;
        this.everHadTable = false;

        this.argumentDiv = getProseArgument(this, problem);

        this.stepDiv = addelem('div', this, {
            classes: ['combosteps']
        });

        // set for choosing conclusion
        this.onstep = 1;
        this.addstepdirections('Click on the conclusion ' +
            'in the argument above.');
        this.argumentDiv.classList.add("choosemode");

        this.ttDiv = addelem('div', this, {
            classes: ['combottdiv']
        });
        for (let i=0; i<this.argumentDiv.statementSpans.length; i++) {
            let ss = this.argumentDiv.statementSpans[i];
            ss.myindex = i;
            ss.myprob = this;
            ss.onclick = function() {
                this.myprob.chooseAsConclusion(this.myindex);
            }
        }

        // comment area
        this.commentDiv = addelem('div', this, {
            classes: ['combocomment', 'hidden']
        });

        // buttons
        this.buttonDiv = addelem('div', this, {
            classes: ['buttondiv']
        });

        this.checksaveButton = addelem('button', this.buttonDiv, {
            type: 'button',
            myprob: this,
            innerHTML: tr(checksave),
            onclick: function(e) { this.myprob.processAnswer(); }
        });

        this.startOverButton = addelem('button', this.buttonDiv, {
            type: 'button',
            myprob: this,
            innerHTML: tr('start over'),
            onclick: function() {
                this.myprob.startOver();
            }
        });

    }

    niceStatement(s) {
        s = s.trim().replace(/[.,;:]*$/,'') + '.';
        s = s.at(0).toUpperCase() + s.substr(1);
        return s;
    }

    restoreAnswer(ans) {
        this.isRestoring = true;
        if ("chosenConclusion" in ans) {
            this.chooseAsConclusion(ans.chosenConclusion);
            if (ans.translations) {
                this.concProb.ansinput.value =
                    ans.translations[ans.chosenConclusion];
                this.concProb.processAnswer();
            }
        }
        if (ans.chosenOrder) {
            for (let n of ans.chosenOrder) {
                this.chooseAsPremise(n);
                if (ans.translations) {
                    let thisPP = this.premProbs[this.premProbs.length-1];
                    thisPP.ansinput.value = ans.translations[n];
                    thisPP.processAnswer();
                }
            }
        }
        if (this.hasTable && this.ttProb && ans.tableAns) {
            this.ttProb.restoreAnswer(ans.tableAns);
        }
        this.isRestoring = false;
    }

    setComment(comm) {
        if (!comm || comm == '') {
            this.commentDiv.innerHTML = '';
            this.commentDiv.classList.add('hidden');
            return;
        }
        this.commentDiv.classList.remove('hidden');
        this.commentDiv.innerHTML = comm;
    }

    setIndicator(ind) {
        super.setIndicator(ind);
        if ("messages" in ind && ind.messages.length > 0) {
            let iH = ind.messages.map(
                (m) => (htmlEscape(m))).join('<br>');
            this.setComment(iH);
        } else {
            this.setComment('');
        }

        // color marked cells
        if (this.ttProb && ind.offcells && ind.offcells.prems && ind.offcells.prems.length > 0) {
            for (let i = 0; i < ind.offcells.prems.length; i++) {
                let theseOffcells = ind.offcells.prems[i];
                if (theseOffcells.length > 0) {
                    let trtr = this.ttProb.leftTables[i].tbody.getElementsByTagName("tr");
                    for (let [y,x] of theseOffcells) {
                        let tr = trtr[y];
                        if (tr && tr.ttcells[x]) {
                            tr.ttcells[x].classList.add('badcell');
                        }
                    }
                }
            }
        }
        if (this.ttProb && ind?.offcells?.conc && ind.offcells.conc.length > 0) {
            let trtr = this.ttProb.rightTable.tbody.getElementsByTagName("tr");
            for (let [y,x] of ind.offcells.conc) {
                let tr = trtr[y];
                if (tr && tr.ttcells[x]) {
                    tr.ttcells[x].classList.add('badcell');
                }
            }
        }
        if (this.ttProb && ("qright" in ind) && (!ind.qright)) {
            this.ttProb.mcquestion.classList.add("badsubquestion");
        } else {
            if (this.ttProb) {
                this.ttProb.mcquestion.classList.remove("badsubquestion");
            }
        }
        if (this.ttProb && ("rowdiff" in ind) && (ind.rowdiff !== 0)) {
            this.ttProb.rnchoosediv.classList.add("badnumber");
        } else {
            if (this.ttProb) {
                this.ttProb.rnchoosediv.classList.remove("badnumber");
            }
        }
    }

    updateTTStatements() {
        this.makeChanged();
        this.ttDiv.innerHTML = '';
        this.hasTable = false;
        let allIn = true;
        for (let t of this.translations) {
            if (t == '') { allIn = false; break; }
        }
        if (!allIn) { return; }
        if (!this.everHadTable) {
            this.addstepdirections('Complete a truth table for ' +
                'the argument and answer whether it is valid or ' +
                'invalid.');
        }

        this.ttProb = addelem('combo-truth-table', this.ttDiv, {});
        this.ttProb.myprob = this;
        let probinfo = {
            prems: [],
            conc: this.translations[this.chosenConclusion]
        }
        for (let i of this.chosenOrder) {
            probinfo.prems.push(this.translations[i]);
        }
        this.ttProb.makeProblem(probinfo,
            {question: true}, this.checksave);
        this.ttProb.buttonDiv.style.display = "none";
        this.hasTable = true;
        this.everHadTable = true;
    }

}

export class ComboTranslation extends TranslationExercise {

    constructor() {
        super();
    }

    makeChanged() {
        this.myprob.makeChanged();
    }

    processAnswer() {
        let newAns = this.getAnswer();
        let oldTrans = this.myprob.translations[this.myindex];
        // do nothing if no change
        if (newAns == oldTrans) { return; }
        this.makeChanged();
        this.myprob.translations[this.myindex] = newAns;
        this.myprob.updateTTStatements();
        if (!this.wentPast &&
            ((this.myprob.premProbs.length + 1) <
                this.myprob.myproblem.length)) {
            this.myprob.chooseNextPremise();
        }
        this.buttonDiv.style.display = 'none';
        this.wentPast = true;
    }

}

export class ComboTruthTable extends ArgumentTruthTable {

    constructor() {
        super();
    }

    makeChanged() {
        this.myprob.makeChanged();
    }

    processAnswer() {
        this.myprob.processAnswer();
    }

}

customElements.define("combo-translation-truth-table", ComboTransTruthTable);
customElements.define("combo-translation", ComboTranslation);
customElements.define("combo-truth-table", ComboTruthTable);
