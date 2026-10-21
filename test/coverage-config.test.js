import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { loadNycConfig } = createRequire(import.meta.url)('@istanbuljs/load-nyc-config');

test('coverage config loads YAML and extended config with the updated parser', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portus-coverage-config-'));
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), '{}');
    fs.writeFileSync(path.join(directory, 'base.yml'), 'all: true\nexclude:\n  - fixtures/**\n');
    fs.writeFileSync(path.join(directory, '.nycrc.yml'), 'extends: ./base.yml\ninclude:\n  - src/**\n');
    const config = await loadNycConfig({ cwd: directory });
    assert.equal(config.all, true);
    assert.deepEqual(config.include, ['src/**']);
    assert.deepEqual(config.exclude, ['fixtures/**']);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
