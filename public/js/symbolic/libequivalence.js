// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import Formula from './formula.js';
import { syntax, symbols } from './libsyntax.js';
import { arrayUnion, randomString } from '../misc.js';
import { loadEquivalents, saveEquivalents, equivProliferate } from './libequivalence-db.js';

// too simple for function terms?**
const cRegEx = new RegExp( '^[' + syntax.constantsRange + ']$');
const ncRegEx = new RegExp( '[^' + syntax.constantsRange + ']', 'g');
const constCP = syntax.constantsRange.codePointAt(0);
const varCP = syntax.variableRange.codePointAt(0);
const smallInterpSize = 3;
const termLimit = 2;

///////////////////////////////////////////////////////////////////////
// TREE/TABLEAUX FUNCTIONS
///////////////////////////////////////////////////////////////////////

/*
branches have the following properties:
    - growing (boolean): whether it is still growing
    - closed (boolean): whether it has a contradiction; an open branch is
            one that is not growing and closed
    - undecided (boolean): if gave up on a branch b/c suspected loop
    - queue (obj) {
        high: regular unbranching statements
        medium: statements creating existential instantiations
        low: branching statements
      }
    - processed (array): regular formulas already processed
    - univ (obj): array of mappings from true universals and false
        existentials to the terms to which they have been applied already
    - terms: constants used anywhere in the branch
    - termsleft: constants waiting to appear in branch before end
}

Possible modes:
    'abbreviatedtt': abbreviated TT; ignores quantifiers and terms 
    'full': full tableaux, which quits when no terms left for the branch
    'small': assumes there are exactly three entities in domain (or
        exactly many as mentioned in problem if more than three), so
        universals are conjunctions and existentials are disjunctions
*/


