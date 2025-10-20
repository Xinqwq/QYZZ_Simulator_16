const path = require('path');

module.exports = {
  devServer: {
    allowedHosts: ['localhost', '127.0.0.1'],
    port: 8080,
    host: 'localhost',
    hot: true,
    open: true,
    compress: true,
    historyApiFallback: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
};

