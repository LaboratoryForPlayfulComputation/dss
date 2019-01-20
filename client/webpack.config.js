const path = require('path');

module.exports = {
    entry: './dist/lib/index.js',
    output: {
        filename: 'dss-client.bundle.js',
        path: path.resolve(__dirname, 'dist')
    }
};
