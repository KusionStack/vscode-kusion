import * as vscode from 'vscode';
import * as util from './util';

const kusionChannel = 'kusion';
const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(kusionChannel);

export function getKusionChannel() {
    return outputChannel;
}

export function show() {
    outputChannel.show();
}

export function appendLine(line: string, stripAnsi: boolean) {
    line = stripAnsi ? util.stripAnsi(line) : line;
    outputChannel.appendLine(line);
}