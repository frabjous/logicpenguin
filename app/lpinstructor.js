// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

////////////////// lpinstructor.js /////////////////////////////////////
// responds to instructor-only json requests                          //
////////////////////////////////////////////////////////////////////////

import lpauth from './lpauth.js';
import lpdata from './lpdata.js';
import lpfs from './lpfs.js';
import lplti from './lplti.js';
import path from 'node:path';
import {execSync} from 'node:child_process';

// set datadir
const datadir = process.appsettings.datadir;

const qr = {};

qr.allexerciseinfo = async function(req) {
  const info = {};
  // read info about exercises
  const exdir = path.join(datadir, req.consumerkey, req.contextid, 'exercises');
  if (!lpfs.ensuredir(exdir)) {
    return {
      error: true,
      errMsg: 'Could not find or create exercise directory.'
    }
  }
  let exfiles = await lpfs.filesin(exdir);
  if (exfiles === false) { exfiles = []; }
  // only look at -info files
  exfiles = exfiles.filter((f) => (f.substr(-10) == '-info.json'));
  // read exercises for the duetime
  for (const fn of exfiles) {
    const ffn = path.join(exdir, fn);
    const exinfo = lpfs.loadjson(ffn);
    // the exnum cuts off 10 characters '-info.json'
    const exnum = fn.substr(0, fn.length - 10);
    if (!exinfo) { continue; }
    info[exnum] = exinfo;
  }
  return info;
}

qr.allstudentinfo = async function(req) {
  const info = {};
  // read info about exercises
  const exdir = path.join(datadir, req.consumerkey, req.contextid, 'exercises');
  if (!lpfs.ensuredir(exdir)) {
    return {
      error: true,
      errMsg: 'Could not find or create exercise directory.'
    }
  }
  let exfiles = await lpfs.filesin(exdir);
  if (exfiles === false) { exfiles = []; }
  // only look at -info files
  exfiles = exfiles.filter((f) => (f.substr(-10) == '-info.json'));
  info.exercises = {};
  // read exercises for the duetime
  for (const fn of exfiles) {
    const ffn = path.join(exdir, fn);
    const exinfo = lpfs.loadjson(ffn);
    // the exnum cuts off 10 characters '-info.json'
    const exnum = fn.substr(0, fn.length - 10);
    if (!exinfo) { continue; }
    if (exinfo?.savable &&
        (("duetime" in exinfo) && (exinfo.duetime > 0))) {
      info.exercises[exnum] = exinfo.duetime;
    }
  }
  // read list of students
  const usersdir = path.join(datadir, req.consumerkey, req.contextid, 'users');
  const users = await lpfs.subdirs(usersdir);
  info.users = {};
  for (const userid of users) {
    const userinfo = {};
    userinfo.exercises = {};
    const userdir = path.join(usersdir, userid);
    const extensionsdir = path.join(userdir, 'extensions');
    const launchesdir = path.join(userdir, 'launches');
    let launches = await lpfs.filesin(launchesdir);
    if (!launches) {
      launches = [];
    }
    // read personal data from first launch
    if (launches.length > 0) {
      const launchfile = path.join(launchesdir, launches[0]);
      const launchinfo = lpfs.loadjson(launchfile);
      for (const personalinfo of ['email','family','given','fullname','roles']) {
        if (personalinfo in launchinfo) {
          userinfo[personalinfo] = launchinfo[personalinfo];
        }
      }
    }
    const saveddir = path.join(userdir, 'saved');
    const scoresdir = path.join(userdir, 'scores');
    for (const exnum in info.exercises) {
      const thisex = {};
      const extfile = path.join(extensionsdir, exnum + '.json');
      const savedfile = path.join(saveddir, exnum + '.json');
      const scorefile = path.join(scoresdir, exnum + '.json');
      const overridefile = path.join(scoresdir,
        'override-' + exnum + '.json');
      if (lpfs.isfile(extfile)) {
        const exttime = lpfs.loadjson(extfile);
        if (exttime !== false) {
          thisex.extension = exttime;
        }
      }
      if (lpfs.isfile(scorefile)) {
        const score = lpfs.loadjson(scorefile);
        if (score !== false) {
          thisex.score = score;
        }
      }
      if (lpfs.isfile(overridefile)) {
        thisex.overridden = true;
      }
      thisex.launch = false;
      for (const l of launches) {
        if (l.substring(0, exnum.length + 1) == exnum + '-') {
          let lstr = l.substr(-45);
          lstr = lstr.substring(0,40);
          thisex.launch = lstr;
          break;
        }
      }
      thisex.saved = lpfs.isfile(savedfile);
      userinfo.exercises[exnum] = thisex;
    }
    info.users[userid] = userinfo;
  }
  return info;
}

