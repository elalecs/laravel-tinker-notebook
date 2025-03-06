import * as vscode from 'vscode';

export interface CodeBlock {
    code: string;
    range: vscode.Range;
    language: string;
    directives: string[];
    sessionId?: string; // ID of the session associated with this code block
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
            const directiveRegex = /\/\/\s*@(tinker-[a-z-]+)(?::(\S+))?/g;
            const directives: string[] = [];
            let directiveMatch;
            let sessionId: string | undefined;
            
            while ((directiveMatch = directiveRegex.exec(codeContent)) !== null) {
                const directiveName = '@' + directiveMatch[1];
                directives.push(directiveName);
                
                // Process session-related directives
                if (directiveName === '@tinker-use-session' && directiveMatch[2]) {
                    // If there is a parameter for use-session, save it as session ID
                    sessionId = directiveMatch[2];
                }
            }
            
            codeBlocks.push({
                code: codeContent,
                range: new vscode.Range(startPos, endPos),
                language: match[1],
                directives,
                sessionId
            });
        }
        
        return codeBlocks;
    }
    
    /**
     * Determines if a code block has a specific directive
     */
    public hasDirective(codeBlock: CodeBlock, directive: string): boolean {
        return codeBlock.directives.includes(directive);
    }
    
    /**
     * Extracts execution options based on directives
     */
    public getExecutionOptions(codeBlock: CodeBlock): { newSession: boolean, showRaw: boolean, hideResult: boolean, sessionId?: string } {
        return {
            newSession: this.hasDirective(codeBlock, '@tinker-new-session'),
            showRaw: this.hasDirective(codeBlock, '@tinker-show-raw'),
            hideResult: this.hasDirective(codeBlock, '@tinker-hide-result'),
            sessionId: codeBlock.sessionId
        };
    }
}
