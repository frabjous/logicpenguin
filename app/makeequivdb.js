import appsettings from './lpsettings.js';
import lpfs from './lpfs.js';
import { loadEquivalents } from '../public/js/symbolic/libequivalence-db.js';

console.log(loadEquivalents('Fa → ~Fa'));
console.log(loadEquivalents('Fa → ~Fa'));
console.log(loadEquivalents('~Fa → Fa'));
