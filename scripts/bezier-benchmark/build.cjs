// Separate production diagnostic bundle. No app route or normal UI changes.
process.env.NODE_ENV = 'production';
process.env.BABEL_ENV = 'production';
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const label = process.argv[2] || 'current';
if (!['before', 'after', 'current'].includes(label)) throw new Error('Use before, after, or current');
const ref = process.argv[3];
if (label === 'before' && !ref) throw new Error('Pass the original commit as the third argument when building before');
const output = path.resolve(__dirname, '../../.benchmark-output', label);
webpack({
    mode: 'production',
    context: path.resolve(__dirname, '../..'),
    entry: path.resolve(__dirname, 'browser.tsx'),
    output: {path: output, filename: 'benchmark.js'},
    resolve: {extensions: ['.tsx', '.ts', '.js']},
    module: {rules: [
        {test: /\.(png|jpe?g|gif|svg)$/, type: 'asset/resource'},
        {test: /\.[jt]sx?$/, exclude: /node_modules/, use: [
            {loader: require.resolve('babel-loader'),
                options: {presets: [[require.resolve('babel-preset-react-app'), {runtime: 'automatic'}]]}},
            ...(label === 'before' ? [{loader: path.resolve(__dirname, 'baseline-loader.cjs'), options: {ref}}] : [])
        ]},
        {test: /\.css$/, use: [require.resolve('style-loader'), require.resolve('css-loader')]},
        {test: /\.scss$/, use: [require.resolve('style-loader'), require.resolve('css-loader'), require.resolve('sass-loader')]}
    ]},
    performance: {hints: false},
    plugins: [new webpack.DefinePlugin({'process.env.BEZIER_BENCHMARK_SOURCE': JSON.stringify(label === 'before' ? ref : 'working-tree')})]
}, (error, stats) => {
    if (error || stats.hasErrors()) {
        console.error(error || stats.toString({all: false, errors: true}));
        process.exitCode = 1;
        return;
    }
    fs.copyFileSync(path.resolve(__dirname, 'index.html'), path.join(output, 'index.html'));
    console.log(`Production benchmark built in .benchmark-output/${label}`);
});
