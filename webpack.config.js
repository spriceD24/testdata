'use strict';

const path = require('path');

module.exports = {
  entry: [
    path.resolve(__dirname, 'index.js'),
    path.resolve(__dirname, 'get-pdf.js'),
	path.resolve(__dirname, 'get-pdf-test.js'),
	path.resolve(__dirname, 'plus_utils.js'),
    path.resolve(__dirname, 'clear-article.js'),
	path.resolve(__dirname, 'cache.js'),
  ],
  output: {
    path: path.resolve(__dirname, 'assets'),
    filename: 'bundle.js'
  },
  module: {
  }
};