// Restore only the two evaluator sources in the bundle; never change the checkout.
const path = require('path');
const {execFileSync} = require('child_process');
module.exports = function (source) {
    const relative = path.relative(this.rootContext, this.resourcePath).replace(/\\/g, '/');
    const evaluators = ['src/bezeg/impl/curve/polynomial-bezier-curve.ts', 'src/bezeg/impl/curve/rational-bezier-curve.ts'];
    if (!evaluators.includes(relative)) return source;
    return execFileSync('git', ['show', `${this.getOptions().ref}:${relative}`], {cwd: this.rootContext, encoding: 'utf8'});
};
