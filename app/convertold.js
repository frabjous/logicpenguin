#!/usr/bin/env node
// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import lpfs from './lpfs.js';

import Formula from '../public/js/symbolic/formula.js';
import { libtf } from '../public/js/symbolic/libsemantics.js';
import { arrayUnion } from '../public/js/misc.js';

const sourcedir = '/home/kck/http/logic';
const filebase = process.argv[2];
let infile = sourcedir + '/homework/' + filebase + '.json';
if (filebase == '3d') {
    infile = sourcedir + '/homework/3b.json';
}

const hwinfo = lpfs.loadjson(sourcedir + '/hwinfo.json');
const indata = lpfs.loadjson(infile);
if (!indata || !hwinfo) {
    console.error('Could not load input data.');
    process.exit(1);
}

const datafolder = '/home/kck/data/logic-penguin-exercises/kck/1443';
const exinfoout  = datafolder + '/exercises/' + filebase + '-info.json';
const exprobsout = datafolder + '/exercises/' + filebase + '-allproblems.json';
const exansout   = datafolder + '/exercises/' + filebase + '-answers.json';


// determine transopts
let transopts = {};
if (filebase.at(0) == '4') {
    transopts.pred = false;
    transopts.lazy = true;
    transopts.nofalsum = true;
    transopts.hints = true;
}
if ((filebase.at(0) == '6') || (filebase.at(0) == '7')) {
    transopts.pred = true;
    transopts.nofalsum = true;
    transopts.hints = true;
}

let derivopts = { hints: true, checklines: true, rulepanel: true };
if (filebase.at(0) == '5') {
    derivopts.lazy = true;
} else {
    derivopts.pred = true;
}

const inconly = {
    "5b": [ "→O", "∨O", "DD", "Pr" ],
    "5c": [ "&I", "∨I", "↔I", "&O", "∨O", "↔O", "→O", "DN", "DD", "Pr" ],
    "5d": [ "&I", "∨I", "↔I", "&O", "∨O", "↔O", "→O", "DN", "R", "Ass", "DD", "CD", "↔D", "Pr", "→I" ],
    "5e": [ "&I", "∨I", "↔I", "✖I", "&O", "∨O", "↔O", "→O", "✖O", "DN", "R", "Ass", "→I", "DD", "CD", "&D", "↔D", "ID", "Pr" ]
}
const exclude = {
    "8a": [ "∃O", "UD", "~∀O", "~∃O", "~∀I", "~∃I", "∃D" ],
    "8b": [ "∃O", "UD", "~∀O", "~∃O", "~∀I", "~∃I", "∃D" ],
    "8c": [ "~∀O", "~∃O", "~∀I", "~∃I", "∃D" ],
    "8d": [ "~∀O", "~∃O", "~∀I", "~∃I", "∃D" ]
}

if (filebase in inconly) {
    derivopts.useonlyrules = inconly[filebase];
}

if (filebase in exclude) {
    derivopts.excluderules = exclude[filebase];
}

// Functions

function parseNLargument(str) {
    let statements = str.split(/<br *\/?>/);
    statements = statements.filter((x) => (x != ''));
    let premises = statements.slice(0,-1).map(punctuate).map((x) => (x.trim()));
    let conclusion = punctuate(statements.slice(-1)[0].replace('/ ','')).trim();
    return { prems: premises, conc: conclusion }
}

function punctuate(str) {
    // capitalize first letter
    str = str[0].toUpperCase() + str.substring(1);
    // add period at end if needed
    str = str.replace(/\.?$/,'.');
    return str;
}

function stripptag(str) {
    return str.replace(/<\/?p>/g,'');
}

// Assignments

// TAKES OLD NAMES
let optionsfor = {
    "truefalse": {},
    "fvs-allowcanttell": { allowcanttell: true },
    "fvs-disallowcanttell": { allowcanttell: false },
    "tf-statements": { interp: {
        "A":true,  "B":true, "C":true,
        "X":false, "Y":false, "Z": false
    }},
    "tt-single": { question: true },
    "tt-equiv": { question: true },
    "tt-argument": { question: true },
    "translation": transopts,
    "combo": {},
    "derivation": derivopts
}

let newproblemtype = {
    truefalse: 'true-false',
    "fvs-allowcanttell": 'valid-correct-sound',
    "fvs-disallowcanttell": 'valid-correct-sound',
    "counterexample": "gmh-counterexample",
    "tf-statements": "evaluate-truth",
    "tt-single": "formula-truth-table",
    "tt-equiv": "equivalence-truth-table",
    "tt-argument": "argument-truth-table",
    "translation": "symbolic-translation",
    "combo": "combo-translation-truth-table",
    derivation: "derivation-hardegree"
}

