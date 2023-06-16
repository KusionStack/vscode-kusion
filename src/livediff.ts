import * as vscode from 'vscode';
import * as util from './util';
import * as stack from './ocmp';
import * as child_process from 'child_process';
import * as yaml from 'yaml';
import * as output from './output';


const KUSION_LIVE_DIFF_EDITOR_OPEN = 'inKusionLiveDiff';

export function checkInLiveDiffTab(): boolean {
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (input && input instanceof vscode.TabInputTextDiff) {
    const original = input.original;
    const modified = input.modified;
    return (original && modified && original.scheme === 'kusion');
  }
  return false;
}

export function updateKusionLiveDiffEditorStatus(editor: vscode.TextEditor | undefined) {
  if (editor && checkInLiveDiffTab()) {
    const allEditors = vscode.window.visibleTextEditors;
    for (const e of allEditors) {
      if (e.document.uri.scheme === 'kusion') {
        vscode.languages.setTextDocumentLanguage(e.document, 'yaml');
      }
    }
    util.setContextValue(KUSION_LIVE_DIFF_EDITOR_OPEN, true);
  } else {
    util.setContextValue(KUSION_LIVE_DIFF_EDITOR_OPEN, false);
  }
}

function getSpecPath(stackUri: vscode.Uri): string {
  return vscode.Uri.joinPath(stackUri, 'spec').fsPath;
}

function getStatusPath(stackUri: vscode.Uri): string {
  return vscode.Uri.joinPath(stackUri, 'status').fsPath;
}

export async function showDiff(context: vscode.ExtensionContext, currentStack: stack.Stack) {
  const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

  const editorOptions: vscode.TextDocumentShowOptions = {
    preserveFocus: false,
    preview: false,
    viewColumn: column
  };

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Loading Stack Status from Runtime...",
    cancellable: false
  }, (progress) => {
    return new Promise<void>((resolve, reject) => {
      // runtime/status: kusion:${stackPath}?language=yaml#runtime
      // spec: kusion:${stackPath}?language=yaml#spec
      liveDiff(currentStack).then((previewResult: LiveDiffPreview) => {
        resolve();
        const registration = vscode.workspace.registerTextDocumentContentProvider('kusion', {
          provideTextDocumentContent(uri) {
            switch (uri.fragment) {
              case 'runtime':
                return yaml.stringify(previewResult.status);
              case 'spec':
                return yaml.stringify(previewResult.spec);
              default:
                return 'default';
            }
          }
        });
        const statusUri = vscode.Uri.parse(`kusion:${getStatusPath(currentStack.uri)}?language=yaml#runtime`);
        const specUri = vscode.Uri.parse(`kusion:${getSpecPath(currentStack.uri)}?language=yaml#spec`);
        // check if there are diff tabs that represents the same stack's diff info, close it first to avoid being directly reused by vscode
        const diffEditorTabsToClose: vscode.Tab[] = [];
        for (const tab of vscode.window.tabGroups.all.map(g => g.tabs).flat()) {
          const { input } = tab;
          if (input instanceof vscode.TabInputTextDiff) {
            if (input.modified.scheme === 'kusion' && input.modified.fsPath === specUri.fsPath) {
              diffEditorTabsToClose.push(tab);
            }
          }
        }
        vscode.window.tabGroups.close(diffEditorTabsToClose);
        vscode.commands.executeCommand('vscode.diff',
          statusUri, 
          specUri,
          `${currentStack.name} (Runtime) ↔ (Spec)`,
          editorOptions).then(
            value => {
              value;
              registration.dispose();
              util.setContextValue(KUSION_LIVE_DIFF_EDITOR_OPEN, true);
            }
          );
      },
      (reason) =>  {
        reject(reason);
      });
    });
  });
}

export function livePreview(currentStack: stack.Stack): Promise<ChangeOrder> {
  return new Promise((resolve, reject) => {
    // todo: before release, if stack defination changed, the currentStack.name should change to fullName
    child_process.exec(`kusion preview -w ${currentStack.name} --ignore-fields="metadata.generation,metadata.managedFields" --output json`, { cwd: currentStack.kclWorkspaceRoot?.path }, (error, stdout, stderr) => {
      if (stdout) {
        try {
          const result = JSON.parse(stdout) as ChangeOrder;
          resolve(result);
        } catch (e) {
          console.log(`not json: ${stdout}`);
          if (error || stderr) {
            console.error(`kusion preview --output json exec error: ${error}, ${stderr}`);
            output.show();
            output.appendLine(`kusion Preview failed:`, false);
            output.appendLine(stdout, true);
            reject(stderr);
          }
        }
      }
      if (error || stderr) {
        console.error(`kusion preview --output json exec error: ${error}, ${stderr}`);
        output.show();
        output.appendLine(`kusion Preview failed:`, false);
        output.appendLine(stderr, true);
        reject(stderr);
      }
    });
  });
}


export function liveDiff(currentStack: stack.Stack): Promise<LiveDiffPreview> {
  return new Promise<LiveDiffPreview>((resolve, reject) => {
    livePreview(currentStack).then((result: ChangeOrder) => {
      const status: { [key: string]: object } = {};
      const spec: { [key: string]: object } = {};
      const steps = result.changeSteps;
      for (const key in steps) {
        if (steps.hasOwnProperty(key)) {
          const step = steps[key];
          status[step.id] = step.from;
          spec[step.id] = step.to;
        }
      }
      resolve(new LiveDiffPreview(status, spec));
    }, (reason)=>{
      reject(reason);
    });
  });
}

class LiveDiffPreview {
  status: { [key: string]: object };
  spec: { [key: string]: object };

  constructor(status: { [key: string]: object }, spec: { [key: string]: object }) {
    this.status = status;
    this.spec = spec;
  }
}

export class ChangeOrder {
  stepKeys: string[];
  changeSteps: ChangeSteps;

  constructor(stepKeys: string[], changeSteps: ChangeSteps) {
    this.stepKeys = stepKeys;
    this.changeSteps = changeSteps;
  }
}

export interface ChangeSteps {
  [key: string]: ChangeStep;
}

export class ChangeStep {
  // the resource id
  id: string;
  // the operation performed by this step
  action: ActionType;
  // old data
  from: ResourceNode;
  // new data
  to: ResourceNode;

  constructor(id: string, action: ActionType, from: ResourceNode, to: ResourceNode) {
    this.id = id;
    this.action = action;
    this.from = from;
    this.to = to;
  }
}

export enum ActionType {
  unChange = "UnChange",// nothing to do.
  create = "Create",    // creating a new resource.
  update = "Update",    // updating an existing resource.
  delete = "Delete",    // deleting an existing resource.
}

export class ResourceNode {
  id: string;
  type: string;
  attributes: object;
  dependsOn: string[];

  constructor(id: string, type: string, attributes: object, dependsOn: string[]) {
    this.id = id;
    this.type = type;
    this.attributes = attributes;
    this.dependsOn = dependsOn;
  }
}