qr.deleteexercise = async function(req) {
  if (!("exnum" in req)) {
    return { error: true, errMsg: 'Exercise to delete not specified.' }
  }
  const exnum = req.exnum;
  const exdir = path.join(datadir, req.consumerkey, req.contextid,
    'exercises');
  const exinfofile = path.join(exdir, exnum + '-info.json');
  const exprobfile = path.join(exdir, exnum + '-allproblems.json');
  const exansfile = path.join(exdir, exnum + '-answers.json');
  if (lpfs.isfile(exinfofile)) {
    const delres = await lpfs.deletefile(exinfofile);
    if (!delres) { return {
      error: true,
      errMsg: 'Unable to delete exericse info file.'
    }}
  }
  if (lpfs.isfile(exprobfile)) {
    const pdelres = await lpfs.deletefile(exprobfile);
    if (!pdelres) { return {
      error: true,
      errMsg: 'Unable to delete exericse problems file.'
    }}
  }
  if (lpfs.isfile(exansfile)) {
    const adelres = await lpfs.deletefile(exansfile);
    if (!adelres) { return {
      error: true,
      errMsg: 'Unable to delete exericse answers file.'
    }}
  }
  return { success: true }
}

qr.exerciseinfo = async function(req) {
  if (!("exdata" in req)) {
    return { error: true, errMsg: 'No exercise info included.' }
  }
  const exdata = req.exdata;
  // rename if need be
  if (exdata.origexnum && (exdata.origexnum != exdata.exnum)) {
    const renameRes = await renameExerciseFiles(req.consumerkey,
      req.contextid, exdata.origexnum, exdata.exnum);
    if (!renameRes) {
      return { error: true, errMsg: 'Unable to rename exercise.' }
    }
  }
  const exdir = path.join(datadir, req.consumerkey, req.contextid, 'exercises');
  if (!lpfs.ensuredir(exdir)) {
    return { error: true, errMsg: 'Cannot find or create exercise directory.' }
  }
  const exinfofile = path.join(exdir, exdata.exnum + '-info.json');
  // do not overwrite existing exercise
  if ((!exdata.origexnum) && (lpfs.isfile(exinfofile))) {
    return { error: true, errMsg: 'Unable to create exercise; an ' +
      'exercise with that short name already exists!' }
  }
  const exinfo = exdata.exinfo;
  const exnum = exdata.exnum;
  if (exinfo.duetime === null) { delete exinfo.duetime; }
  let answers = [];
  let problems = [];
  if ("answers" in req) {
    answers = req.answers;
  }
  if ("problems" in req) {
    problems = req.problems;
  }
  // make sure all the numbers match
  const probsets = exinfo.problemsets;
  if (probsets.length != answers.length || probsets.length != problems.length) {
    return {
      error: true,
      errMsg: 'Info for an inconsistent number of problem sets received.'
    }
  }
  for (let i=0; i<problems.length; i++) {
    const probsetprobs = problems[i];
    const probsetans = answers[i];
    if (probsetprobs.length != probsetans.length) {
      return {
        error: true,
        errMsg: 'Numbers of problems and answers do not match.'
      }
    }
  }
  // save files
  const exprobfile = path.join(exdir, exnum + '-allproblems.json');
  const exansfile = path.join(exdir, exnum + '-answers.json');
  if (!lpfs.savejson(exinfofile, exinfo)) {
    return {
      error: true,
      errMsg: 'Unable to save exercise information file.'
    }
  }
  if (!lpfs.savejson(exprobfile, problems)) {
    return {
      error: true,
      errMsg: 'Unable to save exercise problems file.'
    }
  }
  if (!lpfs.savejson(exansfile, answers)) {
    return {
      error: true,
      errMsg: 'Unable to save exercise answers file.'
    }
  }
  return { success: true }
}

