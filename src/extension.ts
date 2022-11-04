// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "kusion" is now active!');

	let kusionOutput = vscode.window.createOutputChannel('kusion');

	const kusionCompile = vscode.commands.registerCommand('kusion.compile', async () => {
		kusionOutput.show();

		const fileName = activeDocumentPath();
		if (fileName !== undefined) {
			const stackPath = getStackPath(fileName);
			if (stackPath !== undefined) {
				const script = compileScript(stackPath);
				const output = await execShell(script);
				if (output === "") {
					kusionOutput.appendLine(compileSuccessMsg(stackPath));
				} else {
					kusionOutput.append(output);
				}
			}
		} else {
			kusionOutput.append("not in stack");
		}
	});

	const kusionPreview = vscode.commands.registerCommand('kusion.preview', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Preview from kusion!');
	});

	const kusionApply = vscode.commands.registerCommand('kusion.apply', async () => {
		// let kusionTerminal = vscode.window.createTerminal('kusion');
		// kusionTerminal.show();

		const fileName = activeDocumentPath();
		if (fileName !== undefined) {
			const stackPath = getStackPath(fileName);
			if (stackPath !== undefined) {
				const script = applyScript(stackPath);
				const output = await execShell(script);
				// kusionTerminal.sendText(output);
				kusionOutput.append(output);
			}
		} else {
			kusionOutput.append("not in stack");
		}

		vscode.window.showInformationMessage('Apply from kusion!');
	});




	context.subscriptions.push(kusionPreview, kusionCompile, kusionApply);
}

const execShell = (cmd: string) =>
    new Promise<string>((resolve, reject) => {
        cp.exec(cmd, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    });


function activeDocumentPath () : (string | undefined) {
	return vscode.window.activeTextEditor?.document.fileName;
}

function getStackPath(filepath: string):(string | undefined) {
	const path = require("path");
	var parentDir =  path.dirname(filepath);
	const stackFilePath = path.join(parentDir, "stack.yaml");
	
	if (fs.existsSync(stackFilePath)) {
		return parentDir;
	}
	return undefined;
}

const compileScript = (workdir: string) => {
	return `kusion compile -w ${workdir}`;
};

const applyScript = (workdir: string) => {
	return `kusion apply -w ${workdir} -y`;
};

const goldenPath = (stackPath: string) => {
	const path = require("path");
	return path.join(stackPath, "ci-test", "stdout.golden.yaml");
};

const compileSuccessMsg = (stackPath: string) => {
	return `kusion compiled success, view results in: ${goldenPath(stackPath)}`;
};