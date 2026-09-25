// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

//////////////////// grades.js ///////////////////////////////////////////////
// defines the main functions controlling the grades view page for students //
//////////////////////////////////////////////////////////////////////////////

import {byid, addelem} from './common.js';
import tr from './translate.js';

function addrow(exnum) {
  const tbody = this;
  const trow = addelem('tr', tbody, {
    classes: ['graderow'],
    score: false
  });
  const extended = (exnum in (extensions ?? {}));
  const duetime = (extended) ? extensions[exnum] : allexercises[exnum].duetime;
  const dtd = addelem('td', trow, {
    innerHTML: (new Date(duetime)).toLocaleString()
  });
  if (extended) {
    dtd.classList.add('extended');
    dtd.title = tr('extended deadline');
  }
  const ntd = addelem('td', trow, {
    innerHTML: (allexercises?.[exnum]?.longtitle ?? 'Unknown exercise')
  });
  let hasscore = false;
  let scorestr = tr('(not due yet)');
  if (exnum in (usergrades ?? {})) {
    trow.score = usergrades[exnum];
    scorestr = prettyScore(trow.score, true);
    hasscore = true;
  }
  if (!hasscore) {
    if (currtime > duetime) {
      if (currtime < duetime + 86400000) {
        scorestr = tr('(not graded yet)');
      } else {
        trow.score = 0;
        hasscore = true;
        scorestr = prettyScore(trow.score);
      }
    }
  }
  const scoretd = addelem('td', trow, {
    innerHTML: scorestr,
    classes: ['score']
  });
  if (!hasscore) {
    scoretd.classList.add('notyet')
  }
  if (!dohyp) return;
  const hyptd = addelem('td', trow, {
    classes: ['hypcell']
  });
  if (!hasscore) {
    trow.hypinp = addelem('input', hyptd, {
      type: 'number',
      min: '0',
      max: '100',
      value: 0,
      onedit: updateFinalGrade,
      onchange: updateFinalGrade,
      oninput: updateFinalGrade
    });
  }
  return trow;
}

function gradeAverage(usedrop, usehyps) {
  let allscores = [];
  const allrows = document.getElementsByClassName("graderow");
  for (const trow of allrows) {
    if (trow?.score !== false) {
      allscores.push(trow.score);
      continue;
    }
    if (usehyps && trow?.hypinp) {
      allscores.push(trow.hypinp.value/100);
    }
  }
  allscores = allscores.sort();
  // drop lowest if specified to do so
  if (usedrop && settings?.drop) {
    allscores = allscores.slice(settings.drop);
  }
  if (allscores.length < 1) return 'n/a';
  // boost average slightly to accommodate js errors
  const avg = (allscores.reduce((a,b)=>(a+b))/allscores.length)
    + 0.000001;
  return prettyScore(avg) +
    ((doletters) ? ` (${lettergrade(avg)})` : '')
}

function lettergrade(n) {
  for (let i=0; i<settings.scale.length; i++) {
    const target = settings.scale[i];
    if (n>=target) return settings.letters[i];
  }
  return settings.letters[settings.letters.length - 1];
}

function prettyScore(n, multiply = true) {
  if (multiply) n = n * 100;
  return n.toFixed(2).replace(/\.?0+$/, '') +
    ((n==0) ? '' : '%');
}

function updateFinalGrade() {
  if (!finalgrtotal) return;
  finalgrtotal.innerHTML = gradeAverage(true, true);
}

const LPgrades = {};

const gradesinfo = window.gradesinfo;
const {
  allexercises,
  extensions,
  settings,
  name,
  usergrades
} = gradesinfo;
let finalgrtotal = null;

// use hypothetical score column only if
// there are upcoming due dates and finalwithhyp
// average exists
let dohyp = (settings?.averages?.finalwithhyp ?? false);
let currtime = Date.now();
const duetimes = Object.values(allexercises ?? {}).map(
  (e) => (e.duetime)
).concat(Object.values(extensions ?? {}));
const lasttime = (Math.max(...duetimes));
if (currtime > lasttime) dohyp = false;

// do averages section if any averages in settings
const doavgs = (Object.keys(settings?.averages ?? {}).length > 0);

// do letter grades in averages if set and scale numbers match
const doletters = (
  settings?.letters && settings?.scale &&
  (settings.letters.length == settings.scale.length)
);

LPgrades.setup = function() {
  if (name) {
    byid("studentname").innerHTML = gradesinfo.name;
  }
}

LPgrades.showtable =function() {
  const main = byid("gradesmain");
  main.innerHTML = '';
  const table = addelem('table', main, { classes: ['gradetable']});
  const thead = addelem('thead', table, {});
  const thr = addelem('tr', thead, {});
  const dueth = addelem('th', thr, {innerHTML:tr("Due")});
  const nameth = addelem('th', thr, {innerHTML:tr("Exercise")});
  const scoreth = addelem('th', thr, {innerHTML:tr("Recorded Score")});
  if (dohyp) {
    const hypth = addelem('th', thr, {innerHTML:tr("Hypothetical Score")});
  }
  const tbody = addelem('tbody', table, {});
  tbody.addrow = addrow;
  const exnums = Object.keys(gradesinfo?.allexercises ?? {}).sort(
    (a, b) => {
      const aex = allexercises[a];
      const bex = allexercises[b];
      if (aex?.duetime == bex?.duetime) {
        return aex?.longtitle?.localeCompare(bex?.longtitle) ?? 0;
      }
      return aex.duetime - bex.duetime;
    }
  );
  for (const exnum of exnums) {
    tbody.addrow(exnum);
  }
  if (!doavgs) return;
  const avgdiv = addelem('div', main, {
    classes: ["gradeavgs"]
  });
  const avgtbl = addelem('table', avgdiv, {});
  const avgtbody = addelem('tbody', avgtbl, {});
  if (settings?.averages?.allgraded) {
    const allgraded = addelem('tr', avgtbody, {});
    const allgradedlbl = addelem('td', allgraded, {
      innerHTML: tr('Average of all graded exercises: ')
    });
    const allgradedtotal = addelem('td', allgraded, {
      innerHTML: gradeAverage(false, false),
      classes: ['average']
    });
  }
  if (settings?.averages?.gradedwithdrop && (settings?.drop > 0)) {
    const dropavg = addelem('tr', avgtbody);
    const dropavglbl = addelem('td', dropavg, {
      innerHTML: tr('Average of graded exercises dropping lowest') +
        ` ${settings.drop.toString()}: `
    });
    const dropavgtotal = addelem('td', dropavg, {
      innerHTML: gradeAverage(true, false),
      classes: ['average']
    });
  }
  if (settings?.averages?.finalwithhyp) {
    const finalgr = addelem('tr', avgtbody);
    const finalgrlbl = addelem('td', finalgr, {
      innerHTML: tr('Final grade') +
        ((dohyp) ? (' <em>' + tr('using hypothetical scores')
        + '</em>') : '') + ': '
    });
    finalgrtotal = addelem('td', finalgr, {
      classes: ['finalgrade']
    });
  }
  updateFinalGrade();
}

LPgrades.setup();
LPgrades.showtable();

export default LPgrades;