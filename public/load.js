// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////
// SETUP //
//////////

import {addelem, byid, url, makeInfobox, infoboxMsg} from './js/common.js';
import makeProgressBar from './js/ui/progress-bar.js';
import tr from './js/translate.js';
/*
import { formulaTable, equivTables, argumentTables, comboTables } from './js/symbolic/libsemantics.js';
import Formula from './js/symbolic/formula.js';
*/
const LP = {};

// attach convenience functions for export
LP.byid = byid;
LP.addelem = addelem;
LP.infoboxMsg = infoboxMsg;

// attach url for export
LP.url = url;

// start with no problem types loaded
LP.problemTypes = {};
LP.superChargers = {};

////////////////
// FUNCTIONS //
//////////////

LP.loadCSS = function(name) {
    addelem('link', document.head, {
        rel: 'stylesheet',
        type: 'text/css',
        href: LP.url + '/stylesheets/' + name + '.css'
    });
}
const loadCSS = LP.loadCSS;

LP.embed = async function(opts) {
    if (!("problemtype" in opts)) {
        console.error('Logic penguin embedding error: no problemtype specified.');
        return false;
    }
    const problemtype = opts.problemtype;
    if (!LP.problemTypes[problemtype]) {
        LP.loadCSS(problemtype);
        try {
            const imported = await import(LP.url +
                '/js/problemtypes/' + problemtype + '.js');
            LP.problemTypes[problemtype] = imported.default;
        } catch(err) {
            console.error('Logic penguin embedding error: problem loading ' +
                'script: ' + problemtype + '.js', err.toString(), err.stack);
            return false;
        }
    }
    const [ parentid, problem, answer, restore, options ] =
        LP.problemTypes[problemtype].sampleProblemOpts(opts);
    await LP.sampleProblem(parentid, problemtype, problem, answer,
        restore, options);
}

