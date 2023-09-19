const readline = require('readline');
const {spawn} = require('child_process');

class SevenZip {
	executable = '7z';

	setExecutable(executable) {
		this.executable = executable;
	}

	runAsync(...args) {
		const child = spawn(this.executable, args);
		return new Promise((resolve, reject) => {
			const stderrBuffer = [];
			child.stdout.pause();
			child.stderr.on('data', data => {
				stderrBuffer.push(data);
			});
			child.on('close', code => {
				if (code !== 0) {
					reject(stderrBuffer.join(''));
				}
			});
			child.on('error', reject);
			child.on('spawn', () => resolve(child));
		});
	}

	async getFiles(fullPath) {
		const child = await this.runAsync('l', '-ba', '-slt', fullPath);
		return parseListOutputAsync(child.stdout);
	}

	async getSingleFile(fullPath, internalPath) {
		const child = await this.runAsync('l', '-ba', '-slt', fullPath, internalPath);
		const fileList = await parseListOutputAsync(child.stdout);
		if (fileList.length < 1) {
			throw new Error('File not found');
		}

		return fileList[0];
	}

	async extractFile(fullPath, internalPath) {
		const child = await this.runAsync('x', fullPath, '-so', internalPath);
		return child.stdout;
	}
}

function parseListOutputAsync(stream) {
	const rl = readline.createInterface({input: stream});
	return new Promise((resolve, reject) => {
		const files = [];
		let currentFile = null;
		rl.on('line', line => {
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