qr.getexinfo = async function(req) {
  if (!("exnum" in req)) {
    return { error: true, errMsg: 'No exercise number provided.' }
  }
  const exnum = req.exnum;
  const exdir = path.join(datadir, req.consumerkey, req.contextid,
    'exercises');
  const infofile = path.join(exdir, exnum + '-info.json');
  const probfile = path.join(exdir, exnum + '-allproblems.json');
  const ansfile = path.join(exdir, exnum + '-answers.json');
  if (!lpfs.isfile(infofile)) {
    return { error: true, errMsg: 'Exercise data not found.' }
  }
  const rv = {};
  rv.exinfo = lpfs.loadjson(infofile);
  if (!rv.exinfo) {
    return { error: true, errMsg: 'Could not read exercise data.' }
  }
  if (lpfs.isfile(probfile)) {
    rv.problems = lpfs.loadjson(probfile);
  } else {
    rv.problems = [];
  }
  if (lpfs.isfile(ansfile)) {
    rv.answers = lpfs.loadjson(ansfile);
  } else {
    rv.answers = [];
  }
  return rv;
}

qr.getsystemnames = async function(req) {
  const files = await lpfs.filesin('public/js/problemtypes');
  const systemspt = files.filter((f) => {
    if (f.substring(0,11) != 'derivation-') { return false; }
    if (f.indexOf('-base') != -1) { return false; }
    return true;
  });
  const systems = systemspt.map((n) => (
    n.replace('derivation-','').replace('.js','')
  ));
  return { systems }
}

qr.grantextension = async function(req) {
  for (const reqqy of ["consumerkey", "contextid", "extuserid", "extexnum",
    "ts"]) {
    if (!(reqqy in req)) {
      return { error: true, errMsg: 'Insufficient information ' +
        'provided to grant extension.' }
    }
  }
  const success = lpdata.grantExtension(req.consumerkey, req.contextid,
    req.extuserid, req.extexnum, req.ts);
  if (!success) {
    return { error: true,
      errMsg: 'Unable to grant extension.'
    }
  }
  return { success: true };
}

qr.lectcomponentinfo = async function(req) {
  const {consumerkey, contextid, pagename} = req;
  if (!consumerkey || !contextid || !pagename) return {
    error: true,
    errMsg: 'Insufficient information provided to fetch lecture info.'
  }
  const lectdir = path.join(datadir, consumerkey, contextid, 'lectures');
  const lectfile = path.join(lectdir, pagename + '.html');
  const lecthtml = lpfs.loadfile(lectfile) ?? '';
  const lpieces = lecthtml.split('<!-- LOGICPENGUIN-LECTURECOMPONENT --><div class="lecturecomponent');
  const htmlPieces = [];
  for (const lpiece of lpieces) {
    const subpieces = lpiece.split('">');
    if (subpieces.length < 2) continue;
    const comptype = subpieces[0].replaceAll('-',' ').trim();
    const html = subpieces.slice(1).join('">')
      .split('</div><!-- END-LOGICPENGUIN-LECTURECOMPONENT -->')?.[0]
      ?.trim();
    htmlPieces.push({comptype, html});
  }
  return {
    success: true,
    htmlPieces: htmlPieces
  }
}

qr.lectureinfo = async function(req) {
  const lectdir = path.join(datadir, req?.consumerkey, req?.contextid,
    'lectures');
  const lectinfofile = path.join(lectdir, 'lectureinfo.json');
  const lectinfo = lpfs.loadjson(lectinfofile) ?? {};
  // ensure still existing
  let changed = false;
  for (const pagename in lectinfo) {
    if (pagename == "contextdescription") continue;
    if (!lpfs.isfile(path.join(lectdir, pagename + '.html'))) {
      delete(lectinfo[pagename]);
      changed = false;
    }
  }
  if (changed) {
    lpfs.savejson(lectinfofile, lectinfo);
  }
  return lectinfo;
}

