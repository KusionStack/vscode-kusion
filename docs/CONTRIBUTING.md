# Contributing

All kinds of contributions for improving the Kusion experience on VS Code are welcomed.

This guide will explain the process to set up your development environment to work on the VS Code Kusion extension.

## Developing

### Set Up the Environment

1. Install [node](https://nodejs.org/en/).

2. Install [VS Code](https://code.visualstudio.com/download) 1.50+

2. Clone the repository and run npm install:

```
git clone https://github.com/amyXia1994/vscode-kusion.git
cd vscode-kusion
npm install
code .
```

## Run

To run the extension, open the project with VS Code and open the Run view (Command+Shift+D), select Run Extension, and press F5. This will compile and run the extension in a new Extension Development Host window, in which you can create a Konfig project and add some .k files to play with.

## Compile and Publish

* You can compile the project by executing the following command:

    ```shell
    npm run compile
    ```
* To publish the extension to the VS Code extension market, you need to first build an extension package and then publish it:
    ```shell
    vsce package --baseImagesUrl https://github.com/amyXia1994/vscode-kusion.git
    vsce publish --baseImagesUrl https://github.com/amyXia1994/vscode-kusion.git
    ```


## Reference

- [VS Code Extension Development](https://code.visualstudio.com/api/extension-guides/overview)
- [VS Code Language Extension Development](https://code.visualstudio.com/api/language-extensions/overview)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
