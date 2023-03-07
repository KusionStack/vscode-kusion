import * as vscode from 'vscode';
import * as tasks from './tasks';
import * as quickstart from './quickstart/setup';
import * as dataPreview from './preview';
import * as util from './util';
import * as uri from 'vscode-uri';

export function createAndRunTask(taskName: string, kusionWorkspace: vscode.Uri|undefined, stack: vscode.Uri) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const target = vscode.workspace.workspaceFolders![0]; // safe, see extension.ts activate()
    tasks.buildKusionTask(
        target,
        taskName,
        stack,
        kusionWorkspace
    ).then((task)=>{
        if (!task) {
            return undefined;
        }
        vscode.tasks.executeTask(task);
    });
}

async function kusionCommandRun(commandName: string): Promise<void> {
    var resource : vscode.Uri | undefined = util.activeTextEditorDoc()?.uri;
    if (resource === undefined || !util.inKusionStackCheck(resource)) {
        return;
    }
    const root = await util.kclWorkspaceRoot(resource);
    const stackUri = uri.Utils.dirname(resource);
    createAndRunTask(commandName, root, stackUri);
    quickstart.checkAndNotifySvc(root, stackUri);
}

export function kusionCompile() : void {
    kusionCommandRun('compile');
}

export function kusionApply() : void {
    if (!quickstart.canApply()) {
        vscode.window.showWarningMessage("Minikube not ready, please wait for the minikube to start");
    } else {
        kusionCommandRun('apply');
    }
}

export function kusionShowDataPreviewCommand() : void {
    dataPreview.showDataPreview({sideBySide: false, locked: true});
}

export function kusionShowDataPreviewToSideCommand() : void {
    dataPreview.showDataPreview({sideBySide: true, locked: true});
}