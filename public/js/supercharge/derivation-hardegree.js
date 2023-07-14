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

export function chargeup(probelem) {
    probelem.showansButton = addelem('button', probelem.buttonDiv, {
        innerHTML: tr('show answer'),
        type: 'button',
        myprob: probelem,
        onclick: function() {
            this.myprob.getSolution();
        }
    });
    probelem.checkLines = async function() {
        const question = this.myquestion;
        const answer = this.myanswer;
        const givenans = this.getAnswer();
        const partialcredit = false;
        const points = -1;
        const cheat = true;
        const options = this.options;
        // set to checking
        const lines = this.getElementsByClassName("derivationline");
        for (const line of lines) {
            if (line?.checkButton && line?.checkButton?.update) {
                if ((line.input.value != '') || (line.jinput.value != '')) {
                    line.checkButton.update('checking');
                }
            }
        }
        const ind = await hardegreeDerivCheck(
            question, answer, givenans, partialcredit, points, cheat, options
        );
        // save problem automatically if check reveals whole thing correct
        const forceSave = (ind.successstatus == 'correct' && !this.ishinting);
        ind.successstatus = 'edited';
        ind.savedstatus = 'unsaved';
        if (!this.isRestoring) {
            this.setIndicator(ind);
        }
        if (forceSave) {
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
    probelem.hintButton = addelem('button', probelem.buttonDiv, {
        innerHTML: tr('give hint'),
        type: 'button',
        myprob: probelem,
        onclick: function() {
            this.myprob.giveHint();
        }
    });
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
        while ((i<=max) &&
            (lines[i].input.value != '' && lines[i].jinput.value != '')) {
            i++;
        }
        // include last line in error check if it has both
        let incll = (lines[i].input.value != '' &&
            lines[i].jinput.value != '');
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
        if (allgood & incll) {
            this.setComment('<span class="celebratehint"><strong>' +
                tr('Hint.') + ' </strong><span>' +
                tr('Go ahead and celebrate. You’re done!') +
                '</span></span>');
            return;
        }
        // actually get hint
        const probinfo = this.getAnswer();
        console.log(probinfo);
        this.setComment('<span class="regularhint"><strong>' +
            tr('Hint.') + ' </strong>' +
            '<span>' + htmlEscape(tr(new hardegreeDerivationHint(probinfo,
                (this?.options ?? {}), incll).output())) + '</span></span>');
    }
    return;
}

