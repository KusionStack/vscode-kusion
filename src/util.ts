import * as vscode from "vscode";
import * as uri from 'vscode-uri';
import * as fs from 'fs';

const kclModFile = 'kcl.mod';

/** Sets ['when'](https://code.visualstudio.com/docs/getstarted/keybindings#_when-clause-contexts) clause contexts */
export function setContextValue(key: string, value: any): Thenable<void> {
    return vscode.commands.executeCommand("setContext", key, value);
}

export async function getStackFullName(path: vscode.Uri | string) : Promise<string> {
    const currentKclWorkspaceRoot = await kclWorkspaceRoot(path);
    if (currentKclWorkspaceRoot === undefined) {
        // no KCL workspace root found, use stack's absolute file path
        return path instanceof vscode.Uri ? path.fsPath: path;
    }
    const p = require('path');
    return p.relative(currentKclWorkspaceRoot.path, path instanceof vscode.Uri ? path.path: path);
}

export async function kclWorkspaceRoot(path: vscode.Uri | string): Promise<vscode.Uri | undefined> {
    var fromUri = path instanceof vscode.Uri ? path: vscode.Uri.file(path);
    while (true) {
        try {
            const modPath = uri.Utils.joinPath(fromUri, kclModFile);
            await vscode.workspace.fs.stat(modPath);
            return fromUri;
        } catch {
            if(fromUri.fsPath === '/') {
                return undefined;
            }
            fromUri = uri.Utils.dirname(fromUri);
        }
    }
}

export function inKusionStack(currentUri: vscode.Uri): boolean {
    if (currentUri === undefined) {
        return false;
    }
    const workdir = uri.Utils.dirname(currentUri);
    const stackFilePath = vscode.Uri.joinPath(workdir, "stack.yaml");
    return fs.existsSync(stackFilePath.fsPath);
}