// applies a given rule to a branch for a particular statement
function apply(branch, s, mode) {
    let f = Formula.from(s);
    // make sure what we need is there
    if (f.op && (f.op != symbols.FALSUM) &&
        (!f.right || (syntax.isbinaryop(f.op) && !f.left))) {
        return undecided(branch);
    }
    // affirmative AND => both conjuncts added
    if (f.op == symbols.AND) {
        return nodes(branch, [[f.left.normal, f.right.normal]], mode);
    }
    // affirmative OR => branch to each disjunct
    if (f.op == symbols.OR) {
        return nodes(branch, [[f.left.normal], [f.right.normal]], mode);
    }
    // affirmative IFTHEN => branch of negation of antecedent and
    //                       consequent
    if (f.op == symbols.IFTHEN) {
        return nodes(branch, [[symbols.NOT + f.left.wrapifneeded()],
            [f.right.normal]], mode)
    }
    // affirmative IFF => branch to both sides, or both negations
    if (f.op == symbols.IFF) {
        return nodes(branch, [
            [f.left.normal, f.right.normal],
            [
                symbols.NOT + f.left.wrapifneeded(),
                symbols.NOT + f.right.wrapifneeded()
            ]
        ], mode);
    }
    // falsum = close branch
    if (f.op == symbols.FALSUM) { return closebranch(branch); }
    // universals: depends on mode
    if (f.op == symbols.FORALL) {
        // abbreviatedtt: ignore quantifier
        if (mode == 'abbreviatedtt') {
            return nodes(branch, [[f.right.normal]], mode);
        }
        // rage if no bound variable
        if (!f.boundvar) {
            return undecided(branch);
        }
        // small mode, like a conjunction of instances
        if (mode == 'small') {
            let instances = branch.terms.map(
                (t) => (f.right.instantiate(f.boundvar, t))
            );
            return nodes(branch, [instances], mode);
        }
        // "full" mode, use first term not instantiated-to
        for (let t of branch.terms) {
            // if a term not already used, use it
            if (branch.univ[s].indexOf(t) == -1) {
                branch.univ[s].push(t);
                let instance = f.right.instantiate(f.boundvar, t);
                return nodes(branch, [[instance]], mode);
            }
        }
        // shouldn't be here, but if somehow we are, just grow the branch
        return grow(branch, mode);
    }
    // existentials: depends on mode
    if (f.op == symbols.EXISTS) {
        // abbreviated tt; ignore quantifier
        if (mode == 'abbreviatedtt') {
            return nodes(branch, [[f.right.normal]], mode);
        }
        // rage if no bound variable
        if (!f.boundvar) {
            return undecided(branch);
        }
        // small mode, like a disjunction of instances
        if (mode == 'small') {
            // note: unlike universals, mapping is to singletons
            let instances = branch.terms.map(
                (t) => ([f.right.instantiate(f.boundvar, t)])
            );
            return nodes(branch, instances, mode);
        }
        // "full" mode, use a new term if there is one
        if (branch.termsleft.length == 0) {
            // if we have run out, it's time to give up
            return undecided(branch);
        }
        let t = branch.termsleft.shift();
        branch.terms.push(t);
        let instance = f.right.instantiate(f.boundvar, t);
        return nodes(branch, [[instance]], mode);
    }
    // for negations, right side op is important
    if (f.op == symbols.NOT) {
        let r = f.right;
        // again make sure what we need is there
        if (r.op && (r.op != symbols.FALSUM) &&
            (!r.right || (syntax.isbinaryop(r.op) && !r.left))) {
            return undecided(branch);
        }
        // negated AND => branch to negation of each conjunct
        if (r.op == symbols.AND) {
            return nodes(branch, [
                [ symbols.NOT + r.left.wrapifneeded() ],
                [ symbols.NOT + r.right.wrapifneeded() ]
            ], mode);
        }
        // negated OR => negations of both disjuncts added
        if (r.op == symbols.OR) {
            return nodes(branch, [[
                symbols.NOT + r.left.wrapifneeded(),
                symbols.NOT + r.right.wrapifneeded()
            ]], mode);
        }
        // negated IFTHEN => antecedent and negated consequent added
        if (r.op == symbols.IFTHEN) {
            return nodes(branch, [[
                r.left.normal,
                symbols.NOT + r.right.wrapifneeded()
            ]], mode);
        }
        // negated IFF => branch to affirmative and negative pairs
        if (r.op == symbols.IFF) {
            return nodes(branch, [
                [r.left.normal, symbols.NOT + r.right.wrapifneeded()],
                [symbols.NOT + r.left.wrapifneeded(), r.right.normal]
            ], mode);
        }
        // negated negation => remove the double-negative
        if (r.op == symbols.NOT) {
            return nodes(branch, [[r.right.normal]], mode);
        }
        // negated falsum => do nothing
        if (r.op == symbols.FALSUM) {
            return grow(branch, mode);
        }
        // negated universal: depends on mode, but like an existential
        if (r.op == symbols.FORALL) {
            // abbreviated tt; ignore quantifier
            if (mode == 'abbreviatedtt') {
                return nodes(branch,
                    [[symbols.NOT + r.right.wrapifneeded()]], mode);
            }
            // rage if no bound variable
            if (!r.boundvar) {
                return undecided(branch);
            }
            // small mode, like a disjunction of instances
            if (mode == 'small') {
                // note: mapping is to singletons
                let instances = branch.terms.map(
                    (t) => {
                        let falsehood =
                            r.right.instantiate(r.boundvar, t);
                        let ff = Formula.from(falsehood);
                        return [symbols.NOT + ff.wrapifneeded()];
                    }
                );
                return nodes(branch, instances, mode);
            }
            // "full" mode, use a new term
            if (branch.termsleft.length == 0) {
                // if we have run out, it's time to give up
                return undecided(branch);
            }
            let t = branch.termsleft.shift();
            branch.terms.push(t);
            let falsehood = r.right.instantiate(r.boundvar, t);
            let ff = Formula.from(falsehood);
            return nodes(branch,
                [[symbols.NOT + ff.wrapifneeded()]], mode);
        }
        // negated existential: depends on mode, but like a universal
        if (r.op == symbols.EXISTS) {
            // in abbreviated tt we ignore the quantifier
            if (mode == 'abbreviatedtt') {
                return nodes(branch,
                    [[symbols.NOT + r.right.wrapifneeded()]], mode);
            }
            // rage if no bound variable
            if (!r.boundvar) {
                return undecided(branch);
            }
            // small mode, like a conjunction of negated instances
            if (mode == 'small') {
                let instances = branch.terms.map(
                    (t) => {
                        let falsehood = r.right.instantiate(r.boundvar, t);
                        let ff = Formula.from(falsehood);
                        return symbols.NOT + ff.wrapifneeded();
                    }
                );
                return nodes(branch, [instances], mode);
            }
            // "full" mode, use first term not instantiated-to
            for (let t of branch.terms) {
                // if a term not already used, use it
                if (branch.univ[s].indexOf(t) == -1) {
                    branch.univ[s].push(t);
                    let falsehood =
                        r.right.instantiate(r.boundvar, t);
                    let ff = Formula.from(falsehood);
                    return nodes(branch,
                        [[symbols.NOT + ff.wrapifneeded()]], mode);
                }
            }
            // shouldn't be here, but if somehow we are,
            // just grow the branch
            return grow(branch, mode);
        }

    }
    // should be atomic or negation of atomic; check for contradiction
    if (contradicts(branch, s, mode)) {
        return closebranch(branch);
    }
    // processing the atomic didn't do anything; move on
    return grow(branch, mode);
}

