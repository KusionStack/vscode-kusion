import * as vscode from 'vscode';
import * as stack from './ocmp';
import { getNonce } from "./utilities/getNonce";
import * as liveDiff from './livediff';

const viewType = 'kusion.showOperationDetail';

function getViewTitle(stackLabel: string, locked: boolean,): string {
    return `[Status] ${stackLabel}`;
}

export async function showOperationDetail(context: vscode.ExtensionContext, currentStack: stack.Stack) {
    var previewColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    const stackFullName = currentStack.fullName;
    const webview = vscode.window.createWebviewPanel(
        viewType,
        getViewTitle(stackFullName, true),
        previewColumn,
        {
            enableFindWidget: true,
            enableScripts: true,
        }
    );

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
                    <span class="text-body-secondary">${currentStack.project}</span>
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
    // set the initial operation info
    webview.webview.postMessage({ command: 'init', data: new OperationInfo(currentStack.project, currentStack.name, StackStatus.syncing) });

    const p = new Promise<void>(async resolve => {
        let refreshIntervalId = setInterval(() => {
            const afterReady = () => {
                // stop looping after minikube start ready
                clearInterval(refreshIntervalId);
                resolve();
            };
            checkStackSynced(currentStack, webview.webview, afterReady);
        }, 3000);
    });
}

async function checkStackSynced(currentStack: stack.Stack, webview: vscode.Webview, afterReady: () => void) {
    // get live diff preview result
    liveDiff.livePreview(currentStack).then((liveDiffPreview)=>{
        // update the resources status ans resource map
        const operationInfo = getOperationInfo(currentStack.project, currentStack.name, liveDiffPreview);
        webview.postMessage({ command: 'update', data: operationInfo });
        if (operationInfo.status === StackStatus.synced) {
            afterReady();
        }
    },
    (reason)=> {
        // if livePreview failed, stop checking and report error
        vscode.window.showErrorMessage(reason);
        afterReady();
    });
    
}

function getOperationInfo(project: string, stack: string, changeOrder: liveDiff.ChangeOrder): OperationInfo {
    const resourceMap = getResourceMap(changeOrder);
    return new OperationInfo(project, stack, getStackStatus(resourceMap), resourceMap);
}

function getStackStatus(resourceMap: { [name: string]: K8sResourceChange }): StackStatus {
    for (const id in resourceMap) {
        if (resourceMap[id].status !== ResourceStatus.synced) {
            return StackStatus.syncing;
        }
    }
    return StackStatus.synced;
}

function getResourceMap(changeOrder: liveDiff.ChangeOrder) {
    const resourceMap: { [name: string]: K8sResourceChange } = {};
    changeOrder.stepKeys.forEach(stepKey => {
        const step = changeOrder.changeSteps[stepKey];
        var dependsOn: string[] = [];
        if (step.action === liveDiff.ActionType.unChange || step.action === liveDiff.ActionType.update) {
            // todo: check the step.from and step.to, not only the step.to
            dependsOn = step.to.dependsOn;
        }
        const res = getResourceInfo(stepKey, step);
        res.setDependsOn(dependsOn);
        resourceMap[res.id] = res;
    });
    return resourceMap;
}


// stepKey is like: apps/v1:Deployment:guestbook:redis-leader
function getResourceInfo(stepKey: string, step: liveDiff.ChangeStep): K8sResourceChange {
    // todo: support non-k8s resource
    const stepKeyParts = stepKey.split(':');
    var resourceStatus = ((action: liveDiff.ActionType) => {
        switch (step.action) {
            case liveDiff.ActionType.create:
                return ResourceStatus.toCreate;
            case liveDiff.ActionType.delete:
                return ResourceStatus.toDelete;
            case liveDiff.ActionType.update:
                return ResourceStatus.toUpdate;
            case liveDiff.ActionType.unChange:
                return ResourceStatus.synced;
            default:
                return ResourceStatus.synced;
        }
    })(step.action);

    const resource = new K8sResourceChange(stepKey, stepKeyParts[0], stepKeyParts[1], stepKeyParts[2], stepKeyParts[3], resourceStatus);
    return resource;
}

class K8sResourceChange {
    id: string;
    name: string;
    apiVersion: string;
    kind: string;
    namespace: string;
    status: ResourceStatus;
    dependsOn: string[] = [];

    constructor(id: string, apiVersion: string, kind: string, namespace: string, name: string, status: ResourceStatus) {
        this.id = id;
        this.name = kind === 'Namespace' ? namespace : name;
        this.apiVersion = apiVersion;
        this.kind = kind;
        this.namespace = namespace;
        this.status = status;
    }

    setDependsOn(dependsOn: string[]) {
        this.dependsOn = dependsOn;
    }
}

class OperationInfo {
    project: string;
    stack: string;
    status: StackStatus;
    resourceMap: { [name: string]: K8sResourceChange };

    constructor(project: string, stack: string, status: StackStatus = StackStatus.syncing, resourceMap: { [name: string]: K8sResourceChange } = {}) {
        this.project = project;
        this.stack = stack;
        this.status = status;
        this.resourceMap = resourceMap;
    }
}

enum ResourceStatus {
    toCreate = 'toCreate',
    creating = 'creating',
    toUpdate = 'toUpdate',
    updating = 'updating',
    toDelete = 'toDelete',
    deleting = 'deleting',
    synced = 'synced',
}

enum StackStatus {
    synced = 'synced',
    syncing = 'syncing',
    unsynced = 'unsynced',
}