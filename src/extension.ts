// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as kusion_task_provider from './tasks';
import * as commands from "./commands";
import {setContextValue} from './util';

let kusionTaskProvider: vscode.Disposable | undefined;
const KUSION_PROJECT_CONTEXT_NAME = "inKusionProject";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "kusion" is now active!');

	// get workspaceRoot, if there's no opening workspace, ust resturn.
	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (!workspaceRoot) {
		return;
	}

	kusionTaskProvider = vscode.tasks.registerTaskProvider(kusion_task_provider.KusionTaskProvider.KusionType, new kusion_task_provider.KusionTaskProvider(workspaceRoot));

	const kusionCompile = vscode.commands.registerCommand('kusion.compile', commands.kusionCompile);
	const kusionApply = vscode.commands.registerCommand('kusion.apply', commands.kusionApply);
	const kusionPreview = vscode.commands.registerCommand('kusion.preview', commands.kusionPreview);
	context.subscriptions.push(kusionPreview, kusionCompile, kusionApply);
	await setContextValue(KUSION_PROJECT_CONTEXT_NAME, true);
}


export async function deactivate(): Promise<void> {
	if (kusionTaskProvider) {
		kusionTaskProvider.dispose();
	}
	await setContextValue(KUSION_PROJECT_CONTEXT_NAME, undefined);
}