// marks branch as closed
function closebranch(branch) {
    // note: uncomment below to see branches all close
    branch.growing = false;
    branch.closed = true;
    branch.undecided = false;
    return branch;
}

// checks if statement contradicts an already processed statement
// on branch or in universal pool
function contradicts(branch, s, mode) {
    let f = Formula.from(s);
    // check if it contradicts already processed statement
    for (let pstr of branch.processed) {
        let p = Formula.from(pstr);
        if ((p.normal == symbols.NOT + f.wrapifneeded()) ||
            (f.normal == symbols.NOT + p.wrapifneeded())) {
                return true;
        }
        // in the abbreviated truth table method, it's enough
        // for us to a negation of an atomic with same p-letter?
        if (mode == 'abbreviatedtt') {
            if (((!p.op && p.pletter)
                && (f.op == symbols.NOT && f.right &&
                    (f.right.pletter == p.pletter))) ||
                ((!f.op && f.pletter) && (p.op == symbols.NOT
                    && p.right && p.right.pletter == f.pletter))) {
                return true;
            }
        }
    }
    // check if it contradicts an active universal
    for (let ustr in branch.univ) {
        let u = Formula.from(ustr);
        if ((u.normal == symbols.NOT + f.wrapifneeded()) ||
            (f.normal == symbols.NOT + u.wrapifneeded())) {
                return true;
        }
    }
    return false;
}

export function treeEquivtest(fp, fq) {
    let sprouts = [
        [ fp.normal, symbols.NOT + fq.wrapifneeded() ],
        [ fq.normal, symbols.NOT + fp.wrapifneeded() ]
    ];
    // TEST 1: REGULAR TABLEAUX (with termlimit)
    let fullresult = tree(sprouts, 'full');
    // todo: parse processed tree to describe countermodel?)
    if (!fullresult.undecided) {
        return {
            equiv: fullresult.closed,
            method: 'full',
            determinate: true
        }
    }
    // TEST 2: ABBREVIATED TRUTH TABLE TEST;
    // this can only identify non-equivalence
    let attresult = tree(sprouts, 'abbreviatedtt');
    if (!attresult.undecided && !attresult.closed) {
        return {
            equiv: false,
            determinate: true,
            method: 'abbreviatedtt'
        }
    }
    // TEST 3: SMALL DOMAIN TEST
    // this can only identify non-equivalence as well
    // would probably catch everything abbreviatedtt test would
    // catch, but considerably slower in doing so?
    let smallresult = tree(sprouts, 'small');
    if (!smallresult.undecided && !smallresult.closed) {
        return {
            equiv: false,
            determinate: true,
            method: 'small'
        }
    }
    // if we fell through here, it's indeterminate!
    return {
        equiv: fullresult.closed,
        method: 'alltrees',
        determinate: false
    }
}

