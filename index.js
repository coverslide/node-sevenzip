'use strict';

var Path = require('path');
var spawnAsync = require('child_promise');

var tmp = require('tmp');

var SevenZip = module.exports = {};

SevenZip.getFilesAsync = function (fullPath) {
    return runChildProcessAsync(['l', fullPath])
        .then(function (output) {
            return new Promise(function (resolve, reject) {
                resolve(getFilesFromOutput(output));
            });
        })
};

SevenZip.getSingleFileAsync = function (fullPath, filename) {
    return new Promise(function (resolve, reject) {
            tmp.dir(function (err, path) {
                if (err) return reject(err);
                resolve(path);
            });
        }).then(function (dir) {
            var args = ['x', fullPath, '-o' + dir, filename];
            return runChildProcessAsync(args)
                .then(function (output) {
                    return new Promise(function (resolve, reject) {
                        resolve(Path.join(dir, filename));
                    });
                });
        });
};

function runChildProcessAsync(args, options) {
    return spawnAsync('7z', args, options)
        .then(function (output) {
            return output.split(/[\n\r]+/).slice(3).join('\n');
        });
}

function getFilesFromOutput (output) {
    var lines = output.split(/[\n\r]+/);
    var fileLines = false;
    var lineRegExp = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)\s*$/;
    var files = [];
    lines.forEach(function (line) {
        if (line.match(/----------/)) {
            fileLines = !fileLines;
            var lineLengthMatches = line.match(/(-+)(\s+)(-+)(\s+)(-+)(\s+)(\-+)(\s+)/);
            var lineLengths = Array.prototype.map.call(lineLengthMatches, function (match) {
                return match.length
            });
            lineRegExp = new RegExp(
                '^\\s*'
                + '(.{' + lineLengths[1] +'})\\s{' + lineLengths[2] + '}'
                + '(.{' + lineLengths[3] +'})\\s{' + lineLengths[4] + '}'
                + '(.{' + lineLengths[5] +'})\\s{' + lineLengths[6] + '}'
                + '(.{' + lineLengths[7] +'})\\s{' + lineLengths[8] + '}'
                + '(.*)\\s*$');
            return;
        }
        if (!fileLines) {
            //check if we are above the fileLines
            return;
        }
        var lineAttributesMatch = line.match(lineRegExp);
        var lineAttributes = {
            datetime: lineAttributesMatch[1],
            attr: lineAttributesMatch[2],
            usize: +lineAttributesMatch[3],
            csize: +lineAttributesMatch[4],
            filename: lineAttributesMatch[5]
        };
        files.push(lineAttributes);
    });
    return files;
}
