// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////// checkers/derivation-check.js ///////////////////////
// common function for checking a derivations and derivation lines    //
////////////////////////////////////////////////////////////////////////

import getFormulaClass from '../symbolic/formula.js';
import { justParse } from '../ui/justification-parse.js';
import { arrayUnion, perms } from '../misc.js';


export default class DerivationCheck {
    constructor(notationname, rules, deriv, prems, conc,
        thorough = false, numberedShowLines = false) {
        this.notationname = notationname;
        const Formula = getFormulaClass(notationname);
        this.Formula = Formula;
        this.syntax = Formula.syntax;
        this.rules = rules;
        this.deriv = deriv;
        this.prems = prems.map((p) => (Formula.from(p).normal));
        this.conc = Formula.from(conc).normal;
        this.thorough = thorough;
        this.pointsportion = 1;
        this.progresslines = 0;
        this.numberedShowLines = numberedShowLines;
        this.errors = {};
    }

    adderror(target, category, severity, desc) {
        if (!this.errors) {
            this.errors = {};
        }
        if (!this.errors[target]) {
            this.errors[target] = {};
        }
        if (!this.errors[target][category]) {
            this.errors[target][category] = {};
        }
        if (!this.errors[target][category][severity]) {
            this.errors[target][category][severity] = {};
        }
        if (this.errors[target][category][severity][desc]) {
            this.errors[target][category][severity][desc]++;
        } else {
            this.errors[target][category][severity][desc] = 1;
        }
        return this.errors;
    }

    amts = { high: 0.2, medium: 0.15, low: 0.1 };

    analyze(subderiv) {
        // don't analyze twice
        if (subderiv.analyzed) { return subderiv; }
        subderiv.lines = [];
        subderiv.lnmap = {};
        // process showline
        if (subderiv.showline &&
            (subderiv.showline?.j && subderiv.showline?.j != '') ||
            (subderiv.showline?.s && subderiv.showline?.s != '')) {
            subderiv.showline.mysubderiv = subderiv;
            if (this.numberedShowLines) {
                subderiv.lines.push(subderiv.showline);
                subderiv.showline.isshowline = true;
            }
            if (subderiv.showline.n && subderiv.showline.n != '') {
                subderiv.lnmap[subderiv.showline.n] = subderiv.showline;
            }
        }
        for (let p of subderiv?.parts) {
            // if a subderivation, get its analysis and merge
            if ("parts" in p) {
                p = this.analyze(p);
                p.parentderiv = subderiv;
                subderiv.lines = subderiv.lines.concat(p.lines);
                for (const ln in p.lnmap) {
                    if (ln in subderiv.lnmap) {
                        this.adderror(ln, "justification", "low",
                            "has the same line number as a line another " +
                            "subderivation");
                    } else {
                        subderiv.lnmap[ln] = p.lnmap[ln];
                    }
                }
                p.analyzed = true;
                continue;
            }
            // even empty lines get subderivs!
            p.mysubderiv = subderiv;
            // skip empty stuff
            if ((!p.s || p.s == '') && (!p.j || p.j == '')) {
                continue;
            }
            subderiv.lines.push(p);
            if (!p.n) {
                this.adderror('??', 'justification', 'low',
                    'not all lines have line numbers');
            } else {
                if (p.n in subderiv.lnmap) {
                    this.adderror(p.n, "justification", "low",
                        "has a duplicate line number");
                } else {
                    subderiv.lnmap[p.n] = p;
                }
            }
        }
        return subderiv;
    }

    checkConc() {
        let foundConc = false;
        const Formula = this.Formula;
        for (let pt of this.deriv.parts) {
            if (pt.showline &&
                (Formula.from(pt.showline.s).normal == this.conc)) {
                foundConc = true;
                break;
            }
            if (pt.s && Formula.from(pt.s).normal == this.conc) {
                foundConc = true;
                break;
            }
        }
        if (!foundConc) {
            this.adderror('1',"rule","high","final conclusion of " +
                "argument not shown");
        }
    }

