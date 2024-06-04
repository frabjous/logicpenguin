// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// truth-tables.js ///////////////////////////////////////
// the common basis of all truth-table problems                        //
/////////////////////////////////////////////////////////////////////////

import LogicPenguinProblem from '../problem-class.js';
import { addelem, byid, htmlEscape } from '../common.js';
import { randomString } from '../misc.js';
import getSyntax from '../symbolic/libsyntax.js';
import  tr from '../translate.js';

export default class TruthTable extends LogicPenguinProblem {

    // make a basic problem
    constructor() {
        super();
    }

    // create a clickable cell
    addClickCell(tre) {
        const c = addelem('td', tre, {
            innerHTML: '',
            title: tr('click to toggle, or press T/F'),
            myprob: this,
            onclick: function() {
                this.innerHTML = TruthTable.nextVal[this.innerHTML];
                this.processChange();
            },
            onmouseenter: function() {
                window.currentClickCell = this;
            },
            onmouseleave: function() {
                delete window.currentClickCell;
            },
            processChange: function() {
                this.classList.remove('badcell');
                this.myprob.makeChanged();
                if (this.myprob.checkIfComplete()) {
                    this.myprob.processAnswer();
                }
            }
        });
        return c;
    }

    // add rows to all tables in problem
    addRows(n) {
        this.label.classList.add("hidden");
        this.startIns.classList.add("hidden");
        this.tableDiv.classList.remove("hidden");
        for (const table of [ ...this.leftTables, this.rightTable ]) {
            for (let i = 0; i < n; i++) {
                let tre = addelem('tr', table.tbody, {});
                tre.ttcells = [];
                for (let k = 0; k < table.cellwidth; k++) {
                    tre.ttcells.push(this.addClickCell(tre));
                }
                if (table.isright) {
                    const cbcell = addelem('td', tre, {
                        classes: [ 'ttcbcell' ]
                    });
                    tre.rowcheckbox = addelem('input', cbcell, {
                        type: 'checkbox', myrow: tre, myprob: this,
                        onchange: function() {
                            this.myprob.redoAllBorders();
                            this.myprob.checksaveButton.disabled = false;
                        }
                    });
                }
            }
        }
        this.redoAllBorders();
    }

    // checks if entire series of tables filled in
    checkIfComplete() {
        let hasrows = false;
        for (const table of [ ...this.leftTables, this.rightTable ]) {
            const trtr = table.tbody.getElementsByTagName("tr");
            for (const tre of trtr) {
                hasrows = true;
                for (const c of tre.ttcells) {
                    if (c.innerHTML == '') { return false; }
                }
            }
        }
        return hasrows;
    }

    // get info on highlights and all table cells
    // add to this for particular problem types to get answer
    getAnswer() {
        const ans = { lefts: [] };
        for (const table of this.leftTables) {
            ans.lefts.push(this.getTableData(table));
        }
        ans.right = this.getTableData(this.rightTable);
        ans.rowhls = this.getRowHLs();
        return ans;
    }

    // gets which columns in a table are highlighted
    getColHLs(table) {
        const columns = [];
        for (const cb of table.colcheckboxes) {
            columns.push(cb.checked);
        }
        return columns;
    }

    // gets which rows (for all tables) are highlighted
    getRowHLs() {
        const rows = [];
        if (this.rightTable) {
            const trtr = this.rightTable.tbody.getElementsByTagName("tr");
            for (const tre of trtr) {
                rows.push(tre?.rowcheckbox?.checked);
            }
        }
        return rows;
    }

    // gets the cell data for particular table
    getTableData(table) {
        const trtr = table.tbody.getElementsByTagName("tr");
        let tdata = {
            rows: [],
            colhls: this.getColHLs(table)
        };
        for (const tre of trtr) {
            let row = [];
            for (let c of tre.ttcells) {
                row.push(TruthTable.cellVal[c.innerHTML]);
            }
            tdata.rows.push(row);
        }
        return tdata;
    }

    makeChanged() {
        super.makeChanged();
        this.checksaveButton.disabled = false;
    }

    // makes original label that gets hidden
    makeLabel(problem) {
        const leftsep = problem?.leftsep ?? ' ';
        const sep = problem?.sep ?? ' ';
        return htmlEscape(
            problem.lefts.join(leftsep) + sep + problem.right
        );
    }

