

const Path = require('path');
const spawnAsync = require('child_promise');

const tmp = require('tmp');

const SevenZip = { executable: '7z' };

module.exports = SevenZip;

function runChildProcessAsync(args, options) {
  return spawnAsync(SevenZip.executable, args, options)
    .then(output => output.split(/[\n\r]+/).slice(3).join('\n'));
}

function getFilesFromOutput(output) {
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

SevenZip.getFilesAsync = function getFilesAsync(fullPath) {
  return runChildProcessAsync(['l', fullPath])
    .then(output => new Promise((resolve) => {
      resolve(getFilesFromOutput(output));
    }));
};

SevenZip.getSingleFileAsync = function getSingleFileAsync(fullPath, filename) {
  return new Promise((resolve, reject) => {
    tmp.dir((err, path) => {
      if (err) return reject(err);
      return resolve(path);
    });
  }).then((dir) => {
    const args = ['x', fullPath, `-o${dir}`, filename];
    return runChildProcessAsync(args)
      .then(() => new Promise((resolve) => {
        resolve(Path.join(dir, filename));
      }));
  });
};