// determines which next rule to apply by priority (and uses it to
// "grow"); does universals only if nothing else to do
function grow(branch, mode) {
    // if closed or made indeterminate in previous step
    // return branch as is
    if (!branch.growing) { return branch; }
    // if deadline is past, return undetermined
    if ( (new Date()).getTime() > branch.deadline ) {
        return undecided(branch);
    }
    for (let priority of ['high', 'medium', 'low']) {
        if (branch.queue[priority].length > 0) {
            let processme = branch.queue[priority].shift();
            // we can skip if already processed this very formula
            if (branch.processed.indexOf(processme) == -1) {
                branch.processed.push(processme);
                return apply(branch, processme, mode);
            } else {
                return grow(branch, mode);
            }
        }
    }
    // if we made it here only universals left to do
    // in full mode, we must do universals at least once
    // so we add a term to the stack if empty
    if (mode == 'full' && branch.terms.length == 0) {
        branch.terms.push(branch.termsleft.shift());
    }
    // loop through universals: note you need to cycle through all
    // universals applied a certain number of times, and not through
    // the universals to avoid exhausting one before playing with
    // any others
    if (mode == "full") { 
        for (let n = 1 ; n <= branch.terms.length ; n++) {
            for (let s in branch.univ) {
                // see how many letters applied
                let ll = branch.univ[s];
                if (ll.length < n) {
                    return apply(branch, s, mode);
                }
            }
        }
    }
    // if we made it here, there's nothing to do and the branch is open!
    branch.growing = false;
    branch.undecided = false;
    return branch;
}

function newbranch(terms, termsleft) {
    return {
        queue: { high: [], medium: [], low: [] },
        closed: false,
        growing: true,
        undecided: false,
        processed: [],
        univ: {},
        deadline: (new Date()).getTime() + 5000,
        terms: terms,
        termsleft: termsleft
    }
}

// adds nodes and branches and merges results generally
function nodes(branch, sprouts, mode) {
    // we convert to JSON to create clones of branch of need be
    let branchjson = (sprouts.length > 1) ? JSON.stringify(branch) : '';
    // get result for each sprout group (= new branch)
    for (let i = 0; i < sprouts.length; i++) {
        let sprout = sprouts[i];
        // we can use the branch as trunk if it's the first or only one;
        // otherwise create a new branch trunk from the json
        let trunk = (i==0) ? branch : JSON.parse(branchjson);
        // add each new sprout to queue by priority
        for (let a of sprout) {
            let priority = priorityOf(a, mode);
            if (priority == 'univ') {
                // add to universals
                trunk.univ[a] = [];
            } else {
                trunk.queue[priority].push(a);
            }
            // check if that closed branch
            if (contradicts(trunk, a, mode)) {
                trunk.processed.push(a);
                trunk = closebranch(trunk);
                break;
            }
            // if not, sort the next sprout
        }
        // grow remainder of tree from new state
        trunk = grow(trunk, mode);
        // check what happened
        // if undecided, entire tree is undecided based on it
        if (trunk.undecided) {
            return trunk;
        }
        // if open, entire tree is open based on it
        if (!trunk.closed && !trunk.growing) {
            return trunk;
        }
        // if closed, we need to explore next branch starting from
        // its new sprouts, i.e., go on to the next loop
    }
    // if we made it here, that means that every branch
    // closed, so we can return any of them
    // might as well be the first
    return branch;
}

function priorityOf(s, mode) {
    // no-branchers: priority high
    // new names: priority medium (existentials, negated universals)
    // branchers: priority low
    // or "univ" for universals, negated existentials (ultra-low)
    let f = Formula.from(s);
    let op = f.op ?? false;
    // affirmatives
    if (op === false || op == symbols.AND || op == symbols.FALSUM) {
        return 'high';
    }
    if (op == symbols.OR || op == symbols.IFTHEN ||
        op == symbols.IFF) {
        return 'low';
    }
    if (op == symbols.EXISTS) {
        if (mode == 'full') { return 'medium'; }
        if (mode == 'abbreviatedtt') { return 'high'; }
        return 'low'; // (mode == small)
    }
    if (op == symbols.FORALL) {
        return ((mode == 'full') ? 'univ' : 'high');
    }
    // negations
    if (op == symbols.NOT) {
        let negop = f?.right?.op ?? false;
        if (negop === false || negop == symbols.IFTHEN ||
            negop == symbols.OR || negop == symbols.FALSUM ||
            negop == symbols.NOT) {
            return 'high';
        }
        if (negop == symbols.AND || negop == symbols.IFF) {
            return 'low';
        }
        if (negop == symbols.EXISTS) {
            return ((mode == 'full') ? 'univ' : 'high');
        }
        if (negop == symbols.FORALL) {
            if (mode == 'full') { return 'medium'; }
            if (mode == 'abbreviatedtt') { return 'high'; }
            return 'low'; // (mode == small)
        }
    }
    // shouldn't be here?
    return 'low';
}

