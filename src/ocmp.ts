import * as vscode from 'vscode';
import * as util from './util';
import * as vscodeUri from 'vscode-uri';
import * as p from 'path';

export class Stack {
    readonly name: string;
    readonly fullName: string;
    readonly uri: vscode.Uri;
    readonly kclWorkspaceRoot: vscode.Uri | undefined;

    constructor(uri: vscode.Uri, root?: vscode.Uri | undefined) {
        this.name = vscodeUri.Utils.basename(uri);
        this.uri = uri;
        this.kclWorkspaceRoot = root;
        this.fullName = this.kclWorkspaceRoot === undefined ? uri.path : util.getProjectStackFullName(uri, root);
    }
}

export class Project {
    readonly name: string;
    readonly fullName: string;
    readonly uri: vscode.Uri;
    readonly kclWorkspaceRoot: vscode.Uri | undefined;
    readonly stacks: Promise<Stack[]>;
    readonly pathParts: string[] = [];

    constructor(uri: vscode.Uri, root?: vscode.Uri | undefined) {
        this.name = vscodeUri.Utils.basename(uri);
        this.uri = uri;
        this.kclWorkspaceRoot = root;
        this.fullName = this.kclWorkspaceRoot === undefined ? uri.path : util.getProjectStackFullName(uri, root);
        this.pathParts = this.fullName.split(p.sep);

        this.stacks = new Promise<Stack[]>(resolve=>{
            vscode.workspace.fs.readDirectory(uri).then((paths)=> {
                const stacks: Stack[] = [];
                const dirs = paths.filter((p)=>{const [_, fileType]: [string, vscode.FileType] = p; return fileType===vscode.FileType.Directory;});
                var count = dirs.length;
                // iterate the sub directories under the project
                dirs.forEach((d)=>{
                    const [dirname, _]: [string, vscode.FileType] = d;
                    vscode.workspace.fs.stat(vscode.Uri.joinPath(uri, dirname, 'stack.yaml')).then(
                        // if stack.yaml exists, then it is a stack, push to project.stacks
                        stat => {
                            const stack = new Stack(vscode.Uri.joinPath(uri, dirname), root);
                            stacks.push(stack);
                            count--;
                            if (count === 0) {
                                resolve(stacks);
                            }
                        },
                        // if stack.yaml does not exist, then it is not a stack, skip
                        err => {
                            count--;
                            if (count === 0) {
                                resolve(stacks);
                            }
                        }
                    );
                });
            });
        });
    }
}

export function getProjects(root: vscode.Uri): Promise<Project[]>{
    const pattern = '**/project.yaml';
    return new Promise<Project[]>((resolve) => {
        vscode.workspace.findFiles(pattern).then((uris)=> {
            resolve(uris.map((value) => new Project(vscodeUri.Utils.dirname(value), root)));
        });
    });
}