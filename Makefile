compile:
	npm install .
	npm run compile
publish:
	make compile
	vsce package --baseImagesUrl https://github.com/KusionStack/vscode-kusion.git
	vsce publish --baseImagesUrl https://github.com/KusionStack/vscode-kusion.git