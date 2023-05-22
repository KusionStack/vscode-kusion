// This module is mainly based on the file src/shell.ts in [vscode-kubernetes-tools](https://github.com/vscode-kubernetes-tools/vscode-kubernetes-tools) project.
// Thanks for your great work.
'use strict';

import * as vscode from 'vscode';
import * as shelljs from 'shelljs';

export enum Platform {
    Windows,
    MacOS,
    Linux,
    Unsupported,  // shouldn't happen!
}

export interface ExecCallback extends shelljs.ExecCallback { }

export interface Shell {
    isWindows(): boolean;
    isUnix(): boolean;
    platform(): Platform;
    home(): string;
    combinePath(basePath: string, relativePath: string): string;
    fileUri(filePath: string): vscode.Uri;
    which(bin: string): string | null;
}

export const shell: Shell = {
    isWindows: isWindows,
    isUnix: isUnix,
    platform: platform,
    home: home,
    combinePath: combinePath,
    fileUri: fileUri,
    which: which,
};

const WINDOWS: string = 'win32';

export interface ShellResult {
    readonly code: number;
    readonly stdout: string;
    readonly stderr: string;
}

export type ShellHandler = (code: number, stdout: string, stderr: string) => void;

function isWindows(): boolean {
    return process.platform === WINDOWS;
}

function isUnix(): boolean {
    return !isWindows();
}

function platform(): Platform {
    switch (process.platform) {
        case 'win32': return Platform.Windows;
        case 'darwin': return Platform.MacOS;
        case 'linux': return Platform.Linux;
        default: return Platform.Unsupported;
    }
}

function concatIfSafe(homeDrive: string | undefined, homePath: string | undefined): string | undefined {
    if (homeDrive && homePath) {
        const safe = !homePath.toLowerCase().startsWith('\\windows\\system32');
        if (safe) {
            return homeDrive.concat(homePath);
        }
    }

    return undefined;
}

function home(): string {
    return process.env['HOME'] ||
        concatIfSafe(process.env['HOMEDRIVE'], process.env['HOMEPATH']) ||
        process.env['USERPROFILE'] ||
        '';
}

function combinePath(basePath: string, relativePath: string) {
    let separator = '/';
    if (isWindows()) {
        relativePath = relativePath.replace(/\//g, '\\');
        separator = '\\';
    }
    return basePath + separator + relativePath;
}

function isWindowsFilePath(filePath: string) {
    return filePath[1] === ':' && filePath[2] === '\\';
}

function fileUri(filePath: string): vscode.Uri {
    if (isWindowsFilePath(filePath)) {
        return vscode.Uri.parse('file:///' + filePath.replace(/\\/g, '/'));
    }
    return vscode.Uri.parse('file://' + filePath);
}

const SAFE_CHARS_REGEX = /^[-,._+:@%/\w]*$/;

export function isSafe(s: string): boolean {
    return SAFE_CHARS_REGEX.test(s);
}

function which(bin: string): string | null {
    return shelljs.which(bin);
}
