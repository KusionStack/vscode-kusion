// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as kusion_task_provider from './tasks';
import * as commands from "./commands";
import * as util from './util';
import * as quickstart from './quickstart/setup';
import * as liveDiff from './livediff';
import * as stack from './stack';
import {ensureKusion} from './installer';

let kusionTaskProvider: vscode.Disposable | undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "kusion" is now active!');

	ensureKusion();
	// get workspaceRoot, if there's no opening workspace, just resturn.
	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	kusionTaskProvider = vscode.tasks.registerTaskProvider(kusion_task_provider.KusionTaskProvider.kusionType, new kusion_task_provider.KusionTaskProvider(workspaceRoot));
	const kusionDataPreview = vscode.commands.registerCommand('kusion.showPreview', commands.kusionShowDataPreviewCommand);
	const kusionDataPreviewToSide = vscode.commands.registerCommand('kusion.showPreviewToSide', commands.kusionShowDataPreviewToSideCommand);
	const kusionCompile = vscode.commands.registerCommand('kusion.compile', commands.kusionCompile);
	const kusionLiveDiff = vscode.commands.registerCommand('kusion.apply', commands.kusionDiffPreview);
	const kusionDestroy = vscode.commands.registerCommand('kusion.destroy', commands.kusionDestroy);
	const kusionHelp = vscode.commands.registerCommand('kusion.help', commands.kusionHelp);
	const kusionCreateProject = vscode.commands.registerCommand('kusion.createProject', () => { commands.kusionCreateProject(context); });
	const kusionConfirmApply = vscode.commands.registerCommand('kusion.confirmApply', ()=> { commands.kusionConfirmApply(context); });
	context.subscriptions.push(kusionCompile, kusionLiveDiff, kusionDestroy, kusionDataPreview, kusionDataPreviewToSide, kusionHelp, kusionHelp, kusionCreateProject, kusionConfirmApply);

	// todo how to set context when active editor switch
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		const inKusionStack = util.inKusionStack(editor?.document.uri);
		util.setInKusionStack(inKusionStack);
		liveDiff.updateKusionLiveDiffEditorStatus(editor);
	});
	vscode.workspace.onDidOpenTextDocument((document)=>{
		util.setInKusionStack(util.inKusionStack(document.uri));
	});

	quickstart.setup();
}


export async function deactivate(): Promise<void> {
	if (kusionTaskProvider) {
		kusionTaskProvider.dispose();
	}
}