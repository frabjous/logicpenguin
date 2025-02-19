// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// derivation-base.js ////////////////////////////////
// defines the base class shared by all derivation problem types     //
// regardless of precise system or ruleset                           //
///////////////////////////////////////////////////////////////////////

import LogicPenguinProblem from '../problem-class.js';
import { addelem, htmlEscape } from '../common.js';
import getSyntax from '../symbolic/libsyntax.js';
import FormulaInput from '../ui/formula-input.js';
import JustificationInput from '../ui/justification-input.js';
import tr from '../translate.js';

export default class DerivationExercise extends LogicPenguinProblem {

    // make a basic problem
    constructor() {
        super();
    }

    // return auto-check as off unless already specified
    get autocheck() {
        if (!("_autocheck" in this)) {
            this._autocheck = false;
        }
        return this._autocheck;
    }

    // turn auto-check on or off
    set autocheck(b) { // b here is a boolean
        const lines = this.mainDeriv.getElementsByClassName("derivationline");
        // hide or unhide check button for each line
        for (const line of lines) {
            if (!line.checkButton) { continue; };
            if (b) {
                line.checkButton.classList.remove("hideunchecked");
            } else {
                line.checkButton.classList.add("hideunchecked")
            }
        }
        // set the toggle button on or off
        if (this.clToggle) {
            if (b) {
                this.clToggle.innerHTML = this.icons['autocheckon'];
                this.clToggle.classList.remove('autocheckoff');
                this.clToggle.classList.add('autocheckon');
                this.clToggle.title = 'turn off autocheck';
            } else {
                this.clToggle.innerHTML = this.icons['autocheckoff'];
                this.clToggle.classList.remove('autocheckon');
                this.clToggle.classList.add('autocheckoff');
                this.clToggle.title = 'turn on autocheck';
            }
        }
        // explicitly set autocheck on
        this._autocheck = b;
        // run it now
        if (b && this.checkLines && !this.isRestoring) {
            this.checkLines();
        }
    }

    // the answer is the subderivation info of the main derivation
    // i.e., the one with the premises
    getAnswer() {
        if (!this.premDeriv) { return []; }
        const pDinfo = this.premDeriv.getSubderivationInfo();
        pDinfo.autocheck = this.autocheck;
        return pDinfo;
    }

    // fill in answer, which is the same format as regular answers
    getSolution() {
        if (!this.myanswer) { return; }
        this.startOver();
        this.restoreState({
            ans: this.myanswer,
            ind: {
                successstatus: 'correct',
                savedstatus: 'unsaved',
                points: -1,
                message: ''
            }
        });
        this.scrollIntoView({ block: 'nearest' });
    }

    hideRulePanel() {
        if (window?.rulepanel?.parentNode) {
            window.rulepanel.parentNode.removeChild(window.rulepanel);
        }
        if (window?.rulepanel) { window.rulepanel.target = false; }
    }

    // making it changed also removes all line check markers
    makeChanged(renumberchange = true, allowtimer = true) {
        super.makeChanged();
        // renumber the lines
        this.renumberLines(renumberchange);
        // remove markers on lines
        this.markAllUnchecked();
        if (allowtimer && renumberchange && this?.autocheck && this?.checkLines && !this?.ishinting) {
            this.startAutoCheckTimer();
        }
    }

    // base of creating the problem
    makeProblem(problem, options, checksave) {
        this.options = options;
        this.checksave = checksave;

        // default to no show lines
        if (!("useShowLines" in this)) {
            this.useShowLines = false;
        }

        // assign notation, symbols, syntax from options
        this.notationname = options?.notation ?? 'cambridge';
        this.syntax = getSyntax(this.notationname);
        this.symbols = this.syntax.symbols;
        this.notation = this.syntax.notation;

        // introduce autocheck timer; defaults to 400 ms
        this.autocheckTimeout = false;
        if ("autocheckdelay" in this.options) {
            this.autocheckdelay = this.options.autocheckdelay;
        } else {
            this.autocheckdekay = 300;
        }

        // mark as setting up
        this.settingUp  = true;

        // top contains problem if not revealed with show lines
        if (!this.useShowLines) {
            const problemsummary = addelem('div', this, {
                classes: ['derivationproblemsummary', 'symbolic'],
                innerHTML: htmlEscape(problem.prems.join(', ') + ' ∴ ' +
                    problem.conc)
            });
        }

        // outer wrap container, full width
        const container = addelem('div', this, {
            classes: ['derivationcontainer']
        });

        // formula area only contains the formulas, not the side boxes
        const formulaarea = addelem('div', container, {
            classes: ['derivationcore']
        });

        // premise root is active and has target for derivations without
        // show lines; otherwise, there is no target of premise root
        let mainTarget = false;
        if (!this.useShowLines) {
            mainTarget = problem.conc;
        }

        // premises in the "premise root"
        this.premDeriv = addelem('sub-derivation', formulaarea, {});
        this.premDeriv.useShowLines = this.useShowLines;
        this.premDeriv.myprob = this;
        this.premDeriv.initialSetup({
            parentderiv: false,
            target: mainTarget
        });
        this.premDeriv.classList.add("premiseroot");
        let prems = problem?.prems ?? [];
        let lastprem = false;
        for (const prem of prems) {
            const line = this.premDeriv.addLine(prem, false);
            lastprem = line;
            line.classList.add("premiseline");
            line.jinput.value = this.premiseAbbr ?? tr('premise');
            line.jinput.readOnly = true;
            line.input.readOnly = true;
            // hide inputs completely for those w/o showlines
            line.jinput.myrwrap.classList.add('premisejwrap');
        }
        if (lastprem) {
            lastprem.classList.add("lastpremise");
        }

        this.mainDeriv = this.premDeriv;
        if (this.useShowLines) {
            // main derivation targets the conclusion
            this.mainDeriv =
                this.premDeriv.addSubderivation(problem.conc, false);
            this.mainDeriv.classList.add("mainderivation");

            this.lastfocusedJ = (this?.mainDeriv
                ?.getElementsByClassName("justification")?.[0]);
        } else {
            // add a line to get started
            const firstline = this.mainDeriv.addLine('', false);
            this.lastfocusedJ = firstline.jinput;
        }

        this.renumberLines();

        // no longer setting up
        this.settingUp = false;

        // comment area
        this.commentDiv = addelem('div', this, {
            classes: ['derivationcomment', 'hidden']
        });

        // buttons
        this.buttonDiv = addelem('div', this, {
            classes: ['buttondiv']
        });

        this.checksaveButton = addelem('button', this.buttonDiv, {
            type: 'button',
            myprob: this,
            innerHTML: tr(checksave),
            onmousedown: function(e) {
                e.preventDefault();
            },
            onclick: function(e) {
                e.preventDefault();
                this.myprob.processAnswer();
            }
        });

        this.startOverButton = addelem('button', this.buttonDiv, {
            type: 'button',
            myprob: this,
            innerHTML: tr('start over'),
            onmousedown: function(e) {
                e.preventDefault();
            },
            onclick: function(e) {
                e.preventDefault();
                const autoch = this.myprob.autocheck;
                this.myprob.hideRulePanel();
                this.myprob.startOver();
                FormulaInput.hideWidgets();
                // start with focus on main showline? TODO: fitch different?
                const sh = this?.myprob?.
                    getElementsByClassName("derivationshowline")?.[0];
                if (sh) {
                    sh.jinput.focus();
                }
                this.myprob.autocheck = autoch;
            }
        });
    }

