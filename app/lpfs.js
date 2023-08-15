// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

/////////////////////////lpfs.js//////////////////////////////////////
// This script handles lp's interacting with the file system (fs)   //
// by reading and writing files, directory contents, etc.           //
//////////////////////////////////////////////////////////////////////

// Note to self: this library should not need to be able to make use
// of appsettings, since the lpsettings.js script calls it;
// always have caller provide the full path

// import node libraries
import fs from 'node:fs';
import path from 'node:path';

// initiate return value
const lpfs = {};

// returns true if the directory already exists, otherwise creates it
lpfs.ensuredir = function(dir) {
    if (lpfs.isdir(dir)) { return true; }
    return lpfs.mkdir(dir);
}

// true or false depending on whether argument is a directory
lpfs.isdir = function(dir) {
    let stats;
    try {
        stats = fs.statSync(dir);
    } catch (err) {
        return false;
    }
    return stats.isDirectory();
}

// true or false depending on whether argument is a filename of an
// exiting file
lpfs.isfile = function(dir) {
    let stats;
    try {
        stats = fs.statSync(dir);
    } catch (err) {
        return false;
    }
    return stats.isFile();
}

// returns (Promise of) an array with the files in a given directory
lpfs.filesin = async function(dir) {
    const rv = [];
    try {
        const contents = await fs.promises.readdir(dir);
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

// loads a json file and return its content as an object after parsing it
lpfs.loadjson = function(filename) {
    try {
        return JSON.parse(
            fs.readFileSync(filename, { encoding: "utf8", flag: "r" })
        );
    } catch(err) {
        return null;
    }
}

// same as above, but asynchronous, yielding a Promise
lpfs.loadjsonAsync = async function(filename) {
    try {
        const json = await fs.promises.readFile(filename,
            { encoding: "utf8", flag: "r" });
        return JSON.parse(json);
    } catch(err) {
        return null;
    }
}

// creates a directory
lpfs.mkdir = function(dir) {
    try {
        fs.mkdirSync(dir,
            { recursive: true, mode: 0o755 } );
    } catch(err) {
        return false;
    }
    return true;
}

// gets the modification time of a given file, in milliseconds since
// the start of the epoch (1970)
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

// rename a file
lpfs.rename = async function(oldpath, newpath) {
    try {
        await fs.promises.rename(oldpath, newpath);
    } catch(err) {
        return false;
    }
    return true;
}

// serializes an object as json and saves it as a file
lpfs.savejson = function(filename, obj) {
    try {
        fs.writeFileSync(filename, JSON.stringify(obj),
            { encoding: 'utf8', mode: 0o644 });
    } catch(err) {
        return false;
    }
    return true;
}

// as above, but asynchronous, yielding a Promise
lpfs.savejsonAsync = async function(filename, obj) {
    try {
        await fs.promises.writeFile(filename, JSON.stringify(obj),
            { encoding: 'utf8', mode: 0o644 });
    } catch(err) {
        return false;
    }
    return true;
}

// gets a (Promise of) a list of subdirectories of a directory
lpfs.subdirs = async function(dir) {
    const rv = [];
    try {
        const contents = await fs.promises.readdir(dir);
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

// attach return value to process so can be used by public scripts
if (process && !process?.lpfs) { process.lpfs = lpfs; }

// export the object containing the functions
export default lpfs;
