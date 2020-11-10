module.exports = {
	globals: {
		server: true,
		"ace": true,
		"Ember": true,
		"$": true,
	},
	root: true,
  parser: 'babel-eslint',
	parserOptions: {
		ecmaVersion: 2017,
		sourceType: "module"
	},
	extends: "eslint:recommended",
	env: {
		browser: true,
		"es6": true,
		"node": true
	},
	rules: {
		"no-console": "off",
		"no-unused-vars": "warn",
		// "no-extra-parens": "warn",
		"block-scoped-var": "warn",
		// "max-classes-per-file": ["warn", 1],
		"no-alert": "warn",
		"no-empty": ["error", { "allowEmptyCatch": true }],
		"no-eq-null": "warn",
		"no-fallthrough": "off",
		"no-lone-blocks": "warn",
		"no-use-before-define": "off",
		camelcase: "warn",
		"comma-spacing": ["error", {before: false, after: true}],
		// indent: ["error", "tab", {SwitchCase: 1}],
		"max-depth": ["error", 4],
		// "max-lines-per-function": [
		// 	"warn",
		// 	{max: 20, skipBlankLines: true, skipComments: true}
		// ],
		"max-statements": ["warn", 15],
		"max-params": ["warn", 5],
		"no-unneeded-ternary": "error",
		"no-duplicate-imports": "error",
		"no-var": "error",
		"sort-imports":  ["warn", { "ignoreCase": true }]
	}
};