    markAllUnchecked() {
        for (const line of this.getElementsByClassName("derivationline")) {
            // skip lines without markers
            if (!line?.checkButton || !line?.checkButton?.update) {
                continue;
            }
            line.checkButton.update("unchecked");
        }
    }

    markLinesAsChecking() {
        const lines = this.getElementsByClassName("derivationline");
        for (const line of lines) {
            // skip lines without markers
            if (!line?.checkButton || !line?.checkButton?.update) {
                continue;
            }
            // skip empty lines
            if ((line.input.value == '') && (line.jinput.value == '')) {
                continue;
            }
            line.checkButton.update('checking');
        }
    }

    // note: makeRulePanel: specific to specific type of derivation problem

    renumberLines(allowchange = true) {
        const lines = this.getElementsByClassName("derivationline");
        // we want to start with 1, so we start the array with a
        // dummy entry
        this.linesByNum = ['offbyone'];
        // we map the old numbers to the lines to update
        // the citations
        const oldnumbers = {};
        // loop through lines
        for (const line of lines) {
            // shouldn't be here without a numbox, but just in case
            // we don't want a crash
            if (!line.numbox) { continue; }
            // record old line number if it has one
            const oldnum = line.numbox.innerHTML;
            if (oldnum != '') { oldnumbers[oldnum] = line; }
            // ensure the line isn't blank
            const jval = line?.jinput?.value ?? false;
            const ival = line?.input?.value ?? false;
            // hide it if blank, unhide it otherwise
            if (!ival && !jval) {
                line.numbox.innerHTML = '';
                line.numbox.classList.add("invisible");
                continue;
            }
            line.numbox.classList.remove("invisible");
            // give it its new value
            line.numbox.innerHTML =
                this.linesByNum.length.toString();
            // push it to array of lines
            this.linesByNum.push(line);
        }
        // time to fix old citations
        for (const line of this.linesByNum) {
            // again shouldn't be here without a justification input
            // but just in case, we don't want a crash
            if (!line?.jinput) { continue; }
            // don't mess up justification currently being worked on
            if (line.jinput == this.lastfocusedJ && !allowchange) {
                continue;
            }
            const jval = line.jinput.value ?? '';
            // if it's blank we don't need to do anything
            if (jval == '') { continue; }
            // justFix should have been run on justification, so
            // it should only have space in between numbers and rules
            const jvalsplit = jval.split(' ');
            let cites = '';
            let rules = '';
            if (jvalsplit.length > 1) {
                if (this?.rulesFirst) {
                    rules = jvalsplit?.[0];
                    cites = jvalsplit?.[1];
                } else {
                    cites = jvalsplit?.[0];
                    rules = jvalsplit?.[1];
                }
            } else {
                // if no spaces, then we have numbers if there are numbers
                if (/[0-9]/.test(jvalsplit?.[0])) {
                    cites = jvalsplit?.[0];
                } else {
                    // otherwise we have rules
                    rules = jvalsplit?.[0];
                }
            }
            // if cites does not exist, or has no numbers,
            // no updating is needed
            if (!cites || !(/[0-9]/.test(cites))) { continue; }
            // change each citation; note split/join uses thin space
            const newcites = cites.split(', ').map((cite) => {
                let [start, end] = cite.split('–');
                start = oldnumbers?.[start]?.numbox?.innerHTML ?? '?';
                if (end) {
                    end = oldnumbers?.[end]?.numbox?.innerHTML ?? '?';
                }
                return start + ((end) ? ('–' + end) : '');
            }).join(', ');
            // add back in the rules if needed
            if (this?.rulesFirst) {
                line.jinput.value = ((rules) ? (rules + ' ') : '') + newcites;
            } else {
                line.jinput.value = newcites + ((rules) ? (' ' + rules) : '');
            }
        }
    }