qr.overridescore = async function(req) {
  for (const reqqy of ["consumerkey", "contextid", "scoreuserid",
      "scoreexnum", "newscore"]) {
    if (!(reqqy in req)) {
      return { error: true, errMsg: 'Insufficient information ' +
        'provided to override score.' }
    }
  }
  const userdir = lpdata.userdir(req.consumerkey, req.contextid,
    req.scoreuserid, false);
  if (!userdir) {
    return { error: true, errMsg: 'Cannot find directory for user.' }
  }
  const scoredir = path.join(userdir, 'scores');
  const scorefile = path.join(scoredir, req.scoreexnum + '.json');
  const overridefile = path.join(scoredir, 'override-' + req.scoreexnum + '.json');
  let overrides = [];
  if (lpfs.isfile(overridefile)) {
    const readoverrides = lpfs.loadjson(overridefile);
    if (readoverrides) { overrides = readoverrides; }
  }
  let oldscore = false
  if (lpfs.isfile(scorefile)) {
    const readoldscore = lpfs.loadjson(scorefile);
    if (readoldscore) { oldscore = readoldscore; }
  }
  if (oldscore !== false) { overrides.push(oldscore); }
  const osavesucc = lpfs.savejson(overridefile, overrides);
  if (!osavesucc) {
    return { error: true, errMsg: 'Could not write file ' +
      'with override information.' };
  }
  const ssavesucc = lpfs.savejson(scorefile, req.newscore);
  if (!ssavesucc) {
    return { error: true, errMsg: 'Could not save new score.' };
  }
  // send to server
  lplti.sendScore(req.consumerkey, req.contextid, req.scoreuserid,
    req.scoreexnum, req.newscore);
  return { success: true };
}

qr.resetexercise = async function(req) {
  for (const reqqy of ["consumerkey", "contextid", "resetuserid",
      "resetexnum"]) {
    if (!(reqqy in req)) {
      return { error: true, errMsg: 'Insufficient information ' +
        'provided to reset exercise.' }
    }
  }
  const userdir = lpdata.userdir(req.consumerkey, req.contextid,
    req.resetuserid, false);
  if (!userdir) {
    return { error: true, errMsg: 'Cannot find directory for user.' }
  }
  const exnum = req.resetexnum;
  const answersfile = path.join(userdir, 'answers', exnum + '.json');
  const problemsfile = path.join(userdir, 'problems', exnum + '.json');
  const savedfile = path.join(userdir, 'saved', exnum + '.json');
  const resetdir = path.join(userdir, 'resets');
  if (!lpfs.ensuredir(resetdir)) {
    return { error: true, errMsg: 'Could not create reset directory.' }
  }
  const ts = (new Date()).getTime().toString();
  if (lpfs.isfile(answersfile)) {
    console.log("HERE")
    if (!lpfs.rename(answersfile,
      path.join(
        resetdir, 'reset-' + exnum + '-' + ts + '-answers.json'
      )
    )) {
      return {
        error: true,
        errMsg: 'Could not back up old answers file.'
      }
    }
  }
  if (lpfs.isfile(problemsfile)) {
    if (!lpfs.rename(problemsfile,
      path.join(
        resetdir, 'reset-' + exnum + '-' + ts + '-problems.json'
      )
    )) {
      return {
        error: true,
        errMsg: 'Could not back up old problems file.'
      }
    }
  }
  if (lpfs.isfile(savedfile)) {
    if (!lpfs.rename(savedfile,
      path.join(
        resetdir, 'reset-' + exnum + '-' + ts + '-saved.json'
      )
    )) {
      return {
        error: true,
        errMsg: 'Could not back up old saved answers file.'
      }
    }
  }
  return { success: true };
}

qr.savecontextsettings = async function(req) {
  if (!("contextSettings" in req)) {
    return {
      error: true,
      errMsg: 'No context settings to save were sent.'
    }
  }
  const dirname = path.join(datadir, req.consumerkey, req.contextid);
  if (!lpfs.ensuredir(dirname)) {
    return {
      error: true,
      errMsg: 'Could not find or create directory for course.'
    }
  }
  const settingsfile = path.join(dirname, 'context-settings.json');
  if (!lpfs.savejson(settingsfile, req.contextSettings)) {
    return {
      error: true,
      errMsg: 'Could not save course settings file.'
    }
  }
  return { success: true }
}

