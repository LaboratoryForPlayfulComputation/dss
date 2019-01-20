const path = require('path');

module.exports = {
    entry: './dist/lib/dss-client.web.js',
    output: {
        filename: 'dss-client.bundle.js',
        path: path.resolve(__dirname, 'dist')
    }
};
