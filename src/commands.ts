import * as vscode from 'vscode';
import * as tasks from './tasks';
import * as quickstart from './quickstart/setup';
import * as dataPreview from './preview';
import * as util from './util';
import * as uri from 'vscode-uri';
import * as stack from './stack';

export function createAndRunTask(taskName: string, stackObj: stack.Stack) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const target = vscode.workspace.workspaceFolders![0]; // safe, see extension.ts activate()
    const task = tasks.buildKusionTask(
        target,
        taskName,
        stackObj
    );
    if (!task) {
        return undefined;
    }
    vscode.tasks.executeTask(task);
}

function kusionCommandRun(commandName: string, currentStack: stack.Stack|undefined) {
    if (currentStack === undefined) {
        return;
    }
    createAndRunTask(commandName, currentStack);
    if (commandName === 'apply') {
        quickstart.checkAndNotifySvc(currentStack);
    }
}

function kusionPreCheck(): stack.Stack | undefined {
    var resource : vscode.Uri | undefined = util.activeTextEditorDoc()?.uri;
    if (resource === undefined || !util.inKusionStackCheck(resource)) {
        return;
    }
    const root = util.kclWorkspaceRoot(resource);
    const stackUri = uri.Utils.dirname(resource);
    return new stack.Stack(stackUri, root);
}

export function kusionCompile() : void {
    kusionCommandRun('compile', kusionPreCheck());
}

export function kusionApply() : void {
    if (!quickstart.canApplyOrDestroy()) {
        vscode.window.showWarningMessage("Minikube not ready, please wait for the minikube to start");
    } else {
        kusionCommandRun('apply', kusionPreCheck());
    }
}

export function kusionDestroy(): void {
    if (!quickstart.canApplyOrDestroy()) {
        vscode.window.showWarningMessage("Minikube not ready, please wait for the minikube to start");
    } else {
        const currentStack = kusionPreCheck();
        if (currentStack === undefined) {
            return;
        }
        const title = `This action will destroy all the resources defined in the stack ${currentStack.name}.\nFullfill the stack name ${currentStack.name} to confirm`;
        vscode.window.showInputBox({title: title, value: currentStack.name, placeHolder: currentStack.name, validateInput: (value): string | vscode.InputBoxValidationMessage | undefined => {
            if (value !== currentStack.name) {
                return {
                    message: `Stack Path mismatch: ${currentStack.name}`,
                    severity: 3
                };
            } else {
                return {
                    message: 'Stack Path confirmed. Press Enter to Confirm or Press Esc to Cancel',
                    severity: 1
                };
            }
        }}, undefined).then((input)=>{
            if (input === currentStack.name) {
                kusionCommandRun('destroy', currentStack);
            }
        });
    }
}

export function kusionShowDataPreviewCommand() : void {
    dataPreview.showDataPreview({sideBySide: false, locked: true});
}

export function kusionShowDataPreviewToSideCommand() : void {
    dataPreview.showDataPreview({sideBySide: true, locked: true});
}