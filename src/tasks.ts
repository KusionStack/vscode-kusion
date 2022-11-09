/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import { error } from 'console';

export class KusionTaskProvider implements vscode.TaskProvider {
	static KusionType = 'kusion';
	private kusionPromise: Thenable<vscode.Task[]> | undefined = undefined;

	constructor(workspaceRoot: string) {
		const pattern = path.join(workspaceRoot, '**​/*.k');
		const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
		fileWatcher.onDidChange(() => this.kusionPromise = undefined);
		fileWatcher.onDidCreate(() => this.kusionPromise = undefined);
		fileWatcher.onDidDelete(() => this.kusionPromise = undefined);
	}

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		if (!this.kusionPromise) {
			this.kusionPromise = getKusionTasks();
		}
		return this.kusionPromise;
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {        

		// const task = _task.definition.task;
		// A Kusion task consists of a task and an optional file as specified in KusionTaskDefinition
		// Make sure that this looks like a Kusion task by checking that there is a task.
		// if (task) {
        //     const fileName = activeDocumentPath();
        //     if (!fileName) {
        //         return undefined;
        //     }
        //     const stackPath = getStackPath(fileName);
        //     if (!stackPath) {
        //         return undefined;
        //     }

		// 	// resolveTask requires that the same definition object be used.
		// 	const definition: KusionTaskDefinition = <any>_task.definition;
		// 	return new vscode.Task(
        //         definition,
        //         _task.scope ?? vscode.TaskScope.Workspace,
        //         definition.task,
        //         'kusion',
        //         new vscode.ShellExecution(applyScript(stackPath))
        //     );
		// }
		return _task;
	}
}


export interface KusionTaskDefinition extends vscode.TaskDefinition {
	/**
	 * The task name
	 */
	task: string;
}

async function getKusionTasks(): Promise<vscode.Task[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const result: vscode.Task[] = [];
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return result;
	}

    const fileName = activeDocumentPath();
    if (!fileName) {
        return result;
    }

    let theActiveWorkspaceFolder: vscode.WorkspaceFolder | undefined = undefined;

    for(const workspaceFolder of workspaceFolders){
        if (fileName.startsWith(workspaceFolder.uri.fsPath)) {
            theActiveWorkspaceFolder = workspaceFolder;
        }
    }

    if (!theActiveWorkspaceFolder) {
        return result;
    }
    
    const stackPath = getStackPath(fileName);

    if (!stackPath) {
        return result;
    }

    for (const [taskName, taskScript] of kusionCommands) {
        const kind: KusionTaskDefinition = {
            type: 'kusion',
            task: taskName
        };
        // amy there set task shell execution
        const task = new vscode.Task(kind, theActiveWorkspaceFolder, taskName, 'kusion', new vscode.ShellExecution(taskScript(stackPath)));
        // task.presentationOptions.showReuseMessage=false;
        // task.presentationOptions.panel = vscode.TaskPanelKind.New;
        task.presentationOptions.focus = true;
        task.group = vscode.TaskGroup.Build;
        result.push(task);
    }

	return result;
}


export function getStackPath(filepath: string):(string | undefined) {
	const path = require("path");
	var parentDir =  path.dirname(filepath);
	const stackFilePath = path.join(parentDir, "stack.yaml");
	
	if (fs.existsSync(stackFilePath)) {
		return parentDir;
	}
	return undefined;
}

export function activeDocumentPath () : (string | undefined) {
	return vscode.window.activeTextEditor?.document.fileName;
}

export const compileScript = (workdir: string) => {
	return `kusion compile -w ${workdir}`;
};

export const applyScript = (workdir: string) => {
	return `kusion apply -w ${workdir}`;
};

export const goldenPath = (stackPath: string) => {
	const path = require("path");
	return path.join(stackPath, "ci-test", "stdout.golden.yaml");
};

export const compileSuccessMsg = (stackPath: string) => {
	return `kusion compiled success, view results in: ${goldenPath(stackPath)}`;
};


export const kusionCommands = new Map<string,  (stackPath:string) => string> ([
    [
        'compile', 
        (workdir: string) => {
            return `kusion compile -w ${workdir}; echo "${compileSuccessMsg(workdir)}"`; // todo: after task success, show success message
        }
    ],
    [
        'apply', 
        (workdir: string) => {
            return `kusion apply -w ${workdir} --watch`;
        },
    ],
    [
        'preview',
        (workdir: string) => {
            return `kusion preview -w ${workdir}`;
        },
    ]
]);


export function buildKusionTask(definition: KusionTaskDefinition, scope: vscode.WorkspaceFolder | vscode.TaskScope.Global | vscode.TaskScope.Workspace, taskName: string, stackPath: string): vscode.Task|undefined {

    const taskScript = kusionCommands.get(taskName);
    if (!taskScript) {
        return undefined;
    }
    const kind: KusionTaskDefinition = {
        type: 'kusion',
        task: taskName
    };
    return new vscode.Task(kind, scope, taskName, 'kusion', new vscode.ShellExecution(taskScript(stackPath)));
}