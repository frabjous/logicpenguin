// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////// supercharge/derivation-hardegree-hint.js //////////////////
// gives the student a hint if asked for, by applying out rules where  //
// possible, checking for things you want, etc., but really doing a    //
// tableaux indirect proof by default                                  //
/////////////////////////////////////////////////////////////////////////

//TODO: allow other notations

// TODO? it is probably best for hints to be specific to this ruleset,
// but I may need to change how it's loaded
import getRules from '../checkers/rules/hardegree-rules.js';
import getFormulaClass from '../symbolic/formula.js';
import { default as DerivationCheck, formFit } from '../checkers/derivation-check.js';
import { justParse } from '../ui/justification-parse.js';
import { arrayUnion } from '../misc.js';

export function showRuleFor(syntax, op) {
    const symbols = syntax.symbols;
    const possvalues = {
        OR : "ID",
        AND : symbols.AND + "D",
        NOT : "ID",
        IFTHEN : "CD",
        IFF: symbols.IFF + "D",
        FORALL: "UD",
        EXISTS: "ID",
        FALSUM: "DD"
    }
    return possvalues[op];
}

export function outRuleResults(syntax, op) {
    const symbols = syntax.symbols;
    const operators = syntax.operators;
    const possvalues = {
        OR: (f) => ([[f.left.normal, f.right.normal]]),
        AND: (f) => ([[f.left.normal], [f.right.normal]]),
        IFTHEN: (f) => ([[symbols.NOT + f.left.wrapifneeded(), f.right.normal]]),
        IFF: (f) => ([
            [f.left.wrapifneeded() + ' ' + symbols.IFTHEN +
                ' ' + f.right.wrapifneeded()],
            [f.right.wrapifneeded() + ' ' + symbols.IFTHEN +
                ' ' + f.left.wrapifneeded()]
        ]),
        ALL: (f) => (['special']),
        EXISTS: (f) => (['instance']),
        FALSUM: (f) => ([]),
        NOT: (f) => {
            switch(f.right.op) {
                case false:
                    return symbols.FALSUM;
                    break;
                case symbols.OR:
                    return [
                        [symbols.NOT + f.right.left.wrapifneeded()],
                        [symbols.NOT + f.right.right.wrapifneeded()]
                    ];
                    break;
                case symbols.AND:
                    return [[
                        f.right.left.wrapifneeded() + ' ' +
                        symbols.IFTHEN + ' ' + symbols.NOT +
                        f.right.right.wrapifneeded()
                    ]];
                    break;
                case symbols.IFTHEN:
                    return [[
                        f.right.left.wrapifneeded() + ' ' +
                        symbols.AND + ' ' + symbols.NOT +
                        f.right.right.wrapifneeded()
                    ]];
                    break;
                case symbols.IFF:
                    return [[
                        symbols.NOT + f.right.left.wrapifneeded() + ' ' +
                        symbols.IFF + ' ' + f.right.right.wrapifneeded()
                    ]];
                    break;
                case symbols.NOT:
                    return [[ f.right.right.normal ]];
                    break;
                case symbols.FORALL:
                    return [[ symbols.EXISTS + f.right.boundvar +
                        symbols.NOT + f.right.right.wrapifneeded()
                    ]];
                    break;
                case symbols.EXISTS:
                    return [[ symbols.FORALL + f.right.boundvar +
                        symbols.NOT + f.right.right.wrapifneeded()
                    ]];
                    break;
                default: return false;
            }
            return false;
        }
    }
    return possvalues[operators[op]];
}

export const stumpedAnswer = 'Sorry, I’m stumped. Maybe the derivation ' +
    'went in the wrong direction earlier. (Hey don’t look at me!) ' +
    'Start over, perhaps?';

export default class hardegreeDerivationHint {

