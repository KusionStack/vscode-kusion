import * as vscode from 'vscode';
import * as tasks from './tasks';
import * as quickstart from './quickstart/setup';
import * as dataPreview from './preview';
import * as util from './util';
import * as uri from 'vscode-uri';
import * as stack from './stack';
import {ensureKusion} from './installer';
import * as createProject from './create-project';
import * as liveDiff from './livediff';
import * as operationView from './operation-view';

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

export function kusionPreCheckByUri(targetUri: vscode.Uri|undefined): stack.Stack | undefined {
    if (targetUri === undefined) {
        return;
    }
    var resolvedUri : vscode.Uri = targetUri;
    if (targetUri.scheme === 'kusion') {
        // transform kusion uri to file
        resolvedUri = vscode.Uri.parse(`file://${targetUri.fsPath}`);
    }
    if (!util.inKusionStackCheck(resolvedUri)) {
        return;
    }
    const root = util.kclWorkspaceRoot(resolvedUri);
    const stackUri = uri.Utils.dirname(resolvedUri);
    return new stack.Stack(stackUri, root);
}

function kusionPreCheck(): stack.Stack | undefined {
    var resource : vscode.Uri | undefined = util.activeTextEditorDocument()?.uri;
    return kusionPreCheckByUri(resource);
}

export function kusionCompile() {
    if (!ensureKusion()) {
        return;
    }
    kusionCommandRun('compile', kusionPreCheck());
}

export function kusionDiffPreview(context: vscode.ExtensionContext) {
    if (!quickstart.canApplyOrDestroy()) {
        vscode.window.showWarningMessage("Minikube not ready, please wait for the minikube to start");
        return;
    }

    const currentStack = kusionPreCheck();
    if (!currentStack) {
        return;
    }
    
    liveDiff.showDiff(context, currentStack);
}

export function kusionConfirmApply(context: vscode.ExtensionContext) {
    if (!ensureKusion()) {
        return;
    }
    if (!quickstart.canApplyOrDestroy()) {
        vscode.window.showWarningMessage("Minikube not ready, please wait for the minikube to start");
        return;
    }
    if (!liveDiff.checkInLiveDiffTab()) {
        vscode.window.showErrorMessage('Please open the live diff tab to apply the changes');
        return;
    }
    const currentStack = kusionPreCheck();
    if (!currentStack) {
        return;
    }
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    if (!input || !(input instanceof vscode.TabInputTextDiff)) {
        return;
    }
    const modified = input.modified;
    const title = `This action will apply all the resources defined in the stack ${currentStack.name}.\nFullfill the stack name ${currentStack.name} to confirm`;
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
            operationView.showOperationDetail(context, currentStack);
            kusionCommandRun('apply', currentStack);
        }
    });
}

export async function kusionDestroy() {
    if (!ensureKusion()) {
        return;
    }
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

export function kusionHelp(): void {
    const kusionQuick = 'Kusion Quick Start Guide';
    const kclQuick = 'KCL Quick Start Guide';
    const kusionFeedback = 'Feedback';
    const kusionQuickUri = 'https://kusionstack.io/docs/user_docs/getting-started/';
    const kclQuickUri = 'https://kcl-lang.io/docs/user_docs/getting-started/kcl-quick-start';
    const kusionFeedbackUri = 'https://github.com/KusionStack/vscode-kusion/issues/new/choose';
    vscode.window.showQuickPick([
        {
            label: kusionQuick,
            description: 'Get started to deliver applications with Kusion'
            
        },
        {
            label: kclQuick,
            description: 'Get started to write configurations with KCL'
        },
        {
            label: kusionFeedback,
            description: 'Provide your feedback to help improve the product'
        }
    ], {canPickMany: false, placeHolder: "Pick a guide to quick start your Kusion tour!"}).then((value)=> {
        if (value) {
            switch (value.label) {
                case kusionQuick:
                    vscode.env.openExternal(vscode.Uri.parse(kusionQuickUri));
                    return;
                case kclQuick:
                    vscode.env.openExternal(vscode.Uri.parse(kclQuickUri));
                    return;
                case kusionFeedback:
                    vscode.env.openExternal(vscode.Uri.parse(kusionFeedbackUri));
                    return;
            }
        }
    });
}

export function kusionCreateProject(context: vscode.ExtensionContext): void {
    createProject.multiStepInput(context);
}