    checkJustification(line) {
        // make sure there is one
        if (!line.j || line.j.trim() == '') {
            this.adderror(line.n, "justification", "high", "has no justification given");
            return line;
        }
        // parse it
        const { nums, ranges, citedrules } = justParse(line.j);
        // ensure availability of nums and ranges
        for (const num of nums) {
            if (num == '?') {
                this.adderror(line.n, 'justification', 'low', 'cites an unknown line number (?)');
                continue;
            }
            // just calling this function will add errors if it finds them
            const avail = this.isAvailableLineTo(num, line);
        }
        for (const [start, end] of ranges) {
            if ((/[?]/.test(start)) || (/[?]/.test(end))) {
                this.adderror(line.n, 'justification', 'low',
                    'cites a line number range with an unknown line number (?)');
                continue;
            }
            // just calling this function will add errors if it finds them
            const avail = this.isAvailableRangeTo(start, end, line);
        }
        // make sure it cites a rule
        if (citedrules.length < 1) {
            this.adderror(line.n, 'justification', 'medium', 'does not cite a rule');
        }
        // make sure it cites only one rule
        if (citedrules.length > 1) {
            this.adderror(line.n, 'justification', 'low', 'cites more than one rule' +
            ' (only one can be checked)');
        }
        // make sure the rule(s) exist(s)
        const realrules = [];
        for (const rule of citedrules) {
            if ((!(rule in this.rules)) || this.rules[rule].meinongian) {
                this.adderror(line.n, 'justification', 'high', 'cites a rule (' + rule +
                    ') that does not exist');
            } else {
                realrules.push(rule);
            }
        }
        if (realrules.length < 1) {
            this.rulechecked = false;
            return line;
        }
        const rulechecked = realrules[0];
        const ruleinfo = this.rules[rulechecked];
        if (line.isshowline && !ruleinfo.showrule) {
            this.adderror(line.n, 'justification', 'high', 'cites a non-show-rule ' +
                'for a show line');
            this.rulechecked = false;
            return line;
        }
        if (!line.isshowline && ruleinfo.showrule) {
            this.adderror(line.n, 'justification', 'high', 'cites a show-rule ' +
                'for a non-show-line');
            this.rulechecked = false;
            return line;
        }
        if (!line.isshowline) {
            let needednumnums;
            if (ruleinfo.forms) {
                needednumnums = ruleinfo.forms.map((form) =>
                    (form?.prems?.length ?? 0));
            } else {
                needednumnums = [0];
            }
            if (needednumnums.indexOf(nums.length) == -1) {
                this.adderror(line.n, "justification", "low", "cites the wrong " +
                    "number of lines for the rule specified");
                if (nums.length < needednumnums[0] && !this.thorough) {
                    line.rulechecked = false;
                    return line;
                }
            }
            let needednumranges;
            if (ruleinfo.forms) {
                needednumranges = ruleinfo.forms.map((form) =>
                    (form?.subderivs?.length ?? 0));
            } else {
                needednumranges = [0];
            }

            if (needednumranges.indexOf(ranges.length) == -1) {
                this.adderror(line.n, "justification", "low", "cites the wrong " +
                    "number of subderivation line ranges for the rule specified");
                if (ranges.length < needednumranges[0] && !this.thorough) {
                    line.rulechecked = false;
                    return line;
                }
            }

        } else {
            if (nums.length > 0 || ranges.length > 0) {
                this.adderror(line.n, 'justification', 'low', 'cites line ' +
                    'numbers but show lines should not');
            }
        }
        line.citednums = nums;
        line.citedrangenums = ranges;
        line.rulechecked = rulechecked;
        return line;
    }

