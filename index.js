const readline = require('readline');
const { spawn } = require('child_process');

class SevenZip {
  executable = '7z';

  setExecutable(executable) {
    this.executable = executable;
  }

  runAsync(...args) {
    const process = spawn(this.executable, args);
    return new Promise((resolve, reject) => {
      const stderrBuffer = [];
      process.stderr.on('data', (data) => {
        stderrBuffer.push(data);
      });
      process.on('close', (code) => {
        if (code != 0) {
          reject(stderrBuffer.join(''));
        }
      });
      process.on('error', reject);
      process.on('spawn', () => resolve(process));
    });
  }

  async getFiles(fullPath) {
    const process = await this.runAsync('l', '-ba', '-slt', fullPath);
    return await parseListOutputAsync(process.stdout);
  }

  async getSingleFile(fullPath, internalPath) {
    const process = await this.runAsync('l', '-ba', '-slt', fullPath, internalPath);
    const fileList = await parseListOutputAsync(process.stdout);
    if (fileList.length < 1) {
      throw new Error("File not found");
    }
    return fileList[0];
  }

  async extractFile(fullPath, internalPath) {
    const process = await this.runAsync('x', fullPath, '-so', internalPath);
    return process.stdout;
  }
}

function parseListOutputAsync(stream){
  const rl = readline.createInterface({ input: stream });
  return new Promise((resolve, reject) => {
    const files = [];
    let currentFile = null;
    rl.on('line', (line) => {
      const parts = line.split(/ = /);
      if (parts.length < 2) {
        return;
      }
      const key = parts[0];
      const value = parts[1];
      if (key === 'Path') {
        currentFile = {};
        files.push(currentFile);
      }
      currentFile[key] = value;
    });
    rl.on('close', () => resolve(files));
    rl.on('error', reject);
  });
}

module.exports = SevenZip;
