import * as vscode from 'vscode';
import * as uri from 'vscode-uri';
import * as child_process from 'child_process';
import * as util from './util';
import * as shiki from 'shiki';

const viewType = 'kusion.dataPreview';

export function showDataPreview(dataPreviewSettings: ShowDataPreviewSettings) {
    var resource : vscode.Uri | undefined = util.activeTextEditorDoc()?.uri;
    if (resource === undefined || !util.inKusionStackCheck(resource)) {
        return;
    }
    
    var locked = !! dataPreviewSettings.locked;
    const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    var previewColumn = dataPreviewSettings.sideBySide ? vscode.ViewColumn.Beside : resourceColumn;
    const root = util.kclWorkspaceRoot(resource);
    const stackUri = uri.Utils.dirname(resource);
    const stackFullName = util.getStackFullName(stackUri, root);
	const webview = vscode.window.createWebviewPanel(
        viewType, 
        getViewTitle(stackFullName, locked), 
        previewColumn, 
        { enableFindWidget: true, }
    );
    var extensionContext = vscode.extensions.getExtension("KusionStack.kusion");
    if (extensionContext?.extensionUri) {
        var iconPath = {
            dark: vscode.Uri.joinPath(extensionContext.extensionUri, 'images', 'preview-dark.svg'),
            light: vscode.Uri.joinPath(extensionContext.extensionUri, 'images', 'preview-light.svg'),
        };
        webview.iconPath = iconPath;
    }

    setCompiledData(stackUri, (data: string)=> {
        shiki.getHighlighter({
            theme: vscode.window.activeColorTheme.kind === 1 ? 'min-light' : 'min-dark'
        }).then((highlighter) => {
            const codeBlock = highlighter.codeToHtml(`${data}`, { lang: 'yaml' });
            const html = `<!DOCTYPE html><html lang="en"><body>${codeBlock}</body></html>`;
            webview.webview.html = html;
        });
        
    });
    // vscode.window.onDidChangeActiveColorTheme( () => {
    //     //create an empty webview
    //     myEmptyWebview.webview.onDidReceiveMessage((colors)=>{
    //         //do something with the css root colors
    //         console.log(colors);
    //         myEmptyWebview.dispose();//dispose this webview as we are not using it.
    //     });
    // });
}

function getViewTitle(stackLabel: string, locked: boolean,): string {
    return locked
        ? `[Preview] ${stackLabel}`
        : `Preview ${stackLabel}`;
}

interface ShowDataPreviewSettings {
	readonly sideBySide?: boolean;
	readonly locked?: boolean;
}

function setCompiledData(stackUri: vscode.Uri, setToWebview: (data: string)=> void): void {
    const command = `kcl -Y ${util.settingsPath('')} ${util.kclYamlPath('')}`;
    child_process.exec(command, { cwd: stackUri.path }, (err, stdout, stderr)=> {
        if (err || stderr){
            setToWebview(`Stack Compile Failed, Stderr:\n${stderr}`);
            return;
        }
        setToWebview(stdout);
    });
}