    restoreAnswer(ans) {
        this.isRestoring = true;
        if (!ans.parts) { this.isRestoring = false; return; }
        if ("autocheck" in ans && ans.autocheck) {
            this._autocheck = true;
        }
        for (let p of ans.parts) {
            if (!p.parts) { continue; }
            this.mainDeriv.restoreSubderivation(p);
            break;
        }
        this.renumberLines();
        this.autocheck = this.autocheck;
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
        // report errors
        if (ind.errors) {
            // if there is only errors on show lines, any they're all
            // justification or completion, don't report anything
            let onlygooderrors = true;
            for (const lnstr in ind.errors) {
                const errline = this.linesByNum[parseInt(lnstr)];
                if (!errline) { continue; }
                if (!errline.classList.contains("derivationshowline")) {
                    if ((ind?.fromautocheck) &&
                        (parseInt(lnstr) == (this.linesByNum.length -1)) &&
                        (errline.input.value == '' || errline.jinput.value == '')) {
                        continue;
                    }
                    onlygooderrors = false;
                    break;
                }

                for (const category in ind.errors[lnstr]) {
                    if (category != 'justification' && category != 'completion' && category != 'dependency') {
                        onlygooderrors = false;
                        break;
                    }
                }
                if (!onlygooderrors) { break; }
            }
            // regular checking
            let ch = '';
            for (const line of this.linesByNum) {
                if (line == 'offbyone') { continue; }
                const ln = line.numbox.innerHTML;
                let lsupdate = '';
                if (ln == '') { continue; }
                // build table of errors
                if (ind.errors[ln]) {
                    if (ch == '') { ch = '<table class="errortable"><tbody>'; };
                    // don't report a line number if only one error, a
                    // completion error on line 1
                    if ((ln == '1') && (Object.keys(ind.errors[ln]).length == 1) &&
                        Object.keys(ind.errors[ln])[0] == 'completion') {
                        ch += '<tr><td></td><td>';
                    } else {
                        ch += '<tr><td>Line ' + ln + '</td><td>';
                    }
                    let needbr = false;
                    for (const category in ind.errors[ln]) {
                        const errIconType = DerivationExercise.errIconType[category] ?? '';
                        if (lsupdate == '') {
                            lsupdate = errIconType;
                        } else {
                            if (lsupdate != errIconType && lsupdate != 'multierror') {
                                lsupdate = 'multierror';
                            }
                        }
                        if (needbr) {
                            ch+='<br>'
                        }
                        if (category == 'dependency') {
                            ch += '<span class="dependency">' + tr('Warning') + ': </span>';
                        } else {
                            ch += '<span class="' + category + '">' +
                                tr(category.at(0).toUpperCase() + category.substr(1)) +
                                ' errors: </span>';
                        }
                        let needsemicolon = false;
                        for (const severity in ind.errors[ln][category]) {
                            for (const desc in ind.errors[ln][category][severity]) {
                                if (needsemicolon) {
                                    ch+='; ';
                                }
                                ch += htmlEscape(tr(desc));
                                needsemicolon = true;
                            }
                        }
                        needbr = true;
                    }
                    ch += '</td></tr>';
                }
                if (line.checkButton) {
                    if (lsupdate == '') {
                        line.checkButton.update('good');
                    } else {
                        // consider it to be incomplete not wrong if only
                        // natural errors for incomplete problem
                        if (onlygooderrors && (lsupdate == 'justificationerror' || lsupdate == 'baddependency')) {
                            line.checkButton.update('incomplete');
                        } else {
                            line.checkButton.update(lsupdate);
                        }
                    }
                }

            }
            if (ch != '') { ch += '</tbody></table>' };
            // don't report errors if they're only natural errors for an
            // incomplete problem
            if (onlygooderrors && !this.mainDeriv.classList.contains('closed')) {
                this.setComment('');
            } else {
                this.setComment(ch);
            }
        } else { this.setComment(''); }
        // auto close if correct -- made a timer to avoid reopening when clicked
        if (ind.successstatus == "correct") {
            setTimeout( () => {
                for (const sd of this.getElementsByTagName("sub-derivation")) {
                    sd.classList.add("closed");
                }
                for (const ii of this.getElementsByTagName("input")) {
                    ii.noregblur = true;
                    ii.blur();
                    ii.noregblur = false;
                }
            }, 100);
        }
    }

    showRulePanelFor(inp) {
        if (!this.options.rulepanel || !this.ruleset) { return; }
        if (!window.rulepanel ||
            window.rulepanel.problemtype != this.tagName) {
            if (!this.makeRulePanel) { return; }
            window.rulepanel = this.makeRulePanel();
            window.rulepanel.problemtype = this.tagName;
        }
        document.body.appendChild(window.rulepanel);
        // note: this should also unhide them all
        // and show first one
        window.rulepanel.resetState();

        // subset rules -- hide excluded rules
        if (this.options.excluderules) {
            for (const rule of this.options.excluderules) {
                if (window.rulepanel.rulemap[rule]) {
                    window.rulepanel.rulemap[rule].classList.add("excluded");
                }
            }
        }
        // hide all the ones not in useonly if useonly set
        if (this.options.useonlyrules) {
            for (const rule in window.rulepanel.rulemap) {
                if (this.options.useonlyrules.indexOf(rule) == -1) {
                    window.rulepanel.rulemap[rule].classList.add("excluded");
                }
            }
        }
        // hide predicate rules if we are not working with predicate logic
        if (!this?.options?.pred) {
            for (const rule in window.rulepanel.rulemap) {
                if (this.ruleset[rule].pred) {
                    window.rulepanel.rulemap[rule].classList.add("excluded");
                }
            }
        }
        window.rulepanel.target = inp;
    }

    startAutoCheckTimer() {
        // clear current timeout, if any
        if (typeof this.autocheckTimeout == 'number') {
            clearTimeout(this.autocheckTimeout);
        }
        // don't do it if shouldn't
        if (!this?.autocheck || !this?.checkLines) {
            return;
        }
        this.markLinesAsChecking();
        // autocheck timeout
        this.autocheckTimeout = setTimeout( () => (this.checkLines()),
            (this?.autocheckdelay ?? 300));
    }

    icons = {
        addline:        'playlist_add',
        addsubderiv:    'format_indent_increase',
        autocheckoff:   'unpublished',
        autocheckon:    'check_circle',
        baddependency:  'nearby_error',
        checking:       'thumbs_up_down',
        closederiv:     'format_indent_decrease',
        closemainderiv: 'task_alt',
        derivlinemenu:  'more_horiz',
        good:           'done_outline',
        incomplete:     'incomplete_circle',
        insertabove:    'expand_less',
        insertbelow:    'expand_more',
        insertSDabove:  'vertical_align_top',
        insertSDbelow:  'vertical_align_bottom',
        justificationerror: 'sms_failed',
        malfunction:    'sync_problem',
        menucancel:     'close',
        movemeabove:    'open_with',
        movemebelow:    'open_with',
        multierror:     'priority_high',
        removeme:       'backspace',
        rmderiv:        'delete_forever',
        ruleerror:      'report',
        syntaxerror:    'emergency_home',
        unchecked:      'pending'
    }

    premiseAbbr = 'Pr';

    tooltips = {
        baddependency: 'depends on incorrect line',
        checking: 'checking',
        good: 'correct',
        incomplete: 'unfinished',
        justificationerror: 'bad justification',
        malfunction: 'malfunction',
        multierror: 'multiple errors',
        ruleerror: 'breaks a rule',
        syntaxerror: 'syntax error',
        autocheckoff: 'auto-check',
        unchecked: 'unchecked'
    }

