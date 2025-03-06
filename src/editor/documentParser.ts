import * as vscode from 'vscode';

export interface CodeBlock {
    code: string;
    range: vscode.Range;
    language: string;
    directives: string[];
}

export class DocumentParser {
    public findCodeBlockAtPosition(document: vscode.TextDocument, position: vscode.Position): CodeBlock | undefined {
        const allBlocks = this.findAllCodeBlocks(document);
        return allBlocks.find(block => block.range.contains(position));
    }
    
    public findAllCodeBlocks(document: vscode.TextDocument): CodeBlock[] {
        const text = document.getText();
        const codeBlocks: CodeBlock[] = [];
        
        // Simple regex for finding markdown code blocks
        // In a real implementation, use a proper markdown parser
        const codeBlockRegex = /```(php|tinker)([\s\S]*?)```/g;
        
        let match;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const codeContent = match[2].trim();
            
            // Extract directives from comments
            const directiveRegex = /\/\/\s*@(tinker-[a-z-]+)/g;
            const directives: string[] = [];
            let directiveMatch;
            while ((directiveMatch = directiveRegex.exec(codeContent)) !== null) {
                directives.push('@' + directiveMatch[1]);
            }
            
            codeBlocks.push({
                code: codeContent,
                range: new vscode.Range(startPos, endPos),
                language: match[1],
                directives
            });
        }
        
        return codeBlocks;
    }
}
