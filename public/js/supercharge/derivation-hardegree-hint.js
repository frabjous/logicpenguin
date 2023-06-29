// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import rules from '../checkers/rules/hardegree-rules.js';
import Formula from '../symbolic/formula.js';
import { syntax, isInstanceOf } from '../symbolic/libsyntax.js';
import { default as DerivationCheck, formFit } from '../checkers/derivation-check.js';
import { justParse } from '../ui/justification-parse.js';
import { arrayUnion } from '../misc.js';

export const showRuleFor = {
    "∨": "ID",
    "&": "&D",
    "~": "ID",
    "→": "CD",
    "↔": "↔D",
    "∀": "UD",
    "∃": "ID",
    "✖": "DD"
}

export const outRuleResults = {
    "∨": (f) => ([[f.left.normal, f.right.normal]]),
    "&": (f) => ([[f.left.normal], [f.right.normal]]),
    "→": (f) => ([['~' + f.left.wrapifneeded(), f.right.normal]]),
    "↔": (f) => ([
        [f.left.wrapifneeded() + ' → ' + f.right.wrapifneeded()],
        [f.right.wrapifneeded() + ' → ' + f.left.wrapifneeded()]
    ]),
    "∀": (f) => (['special']),
    "∃": (f) => (['instance']),
    "✖": (f) => ([]),
    "~": (f) => {
        switch(f.right.op) {
            case false:
                return '✖';
                break;
            case '∨': 
                return [
                    ['~' + f.right.left.wrapifneeded()],
                    ['~' + f.right.right.wrapifneeded()]
                ];
                break;
            case '&':
                return [[
                    f.right.left.wrapifneeded() + ' → ~' +
                    f.right.right.wrapifneeded()
                ]];
                break;
            case '→':
                return [[
                    f.right.left.wrapifneeded() + ' & ~' +
                    f.right.right.wrapifneeded()
                ]];
                break;
            case '↔':
                return [[
                    '~' + f.right.left.wrapifneeded() + ' ↔ ' +
                    f.right.right.wrapifneeded()
                ]];
                break;
            case '~':
                return [[ f.right.right.normal ]];
                break;
            case '∀':
                return [[ '∃' + f.right.boundvar +
                    '~' + f.right.right.wrapifneeded()
                ]];
                break;
            case '∃':
                return [[ '∀' + f.right.boundvar +
                    '~' + f.right.right.wrapifneeded()
                ]];
                break;
            default: return false;
        }
        return false;
    }
}

export const stumpedAnswer = 'Sorry, I’m stumped. Maybe the derivation ' +
    'went in the wrong direction earlier. (Hey don’t look at me!) ' +
    'Start over, perhaps?';

export default class hardegreeDerivationHint {

    constructor(probinfo, options, lastlinefilled) {
        this.deriv = probinfo;
        this.options = options;
        this.lastlinefilled = lastlinefilled;
        this.dc = new DerivationCheck(rules,
            this.deriv, [], '', false, true);
        this.dc.analyze(this.deriv);
    }

    canIGet(s) {
        if (!this.workingline) { return false; }
        if (!("workingAvailLines" in this)) { return false; }
        let allAvail = this.workingAvailLines;
        // emulate a new line
        let pseudoline = {
            s: s,
            isshowline: false,
            mysubderiv: this.workingsubderiv
        }
        // check each rule
        for (const rule in rules) {
            let ruleinfo = rules[rule];
            // skip bad rules
            if (!this.ruleIsAvail(rule)) { continue; }
            if (ruleinfo.meinongian ||
                ruleinfo.showrule ||
                ruleinfo.premiserule ||
                ruleinfo.assumptionrule) {
                continue;
            }
            if (!ruleinfo.forms) { continue; }
            for (const form of ruleinfo.forms) {
                // check pseudoline as conc
                let ff = new formFit(
                    ruleinfo, rule, form, pseudoline);
                ff.checkConc();
                if (!ff.possible) { continue; }
                let concAssign = JSON.stringify(ff.assigns);
                let numprems = form.prems.length ?? 0;
                if (numprems < 1 || numprems > 2) { continue; }
                pseudoline.citedsubderivs = [];
                pseudoline.citedlines = [];
                for (const a of allAvail) {
                    ff.assigns = JSON.parse(concAssign);
                    ff.possible = true;
                    pseudoline.citedlines = [a];
                    if (numprems == 1) {
                        ff.checkPrems();
                        let newness = ff.checkNewness();
                        if (!newness) {
                            ff.possible = false;
                        }
                        if (ff.possible) {
                            return 'You can obtain ' +
                                s + ' from line ' +
                                a.n + ' with the rule ' +
                                rule + '.';
                        }
                        continue;
                    }
                    for (const b of allAvail) {
                        ff.possible = true;
                        pseudoline.citedlines = [a, b];
                        ff.checkPrems();
                        if (ff.possible) {
                            let x = Math.min(
                                parseInt(a.n), parseInt(b.n)
                            ).toString();
                            let y = Math.max(
                                parseInt(a.n), parseInt(b.n)
                            ).toString();
                            return 'You can obtain ' + s +
                                ' from lines ' + x + ' and ' +
                                y + ' with the rule ' + rule + '.';
                        }
                    }
                }
            }
        }
        return false;
    }

