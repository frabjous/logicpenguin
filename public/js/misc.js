// LICENSE: GNU GPL v3 You should have received a copy of the GNU General
// Public License along with this program. If not, see
// https://www.gnu.org/licenses/.

export function randomString(n = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                'abcdefghijklmnopqrstuvwxyz' +
                '0123456789';
    let rv = '';
    while (rv.length < n) {
        rv += chars[Math.floor(Math.random() * chars.length)];
    }
    return rv;
}

export function arrayUnion(a, b) {
    return [...(new Set([...a,...b]))];
}

export function perms(n) {
    let col=[[]];
    for (let i=0; i<n; i++) {
        let newcol = [];
        for (let a of col) {
            for (let j=0; j<=i ; j++) {
                let b = [...a];
                b.splice(j,0,i)
                newcol.push(b);
            }
        }
        col=newcol;
    }
    return col;
}
