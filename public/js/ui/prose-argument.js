
import { addelem, htmlEscape } from '../common.js';

export function getProseArgument(parNode, argdetails) {
    let argDiv = addelem('div', parNode, {
        classes: ['proseargument']
    });
    argDiv.statementSpans = [];
    let needTN = false;
    for (let sdetails of argdetails) {
        // space between statements
        if (needTN) {
            let tN = document.createTextNode(" ");
            argDiv.appendChild(tN);
        }
        needTN = true;
        // text before main statement
        if (sdetails.pre) {
            addelem('span', argDiv, {
                innerHTML: htmlEscape(sdetails.pre),
                classes: ['proseargpretext']
            });
        }
        if (sdetails.statement) {
            argDiv.statementSpans.push(
                addelem('span', argDiv, {
                    innerHTML: htmlEscape(sdetails.statement),
                    classes: ['proseargstatement']
                })
            );
        }
        // text after main statement
        if (sdetails.post) {
            addelem('span', argDiv, {
                innerHTML: htmlEscape(sdetails.post),
                classes: ['proseargposttext']
            });
        }
    }
    return argDiv;
}
