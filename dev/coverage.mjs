#!/usr/bin/env node

import { join }             from 'node:path';
import { fileURLToPath }    from 'node:url';
import c8js                 from 'c8js';

const mochaPath = fileURLToPath(import.meta.resolve('mocha/bin/mocha.js'));
const workspaceFolder = join(import.meta.dirname, '..');
await c8js
(
    mochaPath,
    ['--check-leaks', 'spec.js'],
    {
        cwd:            workspaceFolder,
        reporter:       ['html', 'text-summary'],
        useC8Config:    false,
        watermarks:
        {
            branches:   [90, 100],
            functions:  [90, 100],
            lines:      [90, 100],
            statements: [90, 100],
        },
    },
);