    checkRule(line) {
        const Formula = this.Formula;
        // populate cited lines and subderivs
        line.citedlines = line.citednums
            .map((n) => (this?.deriv?.lines?.[parseInt(n)-1] ?? false))
            .filter((l) => (l !== false));
        line.citedsubderivs = line.citedrangenums
            .map(([start, end]) => (this?.deriv?.lines?.[start]?.mysubderiv ?? false))
            .filter((sd) => (sd !== false));
        // show rules cite their own subderiv
        if (line.isshowline && line.mysubderiv) {
            line.citedsubderivs.push(line.mysubderiv);
        }
        const rulename = line.rulechecked;
        const rule = this.rules[rulename] ?? false;
        if (!rule) {
            this.adderror(line.n, 'rule', 'high', 'rule information for “' +
                rulename + '” found');
            return line;
        }
        // PREMISE
        if (rule.premiserule) {
            const norm = Formula.from(line.s).normal;
            let found = false;
            for (let prem of this.prems) {
                if (prem == norm) {
                    found = true;
                    break;
                }
            }
            if (found) {
                line.checkedOK = true;
            } else {
                this.adderror(line.n, 'rule', 'high', 'cited premise ' +
                    'not among premises given for problem');
            }
            return line;
        }
        // forms either come from rule of what showlines allow for assumption
        const forms = rule?.forms ?? [];
        // ASSUMPTION
        if (rule.assumptionrule) {
            // TODO: assumptions compatible with other systems
            let checksl = line?.mysubderiv?.showline;
            while (checksl) {
                if (checksl.rulechecked &&
                    this.rules[checksl.rulechecked] &&
                    this.rules[checksl.rulechecked].showrule &&
                    this.rules[checksl.rulechecked].forms) {
                    for (const f of this.rules[checksl.rulechecked].forms) {
                        if (!f.subderivs) { continue; }
                        for (const sd of f.subderivs) {
                            if (sd.allows) {
                                let topush = { conc: sd.allows };
                                if (f.conc) {
                                    topush.prems = [f.conc];
                                }
                                line.citedlines.push(checksl);
                                forms.push(topush);
                            }
                        }
                    }
                }
                checksl = checksl?.mysubderiv?.parentderiv?.showline;
            }
        }
        let errMsg = '';
        for (const form of forms) {
            const fitresult = (new formFit(rule, rulename, form, line, Formula)).result();
            if (fitresult.success) {
                line.checkedOK = true;
                return line;
            }
            if (fitresult.message) {
                errMsg = fitresult.message;
            }
        }
        //TODO: thorough check
        if (errMsg == '') {
            let errMsg = 'the line';
            let isare = 'is';
            if (line.citedlines.length > 0) {
                isare = 'are';
                if (line.citedsubderivs.length > 0) {
                    errMsg += ', the lines it cites,';
                } else {
                    errMsg += ' and those it cites';
                }
            }
            if (line.citedsubderivs.length) {
                isare = 'are';
                errMsg +' and the subderivations it cites';
            }
            errMsg += ' ' + isare + ' not of the right form for ' +
                this.rulechecked + ' to apply';
        }
        const categ = (line.isshowline) ? 'completion' : 'rule';
        this.adderror(line.n, categ, 'high', errMsg);
        return line;
    }

    checkDeriv(deriv) {
        const Formula = this.Formula;
        if (!deriv.lines) { return; }
        // check regular lines
        for (const line of deriv.lines) {
            // check the syntax
            const f = Formula.from(line.s);
            if (f.wellformed) {
                if (f.freevars.length != 0) {
                    this.adderror(line.n, "syntax", "low", "formula uses a " +
                        "variable (" + f.freevars[0] + ") without a quantifier binding it");
                }
            } else {
                if (line.s.trim() == '') {
                    this.adderror(line.n, "syntax", "medium", "formula field left blank");
                } else {
                    // todo? change "low" here?
                    this.adderror(line.n, "syntax", "low", f.syntaxerrors);
                }
            }
            // check justification
            this.checkJustification(line);
            // check rule if there is one
        }
        // loop through again to check actual rules
        for (const line of deriv.lines) {
            if (line.rulechecked) {
                this.checkRule(line);
            }
        }
    }

    isAvailableLineTo(num, line) {
        const zbnum = num - 1;
        // note: I think we can make this low, b/c it can't pass the rule test
        if (this.deriv.lines.length < num || zbnum < 0) {
            this.adderror(line.n, "justification", "low", "cites a line that does not exist");
            return false;
        }
        if (parseInt(line.n) == num) {
            this.adderror(line.n, "justification", "high", "cites its own line number");
            return false;
        }
        if (parseInt(line.n) < num) {
            this.adderror(line.n, "justification", "high", "cites a line later in the derivation");
            return false;
        }
        const citedline = this.deriv.lines[zbnum];
        let checkpart = line;
        while (checkpart) {
            // MOVE TO PREVIOUS PART
            // previous part for showline is it subderiv, but this
            // usually should not happen
            if (checkpart.isshowline) {
                checkpart = this.mysubderiv;
                continue;
            }
            // get context
            let currsubderiv;
            if (checkpart.parentderiv) { currsubderiv = checkpart.parentderiv; } else { currsubderiv = checkpart.mysubderiv; }
            const currindex = currsubderiv?.parts?.indexOf(checkpart) ?? 0;
            // move to previous line or upwards
            if (currindex > 0) {
                checkpart = currsubderiv?.parts?.[ currindex - 1 ] ?? false;
            } else {
                if (currsubderiv?.showline == citedline) {
                    this.adderror(line.n, "justification", "high",
                        "cites a show line it is itself being used to demonstrate");
                    return false;
                }
                // move into parent deriv
                if (currsubderiv) {
                    checkpart = currsubderiv;
                    continue;
                } else {
                    // should be at top of derivation
                    checkpart = false;
                    break;
                }
            }
            // part checked is a subderiv, check its showline
            if (checkpart.parts) {
                // if we got to here this way, it should be a completed subderiv
                if (checkpart.showline && citedline == checkpart.showline) {
                    return true;
                }
                // move on
                continue;
            }
            // see if we jumped over it
            if (checkpart.n && parseInt(checkpart.n) < num) {
                this.adderror(line.n, "justification", "high",
                "cites a line within a subderivation that is no longer available");
            }
            if (checkpart == citedline) {
                return true;
            }
        }
        this.adderror(line.n, "justification", "high",
            "cites a line within a subderivation that is no longer available");
    }

