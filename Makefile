compile:
	npm install .
	npm run compile

package:
	make compile
	vsce package --baseImagesUrl https://github.com/KusionStack/vscode-kusion.git

publish:
	make package
	vsce publish --baseImagesUrl https://github.com/KusionStack/vscode-kusion.git

pre-publish:
	make compile
	vsce package --pre-release --baseImagesUrl https://github.com/KusionStack/vscode-kusion.git
	vsce publish --pre-release --baseImagesUrl https://github.com/KusionStack/vscode-kusion.git