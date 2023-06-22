
let libgrade = {}

libgrade.checkers = {};

libgrade.checkAnswer = async function(problemtype, question, answer,
    givenans, partialcredit, points, cheats, options) {

    // check if grader already loaded; load it if not
    if (!("problemtype" in libgrade.checkers)) {
        let imported = await import('./checkers/' + problemtype + '.js');
        libgrade.checkers[problemtype] = imported.default;
    }

    // if it's not a function, we cannot grade with it
    if (!(typeof libgrade.checkers[problemtype] == 'function')) {
        return false;
    }

    // apply check function and return result
    return await libgrade.checkers[problemtype](question, answer,
        givenans, partialcredit, points, cheats, options);
}

export default libgrade;