    isAvailableRangeTo(start, end, line) {
        const zbstart = start - 1;
        const zbend = end - 1;
        if (zbstart < 0 || zbend < 0 || start > this.deriv.lines.length ||
            zbstart > this.deriv.lines.length) {
            this.adderror(line.n, "justification", "low",
                "cites a non-existent range of lines");
            return false;
        }
        if (parseInt(line.n) >= start &&
            parseInt(line.n) <= end) {
            this.adderror(line.n, "justification", "high",
                "cites a range of lines in which it is included");
            return false;
        }
        if (parseInt(line.n) <= end) {
            this.adderror(line.n, "justification", "high",
                "cites a range of lines later in the derviation");
            return false;
        }
        const citestartline = this.deriv.lines[zbstart];
        const citeendline = this.deriv.lines[zbend];
        const citedsubderiv = citestartline.mysubderiv;
        if (citedsubderiv.lines.indexOf(citeendline) == -1) {
            this.adderror(line.n, "justification", "high",
                "cites a range of lines that spans multiple subderivations");
            return false;
        }
        let linedup = true;
        if (citestartline.mysubderiv.lines[0] != citestartline) {
            this.adderror(line.n, "justification", "medium",
                "line number given for start of range not at the start " +
                "of a subderivation");
            linedup = false;
        }
        if (citedsubderiv.lines[citedsubderiv.lines.length - 1]
                != citeendline) {
            this.adderror(line.n, "justification", "medium",
                "line number given for end of range not at the end of " +
                "a subderivation");
            linedup = false;
        }
        if (!linedup) {
            return false;
        }
        let checkpart = line;
        while (checkpart) {
            let currsubderiv;
            if (checkpart.parentderiv) { currsubderiv = checkpart.parentderiv; }
            else { currsubderiv = checkpart.mysubderiv; }
            const currindex = currsubderiv?.parts?.indexOf(checkpart) ?? 0;
            if (currindex > 0) {
                checkpart = currsubderiv?.parts?.[ currindex - 1 ] ?? false;
            } else {
                // go up a level
                if (currsubderiv) {
                    checkpart = currsubderiv;
                    continue;
                }
                checkpart = false;
                break;
            }
            // see if it matches
            if (checkpart == citedsubderiv) {
                return true;
            }
            // see if we went past
            if (checkpart.n && parseInt(checkpart.n) < start) {
                this.adderror(line.n, "justification", "high",
                    "cites a line range within a subderivation that is " +
                    "no longer available");
                return false;
            }
        }
        this.adderror(line.n, "justification", "high",
            "cites the main derivation as if it were a subderivation");
        return false;
    }

    // check that reported line numbers match up with actual line numbers
    lncheck() {
        for (let i=0; i < this.deriv.lines.length; i++) {
            const line = this.deriv.lines[i];
            line.pos = i;
            if (line.n && line.n != '') {
                let thinkitis = parseInt(line.n)-1;
                if (thinkitis != line.pos) {
                    this.adderror(line.n, 'justification', 'low',
                        'does not have the right line number for its position');
                }
            }
        }
        return this.deriv;
    }

    report() {
        this.analyze(this.deriv);
        this.lncheck();
        this.checkDeriv(this.deriv);
        this.traceBadDeps();
        this.checkConc();
        if (this.thorough) {
            this.weighErrors();
        }
        return {
            lines: this.deriv.lines,
            lnmap: this.deriv.lnmap,
            pointsportion: this.pointsportion,
            errors: this.errors
        }
    }

