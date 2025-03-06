import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExecutionResult } from '../editor/resultRenderer';

export interface ExecutionOptions {
    newSession: boolean;
    showRaw: boolean;
    hideResult: boolean;
}

export class TinkerExecutionService {
    private lastSessionId: string | null = null;
    
    public async executeCode(code: string, options: ExecutionOptions): Promise<ExecutionResult> {
        try {
            // Find Laravel project root directory
            const projectRoot = await this.findLaravelProjectRoot();
            if (!projectRoot) {
                throw new Error('Laravel project not found. Make sure you are in a Laravel project directory.');
            }
            
            // Create a temporary file for the code
            const tempFile = await this.createTempCodeFile(code);
            
            // Start a new session if requested or if there's no existing session
            if (options.newSession || !this.lastSessionId) {
                this.lastSessionId = Date.now().toString();
            }
            
            // Prepare the command to execute
            let command: string;
            if (code.includes('\n')) {
                // Multi-line code execution using pipe
                command = `cd "${projectRoot}" && cat "${tempFile}" | php artisan tinker -`;
            } else {
                // Single line execution
                command = `cd "${projectRoot}" && php artisan tinker --execute="${code.replace(/"/g, '\\"')}"`;
            }
            
            // Execute the command
            const output = await this.executeCommand(command);
            
            // Clean up the temp file
            fs.unlinkSync(tempFile);
            
            return {
                output: output.trim(),
                isRaw: options.showRaw
            };
            
        } catch (error) {
            return {
                output: '',
                error: error instanceof Error ? error.message : String(error),
                isRaw: options.showRaw
            };
        }
    }
    
    private async findLaravelProjectRoot(): Promise<string | undefined> {
        // Start with the workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return undefined;
        }
        
        // Check each workspace folder for an artisan file
        for (const folder of workspaceFolders) {
            const artisanPath = path.join(folder.uri.fsPath, 'artisan');
            if (fs.existsSync(artisanPath)) {
                return folder.uri.fsPath;
            }
        }
        
        // If no artisan file found directly in workspace folders,
        // try to find it in subdirectories (but only go one level deep)
        for (const folder of workspaceFolders) {
            const entries = fs.readdirSync(folder.uri.fsPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const artisanPath = path.join(folder.uri.fsPath, entry.name, 'artisan');
                    if (fs.existsSync(artisanPath)) {
                        return path.join(folder.uri.fsPath, entry.name);
                    }
                }
            }
        }
        
        return undefined;
    }
    
    private async createTempCodeFile(code: string): Promise<string> {
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `laravel-tinker-${Date.now()}.php`);
        
        fs.writeFileSync(tempFile, code);
        return tempFile;
    }
    
    private executeCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr || error.message);
                    return;
                }
                resolve(stdout);
            });
        });
    }
}
