module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules", ".eslintrc.cjs"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "detect" } },
  plugins: ["react-refresh"],
  rules: {
    "react/prop-types": "off", // plain JS project; components are small and documented
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
  },
  overrides: [
    {
      files: ["**/*.test.{js,jsx}", "src/test/**"],
      env: { node: true },
      globals: { describe: "readonly", it: "readonly", test: "readonly", expect: "readonly", vi: "readonly", beforeEach: "readonly", afterEach: "readonly" },
    },
  ],
};
