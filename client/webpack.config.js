const path = require('path');

module.exports = {
  entry: './src/index.js', // Adjust as necessary for your entry file
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        use: 'json-loader',
        type: 'javascript/auto', // needed for webpack 4.x+
      },
      // Other loaders here (e.g., for JS, CSS)
    ],
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx'],
  },
  devServer: {
    contentBase: './dist', // Adjust for your project
  },
};