    traceBadDeps() {
        for (const ln in this.deriv.lnmap) {
            const line = this.deriv.lnmap[ln];
            let myerrcats = [];
            if (this.errors[ln]) {
                myerrcats = Object.keys(this.errors[ln]);
            }
            if (myerrcats.length > 0) { continue; }
            if (line.isshowline) {
                let isInc = false;
                let hasErr = true;
                for (const sdline of line.mysubderiv.lines) {
                    if (sdline == line) { continue; }
                    if (!this.errors[sdline.n]) { continue; }
                    const itserrcats = Object.keys(this.errors[sdline.n]);
                    if (itserrcats.length == 1 && 
                        itserrcats[0] == 'completion') {
                        isInc = true;
                        continue;
                    }
                    if (itserrcats.length > 0) {
                        this.adderror(ln, 'dependency', 'low',
                            'contains errors in its subderivation, so ' +
                            'may not be correct');
                        hasErr = true;
                        break;
                    }
                }
                if (isInc && !hasErr) {
                    this.adderror(ln, 'completion', 'low', 'depends on ' +
                        'one or more incomplete subderivations');
                }
            } else {
                if (!line.citednums || line.citednums.length == 0) {
                    continue;
                }
                for (const cln of line.citednums) {
                    if (!this.errors[cln]) { continue; }
                    const itserrcats = Object.keys(this.errors[cln]);
                    if (itserrcats.length > 0) {
                        this.adderror(ln, 'dependency', 'low',
                            'depends on a line that contains errors, so may not be correct'
                        );
                    }
                }
            }
        }
    }

    weighErrors() {
        // substract points
        targetloop: for (const targLN in this.errors) {
            // we take first error by severity level
            severityloop: for (const sev of ['high','medium','low']) {
                categoryloop: for (const cat in this.errors[targLN]) {
                    // dependency errors do not count
                    if (cat == 'dependency') { continue categoryloop; }
                    if (!(sev in this.errors[targLN][cat])) {
                        continue categoryloop;
                    }
                    errloop: for (let desc in this.errors[targLN][cat][sev]) {
                        this.pointsportion = this.pointsportion -
                            this.amts[sev];
                        // can't go below 0
                        if (this.pointsportion < 0) {
                            this.pointsportion = 0;
                            break targetloop;
                        }
                        continue targetloop;
                    }
                }
            }
        }
        return this;
    }
}
//////////////////////////////////////////////////////////////// FORM FIT
export class formFit {
    constructor(rule, rulename, form, line, Formula) {
        this.rule = rule;
        this.rulename = rulename;
        this.form = form;
        this.Formula = Formula;
        this.syntax = this.Formula.syntax;
        this.message = '';
        this.line = line;
        this.resultf = Formula.from(line.s);
        this.assigns = {};
        this.possible = true;
    }

    checkConc() {
        const Formula = this.Formula;
        if (!this.form.conc) { return; }
        const schema = Formula.from(this.form.conc);
        const cr = this.extendAssign(schema,
            this.resultf, this.assigns);
        if (!cr) {
            this.possible = false;
            this.message = 'formula at this line not of the right form to result ' +
                'from ' + this.rulename;
        }
    }

    checkNewness() {
        if (!this.form.mustbenew) { return true; }
        for (const n of this.form.mustbenew) {
            if (!this?.assigns?.[n] || this?.assigns?.[n]?.length < 1) { continue; }
            const newname = this.assigns[n][0];
            if (!newname) { continue; }
            if (!this.isNewAt(newname, this.line)) { return false; }
        }
        return true;
    }

    checkPrems() {
        const Formula = this.Formula;
        if (!this.form.prems) { return; }
        const premForms = this.form.prems.map((s) => (Formula.from(s)));
        const premLines = this.line.citedlines.slice(0, premForms.length)
            .map((l) => (Formula.from(l.s)));
        // todo: change for thorough check
        while (premLines.length < premForms.length) {
            premLines.push(premLines[0]);
        }
        const allOrders = perms(premLines.length);
        let foundgood = false;
        for (const order of allOrders) {
            const assignstry = { ...this.assigns };
            let madeitthrough = true;
            for (let i=0; i<premForms.length; i++) {
                const schema = premForms[i];
                const f = premLines[ order[i] ];
                // KLUDGE TO KEEP SERVER FROM CRASHING
                if (!f) {
                    madeitthrough = false;
                    break;
                }
                //
                const ext = this.extendAssign(schema, f, assignstry);
                if (ext === false) {
                    madeitthrough = false;
                    break;
                }
            }
            if (madeitthrough) {
                foundgood = true;
                this.assigns = assignstry;
                break;
            }
        }
        if (!foundgood) {
            this.possible = false;
            if (this.rule.assumptionrule) {
                this.message = 'makes an assumption that is not allowed by ' +
                    'the type of derivation';
            } else {
                this.message = 'cited lines are not of the right ' +
                    'form to support this line by ' + this.rulename;
            }
        }
    }

