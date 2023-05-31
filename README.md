# Kusion Extension for Visual Studio Code

The [VS Code Kusion extension](https://marketplace.visualstudio.com/items?itemName=KusionStack.kusion) provides convenient operations to deliver KCL configurations to Clouds.

## Set Up Your Environment

Welcome to KusionStack's world for your cloud delivery! We hope this extension enhances your experience with Kusion.

**Tip: If you are using the Cloud IDE bundled with Kusion, the first two steps can be skipped!**

-   **Step 1.** Install Kusion on your system.
-   **Step 2.** Install the Kusion extension for Visual Studio Code. This extension requires the VS Code 1.68+

## Walk Through the features

This extension now assists Kusion operations to deliver to clouds: Create Project From Archetype, Runtime Live Diff view and Online Status view.

As the vscode-kusion extension installed to our VS Code, let's follow the `Getting started with Kusion` walkthrough and deploy out first application to the cloud with Kusion:

We can find Kusion walkthrough on the VS Code Welcome page. (Or we could open the Command Palatte and type `walkthrough`, then type `kusion` to locate Kusion walkthrough.)

![](https://github.com/KusionStack/vscode-kusion/blob/main/images/walkthrough.gif?raw=true)

1. **Get your Environment Ready**

    We could check if Kusion installed by clicking the `Install Kusion` button in the walkthrough

2. **Abstract: Define Your Models**
    For quick start, A monorepo [konfig](https://github.com/KusionStack/konfig) is already there, which contains classical atractions of application configuration and jobs, etc. We could directly clone the repo and open it with VS Code: 
    
    ```
    git clone https://github.com/KusionStack/konfig.git
    ```

3. **Config: New Kusion Project**

    We could quickly create a new kusion project from archetype. To do that, click the `Create Kusion Project` button on the walkthrough (or, type `Kusion: Create` in the Command Palatte), and select a project template(For example using the `code-city` template we could deploy an application to visualize software as 3D cities).

    ![](https://github.com/KusionStack/vscode-kusion/blob/main/images/create-project.gif?raw=true)

4. **Preview**
    Now let's preview the yaml representation of our Config previously created by clicking the data preview button or type and select `Kusion: Open Data Preview To the Side`.

    ![](https://github.com/KusionStack/vscode-kusion/blob/main/images/data-preview.gif?raw=true)

5. **Runtime Diff and Go online**

    To view the runtime diff of the current stack, we could right-click at the configuraion main file and select `Diff with Runtime and Apply` to open the runtime diff page.

    Then we could confirm the diff and make the changes go online.

    ![](https://github.com/KusionStack/vscode-kusion/blob/main/images/config-diff-apply.gif?raw=true)

## Ask for Help and Feedback

If the extension isn't working as you expect, please reach out to us by [filing an issue](https://github.com/KusionStack/vscode-kusion/issues/new/choose). You can also raise an issue by typing `Kusion: Help` in the Command Palatte from within the VS Code.

![](https://github.com/KusionStack/vscode-kusion/blob/main/images/raise-issue.gif?raw=true)

## Contributing

We are working actively on improving the experience of Kusion on VS Code. All kinds of contributions are welcomed. You can refer to our [contribution guide](docs/CONTRIBUTING.md). It introduces how to build and run the extension locally, and describes the process of sending a contribution.

## License

Apache License Version 2.0
