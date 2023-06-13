import * as vscode from 'vscode';
import * as ocmp from './ocmp';


export class ProjectListProvider implements vscode.TreeDataProvider<ProjectStackRecord> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectStackRecord | undefined | void> = new vscode.EventEmitter<ProjectStackRecord | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ProjectStackRecord | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
		this._onDidChangeTreeData.fire();
	}

    getTreeItem(element: ProjectStackRecord): vscode.TreeItem {
		return element;
	}

    getChildren(element?: ProjectStackRecord): vscode.ProviderResult<ProjectStackRecord[]> {
        if (!element) {
            // todo: show status when not collapsed
            return getProjectRecords();
        } else {
            // todo: show status when not collapsed
            return element.children;
        }
    }

    // todo: support project records refresh after new project/stack is added
    async addProjectRecord(){
        const record = new ProjectStackRecord(
            vscode.TreeItemCollapsibleState.None, 
            "wordpress",
            new Promise<ProjectStackRecord[]>(resolve=>resolve([])),
            new Detail("pending"),
        );
        addProjectRecord(record);
        this._onDidChangeTreeData.fire();
    }
}

export class ProjectStackRecord extends vscode.TreeItem {
	constructor(
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly name: string,
        public readonly children: Promise<ProjectStackRecord[]> | undefined,
        public readonly detail?: Detail,
	) {
        super(`${name}`, collapsibleState);
        this.description = detail?.status;
	}
	contextValue = 'project';
}

export class Detail {
    constructor(
        public readonly status: "ready" | "pending",
    ) {
        this.status = status;
    }
}

export function getProjectRecords(): Promise<ProjectStackRecord[]> {
    // todo: support multiple projects sorted by directory heriarchy
    return new Promise<ProjectStackRecord[]>(resolve=>{
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
            const projects = ocmp.getProjects(vscode.workspace.workspaceFolders[0].uri);
            projects.then((values)=>{
                resolve(values.map(p => new ProjectStackRecord(
                    vscode.TreeItemCollapsibleState.Collapsed,
                    p.name,
                    new Promise<ProjectStackRecord[]>(resolve=>{
                        p.stacks.then(
                            stacks => {
                                resolve(stacks.map(s => new ProjectStackRecord(vscode.TreeItemCollapsibleState.None, s.name, new Promise<ProjectStackRecord[]>(resolve=>resolve([])))));
                            }
                        );
                    })
                ))); 
            });
        }
    });
}

export function addProjectRecord(record: ProjectStackRecord) {
    // records.push(record);
}