    checkSubDerivs() {
        const Formula = this.Formula;
        if (!this.form.subderivs ||
            this.form.subderivs.length == 0) { return; }
        const subDerivs = this.line.citedsubderivs.slice(0, this.form.subderivs.length);
        while (subDerivs.length < this.form.subderivs.length) {
            subDerivs.push(subDerivs[0]);
        }
        const allOrders = perms(this.form.subderivs.length);
        let foundgood = false;
        let newnesstrigger = false;
        orderloop: for (const order of allOrders) {
            let ordergood = true;
            const assignstry = { ...this.assigns };
            subderivloop: for (let i=0; i<this.form.subderivs.length; i++) {
                const derivruleinfo = this.form.subderivs[i];
                const subDeriv = subDerivs[i];
                let satisfaction = true;
                needloop: for (let need of derivruleinfo.needs) {
                    const schema = Formula.from(need);
                    lineloop: for (const line of subDeriv.lines) {
                        // ignores self
                        if (line == this.line) { continue; }
                        //look only in top layer
                        if ((!line.isshowline) &&
                            (line.mysubderiv != subDeriv)) {
                            continue;
                        }
                        if ((line.isshowline) &&
                            (line.mysubderiv.parentderiv != subDeriv)) {
                            continue;
                        }
                        // if subshowrequired; it must be a showline
                        if (derivruleinfo.subshowsrequired &&
                            !line.isshowline) {
                            continue;
                        }
                        const thislinestry = { ... assignstry };
                        const linetry = this.extendAssign(schema,
                            Formula.from(line.s), thislinestry );
                        if (linetry) {
                            let newnessOK = true;
                            if (derivruleinfo.wantsasnew) {
                                for (const n of derivruleinfo.wantsasnew) {
                                    if (!(n in thislinestry) ||
                                        (thislinestry[n].length < 1)) {
                                        continue;
                                    }
                                    const newname = thislinestry[n][0];
                                    if (!this.isNewAt(newname, line)) {
                                        newnessOK = false;
                                        break;
                                    }
                                }
                            }
                            // need was met, check next one
                            if (newnessOK) {
                                continue needloop;
                            } else {
                                newnesstrigger = true;
                            }
                        }
                    }
                    // need not met; try next ordering
                    continue orderloop;
                }
                // made it to end of need loop;
                // so all needs for this subderiv met
            }
            // all subderivs had their needs met, so
            // this is a good order
            foundgood = true;
            break orderloop;
        } // al orders
        if (!foundgood) {
            if (this.line.isshowline) {
                let msg = "what is needed to complete a derivation by " +
                    this.rulename + " for this line not found in the subderivation";
                if (newnesstrigger) {
                    msg += ' — did you remember to use a new name?';
                }
                this.message = msg;
            } else {
                this.message = 'the cited subderivation does not contain what is ' +
                    'necessary to show this line by ' + this.rulename;
            }
            this.possible = false;
        }
        return foundgood;
    }