let probconvert = {
    "true-false": (q) => {
        let c = {...q};
        if (c.answer) {
            delete c.answer;
        }
        return c;
    },
    'valid-correct-sound': (q) => (parseNLargument(q.question)),
    'gmh-counterexample': (q) => (parseNLargument(q.question)),
    'evaluate-truth': (q) => (Formula.from(q.statement).normal),
    'formula-truth-table': (q) => (Formula.from(q.statement).normal),
    'equivalence-truth-table': (q) => ({ l: Formula.from(q.A).normal,
        r: Formula.from(q.B).normal}),
    'argument-truth-table': (q) => ({
        prems: q.premises.map((p) => (Formula.from(p).normal)),
        conc: Formula.from(q.conclusion).normal
    }),
    "symbolic-translation": (q) => (q.question),
    "combo-translation-truth-table": (q) => {
        let argument = [];
        for (let i=0; i<q.sentences.length; i++) {
            let s = {};
            s.statement = q.sentences[i];
            if (q.pretexts[i] && (q.pretexts[i] != '')) {
                s.pre = q.pretexts[i];
            }
            argument.push(s);
        }
        return argument;
    },
    "derivation-hardegree": (q) => ({
        prems: q.premises.map((w) => (Formula.from(w).normal)),
        conc: Formula.from(q.conclusion).normal
    }),
}

let descriptions = {
    "true-false": "True or false?",
    "valid-correct-sound": "Valid? Factually correct? Sound?",
    "gmh-counterexample": "Is there a counterexample?",
    "evaluate-truth": "Applying truth functions",
    "formula-truth-table": "Formula truth tables",
    "argument-truth-table": "Argument truth tables",
    "equivalence-truth-table": "Equivalence truth tables",
    "symbolic-translation": "Translations",
    "combo-translation-truth-table": "Combination problems",
    "derivation-hardegree": "Derivations"
}


let ansconvert = {
    "true-false": (a) => (a),
    "valid-correct-sound": (a) => (a),// only after fix
    "gmh-counterexample": (a) => {
        if (typeof a == 'boolean') {
            return { valid: (!a) }
        }
        return { valid: (!a.answer),
            counterexample: parseNLargument(a.counterexample)
        }
    },
    "evaluate-truth": (a) => (a.tv),
    "formula-truth-table": (a) => {
        let fml = Formula.from(a);
        let interps = libtf.allinterps([fml]);
        let taut = true;
        let contra = true;
        let opspot = 0;
        let rows = interps.map( (interp) => {
            let e = libtf.evaluate(fml, interp);
            if (e.tv) { contra = false; } else { taut = false; }
            opspot = e.opspot;
            return e.row;
        }) ;
        return { taut, contra, opspot, rows };
    },
    "equivalence-truth-table": (a) => {
        let fmlA = Formula.from(a.A);
        let fmlB = Formula.from(a.B);
        let interps = libtf.allinterps([fmlA,fmlB]);
        let equiv = true;
        let A = {};
        let B = {};
        A.opspot = 0;
        B.opspot = 0;
        A.rows = [];
        B.rows = [];
        for (let interp of interps) {
            let ea = libtf.evaluate(fmlA, interp);
            let eb = libtf.evaluate(fmlB, interp);
            A.opspot = ea.opspot;
            B.opspot = eb.opspot;
            A.rows.push(ea.row);
            B.rows.push(eb.row);
            equiv = (equiv && (ea.tv == eb.tv));
        }
        return { equiv, A, B }
    },
    "argument-truth-table": (a) => {
        let pwffs = a.premises.map((p)=>(Formula.from(p)));
        let cwff = Formula.from(a.conclusion);
        let interps = libtf.allinterps([...pwffs,cwff]);
        let valid = true;
        let prems = [];
        for (let pr of pwffs) { prems.push({opspot:0,rows:[]}); }
        let conc = {};
        conc.rows = [];
        conc.opspot = 0;
        for (let interp of interps) {
            let allpremstrue = true;
            for (let i=0; i<pwffs.length; i++) {
                let w = pwffs[i];
                let e = libtf.evaluate(w, interp);
                prems[i].opspot = e.opspot;
                prems[i].rows.push(e.row);
                allpremstrue = (allpremstrue && e.tv);
            }
            let ce = libtf.evaluate(cwff, interp);
            conc.opspot = ce.opspot;
            conc.rows.push(ce.row);
            valid = (valid && (!allpremstrue || ce.tv));
        }
        return { valid, prems, conc }
    },
    "symbolic-translation": (a) => (Formula.from(a).normal),
    "combo-translation-truth-table": (a) => {
        let rv = { index: a.index, translations: a.translations };
        rv.tables = [];
        let wffs = a.translations.map((t) => (Formula.from(t)));
        let interps = libtf.allinterps(wffs);
        rv.valid = true;
        for (let i=0; i<wffs.length; i++) {
            rv.tables.push({ rows:[], opspot: 0 });
        }
        for (let interp of interps) {
            let allpremstrue = true;
            let conctrue = false;
            for (let i=0; i<wffs.length; i++) {
                let wff=wffs[i];
                let e = libtf.evaluate(wff, interp);
                rv.tables[i].opspot = e.opspot;
                rv.tables[i].rows.push(e.row);
                if (i==a.index) { // conclusion
                    conctrue = e.tv;
                } else { //premise
                    allpremstrue = (allpremstrue && e.tv);
                }
            }
            rv.valid = (rv.valid && (!allpremstrue || conctrue));
        }
        return rv;
    },
    "derivation-hardegree": (a) => ('TODO')
}

