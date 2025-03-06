// Mock for vscode module
const vscode = {
  Range: class {
    constructor(
      public readonly start: any,
      public readonly end: any
    ) {
      this.start = start;
      this.end = end;
    }
    
    contains(position: any): boolean {
      return position >= this.start && position <= this.end;
    }
    
    // Add missing methods required by the interface
    isEmpty = () => false;
    isSingleLine = () => false;
    isEqual = () => false;
    intersection = () => this;
    union = () => this;
    with = () => this;
  },
  Position: class {
    constructor(
      public readonly line: number,
      public readonly character: number
    ) {
      this.line = line;
      this.character = character;
    }
    
    // Add missing methods required by the interface
    isBefore = () => false;
    isBeforeOrEqual = () => false;
    isAfter = () => false;
    isAfterOrEqual = () => false;
    isEqual = () => false;
    compareTo = () => 0;
    translate = () => this;
    with = () => this;
  },
  workspace: {
    workspaceFolders: [
      { uri: { fsPath: '/mock/workspace' } }
    ]
  },
  window: {
    activeTextEditor: undefined,
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    setStatusBarMessage: jest.fn()
  },
  commands: {
    registerCommand: jest.fn().mockReturnValue('mock-command')
  },
  languages: {
    registerCodeLensProvider: jest.fn().mockReturnValue('mock-codelens-provider')
  },
  ExtensionContext: class {
    subscriptions: any[] = [];
    extensionPath: string = '/mock/extension/path';
    asAbsolutePath(relativePath: string): string {
      return `/mock/extension/path/${relativePath}`;
    }
  },
  CodeLens: class {
    constructor(
      public readonly range: any,
      public readonly command: any
    ) {
      this.range = range;
      this.command = command;
    }
  },
  TextDocument: class {
    constructor(
      public readonly uri: any,
      public readonly languageId: string,
      public readonly version: number,
      public readonly content: string
    ) {}
    
    getText(): string {
      return this.content;
    }
    
    positionAt(offset: number): any {
      const text = this.content.substring(0, offset);
      const lines = text.split('\n');
      const line = lines.length - 1;
      const character = lines[line].length;
      return new vscode.Position(line, character);
    }
  }
};

export default vscode;
