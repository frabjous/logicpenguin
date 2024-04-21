// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////////// problem-class.js //////////////////////////////////
// The class that is common to all logic penguin problems               //
//////////////////////////////////////////////////////////////////////////

import tr from './translate.js';
import { addelem, byid, sendAnswerToServer, localCheck } from './common.js';
import { randomString } from './misc.js';
import LP from '../load.js';

// the problem is its HTML element, so we extend it
export default class LogicPenguinProblem extends HTMLElement {

    constructor() {
        super();
        this.changedat = 0;
    }

    // adds the indicator showing problem status
    addIndicator() {
        this.indicator = addelem('div', this, {
            classes: ['problemstatusindicator']
        });
        this.indicator.myprob = this;
        this.indicator.success = addelem('div', this.indicator,
            { classes: ['problemsuccessindicator'],
                innerHTML: '<span class="material-symbols-outlined">' +
                LogicPenguinProblem.statusIcons.unanswered + '</span>'
            }
        );
        this.indicator.saved = addelem('div', this.indicator,
            { classes: ['problemsavedindicator'],
                innerHTML: '<span class="material-symbols-outlined">' +
                LogicPenguinProblem.statusIcons.unsaved  + '</span>'
            }
        );
        this.indicator.points = addelem('span', this.indicator,
            { classes: ['problempointsindicator'] });
        this.indicator.points.maxpoints = this.maxpoints;
        this.indicator.msgarea = addelem('span', this.indicator,
            { classes: ['problemindicatormessage'] });
    }

    // read answer currently given; should be replaced by something
    // specific to problem type
    getAnswer() {
        return { determined: false };
    }

    // get what you need to describe current state of indicator
    getIndicatorStatus() {
        const ind = {};
        ind.successstatus = 'unanswered';
        for (const s of LogicPenguinProblem.successStatuses) {
            if (this.classList.contains(s)) {
                ind.successstatus = s;
                break;
            }
        }
        ind.savestatus = 'unsaved';
        for (const s of LogicPenguinProblem.saveStatuses) {
            if (this.classList.contains(s)) {
                ind.successstatus = s;
                break;
            }
        }
        ind.points = -1;
        if ("awarded" in this?.indicator?.points) {
            ind.points = this.indicator.points.awarded;
        }
        if (this?.indicator?.msgarea) {
            const iH = this.indicator.msgarea.innerHTML;
            if (iH != '') {
                ind.message = iH;
            }
        }
        return ind;
    }

    // takes an answer and creates a state exemplifying that answer
    // and reveals it; might need to be overridden for some problem
    // types (if saved answers do not match correct answers)
    getSolution() {
        if (!("myanswer" in this)) { return null; }
        this.restoreState({
            ans: this.myanswer,
            ind: {
                successstatus: 'correct',
                savedstatus: 'unsaved',
                points: -1,
                message: ''
            }
        });
        return true;
    }

    // get current answer and indicator state
    getState() {
        const state = {};
        state.ans = this.getAnswer();
        state.ind = this.getIndicatorStatus();
        return state;
    }

    // mark the changed-at time stamp with every change, and clear the
    // indicator status
    makeChanged() {
        this.changedat = (new Date()).getTime();
        if (!this.isRestoring) {
            this.setIndicator({
                savestatus: 'unsaved',
                successstatus: 'edited',
                points: -1,
                message: ''
            });
        }
    }

    // builds the original problem in its unanswered state; should be
    // replaced with something specific to the problem type
    makeProblem(problem, options, checksave) {
        this.myquestion = problem;
        this.options = options;
        this.checksave = checksave;
    }

    // functions to mark parts of the indicator
    markMessage(m) {
        if (!this?.indicator?.msgarea) {
            return;
        }
        this.indicator.msgarea.innerHTML = m;
    }

    markPoints(p) {
        if (!this?.indicator?.points) { return; }
        if (!this?.maxpoints) { return; }
        // -1 is no points determined
        if (p == -1) {
            if ("awarded" in this.indicator.points) {
                delete this.indicator.points.awarded;
                this.indicator.points.innerHTML = '';
            }
        } else {
            if (this.maxpoints != 1) {
                this.indicator.points.awarded = p;
                this.indicator.points.innerHTML =
                    p.toString() + ' / ' + this.maxpoints.toString() +
                    ' ' + tr('points awarded');
            }
        }
        if (this.myproblemsdiv.progressbar) {
            this.myproblemsdiv.progressbar.update();
        }
    }

    markSaveStatus(s) {
        // unsaveability is permanent
        if ((this.classList.contains("unsavable")) &&
            (s != 'malfunction') && (s != 'saveerror')) {
                this.pseudosaved = ((s == 'saved') ? true : false);
                return;
        }
        this.pseudosaved = false;
        this.classList.remove(...LogicPenguinProblem.saveStatuses);
        if (s != 'unsaved') {
            this.classList.add(s);
        }
        if (!this?.indicator) { return; }
        if (s in LogicPenguinProblem.statusIcons) {
            this.indicator.saved.innerHTML =
                '<span class="material-symbols-outlined"' +
                ((s == "unsavable") ? ' title="answers may not be saved"' :
                '') + '>' + LogicPenguinProblem.statusIcons[s] + '</span>';
        } else {
            this.indicator.saved.innerHTML = '';
        }
    }

    markSuccessStatus(s) {
        this.classList.remove(...LogicPenguinProblem.successStatuses);
        if (s != 'unanswered') {
            this.classList.add(s);
        }
        if (!this?.indicator) { return; }
        if (s in LogicPenguinProblem.statusIcons) {
            this.indicator.success.innerHTML =
                '<span class="material-symbols-outlined">' +
                LogicPenguinProblem.statusIcons[s] + '</span>';
        } else {
            this.indicator.saved.innerHTML = '';
        }

    }

