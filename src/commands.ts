import * as vscode from 'vscode';
import * as tasks from './tasks';
import * as quickstart from './quickstart/setup';


export function createTask(taskName: string, stackPath: string): vscode.Task|undefined {
    const definition: tasks.KusionTaskDefinition = {
        task: taskName,
        type: 'kusion'
    };

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const target = vscode.workspace.workspaceFolders![0]; // safe, see extension.ts activate()
    const kusionTask = tasks.buildKusionTask(
        definition,
        target,
        taskName,
        stackPath
    );
    if (!kusionTask) {
        return undefined;
    }
    // task.presentationOptions.showReuseMessage=false;
    // task.presentationOptions.panel = vscode.TaskPanelKind.New;
    kusionTask.group = vscode.TaskGroup.Build;
    kusionTask.presentationOptions.clear = true;
    kusionTask.presentationOptions.focus = true;
    kusionTask.presentationOptions.reveal = vscode.TaskRevealKind.Always;
    return kusionTask;
}

function kusionCommandRun(commandName: string): void {
    const fileName = tasks.activeDocumentPath();
    if (!fileName) {
        return;
    }
    const stackPath = tasks.getStackPath(fileName);
    if (!stackPath) {
        vscode.window.showInformationMessage("you are currently not in a kusion stack");
        return ;
    }

    const task = createTask(commandName, stackPath);
    if (!task) {
        return;
    }
    vscode.tasks.executeTask(task);
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