    static errIconType = {
        completion: 'incomplete',
        dependency: 'baddependency',
        justification: 'justificationerror',
        rule: 'ruleerror',
        syntax: 'syntaxerror'
    }

}

export class SubDerivation extends HTMLElement {
    constructor() {
        super();
    }

    initialSetup(setupopts) {
        // set up options
        this.parentderiv = setupopts?.parentderiv ?? false;
        if (this.parentderiv) {
            this.myprob = this?.parentderiv?.myprob ?? false;
            this.useShowLines = this?.parentderiv?.useShowLines ?? false;
        }
        this.target = setupopts?.target ?? false;
        // inner and outer divs
        this.outer = addelem('div', this, {
            classes: ['outersubderiv']
        });
        this.inner = addelem('div', this.outer, {
            classes: ['innersubderiv']
        });

        // premise root has no buttons if there are show lines
        if (!this.parentderiv && this.useShowLines) { return; }

        // buttons
        this.buttons = addelem('div', this.inner, {
            classes: ['subderivbuttons']
        });

        this.buttons.addline = addelem('div', this.buttons, {
            classes: ['material-symbols-outlined'],
            innerHTML: this.myprob.icons['addline'],
            mysubderiv: this,
            title: tr('add line'),
            onclick: function() {
                this.mysubderiv.addLine('', false);
            }
        });

        let addsubderivtext = 'add subderivation';
        if (this.useShowLines) {
            addsubderivtext = 'add showline + subderivation';
        }
        this.buttons.addsubderiv = addelem('div', this.buttons, {
            classes: ['material-symbols-outlined'],
            innerHTML: this.myprob.icons['addsubderiv'],
            mysubderiv: this,
            title: tr(addsubderivtext),
            onclick: function() {
                this.mysubderiv.addSubderivation('', true);
            }
        });

        const isSubderiv =
            ((!this.useShowLines && this?.parentderiv) ||
                (this.useShowLines && this?.parentderiv?.parentderiv));
        // button for closing it
        if (isSubderiv || !this.useShowLines) {
            let closebtnicon = this.myprob.icons['closederiv'];
            let closebtntitle = 'close subderivation';
            if (!isSubderiv) {
                closebtntitle = 'close derivation';
            }
            this.buttons.close = addelem('div', this.buttons, {
                classes: ['material-symbols-outlined'],
                innerHTML: closebtnicon,
                mysubderiv: this,
                title: tr(closebtntitle),
                onclick: function() {
                    this.mysubderiv.close();
                }
            });
        }
        if (isSubderiv) {
            // subderivs have button for removing them
            this.buttons.remove = addelem('div', this.buttons, {
                classes: ['material-symbols-outlined'],
                innerHTML: this.myprob.icons['rmderiv'],
                mysubderiv: this,
                title: tr('delete this subderivation'),
                onclick: function() {
                    if (!confirm(tr('Do you really want to remove the ' +
                        'entire subderivation?'))) { return; }
                    this.mysubderiv.remove();
                }
            });
        } else { // main deriv has button for toggling autocheck on/off
            this.myprob.clToggle = addelem('div', this.buttons, {
                classes: ['material-symbols-outlined','derivchecklinestoggle'],
                myprob: this.myprob,
                innerHTML: this.myprob.icons["autocheckoff"],
                title: tr('toggle autochecking on/off')
            });
            if (this.myprob.options.checklines) {
                this.myprob.clToggle.onclick = function(e) {
                    this.myprob.autocheck = (!this.myprob.autocheck);
                }
            } else {
                this.myprob.clToggle.classList.add("hidden");
            }
        }
    }

