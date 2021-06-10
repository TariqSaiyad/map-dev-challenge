const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCSSExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')

module.exports = {
  entry: path.resolve(__dirname, '../src/script.js'),
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../dist')
  },
  devtool: 'source-map',
  plugins: [
    new CopyWebpackPlugin({
      // patterns: [{ from: path.resolve(__dirname, '../static') }],
      patterns: [
        {
          from: path.resolve(__dirname, '../assets/images'),
          to: 'assets/images'
        }
      ]
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../src/index.html'),
      minify: true
    }),
    new MiniCSSExtractPlugin()
  ],
  module: {
    rules: [
      // HTML
      {
        test: /\.(html)$/,
        use: ['html-loader']
      },

      // JS
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: [
            '@babel/preset-env',
            {
              plugins: ['@babel/plugin-proposal-class-properties']
            }
          ]
        }
      },

      // CSS
      {
        test: /\.css$/,
        use: [MiniCSSExtractPlugin.loader, 'css-loader']
      },

      // Images
      {
        test: /\.(jpg|png|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'assets/images/'
            }
          }
        ]
      },

      // Fonts
      {
        test: /\.(ttf|eot|woff|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'assets/fonts/'
            }
          }
        ]
      }
    ]
  }
}
