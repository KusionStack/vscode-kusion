import * as vscode from 'vscode';
import * as uri from 'vscode-uri';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as util from './util';

const viewType = 'kusion.dataPreview';

export async function showDataPreview(dataPreviewSettings: ShowDataPreviewSettings): Promise<void> {
    var resource : vscode.Uri | undefined = vscode.window.activeTextEditor?.document.uri;
    if (resource === undefined || !util.inKusionStack(resource)) {
        vscode.window.showWarningMessage(`Not in a Kusion Stack: ${resource?resource.path:"No Active Editor Found"}`);
        return;
    }

    var locked = !! dataPreviewSettings.locked;
    const resourceColumn = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One;
    var previewColumn = dataPreviewSettings.sideBySide ? vscode.ViewColumn.Beside : resourceColumn;
	const webview = vscode.window.createWebviewPanel(
        viewType, 
        await getViewTitle(resource, locked), 
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
    setCompiledData(resource, (data: string)=> {
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

async function getViewTitle(resource: vscode.Uri, locked: boolean): Promise<string> {
    const resourceLabel = await util.getStackFullName(uri.Utils.dirname(resource));
    return locked
        ? `[Preview] ${resourceLabel}`
        : `Preview ${resourceLabel}`;
}

interface ShowDataPreviewSettings {
	readonly sideBySide?: boolean;
	readonly locked?: boolean;
}

function setCompiledData(resource: vscode.Uri, setToWebview: (data: string)=> void): void {
    const workdir = uri.Utils.dirname(resource);
    child_process.exec(`kusion compile -w ${workdir.fsPath}`, (err, stdout, stderr)=> {
        if (err || stderr){
            // todo: when kusion compile failed, the message should be in stderr, not stdout.
            setToWebview(`Stack Compile Failed, Stderr:\n${stderr}`);
            return;
        }
        const goldenPath = vscode.Uri.joinPath(workdir, "ci-test", "stdout.golden.yaml").fsPath;
        try {
            setToWebview(fs.readFileSync(goldenPath, "utf-8"));
            return;
        } catch (error) {
            setToWebview(`Stack Compile Failed, Golden File Not Found: ${goldenPath}`);
            return;
        }
    });
}
