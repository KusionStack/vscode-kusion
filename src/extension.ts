// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as kusion_task_provider from './tasks';
import * as commands from "./commands";
import * as util from './util';
import * as quickstart from './quickstart/setup';

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

	kusionTaskProvider = vscode.tasks.registerTaskProvider(kusion_task_provider.KusionTaskProvider.kusionType, new kusion_task_provider.KusionTaskProvider(workspaceRoot));
	const kusionDataPreview = vscode.commands.registerCommand('kusion.showPreview', commands.kusionShowDataPreviewCommand);
	const kusionDataPreviewToSide = vscode.commands.registerCommand('kusion.showPreviewToSide', commands.kusionShowDataPreviewToSideCommand);
	const kusionCompile = vscode.commands.registerCommand('kusion.compile', commands.kusionCompile);
	const kusionApply = vscode.commands.registerCommand('kusion.apply', commands.kusionApply);
	const kusionDestroy = vscode.commands.registerCommand('kusion.destroy', commands.kusionDestroy);
	const createKusionProject = vscode.commands.registerCommand('kusion.createProject', () => {vscode.window.showWarningMessage("not implemented yet.");});
	context.subscriptions.push(kusionCompile, kusionApply, kusionDestroy, kusionDataPreview, kusionDataPreviewToSide);
	// todo how to set context when active editor switch
	await util.setContextValue(KUSION_PROJECT_CONTEXT_NAME, true);
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		util.setInKusionStackByUri(editor?.document.uri);
	});
	vscode.workspace.onDidOpenTextDocument((document)=>{
		util.setInKusionStackByUri(document.uri);
	});

	quickstart.setup();
}


export async function deactivate(): Promise<void> {
	if (kusionTaskProvider) {
		kusionTaskProvider.dispose();
	}
	await util.setContextValue(KUSION_PROJECT_CONTEXT_NAME, undefined);
}