function tree(sprouts, mode) {
    let terms = [];
    let termsleft = [];
    if (mode != 'abbreviatedtt') {
        for (let sprout of sprouts) {
            for (let a of sprout) {
                terms = arrayUnion(terms, a.replace(ncRegEx,'').split(''));
            }
        }
        if (mode == 'small') {
            let cp = constCP;
            let c = String.fromCodePoint(cp);
            while (terms.length < smallInterpSize && cRegEx.test(c)) {
                terms = arrayUnion(terms, [c]);
                cp++;
                c = String.fromCodePoint(cp);
            }
        }
        if (mode == 'full') {
            let cp = constCP;
            let c = String.fromCodePoint(cp);
            while (termsleft.length < termLimit && cRegEx.test(c)) {
                if (terms.indexOf(c) == -1) {
                    termsleft.push(c);
                }
                cp++;
                c = String.fromCodePoint(cp);
            }
        }
    }
    return nodes(newbranch(terms, termsleft), sprouts, mode);
}

function undecided(branch) {
    branch.undecided = true;
    branch.growing = false;
    return branch;
}
//////////////////////////////////////////////////////////////////////////
// EQUIVALENCE DATABASE FUNCTINS
//////////////////////////////////////////////////////////////////////////

// note that because the way the checker for symbolic-translations is
// written, it is fp that has a database, not fq, as it is a correct
// answer and should be well-formed

// just checks if provided answer as is in the right answer's database
// of equivalents
export function quickDBCheck(fp, fq) {
    let equivs = loadEquivalents(fp.normal);
    let isEquiv = (equivs.indexOf(fq.normal) != -1);
    return {
        equiv: isEquiv,
        method: 'quickdb',
        determinate: isEquiv
    }
}

// look at all normal equivalents of provided answer and looks for each
// one in the database for the right answer
export function bidirectionalDBCheck(fp, fq) {
    let equivs = loadEquivalents(fp.normal);
    let givenequivs = equivProliferate(fq, {});
    console.log(givenequivs.map((x)=>(x.normal)));
    for (let g of givenequivs) {
        let isEquiv = (equivs.indexOf(g.normal) != -1);
        if (isEquiv) {
            return {
                equiv: true,
                method: 'bidirectionaldb',
                determinate: true
            }
        }
    }
    return {
        equiv: false,
        method: 'bidirectionaldb',
        determinate: false
    }
}

// the key function for testing equivalence, used in symbolic translation
// problem checking
export function equivtest(fp, fq) {
    // check if on the nose
    if (fp.normal == fq.normal) {
        return {
            equiv: true,
            method: 'exactanswer',
            determinate: true
        }
    }
    // check if already in database
    let quickResult = quickDBCheck(fp, fq);
    if (quickResult.determinate) { return quickResult; }

    // do a tree check
    let treeResult = treeEquivtest(fp, fq);
    // if found a new equivalent, save it
    if (treeResult.determinate && treeResult.equiv) {
        let equivs = loadEquivalents(fp.normal);
        equivs.push(fq.normal);
        saveEquivalents(fp.normal, equivs);
    }
    if (treeResult.determinate) { return treeResult; }
    let bidirectionalResult = bidirectionalDBCheck(fp, fq);
    if (bidirectionalResult.determinate && bidirectionalResult.equiv) {
        let equivs = loadEquivalents(fp.normal);
        equivs.push(fq.normal);
        saveEquivalents(fp.normal, equivs);
    }
    if (bidirectionalResult.determinate) {
        return bidirectionalResult;
    }
    // no test worked!
    return {
        equiv: false,
        method: 'all',
        determinate: false
    }
}