    checkIfOutRuleApplied(f) {
        let allAvail = this.workingAvailLines;
        if (!allAvail) { return false; }
        // lookingFor is an array of arrays
        // each element is something that must be found, but
        // what is found could be any element of array
        let lookingFor = [[]];
        if (f.op) {
            let lfGetter = outRuleResults[f.op];
            if (!lfGetter) { return false; }
            lookingFor = lfGetter(f);
        } else {
            lookingFor = [['✖']]
        }
        for (const sline of allAvail) {
            let sf = Formula.from(sline.s);
            // filter looking for by removing found components
            // NOTE: because we are filtering, we return false when
            // found
            lookingFor = lookingFor.filter((lookset) => {
                if (lookset === 'instance') {
                    if (isInstanceOf(sf, f)) {
                        return false;
                    }
                }
                // look through array of options and
                // remove if identical to one of them
                if (Array.isArray(lookset)) {
                    for (const look of lookset) {
                        if (look == sf.normal) {
                            return false;
                        }
                    }
                }
                return true;
            });
            if (lookingFor.length == 0) {
                return true;
            }
        }
        return false;
    }

    fillRegLineHint() {
        if (this.lastline.s == '') {
            let { nums, ranges, citedrules } = justParse(this.lastline.j);
            if (ranges.length > 0) {
                return 'This derivation system does not use number ' +
                    'ranges like ' + ranges[0][0].toString() + '–' +
                    ranges[0][1].toString() + '.';
            }
            if (nums.length > 2) {
                return 'No rule cites more than two lines.';
            }
            if (citedrules.length > 1) {
                return 'You should only cite one rule at a time.';
            }
            // ensure cited lines are available
            for (const num of nums) {
                if (!this.dc.isAvailableLineTo(num, this.lastline)) {
                    return 'You are citing one or more lines that are ' +
                        'not available.';
                }
            }
            // citedline needs setting for formfits
            this.lastline.citedlines = nums.map(
                (n) => (this?.deriv?.lines?.[parseInt(n)-1] ?? false))
                .filter((l) => (l !== false));
            // see if good combined numbers
            if (citedrules.length == 0) {
                // NO RULE CITED
                if (nums.length == 2) {
                    for (let rule of ['→O', '∨O', '↔I']) {
                        let ruleinfo = rules[rule];
                        let forms = ruleinfo.forms;
                        for (const form of forms) {
                            let ffit = (new formFit(
                                ruleinfo, rule, form, this.lastline)
                            );
                            ffit.checkPrems();
                            if (ffit.possible) {
                                return 'The lines with those two ' +
                                    'numbers can be used with ' +
                                    rule + '.';
                            }
                        }
                    }
                }
                return 'Your justification on the last line ' +
                    'doesn’t provide enough info for me to work ' +
                    'with, sorry.';
            }
            let citedrule = citedrules[0];
            if (!(citedrule in rules)) {
                return 'There is no such rule as ' + citedrule;
            }
            let ruleinfo = rules[citedrule];
            if (ruleinfo.meinongian) {
                return 'The rule ' + citedrule + ' does not exist. ' +
                    (rules[citedrule].hint ?? '');
            }
            if (ruleinfo.showrule) {
                return 'Show rules may only be used on show lines.';
            }
            if (ruleinfo.premiserule) {
                return 'You should never try to insert your own premises.';
            }
            if (ruleinfo.assumptionrule) {
                if (nums.length > 0) {
                    return 'You do not need line numbers for an assumption.';
                }
                // try to figure out what the right assumption would be
                let sl = this.lastline.mysubderiv.showline;
                if (!sl) { return 'No assumption is allowed here.'; }
                if (sl.j == 'ID' || sl.j == '∃D' || sl.j == '∨D' ||
                    sl.j == '~D') {
                    let slf = Formula.from(sl.s);
                    let goodassume = '~' + slf.wrapifneeded();
                    if (slf.op == '~') {
                        goodassume = slf.right.normal;
                    }
                    return 'For ' + sl.j + ', your assumption should be the opposite ' +
                        'of the show line, viz., ' + goodassume;
                }
                return 'No assumption is allowed in a ' + sl.j + '.';
            }
            // should be regular rule
            let forms = ruleinfo.forms;
            let enough = [];
            if (!forms) { return 'Weird. That rule has no forms.'; }
            for (let form of forms) {
                enough.push( (form.prems.length == nums.length) );
            }
            let any = enough.reduce((x,y) => (x||y));
            if (!any) {
                return 'You are not citing the correct number of ' +
                    'lines for the rule ' + citedrule + '.';
            }
            for (const form of forms) {
                let ffit = (new formFit(
                    ruleinfo, citedrule, form, this.lastline)
                );
                ffit.checkPrems();
                if (ffit.possible) {
                    return 'It is possible to use rule ' +
                        citedrule + ' with those line numbers. ' +
                        'Look at the rule chart to see ' +
                        'what you get based on the form.';
                }
            }
            return 'You cannot use those lines ' +
                'with that rule here. Something needs ' +
                'to change.';
        }
        if (this.lastline.j == '') {
            let f = Formula.from(this.lastline.s);
            if (!f.wellformed) {
                return 'The formula “' + s + '” is not ' +
                    'well-formed. Can you fix it?';
            }
            // check if good assumption
            let sl = this.lastline.mysubderiv.showline;
            if (!sl) { return stumpedAnswer; }
            if (sl.j == 'CD') {
                if (f.normal == Formula.from(sl.s).left.normal) {
                    return 'The last line looks like an assumption. '+
                        'Fill that in for its justification.';
                }
            }
            if (sl.j == 'ID' ||
                sl.j == '~D' ||
                sl.j == '∨D' ||
                sl.j == '∃D') {
                let slf = Formula.from(sl.s);
                if (slf.normal == '~' + f.wrapifneeded() ||
                    '~' + slf.wrapifneeded() == f.normal) {
                    return 'The last line looks like an assumption. ' +
                        'Fill in that in for its justification.';
                }
            }
            // check all good rules!
            for (const rule in rules) {
                let ruleinfo = rules[rule];
                if (ruleinfo.meinongian ||
                    ruleinfo.showrule ||
                    ruleinfo.premiserule ||
                    ruleinfo.assumptionrule) {
                    continue;
                }
                if (!ruleinfo.forms) { continue; }
                for (const form of ruleinfo.forms) {
                    let ffit = (new formFit(
                        ruleinfo, rule, form, this.lastline));
                    ffit.checkConc();
                    if (!ffit.possible) {
                        continue;
                    }
                    let concAssign = JSON.stringify(
                        ffit.assigns
                    );
                    let numprems = form.prems.length;
                    if (numprems < 1 || numprems > 2) { continue; }
                    let allAvail = this.getAllAvailTo(this.lastline);
                    this.lastline.citedsubderivs = [];
                    this.lastline.citedlines = [];
                    for (let a of allAvail) {
                        ffit.assigns = JSON.parse(concAssign);
                        ffit.possible = true;
                        this.lastline.citedlines = [a];
                        if (numprems == 1) {
                            ffit.checkPrems();
                            let newness = ffit.checkNewness();
                            if (!newness) { ffit.possible = false; }
                            if (ffit.possible) {
                                return 'You can obtain this formula ' +
                                    'from line ' + a.n +
                                    ' with the rule ' + rule + '.';
                            }
                            continue;
                        }
                        for (let b of allAvail) {
                            ffit.possible = true;
                            this.lastline.citedlines = [a, b];
                            ffit.checkPrems();
                            if (ffit.possible) {
                                let x = parseInt(a.n);
                                let y = parseInt(b.n);
                                if (y < x) {
                                    x = parseInt(b.n);
                                    y = parseInt(a.n);
                                }
                                return 'You can obtain this formula ' +
                                    'from lines ' + x.toString() + ' and ' +
                                    y.toString() + ' with the rule ' +
                                    rule + '.';
                            }
                        }
                    }
                }
            }
            return 'It is not possible to obtain '
                + this.lastline.s + ' directly from the ' +
                'currently available lines.';
        }
        return regularHint();
    }

