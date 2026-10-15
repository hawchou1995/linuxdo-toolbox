'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'linuxdo-toolbox.user.js');
const source = fs.readFileSync(path.join(__dirname, 'content-filter.js'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const text = fs.readFileSync(file, 'utf8');
const begin = '  // BEGIN GENERATED CONTENT FILTER';
const end = '  // END GENERATED CONTENT FILTER';
if (text.split(begin).length !== 2 || text.split(end).length !== 2) throw Error('Expected exactly one generated content-filter boundary pair');
const start = text.indexOf(begin), finish = text.indexOf(end);
if (finish < start) throw Error('Generated boundaries out of order');
const built = text.slice(0, start) + begin + '\n' + source + '\n' + text.slice(finish);
if (process.argv.includes('--check')) {
  if (built !== text) { console.error('Embedded content-filter source is stale'); process.exitCode = 1; }
  else console.log('Content-filter embedded source: exact match');
} else { fs.writeFileSync(file, built); console.log('Content-filter embedded source rebuilt'); }
