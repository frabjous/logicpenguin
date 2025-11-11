// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

///////////////// supercharge/derivation-adelaide.js ///////////////////
// adds line checking to adelaide derivation problems                 //
/////////////////////////////////////////////////////////////////////////

import { addelem, htmlEscape } from '../common.js';
import adelaideDerivCheck from '../checkers/derivation-adelaide.js';
import tr from '../translate.js';

// a "myanswer" of true should mean there's no real answer,
// but we want the problem "charged up" anyway
// then there shouldn't be a show answer button
export function chargeup(probelem) {
  if (probelem?.myanswer && probelem.myanswer !== true && !probelem?.noshowanswer) {
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
    const question = this.myquestion;
    const answer = this.myanswer;
    const givenans = this.getAnswer();
    const partialcredit = false;
    const points = -1;
    const cheat = true;
    const options = this.options;
    // set to checking
    this.markLinesAsChecking();
    const ind = await adelaideDerivCheck(
      question, answer, givenans, partialcredit, points, cheat, options
    );
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
  return;
}