LP.makeProblems = async function(parentid, exerciseinfo,
    exerciseproblems, exerciseanswers, progressbar = true) {
    // ensure we have an appropriate element; clear it out
    const problemsdiv = byid(parentid);
    if (!problemsdiv) {
        problemsdiv = byid('problemsdiv');
    }
    if (!exerciseinfo) {
        exerciseinfo = window?.exerciseinfo;
    }
    if (!exerciseproblems) {
        exerciseproblems = window?.exerciseproblems;
    }
    if (!problemsdiv) { return; }
    problemsdiv.innerHTML = '';

    // ensure we have the data
    if (!exerciseinfo || !exerciseproblems || !exerciseinfo.problemsets) {
        return false;
    }

    // top message div
    const pagehdr = byid("pageheader");
    if (pagehdr && !pagehdr.infobox && !exerciseinfo.suppressinfobox) {
        pagehdr.infobox = makeInfobox();
        pagehdr.append(pagehdr.infobox);
        pagehdr.infobox.id = 'infobox';
    }

    // initialize question number at start
    let questionnumber = exerciseinfo.startnum ?? 1;

    if (questionnumber !== 1){
        document.body.style.counterReset = 'probnum ' +
            (questionnumber - 1).toString();
    }

    // loop over problem sets
    for (let probsetnum = 0; probsetnum < exerciseinfo.problemsets.length;
        probsetnum++) {
        // read set info
        const probsetinfo = exerciseinfo.problemsets[probsetnum];
        const probset = exerciseproblems[probsetnum];
        if (!probset || !probsetinfo || !probsetinfo.problemtype) {
            return false;
        }
        const problemtype = probsetinfo.problemtype;
        // load problemtype if need be
        if (!LP.problemTypes[problemtype]) {
            LP.loadCSS(problemtype);
            try {
                const imported = await import(LP.url +
                    '/js/problemtypes/' + problemtype + '.js');
                LP.problemTypes[problemtype] = imported.default;
            } catch(err) {
                console.error("problem loading script",problemtype + '.js',err.toString(), err.stack);
                LP.infoboxMsg('Unable to load all types of problem. ' +
                    'Check your internet connection and reload. ' +
                    'If the problem persists, inform your instructor.',
                    'error');
                return false;
            }
        }
        // create problem set div and header
        const probsetdiv = addelem('div', problemsdiv, {
            classes: [ 'problemset' ],
            id: 'probset' + probsetnum.toString(),
            myprobsetnumber: probsetnum
        });
        if ("description" in probsetinfo) {
            probsetdiv.description = addelem('h2', probsetdiv, {
                classes: [ 'problemsetdescription' ],
                innerHTML: probsetinfo.description
            });
        }
        if ("lecturelink" in probsetinfo) {
            const d = addelem('div', probsetdiv, {
                classes: ['lecturelink']
            });
            const l = addelem('a', d, {
                href: probsetinfo.lecturelink,
                innerHTML: tr('lecture notes on this material'),
                target: '_blank'
            });
        }
        if ("instructions" in probsetinfo) {
            let iH = probsetinfo.instructions;
            if (probsetinfo.points && probsetinfo.points > 1) {
                iH += ' (' + probsetinfo.points.toString() + ' ' +
                    tr('points each') + ')';
            }
            probsetdiv.instructions = addelem('div', probsetdiv, {
                classes: [ 'instructions' ],
                innerHTML: iH
            });
        }
        // set up problem list
        probsetdiv.probarea = addelem('div', probsetdiv, {
            classes: [ 'problemarea' ]
        });
        probsetdiv.problemlist = addelem('ol', probsetdiv.probarea, {
            classes: [ 'problemlist',
                probsetinfo.problemtype + '-list' ],
            start: questionnumber
        });
        // determine check/save button name
        let checksave = 'check / save';
        if (exerciseinfo.savable && !probsetinfo.immediateresult) {
            checksave = 'save';
        }
        if (!window.wasontime || !exerciseinfo.savable) {
            checksave = 'check';
        }
        // loop over problems
        let ctr = 0;
        for (const problem of probset) {
            const problemitem = addelem('li', probsetdiv.problemlist, {});
            const options = probsetinfo.options ?? {};
            const problemelem = LP.makeProblemElem(
                probsetinfo.problemtype, problem, probsetinfo.points,
                options, checksave
            );
            if (!problemelem) {
                console.log("ptype", probsetinfo.problemtype);
                console.log("problem", problem);
                console.log("points", probsetinfo.points);
                console.log("options", options);
                console.log("checksavE", checksave);
            }
            if (!problemitem) { return false; }
            problemitem.append(problemelem);
            problemelem.myprobsetnumber = probsetnum;
            problemelem.myproblemsdiv = problemsdiv;
            problemelem.mprobset = probset;
            problemelem.myexinfo = exerciseinfo;
            problemelem.mynumber = ctr;
            problemelem.myquestionnumber = questionnumber;
            problemelem.id = parentid + probsetnum + 'n' + ctr;
            // check if self-answerable
            if (exerciseanswers && ((typeof exerciseanswers?.[probsetnum]?.
                [ctr]) !== 'undefined') && exerciseanswers?.[probsetnum]
                ?.[ctr] !== null) {
                problemelem.myanswer = exerciseanswers[probsetnum][ctr];
                LP.superCharge(probsetinfo.problemtype, problemelem);
            }
            // check if unsavable
            if ((exerciseinfo?.savable !== true) ||
                (window?.wasontime === false)) {
                problemelem.markSaveStatus('unsavable');
            }
            questionnumber++; ctr++;
        }
    }
    if (progressbar) {
        problemsdiv.progressbar = makeProgressBar(problemsdiv);
    }
}

