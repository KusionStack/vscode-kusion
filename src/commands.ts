import * as vscode from 'vscode';
import * as tasks from './tasks';


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
    kusionCommandRun('apply');
}

export function kusionPreview() : void {
    kusionCommandRun('preview');
}


// const kusionCompile = vscode.commands.registerCommand('kusion.compile', async () => {
//     let kusionOutput = vscode.window.createOutputChannel('kusion');
//     kusionOutput.show();

//     const fileName = kusion_task_provider.activeDocumentPath();
//     if (fileName !== undefined) {
//         const stackPath = kusion_task_provider.getStackPath(fileName);
//         if (stackPath !== undefined) {
//             const script = kusion_task_provider.compileScript(stackPath);
//             const output = await execShell(script);
//             if (output === "") {
//                 kusionOutput.appendLine(kusion_task_provider.compileSuccessMsg(stackPath));
//             } else {
//                 kusionOutput.append(output);
//             }
//         }
//     } else {
//         kusionOutput.append("not in stack");
//     }
// });

// const execShell = (cmd: string) =>
//     new Promise<string>((resolve, reject) => {
//         cp.exec(cmd, (err, out) => {
//             if (err) {
//                 return reject(err);
//             }
//             return resolve(out);
//         });
//     });