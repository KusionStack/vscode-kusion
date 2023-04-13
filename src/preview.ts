import * as vscode from 'vscode';
import * as uri from 'vscode-uri';
import * as child_process from 'child_process';
import * as util from './util';
import * as shiki from 'shiki';
import {ensureKusion} from './installer';

const viewType = 'kusion.dataPreview';

export function showDataPreview(dataPreviewSettings: ShowDataPreviewSettings) {
    if (!ensureKusion(true)) {
        return;
    }
    var resource : vscode.Uri | undefined = util.activeTextEditorDocument()?.uri;
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
        { enableFindWidget: true, enableScripts: true}
    );
    var extensionContext = vscode.extensions.getExtension("KusionStack.kusion");
    if (extensionContext?.extensionUri) {
        var iconPath = {
            dark: vscode.Uri.joinPath(extensionContext.extensionUri, 'images', 'preview-dark.svg'),
            light: vscode.Uri.joinPath(extensionContext.extensionUri, 'images', 'preview-light.svg'),
        };
        webview.iconPath = iconPath;
    }
    compileStackData(stackUri).then(async (data) => {
        const darkHighlighter = await shiki.getHighlighter({
            theme: 'min-dark'
        });
        const lightHighlighter = await shiki.getHighlighter({
            theme: 'min-light'
        });
        const darkHtml = renderInShikiTheme(data, darkHighlighter);
        const lightHtml = renderInShikiTheme(data, lightHighlighter);

        webview.webview.html = vscode.window.activeColorTheme.kind in [1, 4] ? lightHtml : darkHtml;

        vscode.window.onDidChangeActiveColorTheme( (theme) => {
            webview.webview.html = theme.kind in [1, 4] ? lightHtml : darkHtml;
        });
    });

    function renderInShikiTheme(data: string, highlighter: shiki.Highlighter) {
        const codeBlock = highlighter.codeToHtml(`${data}`, { lang: 'yaml' });
        return `<!DOCTYPE html><html lang="en"><body>${codeBlock}</body></html>`;
    }
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

async function compileStackData(stackUri: vscode.Uri): Promise<string> {
    const command = `kcl -Y ${util.settingsPath('')} ${util.kclYamlPath('')}`;
    return new Promise((resolve)=> {
        child_process.exec(command, { cwd: stackUri.path }, (err, stdout, stderr)=> {
            if (err || stderr){
                resolve(`Stack Compile Failed, Stderr:\n${stderr}`);
            }
            resolve(stdout);
        });
    });
}
