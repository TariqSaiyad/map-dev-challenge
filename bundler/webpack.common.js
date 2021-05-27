const path = require('path');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const CopyPlugin = require('copy-webpack-plugin');

const themeDir = '/home/ubuntu/map-dev-challenge';
const inputDir = `${themeDir}/src`;
const outputDir =  `../dist`;

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    'app': [`${themeDir}/src/script.js`],
  },
  output: {
    path: path.resolve(__dirname, outputDir),
    filename: `[name].js`,
  },
  module: {
    rules: [
      // this will apply to both plain `.js` files
      // AND `<script>` blocks in `.vue` files
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ["@babel/preset-env", {	targets: { ie: "11" } }],
            ],
          }
        }
      },
      // this will apply to both plain `.css` files
      // AND `<style>` blocks in `.vue` files
                  // CSS
                  {
                    test: /\.css$/,
                    use:
                    [
                        MiniCSSExtractPlugin.loader,
                        'css-loader'
                    ]
                },
      {
        test: /\.svg$/,
        use: "file-loader",
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'url-loader',
      },
    ]
  },
  resolve: {
   
    extensions: ['*', '.js', '.vue', '.json'],
  },
  plugins: [
    new HtmlWebpackPlugin({
        template: path.resolve(__dirname, `${themeDir}/src/index.html`),
        minify: true
    }),
    new MiniCSSExtractPlugin(),
    new CopyPlugin({
      patterns: [
        { from: `${themeDir}/assets/images`, to: 'images' },
      ],
    }),
  ],
}