    addLine(s, showline = false) {
        // show line go above the rest of the subderiv,
        // in the outer box (KM style)
        const loc = (showline) ? this.outer : this.inner;
        // create the line
        const line = addelem('div', loc, {
            classes: ['derivationline']
        });
        // put in proper location
        if (loc == this.inner) {
            this.inner.insertBefore(line, this.buttons);
        }
        if (loc == this.outer) {
            this.outer.insertBefore(line, this.inner);
        }
        // mark show lines as such
        if (showline) { line.classList.add('derivationshowline') };
        // link back to subderiv
        line.mysubderiv = this;
        // line number boxes
        line.numbox = addelem('div', line, {
            classes: ['derivationlinenumber', 'invisible'],
            title: 'insert line number',
            myline: line,
            tabIndex: -1,
            // removing onmousedown keeps input from being blurred?
            onmousedown: function(e) {
                e.preventDefault();
            },
            onclick: function(e) {
                e.preventDefault();
                const targ = this.myline?.mysubderiv?.myprob?.lastfocusedJ;
                if (targ) {
                    const oldval = targ.value;
                    targ.insertLineNum(this.innerHTML);
                    targ.focus();
                    this.myline.mysubderiv.myprob.showRulePanelFor(targ);
                    targ.oldvalue = oldval;
                }
            }
        });
        // stuff to the right; put before main input so that
        // justification works out
        const rightwrap = addelem('div', line, {
            classes: ['jbwrap']
        });
        const jwrap = addelem('div', rightwrap, {});
        // justification input
        const inputopts = this?.myprob?.options ?? {};
        line.jinput = JustificationInput.getnew(inputopts);
        jwrap.appendChild(line.jinput);
        line.jinput.myline = line;
        line.jinput.myjwrap = jwrap;
        line.jinput.myrwrap = rightwrap;
        line.jinput.blurHook = SubDerivation.blurHook;
        line.jinput.focusHook = SubDerivation.focusHook;
        line.jinput.title = tr('enter line justification');
        line.jinput.shiftArrowLeftHook = SubDerivation.moveHorizontally;
        line.jinput.shiftArrowRightHook = SubDerivation.moveHorizontally;
        line.jinput.arrowUpHook = SubDerivation.moveUp;
        line.jinput.arrowDownHook = SubDerivation.moveDown;
        // the arrow right and arrow left hooks are only fired
        // when at the start or end of input
        line.jinput.arrowRightHook = SubDerivation.focusNextInput;
        line.jinput.arrowLeftHook = SubDerivation.focusPrevInput;
        // on the other hand, the tab hooks are always fired
        line.jinput.shiftTabHook = SubDerivation.focusPrevInput;
        line.jinput.tabHook = SubDerivation.focusNextInput;
        line.jinput.enterHook = function(e) {
            this.tabHook(e, true);
        }
        // buttons following justification input
        line.buttons = addelem('div', jwrap, {
            classes: ['derivlinebuttons']
        });

        line.menuButton = addelem('div', line.buttons, {
            classes: [ 'derivmenubutton' ],
            onclick: function() {
                this.classList.add("opened");
            }
        });
        const icon = addelem('div', line.menuButton, {
            classes: [ 'material-symbols-outlined' ],
            innerHTML: this.myprob.icons['derivlinemenu'],
            title: tr('line menu')
        });
        // popup menu
        const popUp = addelem('table', line.menuButton, {
            classes: [ 'derivlinepopupmenu' ],
            mywidg: line.menuButton,
            onmouseleave: function() {
                this.mywidg.classList.remove("opened");
            }
        });
        const tbody = addelem('tbody', popUp, {});
        const actions = SubDerivation.lineActions;
        for (const actionname in actions) {
            const action = actions[actionname];
            const tre = addelem('tr', tbody, {});
            const icontd = addelem('td', tre, {
                innerHTML: '<div class="material-symbols-outlined">'
                    + this.myprob.icons[actionname] + '</div>',
                classes: [actionname],
            });
            const descrtd = addelem('td', tre, {
                innerHTML: tr(action.descr),
            });
            if (action.numinp) {
                const ni = addelem('input',descrtd, {
                    type: "number",
                    myline: line,
                    onchange: action.fn
                });
            } else {
                icontd.myline = line;
                icontd.onclick = action.fn;
                descrtd.myline = line;
                descrtd.onclick = action.fn;
            }
        }

        // hide buttons in main derivation  unless no showlines
        const hasButtons = ( !this.useShowLines ||
            (this?.parentderiv?.parentderiv || (this.parentderiv && !showline))
        );
        if (!hasButtons) {
            line.buttons.classList.add("invisible");
        }

        // line check indicator/button
        if (this.parentderiv || !this.useShowLines) {
            line.checkButton = addelem('div', line.buttons, {
                myline: line,
                myprob: this.myprob,
                classes: ['derivlinecheck'],
                innerHTML:  '<div class="material-symbols-outlined unchecked">' +
                this.myprob.icons['unchecked'] + '</div>'
            });
            line.checkButton.update = SubDerivation.lineStatusUpdate;
            if (this.myprob.autocheck) {
                line.checkButton.classList.remove('hideunchecked');
            } else {
                line.checkButton.classList.add("hideunchecked");
            }
        }
        // showbox for show lines, with word "SHOW"
        if (showline) {
            line.showbox = addelem('div', line, {
                myderiv: this,
                innerHTML: tr('SHOW') + ':',
                classes: ['showlineshow'],
                title: tr('toggle shown/not'),
                onclick: function() { this.myderiv.toggle(); }
            });
        }
        // a pseudo element created to put a partial line there
        line.bottom = addelem('div', line, {
            classes: ['bottombar']
        });

        // formula input box
        line.input = FormulaInput.getnew(inputopts);
        line.appendChild(line.input);
        line.input.myline = line;
        line.input.myprob = this?.myprob ?? false;
        line.input.blurHook = SubDerivation.blurHook;
        line.input.focusHook = SubDerivation.focusHook;
        line.input.title = tr('enter a formula');
        line.input.shiftArrowLeftHook = SubDerivation.moveHorizontally;
        line.input.shiftArrowRightHook = SubDerivation.moveHorizontally;
        line.input.arrowUpHook = SubDerivation.moveUp;
        line.input.arrowDownHook = SubDerivation.moveDown;
        // the arrow right and arrow left hooks are only fired
        // when at the start or end of input
        line.input.arrowRightHook = SubDerivation.focusNextInput;
        line.input.arrowLeftHook = SubDerivation.focusPrevInput;
        // on the other hand, the tab hooks are always fired
        line.input.shiftTabHook = SubDerivation.focusPrevInput;
        line.input.tabHook = SubDerivation.focusNextInput;
        line.input.enterHook = function(e) {
            this.tabHook(e, true);
        }
        if (s && s != '') {
            line.input.value = s;
            line.numbox.classList.remove("invisible");
        }
        // initial premises are read-only
        if (this.useShowLines &&
            ((!this.parentderiv) ||
            (!this.parentderiv.parentderiv && showline))) {
            line.input.readOnly = true;
            line.numbox.classList.remove("invisible");
        }
        // adding a line usually changes the problem; EDIT: no it does not
        /*if (!this.myprob.settingUp) {
            this.myprob.makeChanged();
        }*/
        if (!this.myprob.isRestoring && !this.myprob.settingUp) {
            line.input.focus();
        }
        return line;
    }

    addSubderivation(s, removeemptylineabove = false) {
        // remove last line of current subderivation if empty
        if (removeemptylineabove) {
            const lines = this.getElementsByClassName("derivationline");
            if (lines && lines.length > 0) {
                const lline = lines[ lines.length - 1 ];
                if ((!lline.classList.contains("derivationshowline")) &&
                    (lline.mysubderiv == this)) {
                    if ((lline.input.value == '') && (lline.jinput.value == '')) {
                        lline.parentNode.removeChild(lline);
                    }
                }
            }
        }
        // create and add element
        const subderiv = addelem('sub-derivation', this.inner, {});
        subderiv.initialSetup({
            parentderiv: this,
            target: (s ?? false)
        });
        // has the subderivation class unless it has no parent
        if (this.parentderiv) {
            subderiv.classList.add("subderivation");
        }
        // move the subderivation before the buttons
        if (this.buttons) {
            this.inner.insertBefore(subderiv, this.buttons);
        }
        // add a line to get it started
        subderiv.addLine('', false);
        if (this?.myprob?.addSubDerivHook) {
            this.myprob.addSubDerivHook(subderiv);
        }
        // make changed if real subderiv
        if (!this.myprob.settingUp) {
            this.myprob.makeChanged();
        }
        return subderiv;
    }

