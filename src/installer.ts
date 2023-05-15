import { shell, Platform } from './shell';
import * as vscode from 'vscode';

export const defaultKusionPath = shell.combinePath(shell.combinePath(shell.home(), '.kusion'), 'kusion');

export function ensureKusion(checkKusion: boolean = true, checkKcl: boolean = false): boolean {
    const hasKusion = kusionInstalled();
    const hasKcl = kclInstalled();

    if ((checkKusion && !hasKusion) || (checkKcl && !hasKcl)) {
        const installKusion = 'Install Kusion & Kcl';
        vscode.window.showErrorMessage(`Kusion or Kcl is not installed.`, installKusion).then((value) => {
            if (value === installKusion) {
                installDependencies();
            }
        });
        return false;
    }
    return true;
}

export function installDependencies() {
    installKusion();
}

function kclInstalled(): boolean {
    return shell.which("kcl") ? true : false;
}

function kusionInstalled(): boolean {
    return shell.which("kusion") ? true : false;
}

class InstallTool {
    readonly name: string;
    readonly commands: string[];
    readonly platforms: Platform[];
    constructor(name: string, commands: string[], platforms: Platform[]) {
        this.name = name;
        this.commands = commands;
        this.platforms = platforms;
    }
}

const installTools = [
    new InstallTool(
        'scoop',
        ['scoop bucket add KusionStack https://github.com/KusionStack/scoop-bucket.git', 'scoop install KusionStack/kusion'],
        [Platform.Windows]
    ),
    new InstallTool(
        'powershell',
        ['powershell -Command "iwr -useb https://kusionstack.io/scripts/install.ps1 | iex"'],
        [Platform.Windows]
    ),
    new InstallTool(
        'brew',
        ['brew install KusionStack/tap/kusion'],
        [Platform.Linux, Platform.MacOS]
    ),
    new InstallTool(
        'curl',
        ['curl https://kusionstack.io/scripts/install.sh | sh'],
        [Platform.Linux, Platform.MacOS]
    )
];

function getAvailableInstallTools(): InstallTool | undefined {
    const platform = shell.platform();
    for (let index = 0; index < installTools.length; index++) {
        const installTool = installTools[index];
        if (platform in installTool.platforms && shell.which(installTool.name)) {
            return installTool;
        }
    }
    return undefined;
}

function installKusion() {
    const tool = getAvailableInstallTools();
    const preRequirets = shell.isWindows() ? 'scoop or powershell': 'brew or curl';
    if (!tool) {
        vscode.window.showErrorMessage(`To install kusion, please have ${preRequirets} installed first. More about Kusion installation: https://kusionstack.io/docs/user_docs/getting-started/install`);
        return;
    }
    const terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(`#${tool.name} detected, installing kusion with ${tool.name}...`);
    for (let i=0; i<tool.commands.length; i++) {
        terminal.sendText(tool.commands[i]);
    }
    return;
}