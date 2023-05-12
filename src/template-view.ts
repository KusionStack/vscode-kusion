import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { getNonce } from "./utilities/getNonce";
import { getWebviewOptions } from './utilities/getWebviewOptions';
import * as util from './util';
import * as output from './output';

export type InitTemplateData = {
	name: string
	location: string
	projectName: string
	description: string
	quickstart: string
	projectFields: Field[]
	stacks: StackTemplate[]
};

type Field = {
	name: string
	type: KclType
	default: string
	description: string
};

type StackTemplate = {
	name: string
	fields: Field[]
};

export enum KclType {
    string = 'string',
    int = 'int',
}

export function goToTemplateSetting() {
	vscode.commands.executeCommand('workbench.action.openSettings', 'kusion.templates');
}

export function getTemplates(): Promise<Map<string, InitTemplateData>> {
	const templateLocations = vscode.workspace.getConfiguration('kusion.templates').get('location') as string[];
	if (!templateLocations || templateLocations.length === 0) {
		return new Promise<Map<string, InitTemplateData>>((resolve, reject) => {
			resolve(new Map<string, InitTemplateData>());
		});
	}
	var count = templateLocations.length;
	var allTemplates: InitTemplateData[] = [];
	
	return new Promise<Map<string, InitTemplateData>>((resolve, reject) => {
		templateLocations.forEach((loc) => {
			const parsedLoc = vscode.Uri.parse(loc);
			const online = parsedLoc.scheme === "https";
			const location = online ? loc : parsedLoc.path;
			const command = `kusion init templates ${location} ${online ? "--online=true" : ""} -o json`;
			var errorMsgs: string[] = [];
			child_process.exec(command, (err, stdout, stderr)=> {
				if (stdout) {
					try {
						const templates = JSON.parse(stdout) as InitTemplateData[];
						if (templates) {
							const withLocation = templates.map((t) => {t.location = location; return t;});
							allTemplates.push(...withLocation);
						}
					} catch (error) {
						errorMsgs.push(stdout);
					}
				}
				if (err || stderr){
					// todo: this error will be fixed in lated kusion
					if (!stderr.trim().endsWith("[WARN] install kclvm failed: error[E3M38]: No input KCL files or paths")) {
						errorMsgs.push(stderr);
					}
				}
				if (errorMsgs.length !== 0) {
					output.show();
					output.appendLine(`Failed to load templates from ${loc}:`, false);
					errorMsgs.forEach((msg)=> {
						output.appendLine(`\t${util.stripAnsi(msg)}`, true);
					});
				}
				count --;
				if (count === 0) {
					const map = allTemplates.reduce((acc, t) => {
						acc.set(templateUniqueId(t.name, t.location), t);
						return acc;
					}, new Map<string, InitTemplateData>());
					resolve(map);
				}
			});
		
		});
	});
}

export function templateUniqueId(name: string, location: string|undefined): string {
	return `${name}@${location}`;
}

function panelTitle(template: InitTemplateData): string {
	return `Create From Template: ${template.projectName}`;
}

