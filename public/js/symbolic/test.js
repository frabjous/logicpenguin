import { equivtest } from './libequivalence.js';
import { equivProliferate } from './libequivalence-db.js';

import getFormulaClass from './formula.js';

const Formula = getFormulaClass('hardegree');

//console.log(equivProliferate(Formula.from('J↔(B↔J)'), {}, 'hardegree'));

console.log(equivtest(Formula.from('(G&S)&[J↔(B↔J)]'),Formula.from('(G&S)&[(J↔B)↔J]'),'hardegree'));
