import * as vscode from 'vscode';
import * as uri from 'vscode-uri';
import * as child_process from 'child_process';
import * as util from './util';

const viewType = 'kusion.dataPreview';

export async function showDataPreview(dataPreviewSettings: ShowDataPreviewSettings): Promise<void> {
    var resource : vscode.Uri | undefined = util.activeTextEditorDoc()?.uri;
    if (resource === undefined || !util.inKusionStackCheck(resource)) {
        return;
    }
    var locked = !! dataPreviewSettings.locked;
    const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    var previewColumn = dataPreviewSettings.sideBySide ? vscode.ViewColumn.Beside : resourceColumn;
    const root = await util.kclWorkspaceRoot(resource);
    const stackUri = uri.Utils.dirname(resource);
    const stackFullName = await util.getStackFullName(stackUri, root);
	const webview = vscode.window.createWebviewPanel(
        viewType, 
        await getViewTitle(stackFullName, locked), 
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
        const html = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/dark.min.css">
        </head>
<body>
    <pre>
        <code class="language-yaml">
${data}</code>
        </pre>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <script>
        hljs.highlightAll();
    </script>
</body>
</html>`;
    webview.webview.html = html;
    });
}

async function getViewTitle(stackLabel: string, locked: boolean,): Promise<string> {
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
