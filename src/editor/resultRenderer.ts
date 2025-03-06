import * as vscode from 'vscode';
import { CodeBlock } from './documentParser';

export interface ExecutionResult {
    output: string;
    error?: string;
    isRaw: boolean;
}

export class ResultRenderer {
    private resultDecorationType: vscode.TextEditorDecorationType;
    
    constructor(context: vscode.ExtensionContext) {
        // Create decoration type for results
        this.resultDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 1em',
                backgroundColor: new vscode.ThemeColor('editor.infoBackground')
            }
        });
    }
    
    public async renderResult(
        editor: vscode.TextEditor, 
        codeBlock: CodeBlock, 
        result: ExecutionResult
    ): Promise<void> {
        const document = editor.document;
        
        // If it's a markdown file, we'll add the result as a new code block
        if (document.languageId === 'markdown') {
            await this.insertResultAsCodeBlock(editor, codeBlock, result);
        } else {
            // For .tinker files, show results using decorations
            this.renderResultAsDecoration(editor, codeBlock, result);
        }
    }
    
    private async insertResultAsCodeBlock(
        editor: vscode.TextEditor,
        codeBlock: CodeBlock,
        result: ExecutionResult
    ): Promise<void> {
        const document = editor.document;
        const endPosition = codeBlock.range.end;
        const endOfLine = document.lineAt(endPosition.line).range.end;
        
        // Format the output
        let resultText: string;
        if (result.error) {
            resultText = `\n\n\`\`\`\n// Error\n${result.error}\n\`\`\`\n`;
        } else {
            resultText = `\n\n\`\`\`\n// Result\n${result.output}\n\`\`\`\n`;
        }
        
        // Insert the result
        await editor.edit(editBuilder => {
            editBuilder.insert(endOfLine, resultText);
        });
    }
    
    private renderResultAsDecoration(
        editor: vscode.TextEditor,
        codeBlock: CodeBlock,
        result: ExecutionResult
    ): void {
        const decorations: vscode.DecorationOptions[] = [];
        
        // Create the decoration
        const endPos = codeBlock.range.end;
        const decoration: vscode.DecorationOptions = {
            range: new vscode.Range(endPos, endPos),
            renderOptions: {
                after: {
                    contentText: result.error 
                        ? `// Error: ${result.error}`
                        : `// Result: ${result.output.substring(0, 100)}${result.output.length > 100 ? '...' : ''}`,
                    color: result.error ? 'red' : 'green'
                }
            }
        };
        
        decorations.push(decoration);
        
        // Apply the decoration
        editor.setDecorations(this.resultDecorationType, decorations);
    }
}
