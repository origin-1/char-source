#!/usr/bin/env node

import { rm }   from 'node:fs/promises';
import { join } from 'node:path';

const workspaceFolder = join(import.meta.dirname, '..');
process.chdir(workspaceFolder);
await rm('coverage', { force: true, recursive: true });
