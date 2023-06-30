// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import LogicPenguinProblem from '../problem-class.js';
import { addelem, htmlEscape } from '../common.js';
import FormulaInput from '../ui/formula-input.js';
import JustificationInput from '../ui/justification-input.js';
import tr from '../translate.js';

export default class DerivationExercise extends LogicPenguinProblem {

    // make a basic problem
    constructor() {
        super();
    }

    get autocheck() {
        if (!("_autocheck" in this)) {
            this._autocheck = false;
        }
        return this._autocheck;
    }

    set autocheck(b) {
        let lines = this.mainDeriv.getElementsByClassName("derivationline");
        for (let line of lines) {
            if (!line.checkButton) { continue; };
            if (b) {
                line.checkButton.classList.remove("hideunchecked");
            } else {
                line.checkButton.classList.add("hideunchecked")
            }
        }
        if (this.clToggle) {
            if (b) { 
                this.clToggle.innerHTML =
                    '<div class="material-symbols-outlined ' +
                    'autocheckon">' + this.icons['autocheckon'] + '</div>';
                this.clToggle.title = 'turn off autocheck';
            } else {
                this.clToggle.innerHTML =
                    '<div class="material-symbols-outlined ' +
                    'autocheckoff">' + this.icons['autocheckoff'] + '</div>';
                this.clToggle.title = 'turn on autocheck';
            }
        }
        this._autocheck = b;
        // run it now
        if (b && this.checkLines && !this.isRestoring) { this.checkLines(); }
    }

