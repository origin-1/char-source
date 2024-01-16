'use strict';

const { createConfig }  = require('@origin-1/eslint-config');
const globals           = require('globals');

module.exports =
createConfig
(
    {
        ignores: ['**/.*', 'coverage'],
    },
    {
        files:              ['**/*.{js,mjs}'],
        jsVersion:          2022,
    },
    {
        files:              ['**/*.mjs'],
        languageOptions:    { sourceType: 'module' },
    },
    {
        files:              ['**/*.js'],
        languageOptions:    { sourceType: 'commonjs' },
    },
    {
        files:              ['spec.js'],
        languageOptions:    { globals: globals.mocha },
    },
    {
        files:              ['**/*.ts'],
        tsVersion:          '4.2.0',
        languageOptions:    { parserOptions: { project: 'tsconfig.json' } },
    },
    {
        languageOptions: { globals: globals.node },
    },
);
