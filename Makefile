compile:
	npm install .
	npm run compile
publish:
	@compile
	vsce package --baseImagesUrl https://github.com/amyXia1994/vscode-kusion.git
	vsce publish --baseImagesUrl https://github.com/amyXia1994/vscode-kusion.git