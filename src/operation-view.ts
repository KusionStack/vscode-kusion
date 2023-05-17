import * as vscode from 'vscode';
import * as uri from 'vscode-uri';
import * as util from './util';
import * as stack from './stack';
import { getNonce } from "./utilities/getNonce";
import * as liveDiff from './livediff';
import * as yaml from 'yaml';

const viewType = 'kusion.showOperationDetail';

function getViewTitle(stackLabel: string, locked: boolean,): string {
    return `[Status] ${stackLabel}`;
}

export async function showOperationDetail(context: vscode.ExtensionContext, currentStack: stack.Stack) {
    var previewColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    const stackFullName = currentStack.name;
	const webview = vscode.window.createWebviewPanel(
        viewType, 
        getViewTitle(stackFullName, true), 
        previewColumn, 
        {
            enableFindWidget: true,
            enableScripts: true,
        }
    );

    // get live diff preview result
    const liveDiffPreview = await liveDiff.livePreview(currentStack);
    // 获取当前 stack 下需要变更的资源的列表：
    const resourceList = getResourceList(liveDiffPreview);
    // todo depends on
    const resourceResult = JSON.stringify(resourceList);
    const scriptPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'media', 'flow.js');
    // And the uri we use to load this script in the webview
    const scriptUri = webview.webview.asWebviewUri(scriptPathOnDisk);
    const echartsUri = webview.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'echarts', 'dist', 'echarts.js'));

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'reset.css');
    const stylesPathMainPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'vscode.css');

    // Uri to load styles into webview
    const stylesResetUri = webview.webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.webview.asWebviewUri(stylesPathMainPath);
    const nonce = getNonce();
//    // <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.webview.cspSource}; img-src ${webview.webview.cspSource} https:; script-src 'nonce-${nonce}';">
    const html = `<!DOCTYPE html>
<html lang="en">
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${stylesResetUri}" rel="stylesheet">
    <link href="${stylesMainUri}" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-GLhlTQ8iRABdZLl6O3oVMWSktQOp6b7In1Zl3/Jr59b6EGGoI1aFkw7cmDA6j6gD" crossorigin="anonymous">
    
    <script nonce="${nonce}" src="${echartsUri}"></script>

    <title>${stackFullName}</title>
    </head>
    <body>
        <div class="container">
            <h4>Operation Detail: Apply ${currentStack.name}</h4>
            <div class="row shadow-none p-3 mt-3 mb-3 bg-body-tertiary rounded">
                <div class="col-md-6">
                    <label class="form-label col-md-2">project</label>
                    <span class="text-body-secondary">${currentStack.project.name}</span>
                </div>
                <div class="col-md-6">
                    <label class="form-label col-md-2">stack</label>
                    <span class="text-body-secondary">${currentStack.name}</span>
                </div>
                <div class="col-md-6">
                    <label class="form-label col-md-2">status</label>
                    <span class="text-body-secondary" id='statusSpan'></span>
                </div>
            </div>
            <div>
                <h4>Operation Progress</h4>
                <div class="row shadow-none p-3 mt-3 mb-3 bg-body-tertiary rounded">
                    <div id="main" style="width: 1000px;height:600px;"></div>
                </div>
            </div>
            
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js" integrity="sha384-w76AqPfDkMBDXo30jS1Sgez6pr3x5MlQ1ZAGC+nuZB+EYdgRZgiwxhTBTkF7CXvN" crossorigin="anonymous"></script>
    </body>
</html>`;
    webview.webview.html = html;
    webview.webview.postMessage({ command: 'init', data: new OperationInfo(currentStack.project.name, currentStack.name) });
    webview.webview.postMessage({ command: 'update', data: resourceResult });
}

function getResourceList(changeOrder: liveDiff.ChangeOrder) {
    const resourceList: K8sResourceChange[] = [];
    changeOrder.stepKeys.forEach(stepKey => {
        const step = changeOrder.changeSteps[stepKey];
        var dependsOn: string[] = [];
        if (step.action === liveDiff.ActionType.unChange || step.action === liveDiff.ActionType.update) {
            dependsOn = step.to.dependsOn;
        }
        const res = getResourceInfo(stepKey, step);
        res.setDependsOn(dependsOn);
        resourceList.push(res);
    });
    return resourceList;
}


// stepKey is like: apps/v1:Deployment:guestbook:redis-leader
function getResourceInfo(stepKey: string, step: liveDiff.ChangeStep): K8sResourceChange {
    // todo: support non-k8s resource
    const stepKeyParts = stepKey.split(':');
    const resource = new K8sResourceChange(stepKeyParts[0], stepKeyParts[1], stepKeyParts[2], stepKeyParts[3], step.action);
    return resource;
}

class K8sResourceChange {
    name: string;
    apiVersion: string;
    kind: string;
    namespace: string;
    action: liveDiff.ActionType;
    dependsOn: string[] = [];
    
    constructor(apiVersion: string, kind: string, namespace: string, name: string, action: liveDiff.ActionType) {
        this.name = kind === 'Namespace' ? namespace : name;
        this.apiVersion = apiVersion;
        this.kind = kind;
        this.namespace = namespace;
        this.action = action;
    }

    setDependsOn(dependsOn: string[]) {
        this.dependsOn = dependsOn;
    }
}

class OperationInfo {
    project: string;
    stack: string;

    constructor(project: string, stack: string) {
        this.project = project;
        this.stack = stack;
    }
}