    close() {
        let changed = false;
        const lines = Array.from(this.getElementsByClassName("derivationline"));

        // check if there are any non-empty lines
        let hasNonEmpty = false;
        for (const line of lines) {
            if (((line.jinput.value != '') || (line.input.value != '')) &&
                (!line.classList.contains('derivationshowline'))) {
                hasNonEmpty = true;
                break;
            }
        }
        // don't close or even remove lines from an empty subderivation
        if (!hasNonEmpty) {
            return;
        }
        // remove blank lines
        lines.forEach((line) => {
            if (line.jinput.value == '' && line.input.value == '' &&
                line.mysubderiv == this &&
                !line.classList.contains('derivationshowline')) {
                line.parentNode.removeChild(line);
                changed = true;
            }
        });

        if (!this.classList.contains("closed")) {
            this.classList.add('closed');
        }

        // only mark as changed if lines were removed
        if (changed) {
            this.myprob.makeChanged();
        }
    }

    getLineInfo(line) {
        const info = {};

        // get input values
        info.s = line?.input?.value ?? '';
        info.j = line?.jinput?.value ?? '';

        // get status of line indicators
        const cbCL = line?.checkButton?.getElementsByTagName("div")?.[0]?.classList;
        if (cbCL) {
            for (const cl of cbCL) {
                if (cl != 'material-symbols-outlined') {
                    info.c = cl;
                    break;
                }
            }
        }

        // get line number
        info.n = line?.numbox?.innerHTML ?? '';
        return info;
    }

    getSubderivationInfo() {
        const info = { parts: [] };
        info.closed = this.classList.contains("closed");
        for (const div of this?.outer?.childNodes) {
            if (div.classList.contains("derivationshowline")) {
                info.showline= this.getLineInfo(div);
            }
            if (div.classList.contains("innersubderiv")) {
                for (const p of div.childNodes) {
                    if (p.classList.contains("subderivbuttons")) {
                        continue;
                    }
                    if (p.classList.contains("derivationline")) {
                        info.parts.push(this.getLineInfo(p));
                    }
                    if (p.tagName.toLowerCase() == 'sub-derivation') {
                        info.parts.push(p.getSubderivationInfo());
                    }
                }
            }
        }
        return info;
    }

    lineBefore(line) {
        let lookbefore = line;
        while (lookbefore) {
            const psib = lookbefore.previousSibling;
            if (psib) {
                // a previous sibling existed; see if it is
                // either a line or subderiv
                if (psib.classList.contains("derivationline")) {
                    // if it's a line, we take it
                    return psib;
                }
                if (psib.tagName.toLowerCase() == 'sub-derivation') {
                    // if its a subderiv, we take its last line
                    let childlines =
                        psib.getElementsByClassName("derivationline");
                    if (childlines && childlines.length > 0) {
                        return childlines[ childlines.length - 1 ];
                    }
                }
                // if we got here, we should go back further
                lookbefore = psib;
            } else {
                // no previous sibling, we are at the top
                // check if showline
                const upone = lookbefore.mysubderiv ??
                    (lookbefore.parentderiv ?? false);
                if (upone && !lookbefore.classList.contains("derivationshowline")) {
                    // if it is we must look to see if there are any
                    const sl = upone.getElementsByClassName("derivationshowline");
                    if (sl && sl.length > 0 && sl[0].parentNode == upone.outer) {
                        // return that show line
                        return sl[ 0 ];
                    }
                }
                lookbefore = upone;
            }
        }
        return false;
    }

    lineAfter(line, stayinsubderiv) {
        // see if a showline
        let lookafter = line;
        while (lookafter) {
            const isshowline = lookafter.classList.contains("derivationshowline");
            if (isshowline) {
                // it is a show line
                // next line should be first line of subderiv
                const lineafter = lookafter?.mysubderiv?.inner?.
                    getElementsByClassName("derivationline")?.[0];
                if (lineafter) { return lineafter; }
            } else {
                // not a show line; look for sibling
                const sib = lookafter.nextSibling;
                if (sib && sib.classList.contains("derivationline")) {
                    return sib;
                }
                // if there is a subderivation following, we want to go to
                // its first line
                if (sib && sib.tagName.toLowerCase() == "sub-derivation") {
                    // if it does not, we can go to its first line
                    const firstline = sib.getElementsByClassName("derivationline")?.[0];
                    if (firstline) { return firstline; }
                }
            }
            // if we are here, we must be at the end of *this* derivation
            if (stayinsubderiv) { return false; }
            lookafter = lookafter.mysubderiv ??
                (lookafter.parentderiv ?? false);
        }
        return false;
    }

    open() {
        if (this.classList.contains("closed")) {
            this.classList.remove("closed");
            this.myprob.makeChanged(false, false);
        }
    }

    remove() {
        this.parentNode.removeChild(this);
        this.myprob.makeChanged();
    }

    restoreLine(line, info) {
        if (line?.jinput) {
          // we run justification fix in case was saved before
          // was auto-fixed
          line.jinput.value = JustificationInput.justFix(info.j);
        };
        if (line?.input) { line.input.value = info.s; };
        if (info?.n && info?.n != '' && line?.numbox) {
            line.numbox.innerHTML = info.n;
            line.numbox.classList.remove('invisible');
        }
        if (info?.c && line?.checkButton) {
            line.checkButton.update(info.c);
        }
    }

    restoreSubderivation(info) {
        // restore showline
        if (info.showline) {
            const sl = this?.getElementsByClassName("derivationshowline")?.[0];
            if (sl && sl.mysubderiv == this) {
                this.restoreLine(sl, info.showline);
            }
        }
        // restore other parts
        let didfirst = false;
        for (const p of info.parts) {
            // restore subsubderivation
            if ("parts" in p) {
                const sd = this.addSubderivation(info?.showline?.s ?? '', (!didfirst));
                sd.restoreSubderivation(p);
            } else {
                // restore regular line
                let l;
                const lines = this.inner.getElementsByClassName("derivationline");
                // may have automatically inserted a first line, use it if need be
                if (lines.length == 1 && lines[0].input.value == '' &&
                    lines[0].jinput.value == '' && !didfirst) {
                    l = lines[0];
                    didfirst = true;
                } else {
                    // otherwise create a line for it
                    l = this.addLine(p.s ?? '', false);
                }
                this.restoreLine(l, p);
            }
        }
        if (info.closed) { this.classList.add('closed'); }
    }