    getAnswer() {
        if (!this.premDeriv) { return []; }
        let pDinfo = this.premDeriv.getSubderivationInfo();
        pDinfo.autocheck = this.autocheck;
        return pDinfo;
    }


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
        this.scrollIntoView();
    }

    hideRulePanel() {
        if (window?.rulepanel?.parentNode) {
            window.rulepanel.parentNode.removeChild(window.rulepanel);
        }
        if (window?.rulepanel) { window.rulepanel.target = false; }
    }

    makeChanged() {
        super.makeChanged();
        // remove markers on lines
        for (let line of this.getElementsByClassName("derivationline")) {
            if (line.checkButton) { line.checkButton.update("unchecked"); }
        }
    }

    makeProblem(problem, options, checksave) {
        this.options = options;
        this.checksave = checksave;

        // outer wrap container, full width
        let container = addelem('div', this, {
            classes: ['derivationcontainer']
        });
        // formula area only contains the formulas, not the side boxes
        let formulaarea = addelem('div', container, {
            classes: ['derivationcore']
        });

        // premises in the "premise root"
        this.premDeriv = addelem('sub-derivation', formulaarea, {});
        this.premDeriv.initialSetup({
            parentderiv: false,
            target: false
        });
        this.premDeriv.classList.add("premiseroot");
        this.premDeriv.myprob = this;
        let prems = problem?.prems ?? [];
        for (let prem of prems) {
            let line = this.premDeriv.addLine(prem, false);
            line.jinput.value = this.premiseAbbr ?? tr('premise');
            line.jinput.readOnly = true;
        }

        // main derivation targets the conclusion
        this.mainDeriv =
            this.premDeriv.addSubderivation(problem.conc, false);
        this.mainDeriv.classList.add("mainderivation");

        this.lastfocusedJ = (this?.mainDeriv
            ?.getElementsByClassName("justification")?.[0]);

        this.renumberLines();

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
            onclick: function(e) { this.myprob.processAnswer(); }
        });

        this.startOverButton = addelem('button', this.buttonDiv, {
            type: 'button',
            myprob: this,
            innerHTML: tr('start over'),
            onclick: function() {
                this.myprob.startOver();
                let sh = this?.myprob?.
                    getElementsByClassName("derivationshowline")?.[0];
                if (sh) {
                    sh.jinput.focus();
                }
            }
        });
    }

    // note: makeRulePanel: specific to specific type of derivation problem

    processLine(line) {
        if (line?.mysubderiv?.myprob?.renumberLines) {
            line.mysubderiv.myprob.renumberLines();
        }
        // check the lines if need be
        if (line.mysubderiv.myprob.autocheck && line?.mysubderiv?.myprob?.checkLines) {
            // don't check with line partly done
            if ((line.jinput.value != '') && (line.input.value != '')) {
                line.mysubderiv.myprob.checkLines();
            }
        };
    }

    renumberLines() {
        let lines = this.getElementsByClassName("derivationline");
        // we want to start with 1, so we start the array with a
        // dummy entry
        this.linesByNum = ['offbyone'];
        // we map the old numbers to the lines to update
        // the citations
        let oldnumbers = {};
        // loop through lines
        for (let line of lines) {
            // shouldn't be here without a numbox, but just in case
            // we don't want a crash
            if (!line.numbox) { continue; }
            // record old line number if it has one
            let oldnum = line.numbox.innerHTML;
            if (oldnum != '') { oldnumbers[oldnum] = line; }
            // ensure the link isn't blank
            let jval = line?.jinput?.value ?? false;
            let ival = line?.input?.value ?? false;
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
        for (let line of this.linesByNum) {
            // again shouldn't be here without a justification input
            // but just in case, we don't want a crash
            if (!line?.jinput) { continue; }
            // justFix should have been run on justification, so
            // it should only have space in between numbers and rules
            let jval = line.jinput.value ?? '';
            let [cites, rules] = jval.split(' ');
            // if only one thing in split, and it has no numbers,
            // no updating is needed
            if (!cites || !(/[0-9]/.test(cites))) { continue; }
            // change each citation; note split uses thin space
            let newcites = cites.split(', ').map((cite) => {
                let [start, end] = cite.split('–');
                start = oldnumbers?.[start]?.numbox?.innerHTML ?? '?';
                if (end) {
                    end = oldnumbers?.[end]?.numbox?.innerHTML ?? '?';
                }
                return start + ((end) ? ('–' + end) : '');
            }).join(', ');
            // add back in the rules if needed
            line.jinput.value = newcites + ((rules) ? (' ' + rules) : '');
        }
    }

    restoreAnswer(ans) {
        this.isRestoring = true;
        if (!ans.parts) { this.isRetoring = false; return; }
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
            // if there is only errors on showlines, any they're all
            // justification or completion, don't report anything
            let onlygooderrors = true;
            for (let lnstr in ind.errors) {
                let errline = this.linesByNum[parseInt(lnstr)];
                if (!errline) { continue; }
                if (!errline.classList.contains("derivationshowline")) {
                    onlygooderrors = false;
                    break;
                }

                for (let category in ind.errors[lnstr]) {
                    if (category != 'justification' && category != 'completion' && category != 'dependency') {
                        onlygooderrors = false;
                        break;
                    }
                }
                if (!onlygooderrors) { break; }
            }
            // regular checking
            let ch = '';
            for (let line of this.linesByNum) {
                if (line == 'offbyone') { continue; }
                let ln = line.numbox.innerHTML;
                let lsupdate = '';
                if (ln == '') { continue; }
                if (ind.errors[ln]) {
                    if (ch == '') { ch = '<table class="errortable"><tbody>'; };
                    ch += '<tr><td>Line ' + ln + '</td><td>';
                    let needbr = false;
                    for (let category in ind.errors[ln]) {
                        let errIconType = DerivationExercise.errIconType[category] ?? '';
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
                        for (let severity in ind.errors[ln][category]) {
                            for (let desc in ind.errors[ln][category][severity]) {
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
                        if (onlygooderrors && (lsupdate == 'justificationerror' || lsupdate == 'baddependency')) {
                            line.checkButton.update('incomplete');
                        } else {
                            line.checkButton.update(lsupdate);
                        }
                    }
                }

            }
            if (ch != '') { ch += '</tbody></table>' };
            if (onlygooderrors) {
                this.setComment('');
            } else {
                this.setComment(ch);
            }
        } else { this.setComment(''); }
        // auto close if correct -- made a timer to avoid reopening when clicked
        if (ind.successstatus == "correct") {
            setTimeout( () => {
                for (let sd of this.getElementsByTagName("sub-derivation")) {
                    sd.classList.add("closed")
                }
            }, 100);
        }
    }

    showRulePanelFor(inp) {
        if (!this.options.rulepanel || !this.ruleset) { return; }
        if (!window.rulepanel ||
            window.rulepanel.problemtype != this.problemtype) {
            if (!this.makeRulePanel) { return; }
            window.rulepanel = this.makeRulePanel();
            window.rulepanel.ruleset = this.ruleset;
        }
        document.body.appendChild(window.rulepanel);
        // note: this should also unhide them all
        // and show first one
        window.rulepanel.resetState();

        // subset rules
        if (this.options.excluderules) {
            for (let rule of this.options.excluderules) {
                if (window.rulepanel.rulemap[rule]) {
                    window.rulepanel.rulemap[rule].classList.add("excluded");
                }
            }
        }
        if (this.options.useonlyrules) {
            for (let rule in window.rulepanel.rulemap) {
                if (this.options.useonlyrules.indexOf(rule) == -1) {
                    window.rulepanel.rulemap[rule].classList.add("excluded");
                }
            }
        }
        if (!this?.options?.pred) {
            for (let rule in window.rulepanel.rulemap) {
                if (this.ruleset[rule].pred) {
                    window.rulepanel.rulemap[rule].classList.add("excluded");
                }
            }
        }
        window.rulepanel.target = inp;
    }

    icons = {
        addline:        'playlist_add',
        addsubderiv:    'variables',//format_indent_increase also worth considering
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
        }
        this.target = setupopts?.target ?? false;
        // inner and outer divs
        this.outer = addelem('div', this, {
            classes: ['outersubderiv']
        });
        this.inner = addelem('div', this.outer, {
            classes: ['innersubderiv']
        });

        // premise root has no buttons
        if (!this.parentderiv) { return; }

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

        this.buttons.addsubderiv = addelem('div', this.buttons, {
            classes: ['material-symbols-outlined'],
            innerHTML: this.myprob.icons['addsubderiv'],
            mysubderiv: this,
            title: tr('add showline + subderivation'),
            onclick: function() {
                this.mysubderiv.addSubderivation('', true);
            }
        });
        if (this.parentderiv?.parentderiv) {
            this.buttons.remove = addelem('div', this.buttons, {
                classes: ['material-symbols-outlined'],
                innerHTML: this.myprob.icons['rmderiv'],
                mysubderiv: this,
                title: 'delete this subderivation',
                onclick: function() {
                    if (!confirm(tr('Do you really want to remove the ' +
                        'entire subderivation?'))) { return; }
                    this.mysubderiv.remove();
                }
            });
        }
        let closeicon = this.myprob.icons['closederiv'];
        let closetitle = 'finish subderivation';
        if (!this.parentderiv?.parentderiv) {
            closeicon = this.myprob.icons['closemainderiv'];
            closetitle = 'complete derivation';
        }
        this.buttons.close = addelem('div', this.buttons, {
            classes: ['material-symbols-outlined'],
            innerHTML: closeicon,
            mysubderiv: this,
            title: tr(closetitle),
            onclick: function() {
                this.mysubderiv.close();
            }
        });
    }

    addLine(s, showline = false) {
        // show line go above the rest of the subderiv,
        // in the outer box (KM style)
        let loc = (showline) ? this.outer : this.inner;
        // create the line
        let line = addelem('div', loc, {
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
            onclick: function(e) {
                let targ = this.myline.mysubderiv.myprob.lastfocusedJ;
                if (targ) {
                    let time = (new Date()).getTime();
                    let iblurred = targ?.myline?.input?.lastblurred ?? 0;
                    let blurred = Math.max(targ.lastblurred, iblurred);
                    if (time  - blurred > 500) { return; }
                    let oldval = targ.value;
                    targ.insertLineNum(this.innerHTML);
                    targ.focus();
                    this.myline.mysubderiv.myprob.showRulePanelFor(targ);
                    targ.oldvalue = oldval;
                }
            }
        });
        // stuff to the right; put before main input so that
        // justification works out
        let rightwrap = addelem('div', line, {
            classes: ['jbwrap']
        });
        let jwrap = addelem('div', rightwrap, {});
        // justification input
        let inputopts = this?.myprob?.options ?? {};
        line.jinput = JustificationInput.getnew(inputopts);
        jwrap.appendChild(line.jinput);
        line.jinput.myline = line;
        line.jinput.blurHook = SubDerivation.blurHook;
        line.jinput.focusHook = SubDerivation.focusHook;
        line.jinput.title = tr('enter line justification');
        line.jinput.shiftArrowLeftHook = SubDerivation.moveHorizontally;
        line.jinput.shiftArrowRightHook = SubDerivation.moveHorizontally;
        line.jinput.arrowUpHook = SubDerivation.moveUp;
        line.jinput.arrowDownHook = SubDerivation.moveDown;
        line.jinput.shiftTabHook = SubDerivation.focusPrevInput;
        line.jinput.tabHook = SubDerivation.focusNextInput;
        line.jinput.enterHook = function(e) {
            this.tabHook(e, true);
        }
        // buttons following justification input
        line.buttons = addelem('div', jwrap, {
            classes: ['derivlinebuttons']
        });
        if (this?.parentderiv?.parentderiv || (this.parentderiv && !showline)) {
            line.menuButton = addelem('div', line.buttons, {
                classes: [ 'derivmenubutton' ],
                onclick: function() {
                    this.classList.add("opened");
                }
            });
            let icon = addelem('div', line.menuButton, {
                classes: [ 'material-symbols-outlined' ],
                innerHTML: this.myprob.icons['derivlinemenu'],
                title: tr('line menu')
            });
            // popup menu
            let popUp = addelem('table', line.menuButton, {
                classes: [ 'derivlinepopupmenu' ],
                mywidg: line.menuButton,
                onmouseleave: function() {
                    this.mywidg.classList.remove("opened");
                }
            });
            let tbody = addelem('tbody', popUp, {});
            let actions = SubDerivation.lineActions;
            for (let actionname in actions) {
                let action = actions[actionname];
                let tre = addelem('tr', tbody, {});
                let icontd = addelem('td', tre, {
                    innerHTML: '<div class="material-symbols-outlined">'
                        + this.myprob.icons[actionname] + '</div>',
                    classes: [actionname],
                });
                let descrtd = addelem('td', tre, {
                    innerHTML: tr(action.descr),
                });
                if (action.numinp) {
                    let ni = addelem('input',descrtd, {
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
        } else {
            if (showline) {
                this.myprob.clToggle = addelem('div', line.buttons, {
                    classes: ['derivchecklinestoggle'],
                    myprob: this.myprob,
                    innerHTML: '<div class="material-symbols-outlined autocheckoff">' +
                        this.myprob.icons["autocheckoff"] + '</div>'
                });
                if (this.myprob.options.checklines) {
                    this.myprob.clToggle.onclick = function(e) {
                        this.myprob.autocheck = (!this.myprob.autocheck);
                    }
                } else {
                    this.myprob.clToggle.classList.add("invisible");
                }
            }
        }
        // line check indicator/button
        if (this.parentderiv) {
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
        // showbox for show lines
        if (showline) {
            line.showbox = addelem('div', line, {
                myderiv: this,
                innerHTML: tr('SHOW') + ':',
                classes: ['showlineshow'],
                title: 'toggle shown/not',
                onclick: function() { this.myderiv.toggle(); }
            });
        }
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
        line.input.shiftTabHook = SubDerivation.focusPrevInput;
        line.input.tabHook = SubDerivation.focusNextInput;
        line.input.enterHook = function(e) {
            this.tabHook(e, true);
        }
        if (s) {
            line.input.value = s;
            line.numbox.classList.remove("invisibile");
        }
        // initial premises are read-only
        if ((!this.parentderiv) ||
            (!this.parentderiv.parentderiv && showline)) {
            line.input.readOnly = true;
            line.numbox.classList.remove("invisible");
        }
        // adding a line usually changes the problem
        if (this?.myprob &&
            (this?.parentderiv?.parentderiv &&
                !(!this?.parentderiv?.parentderiv && showline)
            )) {
            this.myprob.makeChanged();
        }
        return line;
    }

    addSubderivation(s, removeemptylineabove = false) {
        // remove last line of current subderivation if empty
        if (removeemptylineabove) {
            let lines = this.getElementsByClassName("derivationline");
            if (lines && lines.length > 0) {
                let lline = lines[ lines.length - 1 ];
                if (!lline.classList.contains("derivationshowline")) {
                    if ((lline.input.value == '') && (lline.jinput.value == '')) {
                        lline.parentNode.removeChild(lline);
                    }
                }
            }
        }
        let subderiv = addelem('sub-derivation', this.inner, {});
        subderiv.initialSetup({
            parentderiv: this,
            target: (s ?? false)
        });
        if (this.parentderiv) {
            subderiv.classList.add("subderivation");
        }
        if (this.buttons) {
            this.inner.insertBefore(subderiv, this.buttons);
        }
        // add a line to get it started
        subderiv.addLine('', false);
        if (this?.myprob?.addSubDerivHook) {
            this.myprob.addSubDerivHook(subderiv);
        }
        if (this?.myprob && this?.parentderiv?.parentderiv) {
            this.myprob.makeChanged();
        }
        return subderiv;
    }

    close() {
        let changed = false;
        let lines = Array.from(this.getElementsByClassName("derivationline"));
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
            // EDITED: don't mark as changed just for marking closed
            // changed = true;
        }
        if (changed) {
            this.myprob.renumberLines();
            this.myprob.makeChanged();
        }
    }

    getLineInfo(line) {
        let info = {};
        info.s = line?.input?.value ?? '';
        info.j = line?.jinput?.value ?? '';
        // return something falsey if no values
        let cbCL = line?.checkButton?.getElementsByTagName("div")?.[0]?.classList;
        if (cbCL) {
            for (let cl of cbCL) {
                if (cl != 'material-symbols-outlined') {
                    info.c = cl;
                    break;
                }
            }
        }
        info.n = line?.numbox?.innerHTML ?? '';
        return info;
    }

    getSubderivationInfo() {
        let info = { parts: [] };
        info.closed = this.classList.contains("closed");
        for (let div of this?.outer?.childNodes) {
            if (div.classList.contains("derivationshowline")) {
                info.showline= this.getLineInfo(div);
            }
            if (div.classList.contains("innersubderiv")) {
                for (let p of div.childNodes) {
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
            let psib = lookbefore.previousSibling;
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
                let upone = lookbefore.mysubderiv ??
                    (lookbefore.parentderiv ?? false);
                if (upone && !lookbefore.classList.contains("derivationshowline")) {
                    // if it is we must look to see if there are any
                    let sl = upone.getElementsByClassName("derivationshowline");
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
            let isshowline = lookafter.classList.contains("derivationshowline");
            if (isshowline) {
                // it is a show line
                // next line should be first line of subderiv
                let lineafter = lookafter?.mysubderiv?.inner?.
                    getElementsByClassName("derivationline")?.[0];
                if (lineafter) { return lineafter; }
            } else {
                // not a show line; look for sibling
                let sib = lookafter.nextSibling;
                if (sib && sib.classList.contains("derivationline")) {
                    return sib;
                }
                // if there is a subderivation following, we want to go to
                // its first line
                if (sib && sib.tagName.toLowerCase() == "sub-derivation") {
                    // if it does not, we can go to its first line
                    let firstline = sib.getElementsByClassName("derivationline")[0];
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
            this.myprob.makeChanged();
        }
    }

    remove() {
        this.parentNode.removeChild(this);
        this.myprob.makeChanged();
    }

    restoreLine(line, info) {
        if (line?.jinput) { line.jinput.value = info.j; };
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
        if (info.showline) {
            let sl = this?.getElementsByClassName("derivationshowline")?.[0];
            if (sl && sl.mysubderiv == this) {
                this.restoreLine(sl, info.showline);
            }
        }
        let didfirst = false;
        for (let p of info.parts) {
            if ("parts" in p) {
                let sd = this.addSubderivation(info?.showline?.s ?? '', (!didfirst));
                sd.restoreSubderivation(p);
            } else {
                let l;
                let lines = this.inner.getElementsByClassName("derivationline");
                if (lines.length == 1 && lines[0].input.value == '' &&
                    lines[0].jinput.value == '' && !didfirst) {
                    l = lines[0];
                    didfirst = true;
                } else {
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
        if (this.myline.mysubderiv.myprob.options.rulepanel && !e.blockhide) {
            this.myline.mysubderiv.myprob.hideRulePanel();
        }
        if (this.value == this.oldvalue) { return; }
        this.oldvalue = this.value;
        if (this?.myline?.mysubderiv?.myprob?.isRestoring) {
            return true;
        }
        if (this?.myline?.mysubderiv?.myprob?.makeChanged) {
            this.myline.mysubderiv.myprob.makeChanged();
        }
        if (this?.myline?.mysubderiv?.myprob?.processLine) {
            this.myline.mysubderiv.myprob.processLine(this.myline);
        }
        return true;
    }

    static focusHook(e) {
        if (this?.myline?.mysubderiv) {
            if (!this?.myline?.mysubderiv?.myprob?.isRestoring) {
                this.myline.mysubderiv.open();
            }
        }
        if (this?.myline?.jinput &&
            this?.myline?.mysubderiv?.myprob) {
            this.myline.mysubderiv.myprob.lastfocusedJ =
                this.myline.jinput
        }
        if (this.myline.mysubderiv.myprob.options.rulepanel &&
            this.myline.mysubderiv.myprob.showRulePanelFor) {
            this.myline.mysubderiv.myprob.showRulePanelFor(this);
        }
    }

    static focusNextInput(e, stayinsubderiv = false) {
        if (!this.myline) { return; }
        // for formula line consider going to justification input
        if (this.classList.contains("formulainput")) {
            if (this.myline.jinput) {
                this.myline.jinput.focus();
                return;
            }
        }
        // go to input on next line
        let nextline =
            this.myline.mysubderiv.lineAfter(this.myline, stayinsubderiv);
        if (nextline && nextline.input) {
            nextline.input.focus();
            return;
        }
        // don't create after blank line
        if ((this.myline.input.value == '')
            && (this.myline.jinput.value == '')) { return; }
        // create next line!
        if (this.myline.classList.contains("derivationshowline")) {
            if (!stayinsubderiv) { return; }
            let childlines = (this.myline.mysubderiv.inner.
                getElementsByTagName("derivationline"));
            if (childlines) { return; }
        }
        let newline = this.myline.mysubderiv.addLine('', false);
        if (newline?.input) { newline.input.focus(); }
    }

    static focusPrevInput(e) {
        if (!this.myline) { return; }
        // for justification go back to formula input
        if (this.classList.contains("justification")) {
            if (this.myline.input) {
                this.myline.input.focus();
                return;
            }
        }
        // go to justification input on prev line
        let prevline =
            this.myline.mysubderiv.lineBefore(this.myline);
        if (prevline && prevline.jinput) {
            prevline.jinput.focus();
            return;
        }
    }

    // these what get menu items in the little line menu
    static lineActions = {
        insertabove: {
            descr: 'insert line above',
            numinp: false,
            fn: function(e) {
                let targspot = this.myline;
                let targderiv = targspot.mysubderiv;
                if (this.myline.classList.contains("derivationshowline")) {
                    targspot = targderiv;
                    targderiv = targderiv.parentderiv;
                }
                let nl = targderiv.addLine('', false);
                targspot.parentNode.insertBefore(nl, targspot);
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
                this.myline.mysubderiv.myprob.renumberLines();
                if (nl.input) { nl.input.focus();}
            }
        },
        insertbelow: {
            descr: 'insert line below',
            numinp: false,
            fn: function(e) {
                let nl = this.myline.mysubderiv.addLine('', false);
                if (this.myline.classList.contains("derivationshowline")) {
                    this.myline.mysubderiv.inner.insertBefore(nl,
                        this.myline.mysubderiv.inner.firstChild);
                } else {
                    this.myline.parentNode.insertBefore(nl, this.myline.nextSibling);
                }
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
                this.myline.mysubderiv.myprob.renumberLines();
                if (nl.input) { nl.input.focus();}
            }
        },
        insertSDabove: {
            descr: 'insert subderivation above',
            numinp: false,
            fn: function(e) {
                let line = this.myline;
                let targ = line;
                let targderiv = line.mysubderiv;
                if (line.classList.contains("derivationshowline")) {
                    targderiv = targ.mysubderiv.parentderiv;
                    targ = targ.mysubderiv;
                }
                let sd = targderiv.addSubderivation('', false);
                targ.parentNode.insertBefore(sd, targ);
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                line.mysubderiv.myprob.makeChanged();
                line.mysubderiv.myprob.renumberLines();
                let ii = sd.getElementsByClassName("derivationline");
                if (ii?.[0]?.input) { ii[0].input.focus(); };
            }
        },
        insertSDbelow: {
            descr: 'insert subderivation below',
            numinp: false,
            fn: function(e) {
                let sd = this.myline.mysubderiv.addSubderivation('', false);
                if (this.myline.classList.contains("derivationshowline")) {
                    this.myline.mysubderiv.inner.insertBefore(sd,
                        this.myline.mysubderiv.inner.firstChild);
                } else {
                    this.myline.parentNode.insertBefore(sd,
                        this.myline.nextSibling);
                }
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
                this.myline.mysubderiv.myprob.renumberLines();
                let ii = sd.getElementsByClassName("derivationline");
                if (ii?.[0]?.input) { ii[0].input.focus(); };
            }
        },
        movemeabove: {
            descr: 'move above line:',
            numinp: true,
            fn: function(e) {
                let linepicked = parseInt(this.value);
                let targ = this.myline?.mysubderiv?.myprob?.linesByNum?.[linepicked];
                if (!targ) {
                    alert("No such line!");
                    return;
                }
                if (targ?.input?.readOnly) {
                    alert('You cannot edit the argument itself.');
                    return;
                }
                let isshow = this.myline.classList.contains("derivationshowline");
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
                if (targ.classList.contains("derivationshowline")) {
                    targ = targ.mysubderiv;
                }
                targ.parentNode.insertBefore(movee, targ);
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
                this.myline.mysubderiv.myprob.renumberLines();
            }
        },
        movemebelow: {
            descr: 'move below line:',
            numinp: true,
            fn: function(e) {
                let linepicked = parseInt(this.value);
                let targ = this.myline?.mysubderiv?.myprob?.linesByNum?.[linepicked];
                if (!targ) {
                    alert("No such line!");
                    return;
                }
                if (targ?.input?.readOnly) {
                    alert('You cannot edit the argument itself.');
                    return;
                }
                let isshow = this.myline.classList.contains("derivationshowline");
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
                if (targ.classList.contains("derivationshowline")) {
                    targ.mysubderiv.inner.insertBefore(movee,
                        targ.mysubderiv.inner.firstChild);
                } else {
                    targ.parentNode.insertBefore(movee, targ.nextSibling);
                }
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
                this.myline.mysubderiv.myprob.makeChanged();
                this.myline.mysubderiv.myprob.renumberLines();
            }
        },
        removeme: {
            descr: 'remove line',
            numinp: false,
            fn: function(e) {
                if (!this.myline.classList.contains("derivationshowline")) {
                    this.myline.parentNode.removeChild(this.myline);
                    this.myline.mysubderiv.myprob.makeChanged();
                    this.myline.mysubderiv.myprob.renumberLines();
                    return;
                }
                if (!confirm(tr('Removing a show line removes its '
                    + 'attached subderviation. Do you wish to '
                    + 'remove it?'))) { return; }
                this.myline.mysubderiv.parentNode.removeChild(
                    this.myline.mysubderiv
                );
                this.myline.mysubderiv.myprob.makeChanged();
                this.myline.mysubderiv.myprob.renumberLines();
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
            }
        },
        menucancel: {
            descr: 'cancel',
            numinp: false,
            fn: function(e) {
                setTimeout(() => (this.myline.menuButton.classList.remove("opened")), 0);
            }
        }
    }

    static lineStatusUpdate(icon) {
        let prob = this.myprob;
        this.innerHTML = '<div class="material-symbols-outlined ' +
            icon + '">' + prob.icons[icon] + '</div>';
        this.title = prob.tooltips[icon];
    }

    static moveHorizontally(e) {
        if (!this.myline) { return; }
        if (this.classList.contains("justification")) {
            if (this.myline.input) { this.myline.input.focus(); }
            return;
        }
        if (this.myline.jinput) { this.myline.jinput.focus(); }
    }

    static moveDown(e) {
        if (!this.myline) { return; }
        let nextline = this.myline.mysubderiv.lineAfter(this.myline, false);
        if (!nextline) { return; }
        if (this.classList.contains("justification")) {
            if (nextline.jinput) { nextline.jinput.focus(); return; }
        }
        if (nextline.input) { nextline.input.focus(); }
    }

    static moveUp(e) {
        if (!this.myline) { return; }
        let prevline = this.myline.mysubderiv.lineBefore(this.myline);
        if (!prevline) { return; }
        if (this.classList.contains("justification")) {
            if (prevline.jinput) { prevline.jinput.focus(); return; }
        }
        if (prevline.input) { prevline.input.focus(); }
    }
}

customElements.define("sub-derivation", SubDerivation);
