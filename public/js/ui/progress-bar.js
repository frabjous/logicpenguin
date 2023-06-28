// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import { addelem } from '../common.js';
import tr from '../translate.js';

export default function makeProgressBar(problemsdiv) {
    let l = addelem('h3', problemsdiv, {
        innerHTML: tr('Progress')
    });
    let pb = addelem('div', problemsdiv, {
        classes: [ 'lpprogressbar' ]
    });
    pb.myproblemsdiv = problemsdiv;
    let t = addelem('table', pb);
    let tb = addelem('tbody', t);
    let tre = addelem('tr', tb);
    pb.correctcell = addelem('td', tre, {
        classes: [ 'pbcorrectcell' ],
        titlebase: tr('marked correct')
    });
    pb.savedcell = addelem('td', tre, {
        classes: [ 'pbsavedcell' ],
        titlebase: tr('saved but correctness unknown')
    });
    pb.unansweredcell = addelem('td', tre, {
        classes: [ 'pbunansweredcell' ],
        titlebase: tr('unanswered or unsaved')
    });
    pb.incorrectcell = addelem('td', tre, {
        classes: [ 'pbincorrectcell' ],
        titlebase: tr('marked incorrect')
    });
    pb.update = function() {
        let ttl = 0;
        let corr = 0;
        let incorr = 0;
        let saved = 0;
        let unans = 0;
        let ii = this.myproblemsdiv
            .getElementsByClassName(
                "problemstatusindicator"
            );
        for (const indic of ii) {
            if (!indic?.points?.maxpoints ||
                !indic?.myprob?.classList) {
                continue;
            }
            ttl += indic.points.maxpoints;
            if (indic.myprob.classList.contains("correct")) {
                corr += indic.points.maxpoints;
                continue;
            }
            if (indic.myprob.classList.contains("incorrect")) {
                let toadd = indic.points.awarded ?? 0;
                toadd = Math.max(toadd, 0);
                corr += toadd;
                let incpts = (indic.points.maxpoints - toadd);
                incorr += incpts;
                continue;
            }
            if (indic.myprob.classList.contains("saved")) {
                saved += indic.points.maxpoints;
                continue;
            }
            if (indic.myprob.pseudosaved) {
                saved += indic.points.maxpoints;
                continue;
            }
            unans += indic.points.maxpoints;
        }
        this.correctcell.pts = corr;
        this.incorrectcell.pts = incorr;
        this.unansweredcell.pts = unans;
        this.savedcell.pts = saved;
        for (let c of [
            this.correctcell,
            this.incorrectcell,
            this.unansweredcell,
            this.savedcell
        ]) {
            let perc = ((c.pts / ttl)*100).toFixed(2);
            c.style.width = perc.toString() + '%';
            c.title = c.titlebase + ': ( ' + c.pts.toString() +
                ' / ' + ttl.toString() + ' = ' +
                perc.toString() + '% )';
            c.style.display = "table-cell";
            if (perc < 0.2) {
                c.style.display = "none";
            }
            if (perc >= 20 && (
                c == this.correctcell ||
                c == this.savedcell
            )) {
                c.innerHTML = perc.toString() + '%';
            } else {
                c.innerHTML = '';
            }
        }
    }
    pb.update();
    return pb;
}
