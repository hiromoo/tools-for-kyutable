'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

const dotenv = require('dotenv');
const webpack = require('webpack');
const env = dotenv.config().parsed;

// Merge webpack configuration files
const config = (_env, argv) =>
  merge(common, {
    entry: {
      popup: PATHS.src + '/popup.js',
      contentScript: PATHS.src + '/contentScript.js',
      background: PATHS.src + '/background.js',
      signin: PATHS.src + '/signin.js',
      main: PATHS.src + '/main.js',
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
    mode: 'development',
    plugins: [
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(env)
      })
    ]
  });

module.exports = config;
