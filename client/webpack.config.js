const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './dist/bin/dss-client.web.js',
    performance: {
        hints: false
    },
    output: {
        filename: 'dss-client.bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.(graphql|gql)$/,
                loader: 'graphql-tag/loader'
            }
        ]
    },
    plugins: [
        new webpack.IgnorePlugin({
            resourceRegExp: /^ws$/,
            contextRegExp: /signaling$/,
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /^wrtc$/,
            contextRegExp: /webrtc$/,
        }),
    ]
};
