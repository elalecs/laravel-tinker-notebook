import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class LaravelDetector {
    /**
     * Find Laravel project root in the current workspace
     */
    public static findLaravelProjectRoot(): string | null {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return null;
        }
        
        // Look for artisan file in workspace folders
        for (const folder of workspaceFolders) {
            const artisanPath = path.join(folder.uri.fsPath, 'artisan');
            if (fs.existsSync(artisanPath)) {
                return folder.uri.fsPath;
            }
        }
        
        return null;
    }
}
