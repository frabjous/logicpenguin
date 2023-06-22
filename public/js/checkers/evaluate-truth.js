export default async function(
    question, answer, givenans, partialcredit, points, cheat, options
) {
    let correct = (answer === givenans);
    return {
        successstatus: (correct ? "correct" : "incorrect"),
        points: ( correct ? points : 0 )
    }
}
