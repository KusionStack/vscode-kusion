// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    const vscode = acquireVsCodeApi();

    // const oldState = /** @type {{ count: number} | undefined} */ (vscode.getState());

    const createButton = /** @type {HTMLElement} */ (document.getElementById('create'));

    function getValues() {
        var templateParams = { 'ProjectConfig': {} };
        const projectNameId = 'ProjectName';

        elements = document.getElementsByTagName('input');
        for (var i = 0; i < elements.length; i++) {
            const elem = elements[i];
            const value = elem.type && elem.type === 'number' ? elem.valueAsNumber : elem.value;
            if (elem.id === projectNameId) {
                templateParams[projectNameId] = value;
            } else {
                templateParams['ProjectConfig'][elem.id] = value;
            }
        }
        return JSON.stringify(templateParams);
    }


    function submitForm() {
        vscode.postMessage({
            command: 'Create Project',
            text: getValues(),
        });
    }

    createButton.addEventListener('click', submitForm);
}());