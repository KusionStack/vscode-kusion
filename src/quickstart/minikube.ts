import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';

var minikubeRunning = false;
var minikubeStarting = false;
const quickstartAppops = "appops";
const quickstartProject = "guestbook";
const quickstartSvc = "frontend";
const quickstartSvcPort = "80";
const quickstartFrontendPod = quickstartSvc;
const quickstartRedisLeader = "redis-leader";
const quickstartRedisFollower = "redis-follower";

type MinikubeStatus = {
    Name: string
    Host: string
    Kubelet: string
    APIServer: string
    Kubeconfig: string
    Worker: boolean
};

export function checkMinikubeRunning():boolean {
    return minikubeRunning;
}

export function waitMinikubeStart(output: vscode.OutputChannel): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Starting Minikube",
        cancellable: false
    }, (progress) => {
        output.show();
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
                const startMinikube = () => {
                    output.appendLine("minikube starting...");
                    child_process.exec("minikube start");
                };
                checkMinikueReady(startMinikube, afterReady);
            }, 3000);
        });
        return p;
    });
}

function checkMinikueReady(startMinikube: ()=> void, afterReady: ()=>void):void {
    child_process.exec("minikube status -o json", (error, stdout, stderr) => {
        if (stdout !== "") {
            console.log(`minikube status stdout: ${stdout}`);
            function isMyType(o: any): o is MinikubeStatus {
                return "Name" in o && "Host" in o && "Kubelet" in o && "APIServer" in o && "Kubeconfig"in o && "Worker" in o;
            }
            try {
                const status = JSON.parse(stdout);
                if (isMyType(status)) {
                    const ready = status !== undefined && status.Host === status.Kubelet &&  status.Kubelet === status.APIServer && status.APIServer === "Running" && status.Kubeconfig === "Configured";
                    if (!ready && !minikubeStarting) {
                        minikubeStarting = true;
                        startMinikube();
                    }
                    if (ready && !minikubeRunning) {
                        minikubeRunning = true;
                        afterReady();
                    }
                }
                return;
            } catch(e) {
                // before minikube started, the `minikube status -o json` command may return invalid json with warning message, no need to handle json parse error
                if(!minikubeStarting) {
                    minikubeStarting = true;
                    startMinikube();
                }
                return;
            }
        }
        if(!minikubeStarting) {
            minikubeStarting = true;
            startMinikube();
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

export function notifySvc(stackPath: string) {
    const workspaceRoot = vscode.workspace.workspaceFolders![0]; // safe, see extension.ts activate()
    const stackRelative = path.relative(workspaceRoot.uri.fsPath, stackPath);
    const projectPath = path.join(quickstartAppops, quickstartProject);
    if (!stackRelative.startsWith(projectPath)) {
        // only check and notify svc detection in guestbook project
        return;
    }
    function afterSvcPodReady(): void {
        let defaultPort = 4000;

        function portForward(): void {
            const port = defaultPort.toString();
            const forwardCmd = `kubectl port-forward -n ${quickstartProject} svc/${quickstartSvc} ${port}:${quickstartSvcPort}`;
            child_process.exec(forwardCmd, (error) => {
                if (error) {
                    if (error.code === 1 && error.message.includes("bind: address already in use unable to create listener")) {
                        console.log(`port ${port} already in use, changing to another`);
                        defaultPort += 1;
                        portForward();
                        return;
                    }
                    if (error?.signal === "SIGTERM") {
                        vscode.window.showWarningMessage(`port-forward ${port}:${quickstartSvcPort} terminated.`);
                        return;
                    }
                }
            });
        }

        vscode.window.showInformationMessage(`Detect Service with type: ClusterIP. Forward Port ${quickstartSvcPort}?`, 'Forward Port').then((opt)=>{
            if (opt !== 'Forward Port') {
                return;
            }
            portForward();
        });
    }
    waitForServiceReady(afterSvcPodReady);
}


function waitForServiceReady(afterSvcPodReady: ()=>void): void {
    var svcReady = false;
    var podReady = false;
    let refreshIntervalId = setInterval(()=>{
        child_process.exec(`kubectl get svc -n ${quickstartProject}`, (error, stdout, stderr) => {
            if (error) {
                console.log(`failed to get svc: ${error}`);
                clearInterval(refreshIntervalId);
                return;
            }
            
            if (stdout.startsWith("NAME") && stdout.includes(quickstartSvc) && !svcReady) {
                console.log(`${stdout}`);
                console.log("svc created");
                clearInterval(refreshIntervalId);
                svcReady = true;
                return;
            }

            if (!stdout || stderr.startsWith("No resources found in")) {
                console.log(stderr);
                return;
            }
        });


    }, 5000);
    let refreshPodIntervalId = setInterval(()=>{
        child_process.exec(`kubectl get pod -n ${quickstartProject}`, (error, stdout, stderr) => {
            if (error) {
                console.log(`failed to get pod: ${error}`);
                clearInterval(refreshPodIntervalId);
                return;
            }
            
            if (svcReady && stdout.startsWith("NAME")) {
                console.log(`${stdout}`);
                var pods = stdout.split('\n');
                if (pods.length >= 1) {
                    pods.shift();
                    var podRunning = 0;
                    pods.forEach((pod: string)=> {
                        if(pod.startsWith(quickstartFrontendPod) && pod.includes("Running")) {
                            podRunning += 1;
                        }
                        if (pod.startsWith(quickstartRedisLeader) && pod.includes("Running")) {
                            podRunning += 1;
                        }

                        if (pod.startsWith(quickstartRedisFollower) && pod.includes("Running")) {
                            podRunning += 1;
                        }
                    });
                    if (podRunning === 3 && !podReady) {
                        podReady = true;
                        clearInterval(refreshPodIntervalId);
                        console.log("pod running");
                        afterSvcPodReady();
                        return;
                    }
                }
            }

            if (!stdout || stderr.startsWith("No resources found in")) {
                console.log(stderr);
                return;
            }
        });
    }, 5000);
}