    toggle() {
        if (this.classList.contains('closed')) {
            this.open();
        } else {
            this.close();
        }
    }

    static blurHook(e) {
        // hide rule panel on blur
        if (this.myline.mysubderiv.myprob.options.rulepanel && !e.blockhide) {
            this.myline.mysubderiv.myprob.hideRulePanel();
        }
        // check if anything changed
        if (this.value == this?.oldvalue) { return; }
        // update old value
        this.oldvalue = this.value;
        // any changes means the problem is changed, when not restoring
        if (this?.myline?.mysubderiv?.myprob?.isRestoring) {
            return true;
        }
        const makechanged =
            ((!("noregblur" in this) || !this.noregblur) &&
            this?.myline?.mysubderiv?.myprob?.makeChanged);
        if (makechanged) {
            this.myline.mysubderiv.myprob.makeChanged();
        }
        return true;
    }

    static focusHook(e) {
        // open an input's subderivation when focused if not
        // open already
        if (this?.myline?.mysubderiv) {
            if (!this?.myline?.mysubderiv?.myprob?.isRestoring) {
                this.myline.mysubderiv.open();
            }
        }

        // don't do anything else unless not readOnly
        if (this.readOnly) { return; }

        // mark this line's as last focused justification input
        if (this?.myline?.jinput &&
            this?.myline?.mysubderiv?.myprob) {
            this.myline.mysubderiv.myprob.lastfocusedJ =
                this.myline.jinput
        }
        // show the rule panel
        if (this.myline.mysubderiv.myprob.options.rulepanel &&
            this.myline.mysubderiv.myprob.showRulePanelFor) {
            this.myline.mysubderiv.myprob.showRulePanelFor(this);
        }
    }

    static focusNextInput(e, stayinsubderiv = false) {
        if (!this.myline) { return; }
        // for formula line consider going to justification input
        // unless it is for a premise
        if (this.classList.contains("formulainput")) {
            if (this.myline.jinput &&
                (!this.myline.jinput.myrwrap.classList.contains("premisejwrap"))) {
                this.myline.jinput.focus();
                this.myline.jinput.setSelectionRange(0,0);
                return;
            }
        }
        // go to input on next line
        const nextline =
            this.myline.mysubderiv.lineAfter(this.myline, stayinsubderiv);
        if (nextline && nextline.input) {
            nextline.input.focus();
            nextline.input.setSelectionRange(0,0);
            return;
        }
        // don't create after blank line
        if ((this.myline.input.value == '')
            && (this.myline.jinput.value == '')) { return; }
        // create next line!
        if (this.myline.classList.contains("derivationshowline")) {
            if (!stayinsubderiv) { return; }
            const childlines = (this.myline.mysubderiv.inner.
                getElementsByTagName("derivationline"));
            if (childlines) { return; }
        }
        const newline = this.myline.mysubderiv.addLine('', false);
        if (newline?.input) { newline.input.focus(); }
    }

    static focusPrevInput(e, putatend = false) {
        if (!this.myline) { return; }
        // for justification go back to formula input
        if (this.classList.contains("justification")) {
            if (this.myline.input) {
                this.myline.input.focus();
                if (putatend) {
                    const len = this.myline.input.value.length;
                    this.myline.input.setSelectionRange(len, len);
                }
                return;
            }
        }
        // go to prev line
        const prevline =
            this.myline.mysubderiv.lineBefore(this.myline);

        if (prevline) {
            // go to justification input if there and not hidden
            if (prevline.jinput &&
                (!prevline.jinput.myrwrap.classList.contains('premisejwrap'))) {
                prevline.jinput.focus();
                if (putatend) {
                    const len = prevline.jinput.value.length;
                    prevline.jinput.setSelectionRange(len, len);
                }
                return;
            }
            // otherwise go to main input
            if (prevline.input) {
                prevline.input.focus();
                if (putatend) {
                    const len = prevline.input.value.length;
                    prevline.input.setSelectionRange(len, len);
                }
                return;
            }
        }
        // fell through; no where to go
    }

