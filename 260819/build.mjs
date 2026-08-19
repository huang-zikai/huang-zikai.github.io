import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
});

const js = result.outputFiles[0].text;
const css = await readFile('src/style.css', 'utf8');
let html = await readFile('src/template.html', 'utf8');

html = html.replace('<!--INLINE_JS-->', () => `<script>${js}</script>`);
html = html.replace('<!--INLINE_CSS-->', () => `<style>${css}</style>`);

await writeFile('index.html', html);
console.log(`index.html written (${html.length} bytes)`);
