// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// supercharge/derivation-hardegree.js ///////////////////
// adds line checking and hint button to hardegree derivation problems //
/////////////////////////////////////////////////////////////////////////

import { addelem, htmlEscape } from '../common.js';
import hardegreeDerivCheck from '../checkers/derivation-hardegree.js';
import hardegreeDerivationHint from './derivation-hardegree-hint.js';
import tr from '../translate.js';

function getPartsUntil(inparts, numtoget) {
    let ctr = 0;
    let rv = [];
    for (const inpart of inparts) {
        const outpart = {};
        if ("parts" in inpart) {
            if ("closed" in inpart) {
                outpart.closed = inpart.closed;
            }
            if ("showline" in inpart) {
                outpart.showline = inpart.showline;
                ctr++;
            }
            if (ctr >= numtoget) {
                outpart.parts = [];
                rv.push(outpart);
                break;
            }
            const [recparts, n] =
                getPartsUntil(inpart.parts, numtoget - ctr);
            outpart.parts = recparts;
            ctr = ctr + n;
            if (ctr >= numtoget) {
                rv.push(outpart);
                break;
            }
        }
        rv.push(inpart);
        ctr++;
        if (ctr >= numtoget) {
            break;
        }
    }
    return [rv, ctr];
}

function fillInTo(probinfo, i) {
    const rv = {}
    if ("closed" in probinfo) {
        rv.closed = probinfo.closed;
    }
    if ("autocheck" in probinfo) {
        rv.autocheck = probinfo.autocheck;
    }
    const [parts, n] = getPartsUntil(probinfo.parts, (i+1));
    rv.parts = parts;
    return rv;
}

export function chargeup(probelem) {
    // if an answer is set to "true", it just means allow cheating
    // and no actual show answer is possible
    if (probelem.myanswer !== true && probelem.allowcheats && !probelem?.noshowanswer) {
        probelem.showansButton = addelem('button', probelem.buttonDiv, {
            innerHTML: tr('show answer'),
            type: 'button',
            myprob: probelem,
            onclick: function() {
                this.myprob.getSolution();
            }
        });
    }

    probelem.checkLines = async function() {
        if (!this.options.checklines && !this.options.hints) { return; }
        const question = this.myquestion;
        const answer = this.myanswer;
        const givenans = this.getAnswer();
        const partialcredit = false;
        const points = -1;
        const cheat = true;
        const options = this.options;
        // set to checking; should already be done when timer set, but
        // just in case
        this.markLinesAsChecking();
        const ind = await hardegreeDerivCheck(
            question, answer, givenans, partialcredit, points, cheat, options
        );
        // after check, mark them all unchecked, setting the indicator
        // will fill in what it needs to, I guess?
        this.markAllUnchecked();
        // save problem automatically if check reveals whole thing correct
        const forceSave = (ind.successstatus == 'correct' && !this.ishinting);
        ind.successstatus = 'edited';
        ind.savedstatus = 'unsaved';
        ind.fromautocheck = true;
        if (!this.isRestoring) {
            this.setIndicator(ind);
        }
        if (forceSave) {
            const lines = this.getElementsByClassName("derivationline");
            // remove empty line at end
            const lastline = lines[lines.length - 1];
            if ((lastline.input.value == '')
                && (lastline.jinput.value == '')) {
                lastline.parentNode.removeChild(lastline);
            }
            // check/save answer
            this.processAnswer();
        }
    }

    if (probelem.options.hints) {
        probelem.hintButton = addelem('button', probelem.buttonDiv, {
            innerHTML: tr('give hint'),
            type: 'button',
            myprob: probelem,
            onmousedown: function(e) {
                e.preventDefault();
            },
            onclick: function(e) {
                // may need to register line
                e.preventDefault();
                this.myprob.giveHint();
            }
        });
    }

    probelem.giveHint = async function() {
        //do a check first
        this.ishinting = true;
        await this.checkLines();
        this.ishinting = false;
        // check line status indicators
        const lines = this.getElementsByClassName("derivationline");
        // first first line without everything filled in
        let i = 0;
        const max = lines.length - 1;
        while ((i<max) &&
            (lines[i].input.value != '' && lines[i].jinput.value != '')) {
            i++;
        }
        // include last line in error check if it has both
        let incll = (lines[i].input.value != '' &&
            lines[i].jinput.value != '');
        const llblank = (lines[i].input.value == '' &&
            lines[i].jinput.value == '');
        // lltc = last line to check, depends on incll
        let lltc = incll ? i : i - 1;
        if (lltc < 0) { return; }
        // check those lines for errors
        let errfound = false;
        let allgood = true;
        for (let j=0; j<=lltc; j++) {
            const line = lines[j];
            if (!line.checkButton) { continue; }
            const ico = line.checkButton.getElementsByTagName("div")?.[0];
            if (!ico) { continue; }
            if (!ico.classList.contains('good')) {
                allgood = false;
            }
            if (ico.classList.contains('multierror') ||
                ico.classList.contains('syntaxerror') ||
                ico.classList.contains('ruleerror') ||
                ico.classList.contains('justificationerror')) {
                errfound = true;
                if (this.commentDiv) {
                    const hintspan = addelem('span', this.commentDiv, {
                        classes: ['errorhint'],
                        innerHTML: '<strong>' + tr('Hint.') + ' </strong> ' +
                            '<span>' + tr('Fix or remove the lines with errors ' +
                            'before continuing.') + '</span>'
                    });
                }
                return;
            }
        }
        if (allgood & (incll || llblank )) {
            this.setComment('<span class="celebratehint"><strong>' +
                tr('Hint.') + ' </strong><span>' +
                tr('Go ahead and celebrate. You’re done!') +
                '</span></span>');
            return;
        }
        // actually get hint
        const probinfo = this.getAnswer();
        let probinfoToUse = probinfo;
        let skippingBackUp = false;
        if (i<max) {
            probinfoToUse = fillInTo(probinfo, i);
            skippingBackUp = true;
        }
        this.setComment('<span class="regularhint"><strong>' +
            tr('Hint.') + ' </strong>' +
            '<span>' +
            ((skippingBackUp) ? (htmlEscape(tr('Let’s go back to line ')) +
                (i+1).toString() + ', and complete it. ') : '') +
            htmlEscape(tr(new hardegreeDerivationHint(probinfoToUse,
                (this?.options ?? {}), incll).output())) + '</span></span>');
    }
    return;
}

