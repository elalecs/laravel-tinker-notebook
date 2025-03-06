import * as vscode from 'vscode';

export class ConfigProvider {
    /**
     * Get extension configuration
     */
    public static getConfig(): {
        phpPath: string;
        artisanPath: string;
        autodetectProject: boolean;
    } {
        const config = vscode.workspace.getConfiguration('laravelTinkerNotebook');
        
        return {
            phpPath: config.get<string>('phpPath') || 'php',
            artisanPath: config.get<string>('artisanPath') || 'artisan',
            autodetectProject: config.get<boolean>('autodetectProject') || true
        };
    }
}
