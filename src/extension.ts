import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface FuncInfo {
	line: number;
	astCount: number;
	funcCallCount: number;
	hasNoinline: boolean;
	hasAnyCalls: boolean;
}

class GoAstCodeLensProvider implements vscode.CodeLensProvider {
	private astCounterPath: string;
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
	readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
	private debounceTimer?: NodeJS.Timeout;

	constructor(context: vscode.ExtensionContext) {
		const platform = process.platform;
		const ext = platform === 'win32' ? '.exe' : '';
		this.astCounterPath = path.join(context.extensionPath, 'astCounter', `astCounter${ext}`);

		this.ensureBinary(context);

		context.subscriptions.push(
			vscode.workspace.onDidChangeTextDocument(e => {
				if (e.document.languageId === 'go') {
					this.scheduleRefresh();
				}
			}),
		);
	}

	private ensureBinary(context: vscode.ExtensionContext) {
		if (!fs.existsSync(this.astCounterPath)) {
			const goSrc = path.join(context.extensionPath, 'astCounter', 'astCounter.go');
			try {
				execSync(`go build -o "${this.astCounterPath}" "${goSrc}"`, { cwd: path.dirname(goSrc) });
			} catch (err) {
				vscode.window.showErrorMessage('Failed to build AST counter. Make sure Go is installed.');
			}
		}
	}

	private scheduleRefresh() {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		const delay = vscode.workspace.getConfiguration('goAstCodeLens').get<number>('debounceDelay', 1000);
		this.debounceTimer = setTimeout(() => {
			this._onDidChangeCodeLenses.fire();
		}, delay);
	}

	provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const codeLenses: vscode.CodeLens[] = [];
		const funcInfos = this.getAstCounts(document);
		const showOnlyInlineable = vscode.workspace.getConfiguration('goAstCodeLens').get<boolean>('showOnlyInlineable', true);
		const maxFuncCalls = vscode.workspace.getConfiguration('goAstCodeLens').get<number>('maxFuncCalls', 1);
		const showNoinline = vscode.workspace.getConfiguration('goAstCodeLens').get<boolean>('showNoinline', false);

		for (const fi of funcInfos) {
			if (showOnlyInlineable && (fi.astCount >= 80 || fi.funcCallCount > maxFuncCalls)) {
				continue;
			}
			if (!showNoinline && fi.hasNoinline) {
				continue;
			}

			const range = new vscode.Range(fi.line - 1, 0, fi.line - 1, 0);
			const nodesStr = `node${fi.astCount > 1 ? 's' : ''}`
			const uncertainHint = 'Actual nodes count may be higher due to function calls that could be inlined'
			const tooltip = `There ${fi.astCount > 1 ? 'are' : 'is'} ${fi.astCount} AST ${nodesStr} in this function${fi.hasAnyCalls ? `\n${uncertainHint}` : ''}`
			const lens = new vscode.CodeLens(range, {
				title: `${fi.hasAnyCalls ? '~' : ''}${fi.astCount} ${nodesStr}`,
				command: '',
				tooltip: tooltip,
			});
			codeLenses.push(lens);
		}

		return codeLenses;
	}

	private getAstCounts(document: vscode.TextDocument): FuncInfo[] {
		try {
			const content = document.getText();
			const output = execSync(
				`"${this.astCounterPath}"`,
				{ encoding: 'utf-8', input: content },
			);
			return JSON.parse(output);
		} catch {
			return [];
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new GoAstCodeLensProvider(context);
	const platform = process.platform;
	const ext = platform === 'win32' ? '.exe' : '';
	const binaryPath = path.join(context.extensionPath, 'astCounter', `astCounter${ext}`);

	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider({
			language: 'go',
			scheme: 'file'
		}, provider),
		vscode.commands.registerCommand('go-ast-codelens.deleteCounter', () => {
			if (fs.existsSync(binaryPath)) {
				fs.unlinkSync(binaryPath);
				vscode.window.showInformationMessage('AST Counter binary deleted.');
			} else {
				vscode.window.showInformationMessage('AST Counter binary not found.');
			}
		}),
		vscode.commands.registerCommand('go-ast-codelens.rebuildCounter', () => {
			if (fs.existsSync(binaryPath)) {
				fs.unlinkSync(binaryPath);
			}
			provider['ensureBinary'](context);
			vscode.window.showInformationMessage('AST Counter binary rebuilt.');
		})
	);
}

export function deactivate() { }
