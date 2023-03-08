import * as vscode from 'vscode';
import * as minikube from './minikube';
import * as stack from '../stack';

export const KUSION_QUICK_START = process.env.KUSION_QUICK_START === 'true';

export function setup() {
    if (KUSION_QUICK_START) {
        const output = vscode.window.createOutputChannel("kusion-minikube");
		minikube.waitMinikubeStart(output);
	}
}

export function canApplyOrDestroy(): boolean {
    if (KUSION_QUICK_START) {
        return minikube.checkMinikubeRunning();
    } else {
        return true;
    }
}

export function checkAndNotifySvc(stackObj: stack.Stack) {
    if (KUSION_QUICK_START) {
        minikube.notifySvc(stackObj);
    }
}