    // basic set up for truth table problem
    makeProblem(problem, options, checksave) {
        this.options = options;
        if ("notation" in this.options) {
            this.notation = this.options.notation;
        }
        this.checksave = checksave;

        // label to be shown prior to table
        this.label = addelem('div', this, {
            innerHTML: this.makeLabel(problem),
            classes: [ 'symbolic' ]
        });
        this.startIns = addelem('div', this, {
            innerHTML: 'Select the number of rows to begin.',
            classes: ['rownummessage']
        });

        // block for tables
        this.tableDiv = addelem('div', this, {
            classes: [ 'truthtableblock', 'hidden' ]
        });

        // "left tables": for premises, left equiv, or empty
        this.leftTables = [];
        for (let i=0; i<problem.lefts.length; i++) {
            const statement = problem.lefts[i];
            this.leftTables.push(this.tableFor(statement, false));
            // separator for all but last left table
            if (i != (problem.lefts.length - 1)) {
                addelem('span', this.tableDiv, {
                    innerHTML: (problem?.leftsep ?? ''),
                    classes: [ 'ttseparator' ]
                });
            }
        }

        // separator between left and right
        if ((problem.lefts.length > 0) && (problem.sep &&
            problem.sep != '')) {
            addelem('span', this.tableDiv, {
                innerHTML: problem.sep,
                classes: [ 'ttseparator' ]
            });
        }

        // right table: conclusion or right equiv or main statement
        this.rightTable = this.tableFor(problem.right, true);

        // chooser for number of rows
        this.rnchoosediv = addelem('div', this, {
            classes: [ 'rownumchooser' ]
        });
        let randomid;
        do { randomid = randomString(4); } while
            (document.getElementById(randomid));
        let rnchooselabel = addelem('label', this.rnchoosediv, {
            htmlFor: randomid,
            innerHTML: tr('Number of rows: ')
        });
        this.numRowInput = addelem('input', this.rnchoosediv, {
            id: randomid,
            type: 'number',
            min: 1,
            max: 1024,
            placeholder: '#rows',
            myprob: this,
            onchange: function() {
                const newvalue = this.value;
                const currNumRows =
                    this?.myprob?.rightTable?.tbody
                        ?.getElementsByTagName("tr")?.length ?? 0;
                if (newvalue < 0 || newvalue > 1024) {
                    this.value = currNumRows;
                    return;
                }
                const difference = (newvalue - currNumRows);
                if (difference == 0) { return; }
                if (difference < 0) {
                    const toremove = (currNumRows - newvalue).toString();
                    let s = 's';
                    if (toremove == 1) { s = ''; }
                    if (!confirm('Really remove ' + toremove + ' row' +
                        s + '? This cannot be undone.')) {
                        this.value = currNumRows;
                        return;
                    }
                    this.myprob.removeRows(0 - difference);
                }
                if (difference > 0) {
                    this.myprob.addRows(difference);
                }
                this.myprob.rnchoosediv.classList.remove('badnumber');
                this.myprob.makeChanged();
                if (this.myprob.checkIfComplete()) {
                    this.myprob.processAnswer();
                }
            }
        });
        addelem('a', this.rnchoosediv, { innerHTML: tr('go'),
            classes: ['fakebutton'] });

        // a hidden place for subequestions
        this.subq = addelem('div', this, { classes: [ 'hidden' ] });

        // buttons
        this.buttonDiv = addelem('div', this, {
            classes: [ 'buttondiv' ]
        });

        this.checksaveButton = addelem('button', this.buttonDiv, {
            type: 'button',
            myprob: this,
            innerHTML: tr(checksave),
            disabled: true,
            onclick: function() { this.myprob.processAnswer(); }
        });

        this.startOverButton = addelem('button', this.buttonDiv, {
            type: 'button',
            myprob: this,
            innerHTML: tr('start over'),
            onclick: function() { this.myprob.startOver(); }
        });
    }

    // redoes cell borders for all tables after first gathering info
    redoAllBorders() {
        const rows = this.getRowHLs();
        for (const table of [...this.leftTables, this.rightTable]) {
            const columns = this.getColHLs(table);
            this.redoTableBorders(table, rows, columns);
        }
    }

    // redoes cell borders for just one table, after first gathering info
    redoBorders(table) {
        const rows = this.getRowHLs();
        const columns = this.getColHLs(table);
        this.redoTableBorders(table, rows, columns);
    }