LP.makeProblemElem = function(probtype, problem, maxpoints, options,
        checksave) {
    if (!probtype || !problem) { return false; }
    const probelement = document.createElement(probtype);
    if (probelement.makeProblem) {
        probelement.makeProblem(problem, options, checksave);
    }
    probelement.maxpoints = maxpoints ?? 1;
    if (probelement.addIndicator) {
        probelement.addIndicator();
    }
    if (options.nobuttons) {
        if (probelement.buttonDiv) {
            probelement.buttonDiv.classList.add("hidden");
        }
    }
    if (options.noindicator) {
        if (probelement.indicator) {
            probelement.indicator.classList.add("hidden");
        }
    }
    probelement.myproblemtype = probtype;
    probelement.myquestion = problem;
    probelement.classList.add('problem');
    return probelement;
}

LP.restoreProblemStates = function(restoredata) {
    if (!restoredata) { return; }
    for (const restoreid in restoredata) {
        const prob = document.getElementById(restoreid);
        if (!prob) { continue; }
        prob.restoreState(restoredata[restoreid]);
    }
}

// here for legacy reasons with my own lecture notes; use "embed" instead
// directly if possible
LP.sampleATT = async function(
    parentid, prems, conc, restore = null, options = {}
) {
    const problem = { prems: prems, conc: conc };
    await LP.embed({
        parentid: parentid,
        problemtype: 'argument-truth-table',
        problem: problem,
        restore: restore,
        options: options,
        notation: 'hardegree'
    });
    if (options?.nonumchooser) {
        const nc = byid(parentid).getElementsByClassName("rownumchooser")?.[0];
        if (nc) { nc.classList.add("hidden"); }
    }
    if (options?.hidecheckboxes) {
        const ii = byid(parentid).getElementsByTagName("input");
        for (const i of ii) {
            if (i.type == "checkbox") { i.classList.add("hidden"); }
        }
    }
};

// again, here for legacy reasons; use embed directly
LP.sampleComboProb = async function(
    parentid,
    probinfo,
    restore = null,
    options = {}
) {
    const problem = probinfo.statements;
    options.probinfo = probinfo;
    await LP.embed({
        parentid: parentid,
        problem: problem,
        restore: restore,
        problemtype: 'combo-translation-truth-table',
        notation: 'hardegree',
        options: options
    });
}

// again, here for legacy reasons, try to use embed directly instead
LP.sampleETT = async function(
    parentid, a, b, restore = null, options = {}
) {
    const problem = { l: a, r: b };
    await LP.embed({
        parentid: parentid,
        problemtype: 'equivalence-truth-table',
        problem: problem,
        restore: restore,
        options: options,
        notation: 'hardegree'
    });
    if (options?.nonumchooser) {
        const nc = byid(parentid).getElementsByClassName("rownumchooser")?.[0];
        if (nc) { nc.classList.add("hidden"); }
    }
    if (options?.hidecheckboxes) {
        const ii = byid(parentid).getElementsByTagName("input");
        for (const i of ii) {
            if (i.type == "checkbox") { i.classList.add("hidden"); }
        }
    }
};

// once again here for legacy reasons and compatibility with my old lecture notes -KK
LP.sampleFTT = async function(
    parentid, problem, restore = null, options = {}
) {
    await LP.embed({
        parentid: parentid,
        problem: problem,
        restore: restore,
        options: options,
        problemtype: 'formula-truth-table',
        notation: 'hardegree'
    });
/*    let f = Formula.from(problem);
    let answer = formulaTable(f);
    await LP.sampleProblem(parentid, 'formula-truth-table',
        problem, answer, restore, options); */
    if (options?.nonumchooser) {
        const nc = byid(parentid).getElementsByClassName("rownumchooser")?.[0];
        if (nc) { nc.classList.add("hidden"); }
    }
    if (options?.hidecheckboxes) {
        const ii = byid(parentid).getElementsByTagName("input");
        for (const i of ii) {
            if (i.type == "checkbox") { i.classList.add("hidden"); }
        }
    }
};