    // behave appropriately for checking or saving the answer
    processAnswer() {
        // read the necessary info
        const state = this.getState();
        if (!state) {
            this.setIndicator({
                savestatus: 'malfunction',
                successstatus: 'malfunction',
                points: -1,
                message: 'Could not determine answer state.'
            });
            return;
        }

        // determine if answer should be sent to the server
        let serversend = (
            window.exerciseinfo && window.exerciseinfo.savable &&
            (this.myprobsetnumber >= 0) && (this.mynumber >= 0) &&
            this.id && window.exnum && window.launchid &&
            window.consumerkey && window.userid && window.contextid);
        const timestamp = (new Date()).getTime();

        // do not send if expired
        const ontime = (window.checkOnTime && window.wasontime) ?
            window.checkOnTime(timestamp) : false;
        if (ontime === -1) {
            this.setIndicator({
                successstatus: 'edited',
                savestatus: 'saveerror',
                points: -1,
                message: 'Time has expired; answers to this exercise may'
                    + ' no longer be saved.'
            });
            return;
        }
        if (!ontime) {
            this.setIndicator({
                savestatus: 'unsavable'
            });
        }
        serversend = (serversend && (ontime === true));
        if (serversend) {
            this.setIndicator( {
                savestatus: 'saving',
                successstatus: 'checking',
                points: -1,
                message: ''
            } );
            sendAnswerToServer({
                reqtype: 'saveans',
                probset: this.myprobsetnumber,
                num: this.mynumber,
                elemid: this.id,
                timestamp: timestamp,
                state: state
            });
            return;
        }
        // see if local check possible
        if ("myanswer" in this && "myproblemtype" in this) {
            localCheck(this);
        }
    }

    // should restore the problem to its answered state from its
    // unanswered state, and replaced with something specific to answer
    // type
    restoreAnswer(ans) {
        return true;
    }

    // should restore the problem using restoredata
    restoreState(state) {
        if ("ans" in state) {
            this.restoreAnswer(state.ans);
        }
        if ("ind" in state) {
            this.setIndicator(state.ind);
        }
    }

    // set/restore the problem's indicator to a given indicator state
    setIndicator(ind) {
        if (ind.successstatus) {
            this.markSuccessStatus(ind.successstatus);
        } else {
            this.markSuccessStatus('edited');
        }
        if (ind.savestatus) {
            this.markSaveStatus(ind.savestatus);
        } else {
            this.markSaveStatus('unsaved');
        }
        if (ind.points >= 0) {
            this.markPoints(ind.points);
        } else {
            this.markPoints(-1);
        }
        if (ind.message) {
            this.markMessage(tr(ind.message));
        } else {
            this.markMessage('');
        }
    }

    startOver() {
        const wasunsavable = this.classList.contains('unsavable');
        const hadindicator = (!!this.indicator);
        const problem = this.myquestion;
        const options = this.options;
        const checksave = this.checksave;
        this.innerHTML = '';
        this.makeProblem(problem, options, checksave);
        if (hadindicator) {
            this.addIndicator();
            this.markSuccessStatus('unanswered');
            if (this.wasunsavable) {
                this.markSaveStatus('unsavable');
            } else {
                this.markSaveStatus('unsaved');
            }
        }
        if ((this.myanswer) && (this.myproblemtype)) {
            LP.superCharge(this.myproblemtype, this);
        }
        this.scrollIntoView({ block: 'nearest' });
    }

    static sampleProblemOpts(opts) {
        let parentid = '';
        let problem = {};
        let answer = null;
        let restore = null;
        let options = {};
        // if options set, use them as options
        if ("options" in opts) {
            options = opts.options;
        }
        for (const opt in opts) {
            if (opt == 'parentid') {
                parentid = opts.parentid;
                continue;
            }
            if (opt == 'parent') {
                if (typeof opts.parent != 'object') { continue; }
                if (!document?.getElementById) { continue; }
                if (!opts?.parent?.id || opts.parent.id == '') {
                    let newid = randomString();
                    while (document.getElementById(newid)) {
                        newid = randomString();
                    }
                    opts.parent.id = newid;
                    parentid = newid;
                }
                continue;
            }
            if (opt == 'answer') {
                answer = opts.answer;
                continue;
            }
            if (opt == 'problem') {
                problem = opts.problem;
                continue;
            }
            if (opt == 'question') {
                if (!problem) {
                    problem = opts.question;
                }
                // don't return to let it get passed on
            }
            if (opt == 'restore') {
                restore = opts.restore;
                continue;
            }
            // don't overwrite explicit options
            if (opt in options) {
                continue;
            }
            // otherwise, pass to options
            options[opt] = opts[opt];
        }
        return [ parentid, problem, answer, restore, options ];
    }

    // properties directly of class
    static saveStatuses = [
        'malfunction',
        'saved',
        'saveerror',
        'saving',
        'unsavable'
    ]; // plus implicit unsaved

    static successStatuses = [
        'checking',
        'correct',
        'edited',
        'incorrect',
        'indeterminate',
        'malfunction',
        'unknown',
    ]; // plus implicit unanswered

    static statusIcons = {
        checking: 'thumbs_up_down',
        correct: 'check_circle',
        edited: 'edit_note',
        incorrect: 'cancel',
        indeterminate: 'psychology_alt',
        malfunction: 'sync_problem',
        saved: 'save',
        saveerror: 'lock_clock',
        saving: 'sync',
        unanswered: 'circle',
        unknown: 'pending',
        unsavable: 'sync_disabled',
        unsaved: 'circle'
    }
}