    fillShowLineHint() {
        if (this.lastline.j == '') {
            let f = Formula.from(this.lastline.s);
            if (!f.wellformed) {
                return 'What you have for the SHOW line is ' +
                    'not a well-formed formula. Can you fix it?';
            }
            if (!f.op) {
                if (this.ruleIsAvail('ID')) {
                    return 'When in doubt, try ID to prove ' +
                        'an atomic formula.';
                } else {
                    return 'Try to show this by DD, maybe?';
                }
            }
            if (f.op == '✖') {
                return '✖ can only be shown by DD.';
            }
            let wantedSR = showRuleFor[f.op];
            if (!wantedSR) {
                return 'Sorry, I don’t understand that formula.';
            }
            if (this.ruleIsAvail(wantedSR)) {
                return 'Usually the best way to prove a ' +
                    f.op + '-formula is by ' + wantedSR + '.';
            }
            return 'Maybe try to show this by DD?';
        }
        if (this.lastline.s == '') {
            let parentShowLine =
                this.lastline.mysubderiv.parentderiv.showline;
            if (!parentShowLine) {
                return stumpedAnswer;
            }
            if (parentShowLine.j == 'CD') {
                return 'Since we started a CD, we now need to ' +
                    'show the consequent (then-part) of the earlier ' +
                    'show line.';
            }
            if (parentShowLine.j == 'ID' ||
                parentShowLine.j == '∃D' ||
                parentShowLine.j == '~D' ||
                parentShowLine.j == '∨D'
            ) {
                return 'Since we started an ID, we now need to show ✖.';
            }
            if (parentShowLine.j == '↔D') {
                return 'In a ↔D, we need to show the one-way conditionals ' +
                    '(→-statements) in each direction.';
            }
            if (parentShowLine.j == '&D') {
                return 'In a &D, we need to show each conjunct (each half) of ' +
                    'the &-statement individually.';
            }
            if (parentShowLine.j == 'UD') {
                return 'In a UD, we need to show an instance of the ∀-statement ' +
                    'but using a new name.';
            }
            return 'Sometimes it makes sense to put in a show line to ' +
                'show something it would be useful to have to complete the ' +
                'derivation. Examples include showing the antecedent ' +
                '(if-part) or negation of the consequent (then-part) of a ' +
                'conditional to set up →O, or showing the negation of one ' +
                'disjunct (one side) of a disjunction to set up ∨O. Is that ' +
                'what you’re doing?';
        }
        return regularHint();
    }