// legacy reasons again
LP.sampleGHDerivation = async function(parentid, problem = null,
    answer = null, restore = null, options = {}) {
    await LP.embed({
        parentid: parentid,
        problem: problem,
        answer: answer,
        restore: restore,
        options: options,
        notation: 'hardegree',
        problemtype: 'derivation-hardegree'
    });
    if (answer && answer?.partial) {
        const pardiv = byid(parentid);
        for (const sdb of pardiv.getElementsByClassName("subderivbuttons")) {
            sdb.style.display = "none";
        }
        for (const bd of pardiv.getElementsByClassName("buttondiv")) {
            bd.style.display = "none";
        }
        for (const dlb of pardiv.getElementsByClassName("derivlinebuttons")) {
            dlb.style.display = "none";
        }
        for (const i of pardiv.getElementsByTagName("input")) {
            i.readOnly = true;
        }
        for (const indic of pardiv.getElementsByClassName("problemstatusindicator")) {
            indic.style.display = "none";
        }
    }
}

// core function for creating embedded problems; LP.embed is a wrapper
// around this, basically
LP.sampleProblem = async function(
    parentid,
    problemtype,
    problem,
    answer = null,
    restore = null,
    options = {}
) {
    const pardiv = byid(parentid);
    if (!pardiv) { return; }
    pardiv.classList.add("logicpenguin");
    const exerciseinfo = {
        startnum: 1,
        saveable: false,
        servergraded: false,
        problemsets: [{
            immediateresult: true,
            cheat: (("cheat" in options) ? options.cheat : true),
            problemtype: problemtype,
            partialcredit: false,
            number: 1,
            points: 1,
            options: options,
            suppressinfobox: true,
            manallygraded: false
        }]
    }
    const exerciseproblems = [[problem]];
    let exerciseanswers = null;
    if (answer === false) {
        exerciseanswers = [[false]];
    } else {
        if (answer !== null) {
            exerciseanswers = [[answer]];
        }
    }
    await LP.makeProblems(parentid, exerciseinfo,
        exerciseproblems, exerciseanswers, false);
    pardiv.classList.add("sampleproblem");
    if (restore !== null) {
        const prob = pardiv.getElementsByTagName(problemtype)[0];
        prob.restoreAnswer(restore);
    }
}

// for legacy reasons; use embed directly
LP.sampleTrans = async function(
    parentid,
    problem,
    answer = null
) {
    return await LP.embed({
        parentid: parentid,
        problem: problem,
        problemtype: 'symbolic-translation',
        notation: 'hardegree',
        answer: answer
    });
}

// adds hints, cheats, to problem, if it is appropriate
LP.superCharge = async function(problemtype, probelem) {
    if (!LP.superChargers[problemtype]) {
        try {
            LP.superChargers[problemtype] = await import(
                LP.url + '/js/supercharge/' + problemtype + '.js');
        } catch(err) {
            probelem.setIndicator({
                savestatus: 'malfunction',
                sucessstatus: 'malfunciton',
                points: -1,
                message: 'Cannot load some scripts. Check your internet '
                    + 'connection, and reload. If the problem persists, '
                    + 'inform your instructor. (' + err.toString() + ')'
            });
            return false;
        }
    }
    if (!LP.superChargers?.[problemtype]?.chargeup) { return false; }
    LP.superChargers[problemtype].chargeup(probelem);
}

///////////////////////////////
// LOAD NECESSARY RESOURCES //
/////////////////////////////
//
// Material Icons
//
addelem('link', document.head, {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css?family=Material+Symbols+Outlined',
    type: 'text/css'
});
//
// Regular Fira Sans
//
addelem('link', document.head, {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css?family=' +
        'Fira+Sans:200,200i,400,400i,700,700i,900',
    type: 'text/css'
});
//
// common stylesheet; will load LogicPenguin font
//
loadCSS('common');
// attach module to window so regular javascript can use it
// if need be
if (typeof window != 'undefined') {
    window.logicPenguin = LP;
}
export default LP;
