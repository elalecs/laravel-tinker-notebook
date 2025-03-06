import * as vscode from 'vscode';
import { TinkerDocumentProvider } from './editor/documentProvider';
import { TinkerExecutionService } from './execution/tinkerService';
import { DocumentParser } from './editor/documentParser';
import { ResultRenderer } from './editor/resultRenderer';

export function activate(context: vscode.ExtensionContext) {
    console.log('Laravel Tinker Notebook extension is now active');

    // Initialize core services
    const tinkerService = new TinkerExecutionService();
    const documentParser = new DocumentParser();
    const resultRenderer = new ResultRenderer(context);
    
    // Register document provider for .tinker.md files
    const tinkerDocProvider = new TinkerDocumentProvider(documentParser, resultRenderer);
    
    // Register commands
    const runCommand = vscode.commands.registerCommand('laravel-tinker-notebook.runBlock', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        try {
            // Get the current document
            const document = editor.document;
            
            // Check if we're in a supported file type
            if (document.languageId !== 'markdown' && !document.fileName.endsWith('.tinker')) {
                vscode.window.showInformationMessage('This file type is not supported for Tinker execution');
                return;
            }
            
            // Get current position
            const position = editor.selection.active;
            
            // Find the code block at the current position
            const codeBlock = documentParser.findCodeBlockAtPosition(document, position);
            if (!codeBlock) {
                vscode.window.showInformationMessage('No executable code block found at cursor position');
                return;
            }
            
            // Show execution indicator
            vscode.window.setStatusBarMessage('Running code in Tinker...', 2000);
            
            // Execute the code using Tinker
            const result = await tinkerService.executeCode(codeBlock.code, {
                newSession: codeBlock.directives.includes('@tinker-new-session'),
                showRaw: codeBlock.directives.includes('@tinker-show-raw'),
                hideResult: codeBlock.directives.includes('@tinker-hide-result')
            });
            
            // Display the results
            if (!codeBlock.directives.includes('@tinker-hide-result')) {
                await resultRenderer.renderResult(editor, codeBlock, result);
            }
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error executing code: ${error}`);
        }
    });
    
    // Register the "Run on Tinker" code lens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        [{ language: 'markdown' }, { pattern: '**/*.tinker' }],
        {
            provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
                const codeBlocks = documentParser.findAllCodeBlocks(document);
                return codeBlocks.map(block => {
                    return new vscode.CodeLens(block.range, {
                        title: '▶ Run on Tinker',
                        command: 'laravel-tinker-notebook.runBlock',
                        arguments: []
                    });
                });
            }
        }
    );
    
    context.subscriptions.push(runCommand, codeLensProvider);
}

export function deactivate() {
    // Clean up resources when extension is deactivated
}