    // give the hint object the properties it needs and analyze and
    // check the derivation
    constructor(probinfo, options, lastlinefilled) {
        this.deriv = probinfo;
        this.options = options;
        // note this will always run in the browser, so we needn't bother
        // looking for process.appsettings.defaultnotation
        this.notationname = options?.notation ?? 'hardegree';
        this.Formula = getFormulaClass(this.notationname);
        this.syntax = this.Formula.syntax;
        this.symbols = this.syntax.symbols;
        this.rules = getRules(this.notationname);
        this.lastlinefilled = lastlinefilled;
        this.dc = new DerivationCheck(this.notationname, this.rules,
            this.deriv, [], '', false, true);
        this.dc.analyze(this.deriv);
    }

    // checks if a certain formula string an be obtained by the rules
    // right away, either returns false or a hint about how to get it
    canIGet(s) {
        const rules=this.rules;
        if (!this.workingline) { return false; }
        if (!("workingAvailLines" in this)) { return false; }
        const allAvail = this.workingAvailLines;
        // emulate a new line to see if it were a correct one
        const pseudoline = {
            s: s,
            isshowline: false,
            mysubderiv: this.workingsubderiv
        }
        // check each rule
        for (const rule in rules) {
            const ruleinfo = rules[rule];
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
                const ff = new formFit(
                    ruleinfo, rule, form, pseudoline, this.Formula);
                ff.checkConc();
                if (!ff.possible) { continue; }
                const concAssign = JSON.stringify(ff.assigns);
                const numprems = form.prems.length ?? 0;
                if (numprems < 1 || numprems > 2) { continue; }
                pseudoline.citedsubderivs = [];
                pseudoline.citedlines = [];
                for (const a of allAvail) {
                    ff.assigns = JSON.parse(concAssign);
                    ff.possible = true;
                    pseudoline.citedlines = [a];
                    if (numprems == 1) {
                        ff.checkPrems();
                        const newness = ff.checkNewness();
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
                            const x = Math.min(
                                parseInt(a.n), parseInt(b.n)
                            ).toString();
                            const y = Math.max(
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
        const symbols = this.symbols;
        const Formula = this.Formula;
        const allAvail = this.workingAvailLines;
        if (!allAvail) { return false; }
        // lookingFor is an array of arrays
        // each element is something that must be found, but
        // what is found could be any element of array
        let lookingFor = [[]];
        if (f.op) {
            const lfGetter = outRuleResults(this.syntax, f.op);
            if (!lfGetter) { return false; }
            lookingFor = lfGetter(f);
        } else {
            lookingFor = [[symbols.FALSUM]]
        }
        for (const sline of allAvail) {
            const sf = Formula.from(sline.s);
            // filter looking for by removing found components
            // NOTE: because we are filtering, we return false when
            // found
            lookingFor = lookingFor.filter((lookset) => {
                if (lookset === 'instance') {
                    if (Formula.isInstanceOf(sf, f)) {
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
        const symbols = this.symbols;
        const Formula = this.Formula;
        const rules = this.rules;
        // if the formula string is not filled in (but maybe justificaiton is)
        if (this.lastline.s == '') {
            const { nums, ranges, citedrules } = justParse(this.lastline.j);
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
                    for (const rule of [
                            symbols.IFTHEN + 'O',
                            symbols.OR + 'O',
                            symbols.IFF + 'I'
                        ]) {
                        const ruleinfo = rules[rule];
                        const forms = ruleinfo.forms;
                        for (const form of forms) {
                            const ffit = (new formFit(
                                ruleinfo, rule, form, this.lastline,
                                this.Formula
                            ));
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
            const citedrule = citedrules[0];
            if (!(citedrule in rules)) {
                return 'There is no such rule as ' + citedrule;
            }
            const ruleinfo = rules[citedrule];
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
                const sl = this.lastline.mysubderiv.showline;
                if (!sl) { return 'No assumption is allowed here.'; }
                if (sl.j == 'ID' || sl.j == (symbols.EXISTS + 'D') ||
                    sl.j == (symbols.OR + 'D') || 
                    sl.j == (symbols.NOT + 'D')) {
                    const slf = Formula.from(sl.s);
                    let goodassume = symbols.NOT + slf.wrapifneeded();
                    if (slf.op == symbols.NOT) {
                        goodassume = slf.right.normal;
                    }
                    return 'For ' + sl.j + ', your assumption should be the opposite ' +
                        'of the show line, viz., ' + goodassume;
                }
                return 'No assumption is allowed in a ' + sl.j + '.';
            }
            // should be regular rule
            const forms = ruleinfo.forms;
            const enough = [];
            if (!forms) { return 'Weird. That rule has no forms.'; }
            for (const form of forms) {
                enough.push( (form.prems.length == nums.length) );
            }
            const any = enough.reduce((x,y) => (x||y));
            if (!any) {
                return 'You are not citing the correct number of ' +
                    'lines for the rule ' + citedrule + '.';
            }
            for (const form of forms) {
                const ffit = (new formFit(
                    ruleinfo, citedrule, form, this.lastline, this.Formula
                ));
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
            const f = Formula.from(this.lastline.s);
            if (!f.wellformed) {
                return 'The formula “' + s + '” is not ' +
                    'well-formed. Can you fix it?';
            }
            // check if good assumption
            const sl = this.lastline.mysubderiv.showline;
            if (!sl) { return stumpedAnswer; }
            if (sl.j == 'CD') {
                if (f.normal == Formula.from(sl.s).left.normal) {
                    return 'The last line looks like an assumption. '+
                        'Fill that in for its justification.';
                }
            }
            if (sl.j == 'ID' ||
                sl.j == (symbols.NOT + 'D') ||
                sl.j == (symbols.OR + 'D') ||
                sl.j == (symbols.EXISTS + 'D')) {
                const slf = Formula.from(sl.s);
                if (slf.normal == (symbols.NOT + f.wrapifneeded()) ||
                    (symbols.NOT + slf.wrapifneeded()) == f.normal) {
                    return 'The last line looks like an assumption. ' +
                        'Fill in that in for its justification.';
                }
            }
            // check all good rules!
            for (const rule in rules) {
                const ruleinfo = rules[rule];
                if (ruleinfo.meinongian ||
                    ruleinfo.showrule ||
                    ruleinfo.premiserule ||
                    ruleinfo.assumptionrule) {
                    continue;
                }
                if (!ruleinfo.forms) { continue; }
                for (const form of ruleinfo.forms) {
                    const ffit = (new formFit(
                        ruleinfo, rule, form, this.lastline, this.Formula
                    ));
                    ffit.checkConc();
                    if (!ffit.possible) {
                        continue;
                    }
                    const concAssign = JSON.stringify(ffit.assigns);
                    const numprems = form.prems.length;
                    if (numprems < 1 || numprems > 2) { continue; }
                    const allAvail = this.getAllAvailTo(this.lastline);
                    this.lastline.citedsubderivs = [];
                    this.lastline.citedlines = [];
                    for (const a of allAvail) {
                        ffit.assigns = JSON.parse(concAssign);
                        ffit.possible = true;
                        this.lastline.citedlines = [a];
                        if (numprems == 1) {
                            ffit.checkPrems();
                            const newness = ffit.checkNewness();
                            if (!newness) { ffit.possible = false; }
                            if (ffit.possible) {
                                return 'You can obtain this formula ' +
                                    'from line ' + a.n +
                                    ' with the rule ' + rule + '.';
                            }
                            continue;
                        }
                        for (const b of allAvail) {
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
        return this.regularHint();
    }

    fillShowLineHint() {
        const Formula = this.Formula;
        const syntax = this.syntax;
        const symbols = this.symbols;
        if (this.lastline.j == '') {
            const f = Formula.from(this.lastline.s);
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
            if (f.op == symbols.FALSUM) {
                return symbols.FALSUM + ' can only be shown by DD.';
            }
            const wantedSR = showRuleFor(syntax, syntax.operators[f.op]);
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
            const parentShowLine =
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
                parentShowLine.j == (symbols.EXISTS + 'D') ||
                parentShowLine.j == (symbols.NOT + 'D') ||
                parentShowLine.j == (symbols.OR + 'D')
            ) {
                return 'Since we started an ID, we now need to show ' +
                    symbols.FALSUM + '.';
            }
            if (parentShowLine.j == (symbols.IFF + 'D')) {
                return 'In a ' + symbols.IFF + 'D, we need to show the one-way conditionals ' +
                    '(' + symbols.IFTHEN + '-statements) in each direction.';
            }
            if (parentShowLine.j == (symbols.AND + 'D')) {
                return 'In a ' + symbols.AND + ' D, we need to show each conjunct (each half) of ' +
                    'the ' + symbols.AND + '-statement individually.';
            }
            if (parentShowLine.j == 'UD') {
                return 'In a UD, we need to show an instance of the ' + symbols.FORALL +
                    '-statement but using a new name.';
            }
            return 'Sometimes it makes sense to put in a show line to ' +
                'show something it would be useful to have to complete the ' +
                'derivation. Examples include showing the antecedent ' +
                '(if-part) or negation of the consequent (then-part) of a ' +
                'conditional to set up ' + symbols.IFTHEN +
                'O, or showing the negation of one ' +
                'disjunct (one side) of a disjunction to set up ' +
                symbols.OR +
                'O. Is that what you’re doing?';
        }
        return this.regularHint();
    }

    getAllAvailTo(line) {
        const rv = [];
        for (const checkline of this.deriv.lines) {
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
        const Formula = this.Formula;
        let rv = [];
        if (!this.workingAvailLines) { return rv; }
        // we also need to consider terms only found in showline
        const revShowLines = [];
        for (const line of this.workingAvailLines) {
            if (line.mysubderiv && line.mysubderiv.showline) {
                if (revShowLines.indexOf(line.mysubderiv.showline) === -1) {
                    revShowLines.push(line.mysubderiv.showline);
                }
            }
        }
        for (const line of this.workingAvailLines.concat(revShowLines)) {
            if (!line.s) { continue; }
            let tt = Formula.from(line.s).terms;
            tt = tt.filter((t) => (!this.syntax.isvar(t)));
            rv = arrayUnion(rv, tt);
        }
        return rv;
    }

    getWorkingSubderiv(deriv) {
        const symbols = this.symbols;
        const Formula = this.Formula;
        // check derivation type
        const dtype = deriv?.showline?.j ?? false;
        // if ID or similar then look for inner showline
        // if found, then look in its subderivation
        if (dtype == 'ID' || dtype == (symbols.EXISTS + 'D') ||
            dtype == (symbols.NOT + 'D') || dtype == (symbols.OR + 'D')) {
            const f = Formula.from(deriv.showline.s);
            const pp = deriv.parts;
            for (const p of pp) {
                if (p.parts && p.showline) {
                    if (Formula.from(p.showline.s).normal == symbols.FALSUM) {
                        return this.getWorkingSubderiv(p);
                    }
                }
            }
            return [deriv, 'To set up a ' + dtype + ' you must ' +
                'assume the opposite and then put in a new show ' +
                'line for ' +symbols.FALSUM + '.', true];
        }
        // similar with CD
        if (dtype == 'CD') {
            const f = Formula.from(deriv.showline.s);
            const pp = deriv.parts;
            for (const p of pp) {
                if (p.parts && p.showline) {
                    const g = Formula.from(p.showline.s).normal;
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
            const f = Formula.from(deriv.showline.s);
            const pp = deriv.parts;
            for (const p of pp) {
                if (p.parts && p.showline) {
                    const g = Formula.from(p.showline.s);
                    const tt = g.terms;
                    for (let i=0; i<tt.length; i++) {
                        const t = g.terms[i];
                        if (f.right.instantiate(f.boundvar, t)
                            == g.normal) {
                            return this.getWorkingSubderiv(p);
                        }
                    }
                }
            }
            return [deriv, 'To set up a UD, you need a new show ' +
                'line with an instance of the ' + symbols.FORALL +
                '-statement using a new name.', true];
        }
        // for DD we need to make show lines for both sides found
        if (dtype == (symbols.AND + 'D')) {
            const f = Formula.from(deriv.showline.s);
            const slfound = [ false, false ];
            const pp = deriv.parts;
            for (const p of pp) {
                if (p.parts && p.showline) {
                    const g = Formula.from(p.showline.s).normal;
                    if (g == f?.left?.normal || g == f?.right?.normal) {
                        if (g == f?.left?.normal) { slfound[0] = true; };
                        if (g == f?.right?.normal) { slfound[1] = true; };
                        const [x, y, z] = this.getWorkingSubderiv(p);
                        if (x !== false) {
                            return [x, y, z];
                        }
                    }
                }
            }
            if (slfound[0] && slfound[1]) {
                return [false, false, false];
            }
            return [deriv, 'To complete a ' + symbols.AND + 'D, you should put in ' +
                'show lines for both conjuncts separately, and ' +
                'complete their subderivations.', true];
        }
        // similar with IFF D
        if (dtype == (symbols.IFF + 'D')) {
            const f = Formula.from(deriv.showline.s);
            const slfound = [ false, false ];
            const pp = deriv.parts;
            for (const p of pp) {
                if (p.parts && p.showline) {
                    const g = Formula.from(p.showline.s).normal;
                    const wayone = (f?.left?.wrapifneeded() ?? '') + ' ' + symbols.IFTHEN + ' ' +
                        (f?.right?.wrapifneeded() ?? '');
                    const waytwo = (f?.right?.wrapifneeded() ?? '') + ' ' + symbols.IFTHEN + ' ' +
                        (f?.left?.wrapifneeded() ?? '');
                    if (g == wayone || g == waytwo) {
                        if (g == wayone) { slfound[0] = true; };
                        if (g == waytwo) { slfound[1] = true; };
                        const [x, y, z] = this.getWorkingSubderiv(p);
                        if (x !== false) {
                            return [x, y, z];
                        }
                    }
                }
            }
            if (slfound[0] && slfound[1]) {
                return [false, false, false];
            }
            return [deriv, 'To complete a ' + symbols.IFF + 'D, you should put in ' +
                'show lines for each one-way ' + symbols.IFTHEN + ' statement separately, ' +
                'and complete their subderivations.', true];
        }
        // should either be DD or main deriv
        let foundconc = false;
        let needednorm = false;
        if (dtype == 'DD') {
            const neededs = deriv?.showline?.s ?? false;
            if (neededs) {
                needednorm = Formula.from(neededs).normal;
            }
        }
        // check parts now
        const pp = deriv.parts;
        for (const p of pp) {
            // check any internal
            if (p.parts && p.showline) {
                const [x, y, z] = this.getWorkingSubderiv(p);
                if (x !== false) {
                    return [x, y, z];
                }
            }
            if (p.s) {
                const g = Formula.from(p.s).normal;
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
            while ((!this.deriv.lines[lasti]?.j || this.deriv.lines[lasti].j == '') &&
                (!this.deriv.lines[lasti]?.s || this.deriv.lines[lasti].s == '') &&
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
            if (this.lastline.j == '' || this.lastline.s == '') {
                return this.fillRegLineHint();
            }
        }
        return this.regularHint();
    }

    regularHint() {
        const Formula = this.Formula;
        const symbols = this.symbols;
        // determine last incomplete derivation
        const [workingsubderiv, whatisneeded, showlineneeded] =
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
        const thingyToCheck = this.workingline;
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
        const imminent = this.canIGet(whatisneeded);
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
        for (const line of this.workingAvailLines) {
            const f = Formula.from(line.s);
            // nothing to do for simple statements
            if (!f.op) { continue; }
            // we will handle Universals later
            if (f.op == symbols.FORALL) { continue; }
            // shouldn't be here since everything follows
            // from so should have been imminent, but what the hey
            if (f.op == symbols.FALSUM) {
                if (this.ruleIsAvail(symbols.FALSUM + 'O')) {
                    return 'You have ' + symbols.FALSUM + ' and anything follows from ' + symbols.FALSUM + 'O.';
                }
                continue;
            }
            // check if rule is available
            let rule = (f.op + 'O');
            if (f.op == symbols.NOT) {
                // add to wouldBeNice if whatisneeded is falsum
                if (f.right && whatisneeded == symbols.FALSUM) {
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
                    if (f.right.op == symbols.FALSUM) {
                        // no such rule as ~ FALSUM O
                        continue;
                    }
                    if (f.right.op == symbols.NOT) {
                        rule = 'DN';
                    } else {
                        rule = symbols.NOT + f.right.op + 'O';
                    }
                }
            }
            if (!this.ruleIsAvail(rule)) {
                continue;
            }
            // check if out-rule already applied
            const applied = this.checkIfOutRuleApplied(f);
            if (applied) { continue; }
            // check if we have partner premise for arrow O, wedge O
            let partnerat = false;
            if (f.op == symbols.OR || f.op == symbols.IFTHEN) {
                let partners = [];
                if (f.op == symbols.OR) {
                    partners = [
                        symbols.NOT + f.left.wrapifneeded(),
                        symbols.NOT + f.right.wrapifneeded()
                    ]
                }
                if (f.op == symbols.IFTHEN) {
                    partners = [
                        f.left.normal,
                        symbols.NOT + f.right.wrapifneeded()
                    ];
                }
                lineloop: for (const sl of this.workingAvailLines) {
                    for (const alt of partners) {
                        const slf = Formula.from(sl.s).normal;
                        if (slf == alt) {
                            partnerat = sl.n
                            break lineloop;
                        }
                    }
                }
                // couldn't find partner, add to would be nice
                if (partnerat === false) {
                    for (const alt of partners) {
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
            const newNice = [];
            for (const desired of this.wouldBeNice) {
                const canget = this.canIGet(desired.want);
                if (canget !== false) {
                    return canget + ' This is needed ' +
                        desired.reason + '.';
                }
                const f = Formula.from(desired.want);
                // no new desire for atomics and splat
                if (!f.op || f.op == symbols.FALSUM) {
                    continue;
                }
                // can get double negations with in rules, but
                // no other negations
                if (f.op == symbols.NOT) {
                    if (f.right.op == symbols.NOT) {
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
                if (f.op == symbols.OR) {
                    if (!this.ruleIsAvail(symbols.OR + "I")) { continue; }
                    for (const s of [f.left.normal, f.right.normal]) {
                        newNice.push({
                            reason: 'to then get ' + desired.want +
                                ' by ' + symbols.OR + 'I, ' + desired.reason,
                            want: s,
                            dmable: false
                        });
                    }
                }
                if (f.op == symbols.EXISTS) {
                    if (!this.ruleIsAvail(symbols.EXISTS + "I")) { continue; }
                    const tt = this.getAllTerms();
                    for (const t of tt) {
                        newNice.push({
                            reason: 'to then get ' + desired.want +
                                ' by ' + symbols.EXISTS + 'I, ' + desired.reason,
                            want: f.right.instantiate(f.boundvar, t),
                            dmable: false
                        });
                    }
                }
                if (f.op == symbols.AND || f.op == symbols.IFF) {
                    if (!this.ruleIsAvail(f.op + 'I')) {
                        continue;
                    }
                    let sides = [];
                    const sidesneeded = [ true, true ];
                    if (f.op == symbols.IFF) {
                        sides = [
                            f.left.wrapifneeded() + ' ' + symbols.IFTHEN + ' ' +
                                f.right.wrapifneeded(),
                            f.right.wrapifneeded() + ' ' + symbols.IFTHEN + ' ' +
                                f.left.wrapifneeded()
                        ]
                    }
                    if (f.op == symbols.AND) {
                        sides = [f.left.normal, f.right.normal];
                    }
                    // don't suggest getting half we already have 
                    for (const sline of this.workingAvailLines) {
                        if (!sline.s) { continue; }
                        const here = Formula.from(sline.s);
                        for (const i of [0,1]) {
                            if (here.normal == sides[i]) {
                                sidesneeded[i] = false;
                            }
                        }
                    }
                    // finally add needed side
                    for (const i of [0,1]) {
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
        // ################################# UNIV OUT
        const allTerms = this.getAllTerms();
        const considerRandomInstantiation = (allTerms.length == 0);
        let firstUniv = false;
        // find universals and count instances for each
        const termsneeded = {};
        for (const line of this.workingAvailLines) {
            if (!line.s) { continue; }
            const f = Formula.from(line.s);
            const fn = f.normal;
            if (!f.op || f.op != symbols.FORALL) { continue; }
            // save first universal for possible random instantiation
            if (!firstUniv) { firstUniv = f; }
            termloop: for (const t of allTerms) {
                for (const sline of this.workingAvailLines) {
                    if (!sline.s) { continue; }
                    const g = Formula.from(sline.s);
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
            for (const w in termsneeded) {
                if (termsneeded[w].length == n) {
                    return w + ' says something about everything, ' +
                        'which includes ' + termsneeded[w].join(' and ') +
                        ' — consider using ' + symbols.FORALL + 'O.';
                }
            }
        }
        // ############################### END UNIV OUT
        // Desoerate Measures -----------------
        if (this.dmable.length > 0) {
            return 'Desperate times call for desperate measures. ' +
                'Sometimes it is necessary to add a show line ' +
                'to get something that will set up doing a ' + symbols.IFTHEN + 'O or ' + symbols.OR + 'O; ' +
                'for example, try SHOW: ' + this.dmable[0].want +
                ' to get what you need ' + this.dmable[0].reason + '.';
        }
        // -------------------- end DM
        // Check for contradiction to get anything
        for (const line of this.workingAvailLines) {
            if (!line.s) { continue; }
            const f = Formula.from(line.s);
            // only consider negations
            if (!f.op || f.op != symbols.NOT) {
                continue;
            }
            for (const compline of this.workingAvailLines) {
                if (!compline.s) { continue; }
                const g = Formula.from(compline.s);
                if (f.normal == symbols.NOT + g.wrapifneeded()) {
                    const l = parseInt(line.n);
                    const m = parseInt(compline.n);
                    const o = Math.min(l,m).toString();
                    const p = Math.max(l,m).toString();
                    if (this.ruleIsAvail(symbols.FALSUM + 'O')) {
                        return 'Lines ' + o + ' and ' + p +
                            ' contradict. You can get ' + symbols.FALSUM + ' from them ' +
                            ' and use ' + symbols.FALSUM + 'O to get whatever you want.';
                    } else {
                        // ercommend strategy via wedge Ǐ, wedge O
                        return 'What rule allows you to add ' +
                            'whatever you want as a disjunct to ' +
                            'a formula you already have?';
                    }
                }
            }
        }
        // random instantiate
        if (considerRandomInstantiation && firstUniv) {
            return 'I don’t usually recommend applying ' + symbols.FORALL + 'O when ' +
                'there’s no old name/constant in the problem, but ' +
                'this may be an exception. Consider ' + symbols.FORALL + 'O on ' +
                firstUniv.normal + ' using a name/constant of your choice.';
        }
        return stumpedAnswer;
    }

    ruleIsAvail(r) {
        const rules = this.rules;
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