    // redoes cell borders; requires data on checkboxes already collected
    // this is stupid complicated, but I cannot find anything else
    // that works very well
    redoTableBorders(table, rows, columns) {
        const trtr = table.tbody.getElementsByTagName("tr");
        const reg = 'var(--lpgray5)';
        const rhl = 'var(--lpcyan)';
        const chl = (table.isright) ? 'var(--lpyellow)' : 'var(--lpgreen)';
        // cycle through rows
        for (let i=0; i<trtr.length; i++) {
            const tre = trtr[i];
            // cycle through columns
            for (let j=0; j<tre.ttcells.length; j++) {
                let td = tre.ttcells[j];
                const styles=['dotted', 'dotted', 'dotted', 'dotted'];
                const colors=[reg, reg, reg, reg];
                // 0=top, 1=right, 2=bottom, 3=left
                // add column hls
                if (columns[j]) {
                    colors[1] = chl; styles[1] = 'solid';
                    colors[3] = chl; styles[3] = 'solid';
                    if (i==0) {
                        colors[0] = chl; styles[0] = 'solid';
                    }
                    if (i==(trtr.length - 1)) {
                        colors[2] = chl; styles[2] = 'solid';
                    }
                }
                // previous column is hl
                if (j>0 && columns[j-1]) {
                    colors[3] = chl; styles[3] = 'solid';
                }
                // next column is hl
                if (columns[j+1]) {
                    colors[1] = chl; styles[1] = 'solid';
                }
                // and row hls
                if (rows[i]) {
                    colors[0] = rhl; styles[0] = 'solid';
                    colors[2] = rhl; styles[2] = 'solid';
                    if (j==0) {
                        colors[3] = rhl; styles[3] = 'solid';
                    }
                    if (j==(tre.ttcells.length-1)) {
                        colors[1] = rhl; styles[1] = 'solid';
                    }
                }
                // prev row is hl
                if (i>0 && rows[i-1]) {
                    colors[0] = rhl; styles[0] = 'solid';
                }
                // new row is hl
                if (rows[i+1]) {
                    colors[2] = rhl; styles[2] = 'solid';
                }
                td.style.borderColor = colors.join(' ');
                td.style.borderStyle = styles.join(' ');
            }
        }
    }

    // removes rows from all tables in problem
    removeRows(n) {
        for (const table of this.leftTables) {
            this.removeTableRows(table, n);
        }
        const numleft = this.removeTableRows(this.rightTable, n);
        // hide tables if rows back down to 0
        // which shouldn't really be possible, but whatever
        if (numleft == 0) {
            this.label.classList.remove("hidden");
            this.startIns.classList.remove("hidden");
            this.tableDiv.classList.add("hidden");
        }
        this.redoAllBorders();
        this.scrollIntoView({ block: 'nearest' });
    }

    removeTableRows(table, n) {
        const trtr = table.tbody.getElementsByTagName('tr');
        for (let i = 0; i < n; i++) {
            const tre = trtr[ trtr.length - 1];
            tre.parentNode.removeChild(tre);
        }
        return trtr.length;
    }

    restoreAnswer(ans) {
        // lefts, right, rowhls,  each tdata has rows, colhls
        for (let i = 0; i < ans.lefts.length; i++) {
            const table = this.leftTables[i];
            const tdata = ans.lefts[i];
            this.restoreTable(table, tdata);
        }
        this.restoreTable(this.rightTable, ans.right);
        const trtr = this.rightTable.tbody.getElementsByTagName("tr");
        for (let i = 0; i < ans.rowhls.length; i++) {
            const tr = trtr[i];
            tr.rowcheckbox.checked = ans.rowhls[i];
        }
        this.redoAllBorders();
    }

    restoreTable(table, tdata) {
        // restore cells
        const trtr = table.tbody.getElementsByTagName('tr');
        const currrows = trtr.length;
        if (currrows > tdata.rows.length) {
            this.removeRows(currrows - tdata.rows.length);
            this.numRowInput.value = tdata.rows.length;
        }
        if (tdata.rows.length > currrows) {
            this.addRows(tdata.rows.length - currrows);
            this.numRowInput.value = tdata.rows.length;
        }
        for (let r = 0; r < tdata.rows.length; r++) {
            const tr = trtr[r];
            for (let c = 0; c < tr.ttcells.length ; c++) {
                tr.ttcells[c].innerHTML =
                    TruthTable.cellHFor(tdata.rows[r][c]);
            }
        }
        // restore column checkboxes
        // TODO: get rid of this
        if (tdata.colhls.length != table.colcheckboxes.length) {
            console.log('tcc',table.colcheckboxes);
            console.log('tdch',tdata.colhls);
            this.style.backgroundColor = 'yellow';
            console.log('not',this.options.notation);
        }
        for (let c = 0; c < tdata.colhls.length; c++) {
            table.colcheckboxes[c].checked = tdata.colhls[c];
        }
    }

