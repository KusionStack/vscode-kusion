import * as vscode from 'vscode';
import * as templateView from './template-view';

/**
 * A multi-step input using vscode.window.createQuickPick() and vscode.window.createInputBox().
 * 
 * This first part uses the helper class `MultiStepInput` that wraps the API for the multi-step case.
 */
export async function multiStepInput(context: vscode.ExtensionContext) {
	class TemplateButton implements vscode.QuickInputButton {
		constructor(public iconPath: vscode.ThemeIcon, public tooltip: string) { }
	}

	const settingsButton = new TemplateButton(new vscode.ThemeIcon("gear"), 'Set Template Locations');
	const fromTemplateLabel = 'Create From Template';
    const fromSchemaLabel = 'Create From Schema';
	const archetypeForms: vscode.QuickPickItem[] = [fromTemplateLabel]
		.map(label => ({ label }));
	const templates = templateView.getTemplates();

	interface State {
		title: string;
		step: number;
		totalSteps: number;
		archetypeForm: vscode.QuickPickItem;
		schemaName: vscode.QuickPickItem;
		template: vscode.QuickPickItem;
	}

	async function collectInputs() {
		const state = {} as Partial<State>;
		await MultiStepInput.run(input => pickCreateFromType(input, state));
		return state as State;
	}

	const title = 'Create Kusion Project From Archetype';

	async function pickCreateFromType(input: MultiStepInput, state: Partial<State>) {
		const pick = await input.showQuickPick({
			title,
			step: 1,
			totalSteps: 2,
			placeholder: 'Pick the Archetype Form',
			items: archetypeForms,
			activeItem: undefined,
			shouldResume: shouldResume
		});
		state.archetypeForm = pick;
		switch (pick.label) {
			case fromTemplateLabel:
				return (input: MultiStepInput) => pickTemplate(input, state);
		}
	}

	async function pickTemplate(input: MultiStepInput, state: Partial<State>) {
		const templatePicks = await getAvailableTemplates(undefined /* TODO: token */);
		// TODO: Remember currently active item when navigating back.
		if (templatePicks.length === 0) {
			return;
		}
		const pick = await input.showQuickPick({
			title,
			step: 2,
			totalSteps: 2,
			items: templatePicks,
			activeItem: state.template,
			placeholder: 'Pick a template',
			buttons: [settingsButton],
			shouldResume: shouldResume
		});
		if (pick instanceof TemplateButton) {
			templateView.goToTemplateSetting();
		} else {
			state.template = pick;
		}
	}
	
	function shouldResume() {
		// Could show a notification with the option to resume.
		return new Promise<boolean>((resolve, reject) => {
			// noop
		});
	}

	async function getAvailableTemplates(token?: vscode.CancellationToken): Promise<vscode.QuickPickItem[]> {
		return new Promise<vscode.QuickPickItem[]>((resolve, reject) => {
			templates.then(allTemplates => {
				const result: vscode.QuickPickItem[] = [];
				allTemplates.forEach((t, templateId)=>{
					result.push(
						{
							label: t.name,
							description: t.location,
							detail: t.description
						}
					);
				});
				if (result.length === 0) {
					const setLocation = 'Set Template Location';
					vscode.window.showWarningMessage(`No template found. Please check template location setting`, ...[setLocation]).then((pick) => {
						if (pick === setLocation) {
							templateView.goToTemplateSetting();
						}
					});
				}
				resolve(result);
			});
		});
	}

	const state = await collectInputs();
	switch (state.archetypeForm.label) {
		case fromTemplateLabel:
			const templateInfo = (await templates).get(templateView.templateUniqueId(state.template.label, state.template.description));
			if (!templateInfo) {
				return;
			}
			templateView.CreateFromTemplatePanel.createOrShow(context.extensionUri, templateInfo);
			return;
	}
}

class InputFlowAction {
	static back = new InputFlowAction();
	static cancel = new InputFlowAction();
	static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends vscode.QuickPickItem> {
	title: string;
	step: number;
	totalSteps: number;
	items: T[];
	activeItem?: T;
	placeholder: string;
	buttons?: vscode.QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
	title: string;
	step: number;
	totalSteps: number;
	value: string;
	prompt: string;
	validate: (value: string) => Promise<string | undefined>;
	buttons?: vscode.QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {

	static async run<T>(start: InputStep) {
		const input = new MultiStepInput();
		return input.stepThrough(start);
	}

	private current?: vscode.QuickInput;
	private steps: InputStep[] = [];

	private async stepThrough<T>(start: InputStep) {
		let step: InputStep | void = start;
		while (step) {
			this.steps.push(step);
			if (this.current) {
				this.current.enabled = false;
				this.current.busy = true;
			}
			try {
				step = await step(this);
			} catch (err) {
				if (err === InputFlowAction.back) {
					this.steps.pop();
					step = this.steps.pop();
				} else if (err === InputFlowAction.resume) {
					step = this.steps.pop();
				} else if (err === InputFlowAction.cancel) {
					step = undefined;
				} else {
					throw err;
				}
			}
		}
		if (this.current) {
			this.current.dispose();
		}
	}

	async showQuickPick<T extends vscode.QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, placeholder, buttons, shouldResume }: P) {
		const disposables: vscode.Disposable[] = [];
		try {
			return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = vscode.window.createQuickPick<T>();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.placeholder = placeholder;
				input.items = items;
				if (activeItem) {
					input.activeItems = [activeItem];
				}
				input.buttons = [
					...(this.steps.length > 1 ? [vscode.QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === vscode.QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidChangeSelection(items => resolve(items[0])),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}

	async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, buttons, shouldResume }: P) {
		const disposables: vscode.Disposable[] = [];
		try {
			return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = vscode.window.createInputBox();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.value = value || '';
				input.prompt = prompt;
				input.buttons = [
					...(this.steps.length > 1 ? [vscode.QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				let validating = validate('');
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === vscode.QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidAccept(async () => {
						const value = input.value;
						input.enabled = false;
						input.busy = true;
						if (!(await validate(value))) {
							resolve(value);
						}
						input.enabled = true;
						input.busy = false;
					}),
					input.onDidChangeValue(async text => {
						const current = validate(text);
						validating = current;
						const validationMessage = await current;
						if (current === validating) {
							input.validationMessage = validationMessage;
						}
					}),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}
}
