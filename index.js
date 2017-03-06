const { join } = require('path');
const { mkdtemp } = require('mz/fs');
const { execFile }  = require('mz/child_process');
const { tmpdir } = require('os');

const SevenZip = { executable: '7z' };

module.exports = SevenZip;

SevenZip.getFiles = async function getFiles(fullPath, options) {
  const stdout = await runSevenZip(['l', fullPath], options);
  return parseOutput(stdout);
};

SevenZip.extractFile = async function extractFile(fullPath, filename, options) {
  const dir = await mkdtemp(tmpdir() + '/node-sevenzip-');
  const args = ['x', fullPath, `-o${dir}`, filename];
  await runSevenZip(args, options);
  return join(dir, filename);
};

async function runSevenZip(args, options) {
  const [stdout] = await execFile(SevenZip.executable, args, options);
  return stdout.split(/\r*\n/g).slice(3).join('\n');
}

function parseOutput(output) {
  const lines = output.split(/[\n\r]+/);
  let fileLines = false;
  let lineRegExp = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)\s*$/;
  const files = [];
  lines.forEach((line) => {
    if (line.match(/----------/)) {
      fileLines = !fileLines;
      const lineLengthMatches = line.match(/(-+)(\s+)(-+)(\s+)(-+)(\s+)(-+)(\s+)/);
      const lineLengths = Array.prototype.map.call(lineLengthMatches, match => match.length);
      lineRegExp = new RegExp(
        `${'^\\s*'
        + '(.{'}${lineLengths[1]}})\\s{${lineLengths[2]}}`
        + `(.{${lineLengths[3]}})\\s{${lineLengths[4]}}`
        + `(.{${lineLengths[5]}})\\s{${lineLengths[6]}}`
        + `(.{${lineLengths[7]}})\\s{${lineLengths[8]}}`
        + '(.*)\\s*$');
      return;
    }
    if (!fileLines) {
      // check if we are above the fileLines
      return;
    }
    const lineAttributesMatch = line.match(lineRegExp);
    const lineAttributes = {
      datetime: lineAttributesMatch[1],
      attr: lineAttributesMatch[2],
      usize: +lineAttributesMatch[3],
      csize: +lineAttributesMatch[4],
      filename: lineAttributesMatch[5],
    };
    files.push(lineAttributes);
  });
  return files;
}

