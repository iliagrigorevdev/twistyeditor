const {override, addWebpackModuleRule} = require('customize-cra')

module.exports = override(
  addWebpackModuleRule(
    {
      test: /\.worker\.(c|m)?js$/i,
      use: [
        {
          loader: "worker-loader",
        },
        {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      ],
    }
  )
)