    getAllAvailTo(line) {
        let rv = [];
        for (let checkline of this.deriv.lines) {
            if (parseInt(checkline.n) >= parseInt(line.n)) {
                break;
            }
            if (this.dc.isAvailableLineTo(
                parseInt(checkline.n), line)) {
                rv.push(checkline);
            }
        }
        return rv;
    }

    getAllTerms() {
        let rv = [];
        if (!this.workingAvailLines) { return rv; }
        // we also need to consider terms only found in showline
        let revShowLines = [];
        for (let line of this.workingAvailLines) {
            if (line.mysubderiv && line.mysubderiv.showline) {
                if (revShowLines.indexOf(line.mysubderiv.showline) === -1) {
                    revShowLines.push(line.mysubderiv.showline);
                }
            }
        }
        for (let line of this.workingAvailLines.concat(revShowLines)) {
            if (!line.s) { continue; }
            let tt = Formula.from(line.s).terms.split('');
            tt = tt.filter((t) => (!syntax.isvar(t)));
            rv = arrayUnion(rv, tt);
        }
        return rv;
    }

    getWorkingSubderiv(deriv) {
        // check derivation type
        let dtype = deriv?.showline?.j ?? false;
        // if ID or similar then look for inner showline
        // if found, then look in its subderivation
        if (dtype == 'ID' || dtype == '∃D' ||
            dtype == '~D' || dtype == '∨D') {
            let f = Formula.from(deriv.showline.s);
            let pp = deriv.parts;
            for (let p of pp) {
                if (p.parts && p.showline) {
                    if (Formula.from(p.showline.s).normal == '✖') {
                        return this.getWorkingSubderiv(p);
                    }
                }
            }
            return [deriv, 'To set up a ' + dtype + ' you must ' +
                'assume the opposite and then put in a new show ' +
                'line for ✖.', true];
        }
        // similar with CD
        if (dtype == 'CD') {
            let f = Formula.from(deriv.showline.s);
            let pp = deriv.parts;
            for (let p of pp) {
                if (p.parts && p.showline) {
                    let g = Formula.from(p.showline.s).normal;
                    if (g == f?.right?.normal) {
                        return this.getWorkingSubderiv(p);
                    }
                }
            }
            return [deriv, 'To set up a CD, you must assume ' +
                'the antecedent (if-part), and put in a new show ' +
                'line for the consequent (then-part).', true];
        }
        // similar with UD
        if (dtype == 'UD') {
            let f = Formula.from(deriv.showline.s);
            let pp = deriv.parts;
            for (let p of pp) {
                if (p.parts && p.showline) {
                    let g = Formula.from(p.showline.s);
                    let tt = g.terms;
                    for (let i=0; i<tt.length; i++) {
                        let t = g.terms.at(i);
                        if (f.right.instantiate(f.boundvar, t)
                            == g.normal) {
                            return this.getWorkingSubderiv(p);
                        }
                    }
                }
            }
            return [deriv, 'To set up a UD, you need a new show ' +
                'line with an instance of the ∀-statement using a ' +
                'new name.', true];
        }
        // for DD we need to make show lines for both sides found
        if (dtype == '&D') {
            let f = Formula.from(deriv.showline.s);
            let slfound = [ false, false ];
            let pp = deriv.parts;
            for (let p of pp) {
                if (p.parts && p.showline) {
                    let g = Formula.from(p.showline.s).normal;
                    if (g == f?.left?.normal || g == f?.right?.normal) {
                        if (g == f?.left?.normal) { slfound[0] = true; };
                        if (g == f?.right?.normal) { slfound[1] = true; };
                        let [x, y, z] = this.getWorkingSubderiv(p);
                        if (x !== false) {
                            return [x, y, z];
                        }
                    }
                }
            }
            if (slfound[0] && slfound[1]) {
                return [false, false, false];
            }
            return [deriv, 'To complete a &D, you should put in ' +
                'show lines for both conjuncts separately, and ' +
                'complete their subderivations.', true];
        }
        // similar with ↔D
        if (dtype == '↔D') {
            let f = Formula.from(deriv.showline.s);
            let slfound = [ false, false ];
            let pp = deriv.parts;
            for (let p of pp) {
                if (p.parts && p.showline) {
                    let g = Formula.from(p.showline.s).normal;
                    let wayone = (f?.left?.wrapifneeded() ?? '') + ' → ' +
                        (f?.right?.wrapifneeded() ?? '');
                    let waytwo = (f?.right?.wrapifneeded() ?? '') + ' → ' +
                        (f?.left?.wrapifneeded() ?? '');
                    if (g == wayone || g == waytwo) {
                        if (g == wayone) { slfound[0] = true; };
                        if (g == waytwo) { slfound[1] = true; };
                        let [x, y, z] = this.getWorkingSubderiv(p);
                        if (x !== false) {
                            return [x, y, z];
                        }
                    }
                }
            }
            if (slfound[0] && slfound[1]) {
                return [false, false, false];
            }
            return [deriv, 'To complete a ↔D, you should put in ' +
                'show lines for each one-way → statement separately, ' +
                'and complete their subderivations.', true];
        }
        // should either be DD or main deriv
        let foundconc = false;
        let needednorm = false;
        if (dtype == 'DD') {
            let neededs = deriv?.showline?.s ?? false;
            if (neededs) {
                needednorm = Formula.from(neededs).normal;
            }
        }
        // check parts now
        let pp = deriv.parts;
        for (let p of pp) {
            // check any internal
            if (p.parts && p.showline) {
                let [x, y, z] = this.getWorkingSubderiv(p);
                if (x !== false) {
                    return [x, y, z];
                }
            }
            if (p.s) {
                let g = Formula.from(p.s).normal;
                if (g == needednorm) {
                    foundconc = true;
                }
            }
        }
        // no more work needs doing here, return all false
        if (foundconc) { return [false, false, false]; }
        // could not find what was needed, so this is working deriv
        return [deriv, needednorm, false];
    }

