const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
  {
    mode: "development",
    // mode: "production",
    entry: './src/js/index-leaflet.js',
    // entry: './src/js/index-three.js',
    plugins: [
      new webpack.ProvidePlugin({
        THREE: 'three'
      }),
      new HtmlWebpackPlugin({
        title: 'smart city',
        favicon: "./resources/favicon.ico",
        template: "index.html",
      }),
    ],
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name]-bundle.js',
      clean: true,
    },
    devServer: {
      static: {
        directory: '.'
      },
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(json|json5|png|svg|jpg|jpeg|gif|mp3|stl|glb)$/i,
          type: 'asset/resource',
          use: ["file-loader?name=[name].[ext]"]
        },
        {
          test: /\.(csv|tsv|token)$/i,
          use: ['csv-loader'],
        },
      ],
    },
  },
];
