// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// create-class.js /////////////////////////////
// base class for creating problems of a certain problem-type //
////////////////////////////////////////////////////////////////

import { addelem } from './common.js';
import tr from './translate.js';

export default class LogicPenguinProblemSetCreator extends HTMLElement {

    constructor() {
        super();
    }

    gatherInfo() {
        const info = {};
        const problems = [];
        const answers = [];
        const description = this?.descinput?.value.trim();
        info.problemtype = this.problemtype;
        if (description && description != '') {
            info.description = description;
        }
        const instructions = this?.instructionsinput?.value.trim();
        if (instructions && instructions != '') {
            info.instructions = instructions;
        }
        const number = this?.numberinput?.value;
        if (number && parseInt(number)) {
            info.number = parseInt(number);
        }
        const points = this?.pointsinput?.value;
        if (points && parseInt(points)) {
            info.points = parseInt(points);
        }
        info.partialcredit = this?.partialcreditcb?.checked ?? true;
        info.immediateresult = this?.immediatecb?.checked ?? false;
        info.cheat = this?.cheatcb?.checked ?? false;
        info.manuallygraded = this?.manualcb?.checked ?? false;
        return [info, problems, answers];
    }

    makeProblemSetCreator(probsetinfo, problems, answers) {
        this.classList.add('problemsetcreator');
        this.insAboveBtn = addelem('button', this, {
            type: 'button',
            innerHTML: tr('insert new problem set here'),
            mypset: this
        });
        const article = addelem('article', this);
        const header = addelem('header', article);
        this.divider = addelem('div', header, {
            classes: ['problemsetdivider']
        });
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
        this.pslabel = addelem('h3', this.divider);
        const clearer = addelem('br', this.divider);
        const settingsform = addelem('div', header, {
            classes: ['problemsetsettings']
        });
        const problemtypediv = addelem('div', settingsform);
        const problemtypelabel = addelem('span', problemtypediv, {
            innerHTML: tr('Problem type: '),
            classes: ['problemsetproblemtypelabel']
        });
        const problemtypeindicator = addelem('span', problemtypediv, {
            innerHTML: probsetinfo.problemtype,
            classes: ['problemsetproblemtype']
        });
        this.problemtype = probsetinfo.problemtype;
        const descdiv = addelem('div', settingsform);
        const desclabel = addelem('div', descdiv, {
            innerHTML: tr('Heading (may be left blank to blend with set above)')
        });
        this.descinput = addelem('input', descdiv, {
            type: 'text'
        });
        if (probsetinfo?.description) {
            this.descinput.value = probsetinfo.description;
        }
        const instructionsdiv = addelem('div', settingsform);
        const instructionslabel = addelem('div', instructionsdiv, {
            innerHTML: tr('Instructions (may be left blank to blend with set above)')
        });
        this.instructionsinput = addelem('textarea', instructionsdiv);
        if (probsetinfo?.description) {
            this.instructionsinput.value = probsetinfo.description;
        }
        const numberdiv = addelem('div', settingsform);
        const numberlabel = addelem('span', numberdiv, {
            innerHTML: tr('Number of problems') + ': '
        });
        this.numberinput = addelem('input', numberdiv, {
            type: 'number',
            min: '1'
        });
        if ("number" in probsetinfo) {
            this.numberinput.value = probsetinfo.number.toString()
        }
        const numbermoreinfo = addelem('div', numberdiv, {
            innerHTML: '(' + tr('If number is smaller than the number of ' + 
                'problems below, students will be given a random ' +
                'selection.') + ')'
        });
        const pointsdiv = addelem('div', settingsform);
        const pointslabel = addelem('span', pointsdiv, {
            innerHTML: tr('Points per problem') + ': '
        });
        this.pointsinput = addelem('input', pointsdiv, {
            type: 'number',
            min: '1',
            max: '100'
        });
        if ("points" in probsetinfo) {
            this.pointsinput.value = probsetinfo.points.toString()
        } else {
            this.pointsinput.value = '1';
        }
        const partialCreditLabel = addelem('label', pointsdiv, {
            innerHTML: tr('Allow partial credit') + ' '
        });
        this.partialcreditcb = addelem('input', partialCreditLabel, {
            type: 'checkbox'
        });
        this.partialcreditcb.checked =
            (!("partialcredit" in probsetinfo)
                || probsetinfo.partialcredit);
        const immediatediv = addelem('div', settingsform);
        const immediatelabel = addelem('label', immediatediv, {
            innerHTML: tr('Show result immediately') + ' '
        });
        this.immediatecb = addelem('input', immediatelabel, {
            type: 'checkbox'
        });
        this.immediatecb.checked = (("immediateresult" in probsetinfo) &&
            probsetinfo.immediateresult);
        const cheatdiv = addelem('div', settingsform);
        const cheatlabel = addelem('label', cheatdiv, {
            innerHTML: tr('Allow cheating/viewing answer') + ' '
        });
        this.cheatcb = addelem('input', cheatlabel, {
            type: 'checkbox'
        });
        this.cheatcb.checked = (("cheat" in probsetinfo) && probsetinfo.cheat);
        const manualdiv = addelem('div', settingsform);
        const manuallabel = addelem('label', manualdiv, {
            innerHTML: tr('Require manual grading') + ' '
        });
        this.manualcb = addelem('input', manuallabel, {
            type: 'checkbox'
        });
        this.manualcb.checked = (("manuallygraded" in probsetinfo) &&
            probsetinfo.manuallygraded);
        if (this.makeOptions) {
            this.makeOptions(probsetinfo?.options ?? {});
        }
    }

}

//            "options"