    output() {
        // find last line
        if (!this.lastlinefilled) {
            let lasti = this.deriv.lines.length - 1;
            while (this.deriv.lines[lasti].j == '' &&
                this.deriv.lines[lasti].s == '' &&
                lasti > 0) {
                lasti--;
            }
            this.lastline = this.deriv.lines[lasti];
            if (!this.lastline) {
                return 'I’m just as confused as you. Sorry.';
            }
            if (this.lastline.isshowline) {
                return this.fillShowLineHint();
            }
            return this.fillRegLineHint();
        }
        return this.regularHint();
    }

    regularHint() {
        // determine last incomplete derivation
        let [workingsubderiv, whatisneeded, showlineneeded] =
            this.getWorkingSubderiv(this.deriv);
        // if not set up right; we give a hint about that
        if (showlineneeded) {
            return whatisneeded;
        }
        this.workingsubderiv = workingsubderiv;
        this.whatisneeded = whatisneeded;
        // determine last available line of working deriv
        this.workingline = workingsubderiv.parts[
            workingsubderiv.parts.length - 1
        ];
        let thingyToCheck = this.workingline;
        if (this.workingline.parts && this.workingline.showline) {
            this.workingline = this.workingline.showline;
        }
        // get all lines available to it
        this.workingAvailLines = this.getAllAvailTo(thingyToCheck);
        // add working line
        if (this.workingAvailLines.indexOf(this.workingline) === -1) {
            this.workingAvailLines.push(this.workingline);
        }
        // see if showline is imminent
        let imminent = this.canIGet(whatisneeded);
        // all answers but false should be description of how to get it
        if (imminent !== false) {
            return imminent + ' This will complete the subderivation.';
        }
        // CHUGALUGALUG
        // keep track of desirable things; include showline in a DD
        this.wouldBeNice = [{
            want: whatisneeded,
            reason: 'to finish the subderivation',
            dmable: false
        }];
        // look for unapplied out-rules
        ///////////////////////////////////////// OUTRULE APPLY
        let repd = false; // TODO
        for (const line of this.workingAvailLines) {
            let f = Formula.from(line.s);
            // nothing to do for simple statements
            if (!f.op) { continue; }
            // we will handle Universals later
            if (f.op == '∀') { continue; }
            // shouldn't be here since everything follows
            // from so should have been imminent, but what the hey
            if (f.op == '✖') {
                if (this.ruleIsAvail('✖O')) {
                    return 'You have ✖ and anything follows from ✖O.';
                }
                continue;
            }
            // check if rule is available
            let rule = (f.op + 'O');
            if (f.op == '~') {
                // add to wouldBeNice if whatisneeded is ✖
                if (f.right && whatisneeded == '✖') {
                    this.wouldBeNice.push({
                        want: f.right.normal,
                        reason: 'to get a contradiction with what you already have',
                        dmable: false
                    });
                }
                if (!f.right.op) {
                    // no out rule for negations of atomics
                    continue;
                } else {
                    if (f.right.op == '✖') {
                        // no such rule as ~✖O
                        continue;
                    }
                    if (f.right.op == '~') {
                        rule = 'DN';
                    } else {
                        rule = '~' + f.right.op + 'O';
                    }
                }
            }
            if (!this.ruleIsAvail(rule)) {
                continue;
            }
            // check if out-rule already applied
            let applied = this.checkIfOutRuleApplied(f);
            if (applied) { continue; }
            // check if we have partner premise for →O, ∨O
            let partnerat = false;
            if (f.op == '∨' || f.op == '→') {
                let partners = [];
                if (f.op == '∨') {
                    partners = [
                        '~' + f.left.wrapifneeded(),
                        '~' + f.right.wrapifneeded()
                    ]
                }
                if (f.op == '→') {
                    partners = [
                        f.left.normal,
                        '~' + f.right.wrapifneeded()
                    ];
                }
                lineloop: for (let sl of this.workingAvailLines) {
                    for (let alt of partners) {
                        let slf = Formula.from(sl.s).normal;
                        if (slf == alt) {
                            partnerat = sl.n
                            break lineloop;
                        }
                    }
                }
                // couldn't find partner, add to would be nice
                if (partnerat === false) {
                    for (let alt of partners) {
                        this.wouldBeNice.push({
                            want: alt,
                            dmable: true,
                            reason: 'to be able to use line ' + line.n
                        });
                    }
                    // move to next line
                    continue;
                }
            }
            // if we made it here, out rule should be available
            let rv = 'You can apply ' + rule + ' to line ' +
                line.n;
            if (partnerat !== false) {
                rv += ' with line ' + partnerat
            }
            rv += '.';
            return rv;
        }
        //////////////////////////// END REGULAR OUTRULE APPLY
        // ###################################### IN RULES
        this.dmable = this.wouldBeNice.filter((e) => (e.dmable));
        while (this.wouldBeNice.length > 0) {
            let newNice = [];
            for (let desired of this.wouldBeNice) {
                let canget = this.canIGet(desired.want);
                if (canget !== false) {
                    return canget + ' This is needed ' +
                        desired.reason + '.';
                }
                let f = Formula.from(desired.want);
                // no new desire for atomics and splat
                if (!f.op || f.op == '✖') {
                    continue;
                }
                // can get double negations with in rules, but
                // no other negations
                if (f.op == '~') {
                    if (f.right.op == '~') {
                        if (!this.ruleIsAvail("DN")) { continue; }
                        newNice.push({
                            reason: 'to then get ' + desired.want +
                                ' by DN, ' +  desired.reason,
                            want: f.right.right.normal,
                            dmable: false
                        });
                    }
                    continue;
                }
                if (f.op == '∨') {
                    if (!this.ruleIsAvail("∨I")) { continue; }
                    for (const s of [f.left.normal, f.right.normal]) {
                        newNice.push({
                            reason: 'to then get ' + desired.want +
                                ' by vI, ' + desired.reason,
                            want: s,
                            dmable: false
                        });
                    }
                }
                if (f.op == '∃') {
                    if (!this.ruleIsAvail("∃I")) { continue; }
                    let tt = this.getAllTerms();
                    for (const t of tt) {
                        newNice.push({
                            reason: 'to then get ' + desired.want +
                                ' by ∃I, ' + desired.reason,
                            want: f.right.instantiate(f.boundvar, t),
                            dmable: false
                        });
                    }
                }
                if (f.op == '&' || f.op == '↔') {
                    if (!this.ruleIsAvail(f.op + 'I')) {
                        continue;
                    }
                    let sides = [];
                    let sidesneeded = [ true, true ];
                    if (f.op == '↔') {
                        sides = [
                            f.left.wrapifneeded() + ' → ' +
                                f.right.wrapifneeded(),
                            f.right.wrapifneeded() + ' → ' +
                                f.left.wrapifneeded()
                        ]
                    }
                    if (f.op == '&') {
                        sides = [f.left.normal, f.right.normal];
                    }
                    // don't suggest getting half we already have 
                    for (let sline of this.workingAvailLines) {
                        if (!sline.s) { continue; }
                        let here = Formula.from(sline.s);
                        for (let i of [0,1]) {
                            if (here.normal == sides[i]) {
                                sidesneeded[i] = false;
                            }
                        }
                    }
                    // finally add needed side
                    for (let i of [0,1]) {
                        if (!sidesneeded[i]) { continue; }
                        newNice.push({
                            want: sides[i],
                            reason: 'to help get ' + desired.want +
                                ' by ' + f.op + 'I, ' + desired.reason,
                            dmable: false
                        });
                    }
                }
            }
            this.wouldBeNice = newNice;
        }
        // ##################################### END IN RULES
        // ∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀ UNIV OUT
        let allTerms = this.getAllTerms();
        let considerRandomInstantiation = (allTerms.length == 0);
        let firstUniv = false;
        // find universals and count instances for each
        let termsneeded = {};
        for (const line of this.workingAvailLines) {
            if (!line.s) { continue; }
            let f = Formula.from(line.s);
            let fn = f.normal;
            if (!f.op || f.op != '∀') { continue; }
            // save first universal for possible random instantiation
            if (!firstUniv) { firstUniv = f; }
            termloop: for (const t of allTerms) {
                for (const sline of this.workingAvailLines) {
                    if (!sline.s) { continue; }
                    let g = Formula.from(sline.s);
                    if (g.normal == f.right.instantiate( f.boundvar, t)) {
                        continue termloop;
                    }
                }
                if (!(fn in termsneeded)) {
                    termsneeded[fn] = [];
                }
                termsneeded[fn].push(t);
            }
        }
        // apply to universals with least applications so far
        for (let n = allTerms.length; n > 0; n--) {
            for (let w in termsneeded) {
                if (termsneeded[w].length == n) {
                    return w + ' says something about everything, ' +
                        'which includes ' + termsneeded[w].join(' and ') +
                        ' — consider using ∀O.';
                }
            }
        }
        // ∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀∀ END UNIV OUT
        // Desoerate Measures -----------------
        if (this.dmable.length > 0) {
            return 'Desperate times call for desperate measures. ' +
                'Sometimes it is necessary to add a show line ' +
                'to get something that will set up doing a →O or ∨O; ' +
                'for example, try SHOW: ' + this.dmable[0].want +
                ' to get what you need ' + this.dmable[0].reason + '.';
        }
        // -------------------- end DM
        // Check for contradiction to get anything
        for (let line of this.workingAvailLines) {
            if (!line.s) { continue; }
            let f = Formula.from(line.s);
            // only consider negations
            if (!f.op || f.op != '~') {
                continue;
            }
            for (let compline of this.workingAvailLines) {
                if (!compline.s) { continue; }
                let g = Formula.from(compline.s);
                if (f.normal == '~' + g.wrapifneeded()) {
                    let l = parseInt(line.n);
                    let m = parseInt(compline.n);
                    let o = Math.min(l,m).toString();
                    let p = Math.max(l,m).toString();
                    if (this.ruleIsAvail('✖O')) {
                        return 'Lines ' + o + ' and ' + p +
                            ' contradict. You can get ✖ from them ' +
                            ' and use ✖O to get whatever you want.';
                    } else {
                        // ercommend strategy via ∨Ǐ, ∨O
                        return 'What rule allows you to add ' +
                            'whatever you want as a disjunct to ' +
                            'a formula you already have?';
                    }
                }
            }
        }
        // random instantiate
        if (considerRandomInstantiation && firstUniv) {
            return 'I don’t usually recommend applying ∀O when ' +
                'there’s no old name/constant in the problem, but ' +
                'this may be an exception. Consider ∀O on ' +
                firstUniv.normal + ' using a name/constant of ' +
                'your choice.';
        }
        return stumpedAnswer;
    }

    ruleIsAvail(r) {
        // meinongian rules are never available
        if ("meinongian" in rules[r]) { return false; }
        // if useonlyrules set, it must be among them
        if ("useonlyrules" in this.options) {
            return (this.options.useonlyrules.indexOf(r) !== -1);
        }
        // if exclude rules set, it cannot be among them
        if ("excluderules" in this.options) {
            return (this.options.excluderules.indexOf(r) === -1);
        }
        // useable otherwise
        return true;
    }
}