qr.savelecturepage = async function(req) {
  const {
    consumerkey,
    contextid,
    htmlPieces,
    ispreview,
    pagename,
    pagetitle,
    startName
  } = req;
  const lectdir = path.join(datadir, consumerkey, contextid, 'lectures');
  const lectinfofile = path.join(lectdir, 'lectureinfo.json');
  const lectinfo = lpfs.loadjson(lectinfofile) ?? {};
  let savepagename = pagename;
  if (ispreview) {
    savepagename = `tmp-preview-${pagename}-${Date.now().toString()}`;
  }
  // clear old info
  for (const oldpagename in lectinfo) {
    if (oldpagename.startsWith(`tmp-preview-${pagename}`) ||
        (oldpagename == startName && pagename != startName && !ispreview)) {
      delete(lectinfo[oldpagename]);
      await lpfs.deletefile(path.join(lectdir, oldpagename + '.html'));
    }
  }
  lectinfo[savepagename] = pagetitle;
  if (!lpfs.savejson(lectinfofile, lectinfo)) return {
    error: true,
    errMsg: 'Unable to save lecture not information file.'
  }
  let html = '';
  // if coming from markdown, change html to pandoc output
  for (const piece of htmlPieces) {
    if (!(piece?.comptype == 'content')) continue;
    if (!/LOGICPENGUIN-LECTURE-CONTENT-MODE md/.test(piece?.html)) continue;
    if (!/LOGICPENGUIN-LECTURE-CONTENT-MD/.test(piece.html)) continue;
    let mdcontent = piece.html.split(/LOGICPENGUIN-LECTURE-CONTENT-MD/)[1]
        .split('-->')[0].replaceAll('⟨!——','<!--').replaceAll('——⟩','-->').trim();
    if (mdcontent == '') continue;
    let pandochtml = pandocize(mdcontent);
    if (pandochtml == '') continue;
    piece.html = `<!-- LOGICPENGUIN-LECTURE-CONTENT-MODE md -->
<!-- LOGICPENGUIN-LECTURE-CONTENT-MD
${mdcontent}
-->` + pandochtml;
  }
  // rebuild page
  for (const piece of htmlPieces) {
    html += '<!-- LOGICPENGUIN-LECTURECOMPONENT -->' +
      '<div class="lecturecomponent' +
      ((piece?.comptype) ? ` ${piece.comptype.replaceAll(' ','-')}` : '') +
      '">\n' + piece.html + '\n</div>' +
      '<!-- END-LOGICPENGUIN-LECTURECOMPONENT -->\n';
  }
  if (!lpfs.ensuredir(lectdir)) return {
    error: true,
    errMsg: 'Unable to find or create lecture directory.'
  }
  if (!lpfs.savefile(path.join(lectdir, savepagename + '.html'), html)) {
    return {
      error: true,
      errMsg: 'Unable to save lecture notes page.'
    }
  }
  return {
    success: true,
    savedpagename: savepagename,
    savedpagetitle: pagetitle
  }
}

const lpinstructor = async function(reqobj) {
  // ensure we have all needed data
  const { userid, contextid, consumerkey, launchid, query } = reqobj;
  if (!launchid || !userid || !contextid || !consumerkey || !query) {
    return {
      error: true,
      errMsg: 'Insufficient information provided to process query.'
    };
  }
  if (!(query in qr)) {
    return {
      error: true,
      errMsg: 'Unkown query type.'
    };
  }
  if (!lpauth.verifylaunch(consumerkey, contextid, userid,
      'instructorpage', launchid)) {
    return {
      error: true,
      errMsg: 'Instructor query with unverified launch id.'
    };
  }
  return await qr[query](reqobj);
}

function pandocize(md) {
  let pandocout = '';
  try {
    pandocout = execSync('pandoc -f markdown -t html', {
      encoding: 'utf-8',
      input: md
    });
  } catch(err) {}
  return pandocout;
}

async function renameExerciseFiles(consumerkey, contextid, oldexnum, newexnum) {
  const exdir = path.join(datadir, consumerkey, contextid, 'exercises');
  if (!lpfs.ensuredir(exdir)) {
    return false;
  }
  const oldinfofile = path.join(exdir, oldexnum + '-info.json');
  const oldprobfile = path.join(exdir, oldexnum + '-allproblems.json');
  const oldansfile = path.join(exdir, oldexnum + '-answers.json');
  const newinfofile = path.join(exdir, newexnum + '-info.json');
  const newprobfile = path.join(exdir, newexnum + '-allproblems.json');
  const newansfile = path.join(exdir, newexnum + '-answers.json');
  // do not overwrite
  if (lpfs.isfile(newinfofile)) { return false; }
  if (lpfs.isfile(oldinfofile)) {
    const renresult = await lpfs.rename(oldinfofile, newinfofile);
    if (!renresult) { return false; }
  }
  if (lpfs.isfile(oldprobfile)) {
    const probrenresult = await lpfs.rename(oldprobfile, newprobfile);
    if (!probrenresult) { return false; }
  }
  if (lpfs.isfile(oldansfile)) {
    const ansrenresult = await lpfs.rename(oldansfile, newansfile);
    if (!ansrenresult) { return false; }
  }
  return true;
}

export default lpinstructor;
