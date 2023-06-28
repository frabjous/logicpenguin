// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

import fs from 'node:fs';
import path from 'node:path';

let lpfs = {};

lpfs.ensuredir = function(dir) {
    if (lpfs.isdir(dir)) { return true; }
    return lpfs.mkdir(dir);
}

lpfs.isdir = function(dir) {
    var stats;
    try {
        stats = fs.statSync(dir);
    } catch (err) {
        return false;
    }
    return stats.isDirectory();
}

lpfs.isfile = function(dir) {
    var stats;
    try {
        stats = fs.statSync(dir);
    } catch (err) {
        return false;
    }
    return stats.isFile();
}

lpfs.filesin = async function(dir) {
    let rv = [];
    try {
        let contents = await fs.promises.readdir(dir);
        const promises = contents.map(async (item) => {
            const s = await fs.promises.stat(path.join(dir,item));
            // check if folder and hide hidden stuff too
            return ((s.isFile()) && (item[0] != '.'));
        });
        const isFileList = await Promise.all(promises);
        for (let i=0; i<contents.length; i++) {
            if (isFileList[i]) {
                rv.push(contents[i]);
            }
        }
    } catch(err) {
        return false;
    }
    return rv;
}

lpfs.loadjson = function(filename) {
    try {
        return JSON.parse(
            fs.readFileSync(filename, { encoding: "utf8", flag: "r" })
        );
    } catch(err) {
        return null;
    }
}

lpfs.loadjsonAsync = async function(filename) {
    try {
        let json = await fs.promises.readFile(filename,
            { encoding: "utf8", flag: "r" });
        return JSON.parse(json);
    } catch(err) {
        return null;
    }
}

lpfs.mkdir = function(dir) {
    try {
        fs.mkdirSync(dir,
            { recursive: true, mode: 0o755 } );
    } catch(err) {
        return false;
    }
    return true;
}

lpfs.mtime = async function(filename) {
    let rv = false;
    try {
        const s = await fs.promises.stat(filename);
        rv = s.mtimeMs;
    } catch(err) {
        return false;
    }
    return rv;
}

lpfs.savejson = function(filename, obj) {
    try {
        fs.writeFileSync(filename, JSON.stringify(obj),
            { encoding: 'utf8', mode: 0o644 });
    } catch(err) {
        return false;
    }
    return true;
}

lpfs.savejsonAsync = async function(filename, obj) {
    try {
        await fs.promises.writeFile(filename, JSON.stringify(obj),
            { encoding: 'utf8', mode: 0o644 });
    } catch(err) {
        return false;
    }
    return true;
}

lpfs.subdirs = async function(dir) {
    let rv = [];
    try {
        let contents = await fs.promises.readdir(dir);
        const promises = contents.map(async (item) => {
            const s = await fs.promises.stat(path.join(dir,item));
            // check if folder and hide hidden stuff too
            return ((s.isDirectory()) && (item[0] != '.'));
        });
        const isDirList = await Promise.all(promises);
        for (let i=0; i<contents.length; i++) {
            if (isDirList[i]) {
                rv.push(contents[i]);
            }
        }
    } catch(err) {
        return false;
    }
    return rv;
}

// attach to process so can be used by public scripts
if (process) { process.lpfs = lpfs; }

export default lpfs;
