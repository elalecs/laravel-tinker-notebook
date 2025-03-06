import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeSnippet {
    id: string;
    name: string;
    description: string;
    code: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    category: string;
}

export class SnippetManager {
    private context: vscode.ExtensionContext;
    private snippets: Map<string, CodeSnippet> = new Map();
    private snippetsDir: string;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.snippetsDir = path.join(context.globalStoragePath, 'snippets');
        
        // Ensure directory exists
        if (!fs.existsSync(this.snippetsDir)) {
            fs.mkdirSync(this.snippetsDir, { recursive: true });
        }
        
        // Load snippets
        this.loadSnippets();
    }
    
    /**
     * Returns all snippets organized by category
     */
    public getSnippetsByCategory(): Record<string, CodeSnippet[]> {
        const result: Record<string, CodeSnippet[]> = {};
        
        for (const snippet of this.snippets.values()) {
            if (!result[snippet.category]) {
                result[snippet.category] = [];
            }
            result[snippet.category].push(snippet);
        }
        
        return result;
    }
    
    /**
     * Returns all snippets as an array
     */
    public getAllSnippets(): CodeSnippet[] {
        return Array.from(this.snippets.values());
    }
    
    /**
     * Gets a snippet by ID
     */
    public getSnippet(id: string): CodeSnippet | undefined {
        return this.snippets.get(id);
    }
    
    /**
     * Saves a new snippet
     */
    public saveSnippet(snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>): CodeSnippet {
        const id = `snippet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const now = new Date();
        
        const newSnippet: CodeSnippet = {
            ...snippet,
            id,
            createdAt: now,
            updatedAt: now
        };
        
        this.snippets.set(id, newSnippet);
        this.persistSnippets();
        
        return newSnippet;
    }
    
    /**
     * Updates an existing snippet
     */
    public updateSnippet(id: string, updates: Partial<Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>>): CodeSnippet | undefined {
        const snippet = this.snippets.get(id);
        
        if (!snippet) {
            return undefined;
        }
        
        const updatedSnippet: CodeSnippet = {
            ...snippet,
            ...updates,
            updatedAt: new Date()
        };
        
        this.snippets.set(id, updatedSnippet);
        this.persistSnippets();
        
        return updatedSnippet;
    }
    
    /**
     * Deletes a snippet
     */
    public deleteSnippet(id: string): boolean {
        const deleted = this.snippets.delete(id);
        
        if (deleted) {
            this.persistSnippets();
        }
        
        return deleted;
    }
    
    /**
     * Searches for snippets by name, description or tags
     */
    public searchSnippets(query: string): CodeSnippet[] {
        const lowerQuery = query.toLowerCase();
        const results: CodeSnippet[] = [];
        
        for (const snippet of this.snippets.values()) {
            if (
                snippet.name.toLowerCase().includes(lowerQuery) ||
                snippet.description.toLowerCase().includes(lowerQuery) ||
                snippet.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
                snippet.category.toLowerCase().includes(lowerQuery)
            ) {
                results.push(snippet);
            }
        }
        
        return results;
    }
    
    /**
     * Exports snippets to a file
     */
    public async exportSnippets(snippetIds?: string[]): Promise<string> {
        const snippetsToExport = snippetIds
            ? Array.from(this.snippets.values()).filter(s => snippetIds.includes(s.id))
            : Array.from(this.snippets.values());
            
        const exportData = JSON.stringify(snippetsToExport, null, 2);
        
        // Ask the user for a location to save the file
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('laravel-tinker-snippets.json'),
            filters: {
                'JSON': ['json']
            }
        });
        
        if (!uri) {
            throw new Error('Export cancelled');
        }
        
        fs.writeFileSync(uri.fsPath, exportData);
        return uri.fsPath;
    }
    
    /**
     * Imports snippets from a file
     */
    public async importSnippets(): Promise<number> {
        // Ask the user for the file to import
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'JSON': ['json']
            }
        });
        
        if (!uris || uris.length === 0) {
            throw new Error('Import cancelled');
        }
        
        const fileContent = fs.readFileSync(uris[0].fsPath, 'utf8');
        const importedSnippets = JSON.parse(fileContent) as CodeSnippet[];
        
        let importCount = 0;
        
        for (const snippet of importedSnippets) {
            // Generate new ID to avoid conflicts
            const id = `snippet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            const newSnippet: CodeSnippet = {
                ...snippet,
                id,
                // Preserve original dates if available
                createdAt: snippet.createdAt ? new Date(snippet.createdAt) : new Date(),
                updatedAt: new Date()
            };
            
            this.snippets.set(id, newSnippet);
            importCount++;
        }
        
        this.persistSnippets();
        return importCount;
    }
    
    /**
     * Loads all snippets from storage
     */
    private loadSnippets(): void {
        try {
            const snippetsFile = path.join(this.snippetsDir, 'snippets.json');
            
            if (!fs.existsSync(snippetsFile)) {
                // Create initial snippets file
                fs.writeFileSync(snippetsFile, JSON.stringify([], null, 2));
                return;
            }
            
            const fileContent = fs.readFileSync(snippetsFile, 'utf8');
            const snippets = JSON.parse(fileContent) as CodeSnippet[];
            
            this.snippets.clear();
            
            for (const snippet of snippets) {
                // Convert string dates to Date objects
                snippet.createdAt = new Date(snippet.createdAt);
                snippet.updatedAt = new Date(snippet.updatedAt);
                this.snippets.set(snippet.id, snippet);
            }
        } catch (error) {
            console.error('Error loading snippets:', error);
        }
    }
    
    /**
     * Persists all snippets to storage
     */
    private persistSnippets(): void {
        try {
            const snippetsFile = path.join(this.snippetsDir, 'snippets.json');
            const snippetsData = Array.from(this.snippets.values());
            fs.writeFileSync(snippetsFile, JSON.stringify(snippetsData, null, 2));
        } catch (error) {
            console.error('Error persisting snippets:', error);
        }
    }
}
