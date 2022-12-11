import * as vscode from 'vscode';
import * as child_process from 'child_process';

var minikubeRunning = false;
var minikubeStarting = false;

export function checkMinikubeRunning():boolean {
    return minikubeRunning;
}

export function waitMinikubeStart(output: vscode.OutputChannel): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Starting Minikube",
        cancellable: false
    }, (progress) => {
        output.appendLine("checking minikube status...");
        progress.report({ message: "It may take minitues..." });

        // keep checking minikube status, until minikube starts ready
        const p = new Promise<void>(async resolve => {
            let refreshIntervalId = setInterval(()=> {
                const afterReady = ()=> {
                    // stop looping after minikube start ready
                    clearInterval(refreshIntervalId);
                    resolve();
                    output.appendLine("minikube started!");
                };
                const afterStarting = () => {
                    output.appendLine("minikube starting...");
                };
                checkMinikueReady(afterReady, afterStarting);
            }, 3000);
        });
        return p;
    });
}

function checkMinikueReady(afterReady: ()=>void, afterStarting: () => void):void {
    if (!minikubeStarting) {
        minikubeStarting = true;
        afterStarting();
    }
    child_process.exec("minikube status -o json", (error, stdout, stderr) => {
        if (stdout !== "") {
            console.log(`minikube status stdout: ${stdout}`);
            function isMyType(o: any): o is MinikubeStatus {
                return "Name" in o && "Host" in o && "Kubelet" in o && "APIServer" in o && "Kubeconfig"in o && "Worker" in o;
            }
            try {
                const status = JSON.parse(stdout);
                if (isMyType(status)) {
                    const ready = status!==undefined && status.Host === status.Kubelet &&  status.Kubelet === status.APIServer && status.APIServer === "Running" && status.Kubeconfig === "Configured";
                    if (ready && !minikubeRunning) {
                        minikubeRunning = true;
                        afterReady();
                    }
                }
                return;
            } catch(e) {
                // before minikube started, the `minikube status -o json` command may return invalid json with warning message, no need to handle json parse error
                return;
            }
        }
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
    });
}

type MinikubeStatus = {
    Name: string
    Host: string
    Kubelet: string
    APIServer: string
    Kubeconfig: string
    Worker: boolean
};
