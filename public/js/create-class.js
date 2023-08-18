// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// create-class.js /////////////////////////////
// base class for creating problems of a certain problem-type //
////////////////////////////////////////////////////////////////

import { addelem } from './common.js';
import tr from './translate.js';

export default class LogicPenguinProblem extends HTMLElement {

    constructor() {
        super();
        this.classList.add('problemset-creator');
    }

    makeProblemSetCreator(probsetinfo, problems, answers) {
        this.insAboveBtn = addelem('button', this, {
            type: 'button',
            mypset: this
        });
        const article = addelem('article', this);
        const header = addelem('header', article);
        this.divider = addelem('div', header, {
            classes: ['problemsetdivider']
        });
        this.pslabel = addelem('h3', this.divider);
        const topbuttons = addelem('div',  this.divider, {
            classes: ['problemsetdividerbuttons']
        });
        const moveAboveLabel = addelem('span', topbuttons, {
            innerHTML: 'move '
        });
        this.moveAboveBtn = addelem('select', topbuttons, {
            classes: ['problemsetmoveselect']
        });
        this.deleteButton = addelem('span', topbuttons, {
            classes: ['material-symbols-outlined',  'problemsetdeletebtn'],
            innerHTML: 'delete_forever'
        });
        const settingsform = addelem('div', header);
        const desclabel = addelem('div', settingsform, {
            innerHTML: tr('Heading (may be left blank to blend with set above)')
        });
    }

}

//            "cheat"
//            "description"
//            "immediateresult"
//            "instructions"
//            "manuallygraded"
//            "number"
//            "options"
//            "partialcredit"
//            "points"
//            "problemtype"


