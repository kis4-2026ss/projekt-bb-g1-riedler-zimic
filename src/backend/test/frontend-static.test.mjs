import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(testDir, '../../frontend');

async function readFrontendFile(name) {
  return readFile(resolve(frontendDir, name), 'utf8');
}

test('frontend HTML references existing stylesheet and script assets', async () => {
  const html = await readFrontendFile('index.html');

  assert.match(html, /<link[^>]+href="styles\.css"/);
  assert.match(html, /<script[^>]+src="app\.js"/);

  await assert.doesNotReject(() => readFrontendFile('styles.css'));
  await assert.doesNotReject(() => readFrontendFile('app.js'));
});

test('frontend HTML contains the DOM hooks required by app.js', async () => {
  const [html, appJs] = await Promise.all([
    readFrontendFile('index.html'),
    readFrontendFile('app.js')
  ]);

  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const requiredIds = new Set(
    [...appJs.matchAll(/getElementById\("([^"]+)"\)/g)].map(match => match[1])
  );

  for (const id of requiredIds) {
    assert.ok(htmlIds.has(id), `Missing element with id="${id}"`);
  }

  const htmlClasses = new Set(
    [...html.matchAll(/\bclass="([^"]+)"/g)]
      .flatMap(match => match[1].split(/\s+/))
  );
  const requiredClasses = new Set(
    [...appJs.matchAll(/querySelector\("\.([^"]+)"\)/g)].map(match => match[1])
  );

  for (const className of requiredClasses) {
    assert.ok(htmlClasses.has(className), `Missing element with class="${className}"`);
  }
});