    // these what get menu items in the little line menu
    static lineActions = {
        insertabove: {
            descr: 'insert line above',
            numinp: false,
            fn: function(e) {
                let targspot = this.myline;
                let targderiv = targspot.mysubderiv;
                // showlines, previous are in parent
                if (this.myline.classList.contains("derivationshowline")) {
                    targspot = targderiv;
                    targderiv = targderiv.parentderiv;
                }
                const nl = targderiv.addLine('', false);
                // move line into place
                targspot.parentNode.insertBefore(nl, targspot);
                // close the menu asap
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                if (nl.input) { nl.input.focus();}
            }
        },
        insertbelow: {
            descr: 'insert line below',
            numinp: false,
            fn: function(e) {
                let targetP = this.myline;
                let targetSD = this.myline.mysubderiv;
                // depending on whether subderivation closed, line either
                // goes in this subderivation, or the parent subderivation
                // for derivations without show lines
                if (targetSD?.classList?.contains("closed") && !targetSD?.useShowLines
                    && targetSD?.parentderiv) {
                    targetP = targetSD;
                    targetSD = targetSD.parentderiv;
                }
                // create line
                const nl = targetSD.addLine('', false);
                // move into place
                if (targetP.classList.contains("derivationshowline")) {
                    targetP.mysubderiv.inner.insertBefore(nl,
                        this.myline.mysubderiv.inner.firstChild);
                } else {
                    targetP.parentNode.insertBefore(nl, targetP.nextSibling);
                }
                // close the menu asap
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                // this will always add a blank line so no use making changed
                if (nl.input) { nl.input.focus();}
            }
        },
        insertSDabove: {
            descr: 'insert subderivation above',
            numinp: false,
            fn: function(e) {
                const line = this.myline;
                let targ = line;
                let targderiv = line.mysubderiv;
                // for showlines, the derivation goes in parent
                if (line.classList.contains("derivationshowline")) {
                    targderiv = targ.mysubderiv.parentderiv;
                    targ = targ.mysubderiv;
                }
                // new subderivation
                const sd = targderiv.addSubderivation('', false);
                // move into place
                targ.parentNode.insertBefore(sd, targ);
                // close the menu asap
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                line.mysubderiv.myprob.makeChanged();
                // focus on first input in new subderiv
                const ii = sd.getElementsByClassName("derivationline");
                if (ii?.[0]?.input) { ii[0].input.focus(); };
            }
        },
        insertSDbelow: {
            descr: 'insert subderivation below',
            numinp: false,
            fn: function(e) {
                // check if closed if no showlines
                let targetP = this.myline;
                let targetSD = this.myline.mysubderiv;
                if (targetSD.classList.contains("closed") && (!targetSD.useShowLines) &&
                    targetSD?.parentderiv) {
                    targetP = targetSD;
                    targetSD = targetSD.parentderiv;
                }
                // add the subderivation
                const sd = targetSD.addSubderivation('', false);
                // put into place, for showline, it goes in parent
                if (targetP.classList.contains("derivationshowline")) {
                    targetP.mysubderiv.inner.insertBefore(sd,
                        targetP.mysubderiv.inner.firstChild);
                } else {
                    targetP.parentNode.insertBefore(sd,
                        targetP.nextSibling);
                }
                // close the menu asap
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
                // focus first input
                const ii = sd.getElementsByClassName("derivationline");
                if (ii?.[0]?.input) { ii[0].input.focus(); };
            }
        },
        movemeabove: {
            descr: 'move above line:',
            numinp: true,
            fn: function(e) {
                // figure out what should move
                const linepicked = parseInt(this.value);
                let targ = this.myline?.mysubderiv?.myprob?.linesByNum?.[linepicked];
                if (!targ) {
                    alert("No such line!");
                    return;
                }
                if (targ?.input?.readOnly) {
                    alert('You cannot move the line there.');
                    return;
                }
                const isshow = this.myline.classList.contains("derivationshowline");
                if (isshow) {
                    if (!(confirm("Moving a showline moves its entire " +
                        "subderivation. Do you want to move it?"))) {
                        return;
                    }
                }
                let movee = this.myline;
                if (isshow) {
                    movee = this.myline.mysubderiv;
                }
                // goes in parent if we are talking about a show line
                // or a first line
                if (targ.classList.contains("derivationshowline")) {
                    targ = targ.mysubderiv;
                }
                if (targ.classList.contains("hypothesis")) {
                    targ = targ.mysubderiv;
                }
                // actually do the move
                targ.parentNode.insertBefore(movee, targ);
                // close the menu asap
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
            }
        },
        movemebelow: {
            descr: 'move below line:',
            numinp: true,
            fn: function(e) {
                // figure out what to move
                const linepicked = parseInt(this.value);
                const targ = this.myline?.mysubderiv?.myprob?.linesByNum?.[linepicked];
                if (!targ) {
                    alert("No such line!");
                    return;
                }
                if ((targ.classList.contains('premiseline')) &&
                    (!targ.classList.contains('lastpremise')) ||
                    (targ.mysubderiv.useShowLines)) {
                    alert('You cannot edit the argument itself.');
                    return;
                }
                const isshow = this.myline.classList.contains("derivationshowline");
                if (isshow) {
                    if (!(confirm("Moving a showline moves its entire " +
                        "subderivation. Do you want to move it?"))) {
                        return;
                    }
                }
                let movee = this.myline;
                if (isshow) {
                    movee = this.myline.mysubderiv;
                }
                // do the move
                if (targ.classList.contains("derivationshowline")) {
                    targ.mysubderiv.inner.insertBefore(movee,
                        targ.mysubderiv.inner.firstChild);
                } else {
                    targ.parentNode.insertBefore(movee, targ.nextSibling);
                }
                // close the menu asap
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
            }
        },
        removeme: {
            descr: 'remove line',
            numinp: false,
            fn: function(e) {
                // go ahead and remove normal lines;
                // this will close the menu as it will no longer exist
                if (!this.myline.classList.contains("derivationshowline")) {
                    this.myline.parentNode.removeChild(this.myline);
                    this.myline.mysubderiv.myprob.makeChanged();
                    return;
                }
                // confirm for showlines
                if (!confirm(tr('Removing a show line removes its '
                    + 'attached subderviation. Do you wish to '
                    + 'remove it?'))) { return; }
                this.myline.mysubderiv.parentNode.removeChild(
                    this.myline.mysubderiv
                );
                this.myline.mysubderiv.myprob.makeChanged();
            }
        },
        menucancel: {
            descr: 'cancel',
            numinp: false,
            fn: function(e) {
                // just close the menu
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
            }
        }
    }

    static lineStatusUpdate(icon) {
        const prob = this.myprob;
        this.innerHTML = '<div class="material-symbols-outlined ' +
            icon + '">' + prob.icons[icon] + '</div>';
        this.title = tr(prob.tooltips[icon]);
    }

    static moveHorizontally(e) {
        if (!this.myline) { return; }
        if (this.classList.contains("justification")) {
            if (this.myline.input) { this.myline.input.focus(); }
            return;
        }
        if (this.myline.jinput && (!this.myline.jinput.myrwrap.classList.contains("premisejwrap"))) {
            this.myline.jinput.focus();
        }
    }

    static moveDown(e) {
        if (!this.myline) { return; }
        let nextline = this.myline.mysubderiv.lineAfter(this.myline, false);
        if (!nextline) { return; }
        if (!this.classList.contains("justification")) {
            if (nextline.input) { nextline.input.focus(); }
            return;
        }
        while ((nextline) && (nextline.jinput.myrwrap.classList.contains("premisejwrap"))) {
            nextline = nextline.mysubderiv.lineAfter(nextline, false);
        }
        if (nextline && nextline?.jinput) {
            nextline.jinput.focus();
        }
    }

    static moveUp(e) {
        if (!this.myline) { return; }
        let prevline = this.myline.mysubderiv.lineBefore(this.myline);
        if (!prevline) { return; }
        if (!this.classList.contains("justification")) {
            if (prevline.input) { prevline.input.focus(); }
            return;
        }
        while ((prevline) && (prevline.jinput.myrwrap.classList.contains("premisejwrap"))) {
            prevline = prevline.mysubderiv.lineBefore(prevline, false);
        }
        if (prevline && prevline?.jinput) {
                prevline.jinput.focus();
        }
    }
}

customElements.define("sub-derivation", SubDerivation);