// ACTUAL DATA COLLECTION

let info  = {};
let probs = [];
let ans   = [];

let oinfo = hwinfo[filebase] ?? {};

info.startnum  = oinfo.startnum ?? 1;
info.longtitle = oinfo.pagetitle ?? 'Exercise Set 3D';
info.duetime = 9666836723000;
info.savable = true;
info.servergraded = true;

info.problemsets = [];
for (const inpset of indata) {
    let newset = {};
    let newprobs = [];
    let newans = [];
    newset.immediateresult = (oinfo.canbemarked ?? true);
    newset.cheat = (oinfo.canbemarked ?? true);
    newset.problemtype   = newproblemtype[inpset.probType];
    if (filebase == '3d') { newset.problemtype = 'argument-truth-table'; }
    newset.description   = descriptions[newset.problemtype];
    newset.instructions  = stripptag(inpset.instructions);
    if (newset.instructions == "SENTTRANS") {
        newset.instructions = "Translate the following statements into the language of Sentential Logic. Use the first letters of the all-uppercase words in your translations.";
    }
    if (newset.instructions == "PREDTRANS") {
        newset.instructions = "Translate each of the following statements into the language of Predicate Logic. Use the first letter of the all-uppercase English words in your translation. (They should be used either as lower or uppercase in the translation, as required.)";
    }
    if (newset.instructions == "SENTDERIV") {
        newset.instructions = "For each of the following arguments, construct a formal derivation of the conclusion from the premises.";
    }
    if (newset.instructions == "PREDDERIV") {
        newset.instructions = "For each of the following arguments, construct a formal derivation of the conclusion from the premises.";
    }
    newset.lecturelink   = inpset.lectureLink;
    newset.partialcredit = false;
    if (inpset.numToUse) {
        newset.number = inpset.numToUse;
    } else {
        if (filebase == 'pracexam1') {
            newset.number = 2;
        } else {
            newset.number = 5;
        }
    }
    newset.points = 1;
    newset.options = optionsfor[inpset.probType];
    newset.manuallygraded = false;
    for (const q of inpset.qA) {
        if (filebase == '3d') {
            q.premises = [q.A];
            q.conclusion = q.B;
        }
        newprobs.push(probconvert[newset.problemtype](q));
        // fix counterexample
        if (q.counterexample && q.counterexample != '') {
            q.answer = {
                answer: q.answer,
                counterexample: q.counterexample
            }
        }
        // fix stupid fvs question
        if (!("answer" in q) && ("vanswer" in q)) {
            q.answer = {
                correct: (q.fanswer == "can’t tell") ? -1 : q.fanswer,
                valid: q.vanswer
            }
        }
        if (newset.problemtype == 'evaluate-truth') {
            // we'll handle this above
            q.answer = libtf.evaluate(
                Formula.from(q.statement),
                newset.options.interp
            );
        }
        if (newset.problemtype == 'formula-truth-table') {
            q.answer = q.statement;
        }
        if (newset.problemtype == 'equivalence-truth-table') {
            q.answer = {};
            q.answer.A = q.A;
            q.answer.B = q.B;
        }
        if (newset.problemtype == 'argument-truth-table') {
            q.answer={};
            q.answer.premises = q.premises;
            q.answer.conclusion = q.conclusion;
        }
        if (newset.problemtype == 'combo-translation-truth-table') {
            q.answer={};
            q.answer.index = q.conclusion;
            q.answer.translations = q.translations.map((w) =>
                (Formula.from(w).normal));
        }
        newans.push(ansconvert[newset.problemtype](q.answer));
        if (filebase == '3d') {
            let r = { premises: [q.conclusion],
                conclusion: q.premises[0]
            }
            newprobs.push(probconvert[newset.problemtype](r));
            newans.push(ansconvert[newset.problemtype](r));
        }
    }
    info.problemsets.push(newset);
    probs.push(newprobs);
    ans.push(newans);
}

lpfs.savejson(exinfoout,  info)  || process.exit(1);
lpfs.savejson(exprobsout, probs) || process.exit(1);
lpfs.savejson(exansout,   ans)   || process.exit(1);
