module.exports = {
  root: true,
  env: { node: true, browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  ignorePatterns: ["build", "cdk.out", ".eslintrc.cjs", "node_modules"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    "@typescript-eslint/no-explicit-any": ["warn"],
    "@typescript-eslint/no-unused-vars": ["warn"],
    "react-refresh/only-export-components": [
      "off",
      { allowConstantExport: true }
    ]
  }
};
