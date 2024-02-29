import { equivtest } from './libequivalence.js';

import getFormulaClass from './formula.js';

const Formula = getFormulaClass('hardegree');

console.log(equivtest(Formula.from('(G&S)&[J↔(B↔J)]'),Formula.from('(G&S)&[(J↔B)↔J]'),'hardegree'));
