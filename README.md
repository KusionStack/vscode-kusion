# Kusion Extension for Visual Studio Code

The [VS Code Kusion extension](https://marketplace.visualstudio.com/items?itemName=KusionStack.kusion) provides convenient operations to deliver KCL configurations to Clouds.

## Set Up Your Environment

Welcome to KusionStack's world for your cloud delivery! We hope this extension enhances your experience with Kusion.

**Tip: If you are using the Cloud IDE bundled with Kusion, the first two steps can be skipped!**

-   **Step 1.** Install Kusion on your system.
-   **Step 2.** Install the Kusion extension for Visual Studio Code. This extension requires the VS Code 1.68+
-   **Step 3.** Begin your Kusion tour starting from [Kusion's quick start](https://kusionstack.io/docs/user_docs/getting-started/cloudide).

## Walk Through the features

This extension now assists Kusion operations to deliver to clouds: Create Project From Archetype, Preview Live Diff and Apply.

As the vscode-kusion extension installed to our VS Code, let's follow the `Getting started with Kusion` walkthrough and deploy out first application to the cloud with Kusion:

We can find Kusion walkthrough on the VS Code Welcome page. (Or we could open the Command Palatte and type `walkthrough`, then type `kusion` to locate Kusion walkthrough.)

![](https://github.com/KusionStack/vscode-kusion/tree/main/images/walkthrough.gif)

1. **Get your Environment Ready**

    We could check if Kusion installed by clicking the `Install Kusion` button in the walkthrough

2. **Open a Konfig Workspace Folder**
    A monorepo [konfig](https://github.com/KusionStack/konfig) is already there for quick start, we could clone the repo and open it with VS Code: 
    ```
    git clone https://github.com/KusionStack/konfig.git
    ```

3. **Create a New Kusion Project**

    We could quickly create a new kusion project from archetype. To do that, click the `Create Kusion Project` button on the walkthrough (or, type `Kusion: Create` in the Command Palatte), and select a project template(For example using the `code-city` template we could deploy an application to visualize software as 3D cities).

    ![](https://github.com/KusionStack/vscode-kusion/tree/main/images/create-project.gif)

4. **Explore Your Project and Configurations**
    Now let's open our kusion project that we previously created and browse the configuration code

5. **Verify the Resource Changes to be made**

    After changing the stack's configuration, we can right-click at the configuraion main file and select `Preview Live Diff and Apply` to verify the resource changes to be made. And 

6. **Apply the Application Changes**
    Then if the live diff is as expected, we apply the changes to the runtime by clicking the 'Apply' button to confirm to apply.

    ![](https://github.com/KusionStack/vscode-kusion/tree/main/images/config-diff-apply.gif)

## Ask for Help and Feedback

If the extension isn't working as you expect, please reach out to us by [filing an issue](https://github.com/KusionStack/vscode-kusion/issues/new/choose). You can also raise an issue by typing `Kusion: Help` in the Command Palatte from within the VS Code.

![](https://github.com/KusionStack/vscode-kusion/tree/main/images/raise-issue.gif)

## Contributing

We are working actively on improving the experience of Kusion on VS Code. All kinds of contributions are welcomed. You can refer to our [contribution guide](docs/CONTRIBUTING.md). It introduces how to build and run the extension locally, and describes the process of sending a contribution.

## License

Apache License Version 2.0
