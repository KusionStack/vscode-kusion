import * as vscode from "vscode";
import * as uri from 'vscode-uri';
import * as fs from 'fs';

const kclModFile = 'kcl.mod';

export function activeTextEditorDoc(): vscode.TextDocument | undefined {
    return vscode.window.activeTextEditor?.document;
}

/** Sets ['when'](https://code.visualstudio.com/docs/getstarted/keybindings#_when-clause-contexts) clause contexts */
export function setContextValue(key: string, value: any): Thenable<void> {
    return vscode.commands.executeCommand("setContext", key, value);
}

export function getStackFullName(path: vscode.Uri | string, root: vscode.Uri | undefined) : string {
    if (root === undefined) {
        root = kclWorkspaceRoot(path);
    }
    if (root === undefined) {
        // no KCL workspace root found, use stack's absolute file path
        return path instanceof vscode.Uri ? path.fsPath: path;
    }
    const p = require('path');
    return p.relative(root.path, path instanceof vscode.Uri ? path.path: path);
}

export function getProjectFullName(path: vscode.Uri | string, root: vscode.Uri | undefined) : string {
    if (root === undefined) {
        root = kclWorkspaceRoot(path);
    }
    if (root === undefined) {
        // no KCL workspace root found, use stack's absolute file path
        return path instanceof vscode.Uri ? path.fsPath: path;
    }
    const p = require('path');
    return p.relative(root.path, path instanceof vscode.Uri ? path.path: path);
}

export function kclWorkspaceRoot(path: vscode.Uri | string): vscode.Uri | undefined {
    var fromUri = path instanceof vscode.Uri ? path: vscode.Uri.file(path);
    while (true) {
        const modPath = uri.Utils.joinPath(fromUri, kclModFile);
        if (fs.existsSync(modPath.path)) {
            return fromUri;
        }
        if(fromUri.path === '/') {
            return undefined;
        }
        fromUri = uri.Utils.dirname(fromUri);
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

export function inKusionStackCheck(activeEdior: vscode.Uri|undefined): boolean {
    if (activeEdior === undefined || !inKusionStack(activeEdior)) {
        vscode.window.showWarningMessage(`Not in a Kusion Stack: ${activeEdior?activeEdior.path:"No Active Editor Found"}`);
        return false;
    }
    return true;
}

export const settingsPath = (stackPath: string)=>{
    const p = require('path');
    return p.join(stackPath, 'ci-test', 'settings.yaml');
};

export const kclYamlPath = (stackPath: string)=>{
    const p = require('path');
    return p.join(stackPath, 'kcl.yaml');
};

export function randomNumBetween(pMin: number, pMax: number) {
    pMin = Math.round(pMin);
    pMax = Math.round(pMax);
    if (pMax < pMin) {
        let t = pMin; pMin = pMax; pMax = t;
    }
    return Math.floor(Math.random() * (pMax+1 - pMin) + pMin);
}