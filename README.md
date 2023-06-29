
![logic penguin](/public/images/logicpenguin.png)

# Logic Penguin

🐧 Logic penguin 🐧 aims to be a flexible, extensible, open source, and self-hostable framework for online exercises for introductory logic problems, and interfaces with LMS systems such as [moodle](https://moodle.org/) and [canvas](https://www.instructure.com/canvas) using the [LTI protocol](https://www.imsglobal.org/activity/learning-tools-interoperability).

It is all written in JavaScript so code can be shared browser-side and server-side.

An [express.js](https://expressjs.com/)-based web-server is included to handle the LTI Tool Provider side of things, save and score exercises, submit grades, etc.

The project bears some similarities to the [Carnap.io](https://carnap.io) project, but has a narrower focus on providing exercises for introductory students, and um, is not written in Haskell.

<img src="/public/images/sample-deriv.gif" alt="sample-derivation" style="border: 2px solid black;">

🚧 It is still relatively early in its development. More documentation to come. 🚧

## Working examples

Working examples of the problems and their interface can be found embedded in my own publicly accessible interactive lecture notes for my [Phil 110 sections](https://logic.umasscreate.net) at UMass.

For truth tables: <https://logicpenguin.com/lectures/kck/34254/2>

For symbolic translations (scroll near to bottom): <https://logicpenguin.com/lectures/kck/34254/8>

For Kalish-Montague style derivations using Hardegree’s system: <https://logicpenguin.com/lectures/kck/34254/12>

Obviously, the examples do not allow for saving answers since they do not use the LMS login.

## Progress roadmap and todo

- [x] Implement the core ES6 Javascript Class modules shared by all the exercise types
- [x] Implement all exercise types necessary for Hardegree’s [*Symbolic Logic: A First Course*](https://courses.umass.edu/phil110-gmh/MAIN/IHome-5.htm) for [UMass Phil 110 (Intro to Logic)](https://logic.umasscreate.net), including correctness checkers for all problem types
    - [x] Multiple choice, including true/false
    - [x] Conclusion identification in prose arguments
    - [x] Validity/factually correctness/sound identification for simple arguments
    - [x] Truth tables
    - [x] Symbolic translations for sentential and predicate logic, with feedback useful to students, including equivalence checker
    - [x] Combined conclusion identification, translation, and truth table problems for prose arguments
    - [x] Kalish-Montague style derivations for sentential and predicate logic, including proof checker, optional line by line feedback and optional hints
- [x] Allow different notations to be used
- [x] Allow arbitrary rule sets for derivations to be used
- [x] Implement UI for inserting logical symbols easily both with the keyboard and mouse
- [x] Create a web-font containing all symbols likely to be necessary for any common logical notation by modifying and combining existing open license/source fonts, with the symbols in the appropriate Unicode codepoints
- [x] Provide a mechanism for embedding problems in lecture notes or other random web pages
- [x] Allow the express.js server to also serve lecture notes for courses whose problems it hosts
- [x] Allow the express.js server to serve arbitrary additional static content (e.g., a syllabus, other materials)
- [x] Activate CORS and allow SSL certs (for https) in the server; allow user-specifiable ports for both http and https
- [x] Provide flexible mechanisms for determining if and when students are given feedback about the correctness of their answers and see correct answers
- [x] Provide working LTI 1.1 integration with LMS systems using OAuth1
- [x] Allow arbitrary specification for how often the server “grades” exercises and submits scores to the LMS
- [ ] Adapt derivation UI for Fitch-style natural deduction proofs and the various [forall x](https://www.fecundity.com/logic/) type systems (partly done)
- [ ] Provide an instructor panel for certain things so they don’t have to be done server-side
    - [ ] granting extensions
    - [ ] seeing student progress
    - [ ] overriding grades
    - [ ] editing and creating new exercise sets
    - [ ] choosing preferred notation
    - [ ] importing from other courses
- [ ] Implement and convert existing other kinds of exercises, as used, e.g., in [UMass Phil 105 (Practical Reasoning)](https://logic.umasscreate.net/reasoning/), including non-automatically-graded varieties
    - [ ] Free text answer
    - [ ] Scriven diagrams (partly done)
    - [ ] Tableaux problems
    - [ ] Venn diagrams
    - [ ] Counterexample problems for simple categorical syllogisms
    - [ ] Others?
- [ ] Improve the partial credit calculations for derivations and translations
- [ ] Create [the website](https://logicpenguin.com) and advertise the project and its goals
- [ ] Possibly upgrade from LTI 1.1 to 1.3 if it can be done without involving Google, Facebook, Microsoft et al. for OAuth2
- [ ] Write good documentation generally, including explaining to others how to self-host their own instance
- [x] Improve the equivalence checker for predicate logic to reduce the number of indeterminate answers when there are multiple quantifiers and polyadic predicates (already done multiple times, but can always be better)

## License

Logic penguin is copyright © 2023 by Kevin C. Klement. This is free software, which can be redistributed and/or modified under the terms of the [GNU General Public License (GPL), version 3](https://www.gnu.org/licenses/gpl.html).

Penguin logo and icon adapted from free licensed image by Hannah Hill <https://freepngimg.com/author/hannahhil-5479>.