export class CreateFromTemplatePanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CreateFromTemplatePanel | undefined;

	public static readonly viewType = 'kusion.createFromTemplate';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private readonly _template: InitTemplateData;

	public static createOrShow(extensionUri: vscode.Uri, template: InitTemplateData) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel rendered with the same template, show it.
		if (CreateFromTemplatePanel.currentPanel && CreateFromTemplatePanel.currentPanel._panel.title === panelTitle(template)) {
			CreateFromTemplatePanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CreateFromTemplatePanel.viewType,
			panelTitle(template),
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);
		CreateFromTemplatePanel.currentPanel = new CreateFromTemplatePanel(panel, extensionUri, template);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, template: InitTemplateData) {
		CreateFromTemplatePanel.currentPanel = new CreateFromTemplatePanel(panel, extensionUri, template);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, template: InitTemplateData) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._template = template;
		
		// Set the webview's initial html content
		this._update(this._template);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update(template);
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'Create Project':
						const templateParams = JSON.parse(message.text);
						templateParams.StacksConfig = {};
						for (let s of template.stacks) {
							templateParams.StacksConfig[s.name] = {};
							for (let f of s.fields) {
								templateParams.StacksConfig[s.name][f.name] = f.default;
							}
						}
						const openDialog = vscode.window.showOpenDialog({
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false,
                            openLabel: 'save',
                            title: 'Select The Target Directory to Store the Project',
                        });
						const projectName = templateParams.ProjectName;
                        openDialog.then((uris)=>{
                            if (uris?.length === 1) {
                                const targetFolder = uris[0];
                                const projectUri = vscode.Uri.joinPath(targetFolder, projectName);
								const online = this._template.location.startsWith('https');
                                const command = `kusion init ${this._template.location} ${online?'--online':''} --custom-params='${JSON.stringify(templateParams)}' --template-name=${this._template.name}`;
                                console.log(command);
                                child_process.exec(command, {cwd: targetFolder.path}, (err, stdout, stderr)=> {
									this._panel.dispose();
									if (err || stderr) {
										output.appendLine('failed to init project:', false);
										output.appendLine(stdout, true);
										output.appendLine(stderr, true);
										output.show();
                                        return;
                                    }
									output.appendLine(stdout, true);
									const inWorkspace = (vscode.workspace.getWorkspaceFolder(projectUri));
									const openProject = inWorkspace ? 'Reveal in the Explorer' : 'Open In New Window';
									vscode.window.showInformationMessage(`Successfully Created Kusion Project ${projectName}`, ...[openProject]).then((option)=>{
										if (option === openProject){
											if (inWorkspace) {
												// the project is generated to an opened workspace, just reveal it in the explorer
												vscode.commands.executeCommand('revealInExplorer', projectUri);
											} else {
												// the project is generated outside the workspace, open it in the new window
												vscode.commands.executeCommand(`vscode.openFolder`, projectUri, true);
											}	
										}
									});
                                });
                            }
                        });
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		CreateFromTemplatePanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update(template: InitTemplateData) {
		const webview = this._panel.webview;
        this._updateCreateWebview(webview, template);
	}

	private _updateCreateWebview(webview: vscode.Webview, template: InitTemplateData) {
		this._panel.title = panelTitle(template);
		this._panel.webview.html = this._getHtmlForWebview(webview, template);
	}

	private _getHtmlForWebview(webview: vscode.Webview, template: InitTemplateData) {
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'create_project.js');

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		// Local path to css styles
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');

		// Uri to load styles into webview
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

        const html = /*html*/ `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">

            <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
                and only allow scripts that have a specific nonce.
            -->
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <link href="${stylesResetUri}" rel="stylesheet">
            <link href="${stylesMainUri}" rel="stylesheet">
			
            <title>Create Kusion Project</title>
        </head>
        <body>
			<div class="container"><h1>Create Project</h1></div>
            <form id="myForm" class="needs-validation" novalidate="">
            ${generateForm(template)}
        
            <div class="container"><button id="create" type="submit" class="btn btn-primary" >Create Project</button></div>
            </form>
            <script nonce="${nonce}" src="${scriptUri}">
            </script>
        </body>
        </html>`;
		return html;
	}
}

function generateForm(template: InitTemplateData) {
    var projectBlock = generateLabelInputBlock("ProjectName", KclType.string, template.projectName, template.description);

    for(const attr of template.projectFields) {
        const attrBlock = generateLabelInputBlock(attr.name, attr.type, attr.default, attr.description);
        projectBlock = projectBlock.concat(attrBlock);
    }
    return projectBlock;
}

function generateLabelInputBlock(label: string, type: KclType, defaultValue: string, description: string): string {
    return `<div class="form-group">
    <label for="${label}">${label}</label>
	<small id="${label}Help" class="form-text text-muted">${description}</small>
    <input type="${type === KclType.int ? "number": "text"}" class="form-control" id="${label}" aria-describedby="${label}Help" value="${defaultValue}" placeholder="${defaultValue}">
</div>`;
}