    setIndicator(ind) {
        super.setIndicator(ind);
        if (((this.classList.contains('saved')) ||
            (this.classList.contains('saving')) ||
            (this.classList.contains('unsavable'))) &&
            ((this.classList.contains('correct')) ||
            (this.classList.contains('incorrect')) ||
            (this.classList.contains('unknown')) ||
            (this.classList.contains('checking')) ||
            (this.classList.contains('partial')) ||
            (this.classList.contains('indetermiate')))) {
            this.checksaveButton.disabled = true;
        } else {
            this.checksaveButton.disabled = false;
        }
    }

    tableFor(statement, isright) {

        // get notation from options
        const notation = this?.options?.notation ?? 'cambridge';
        const syntax = getSyntax(notation);
        const operators = syntax.operators;

        // break statement into cells with manufactured regex
        let rstr = '[(\\[{]*';
        rstr += '[' + syntax.notation.predicatesRange;
        // this probably wouldn't be adequate for (x) quantifiers,
        // or for identity, but but you can't do a truth table in
        // predicate logic anyway
        for (const o in operators) { rstr += o; }
        rstr += '][' + syntax.notation.constantsRange +
            syntax.notation.variableRange + ']*';
        rstr += '[)\\]}]*';
        const regex = new RegExp(rstr, 'g');
        const parts = Array.from(
            statement.replace(/\s/g,'').matchAll(regex));
        const table = addelem('table', this.tableDiv, {
            classes: ['truthtable']
        });

        // initial setup
        table.isright = isright;
        table.cellwidth = parts.length;
        table.thead = addelem('thead', table, {});
        table.tbody = addelem('tbody', table, {});
        table.tfoot = addelem('tfoot', table, {});
        const headrow = addelem('tr', table.thead, {});
        const footrow = addelem('tr', table.tfoot, {});
        table.colcheckboxes = [];

        // table head and foot
        for (let i = 0; i < table.cellwidth; i++) {
            const part = parts[i][0];
            addelem('th', headrow, {
                innerHTML: htmlEscape(part),
                classes: ['symbolic']
            });
            const fcell = addelem('td', footrow, {});
            // check box at bottom of column
            table.colcheckboxes.push(addelem('input', fcell, {
                type: 'checkbox', myindex: i,
                mytable: table, myprob: this,
                onchange: function() {
                    this.myprob.redoBorders(this.mytable);
                    this.myprob.checksaveButton.disabled = false;
                }
            }));
        }

        // extra cell for checkbox column
        if (isright) {
            addelem('th', headrow, {});
            addelem('td', footrow, {});
        }
        return table;
    }

    static cellHFor(v) {
        if (v == -1) { return ''; };
        if (v) { return tr('T'); };
        return tr('F');
    }

    static cellVal = {
        [tr('T')]: true,
        [tr('F')]: false,
        ['']: -1
    };

    static nextVal = {
        ['']: tr('T'),
        [tr('T')]: tr('F'),
        [tr('F')]: ''
    };
}

if (window) {
    window.addEventListener('keydown', function(e) {
        if (!window.currentClickCell) { return; }
        const k = e.key.toUpperCase();
        const oldIH = window.currentClickCell.innerHTML;
        if (k == tr('T')) {
            window.currentClickCell.innerHTML = tr('T');
        }
        if (k == tr('F')) {
            window.currentClickCell.innerHTML = tr('F');
        }
        if (k == tr('F')) {
            window.currentClickCell.innerHTML = tr('F');
        }
        if ((k == 'DELETE') || (k == 'BACKSPACE')) {
            window.currentClickCell.innerHTML = '';
        }
        if (k == ' ') {
            window.currentClickCell.innerHTML =
                TruthTable.nextVal[oldIH];
        }
        if (oldIH != window.currentClickCell.innerHTML) {
            e.preventDefault();
            window.currentClickCell.processChange();
        }
        return;
    });
}
