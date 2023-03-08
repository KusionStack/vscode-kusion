import * as vscode from 'vscode';
import * as util from './util';
import * as vscodeUri from 'vscode-uri';

export class Stack {
    readonly name: string;

    readonly uri: vscode.Uri;

    readonly kclWorkspaceRoot: vscode.Uri | undefined;

    readonly project: Project;

    constructor(uri: vscode.Uri, root?: vscode.Uri | undefined) {
        this.uri = uri;
        this.kclWorkspaceRoot = root;
        this.name = this.kclWorkspaceRoot === undefined ? uri.path : util.getStackFullName(uri, root);
        const projectUri = vscodeUri.Utils.dirname(uri);
        this.project = new Project(projectUri, this.kclWorkspaceRoot === undefined ? projectUri.path : util.getProjectFullName(projectUri, root), this.kclWorkspaceRoot);
    }
}

export class Project {
    readonly name: string;
    readonly uri: vscode.Uri;
    readonly kclWorkspaceRoot: vscode.Uri | undefined;
    readonly stacks?: [Stack];

    constructor(uri: vscode.Uri, name: string, root?: vscode.Uri | undefined) {
        this.uri = uri;
        this.kclWorkspaceRoot = root;
        this.name = name;
    }
}