    extendAssign(schema, f, assigns) {
        const Formula = this.Formula;
        const syntax = this.syntax;
        if (schema.op) {
            if (schema.op != f.op) {
                return false;
            }
            // if it's a quantifier with a variable
            // make sure they match
            if (schema.boundvar) {
                if (!f.boundvar) {
                    return false;
                }
                if (schema.boundvar in assigns) {
                    if (assigns[schema.boundvar] !=
                        f.boundvar) {
                        return false
                    }
                } else {
                    assigns[schema.boundvar] = f.boundvar;
                }
            }
            // make assignment based on left
            if (schema.left) {
                if (!f.left) {
                    return false;
                }
                const extl = this.extendAssign(
                    schema.left, f.left, assigns
                );
                if (extl === false) {
                    return false;
                }
            }
            // make assignment based on right
            if (schema.right) {
                if (!f.right) {
                    return false;
                }
                const extr = this.extendAssign(
                    schema.right, f.right, assigns
                );
                if (extr === false) {
                    return false;
                }
            }
            return true;
        }
        // should be atomic
        // see if this atomic already assigned
        if (schema.normal in assigns) {
            if (assigns[schema.normal] != f.normal) {
                return false
            }
        } else {
        // unassigned: assign it
            assigns[schema.normal] = f.normal;
        }
        // check for identity
        if (schema.pletter == '=') {
            if (!f.pletter || f.pletter != '=') {
                return false;
            }
        }
        // check terms
        for (const t of schema.terms) {
            // for variables, we need to make sure any instances
            // using what the variable substitutes into are correct
            if (syntax.isvar(t)) {
                if ((this.form.subst) && (t in this.form.subst)) {
                    const b = this.form.subst[t];
                    for (const a in assigns) {
                        if (a == schema.instantiate(t, b) &&
                            (t in assigns)) {
                            if (f.freevars.indexOf(assigns[t]) == -1) {
                                if (f.normal != assigns[a]) { return false; }
                            } else {
                                const couldbe = assigns[b].filter(
                                    (c) => (assigns[a] == f.instantiate(assigns[t], c)));
                                if (couldbe.length == 0) {
                                    return false;
                                }
                                assigns[b] = couldbe;
                            }
                        }
                    }
                }
            } else {
                // t is a constant
                const consts = arrayUnion([],f.terms.filter(
                    (x) => (!syntax.isvar(x))
                ));
                if (t in assigns) {
                    assigns[t] = assigns[t].filter((c) => ( consts.indexOf(c) != -1));
                } else {
                    assigns[t] = consts;
                }
                // look for it as result of substitution
                if (this?.form?.subst) {
                    for (const v in this.form.subst) {
                        if (this.form.subst[v] == t && (v in assigns)) {
                            for (const a in assigns) {
                                if (a.at(0) != schema.pletter) { continue; }
                                const pf = Formula.from(a);
                                if (schema.normal != pf.instantiate(v, t)) {
                                    continue;
                                }
                                const pfinst = Formula.from(assigns[a]);
                                if (pfinst.freevars.indexOf(assigns[v]) == -1) {
                                    if (pfinst.normal != f.normal) { return false; }
                                    continue;
                                }
                                assigns[t] = assigns[t].filter(
                                    (c) => ( pfinst.instantiate(assigns[v], c) == f.normal));
                                if (assigns[t].length == 0) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    isNewAt(newname, line) {
        const Formula = this.Formula;
        let checkpart = line;
        while (checkpart) {
            let currsubderiv;
            if (checkpart.parentderiv) {
                currsubderiv = checkpart.parentderiv;
            } else {
                currsubderiv = checkpart.mysubderiv;
            }
            // go to previous
            const currindex = currsubderiv?.parts?.indexOf(checkpart) ?? 0;
            if (currindex > 0) {
                checkpart = currsubderiv?.parts?.[currindex-1]?? false;
            } else {
                if (currsubderiv?.showline &&
                    currsubderiv.showline != line) {
                    const f = Formula.from(currsubderiv.showline.s);
                    if (f.terms.indexOf(newname) !== -1) {
                        return false;
                    }
                }
                // move into parent deriv
                if (currsubderiv) {
                    checkpart = currsubderiv;
                    continue;
                }
                checkpart = false;
                break;
            }
            // if a subderiv, again check its showline,
            // which is available
            if (checkpart.parts) {
                if (checkpart.showline) {
                    const f = Formula.from(currsubderiv.showline.s);
                    if (f.terms.indexOf(newname) !== -1) {
                        return false;
                    }
                }
                continue;
            }
            // if a regular line, check it
            if (checkpart.s) {
                const f = Formula.from(checkpart.s);
                if (f.terms.indexOf(newname) !== -1) {
                    return false;
                }
            }
        }
        return true;
    }

    result() {
        this.checkConc();
        this.checkPrems();
        this.checkSubDerivs();
        const newresult = this.checkNewness();
        if (!newresult) {
            if (this.message != '') { this.message += '; '; }
            this.message += 'does not use a new name as is ' +
                'required by ' + this.rulename;
            this.possible = false;
        }
        return {
            success: this.possible,
            message: this.message
        }
    }
}

