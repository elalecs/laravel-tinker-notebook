import { DocumentParser, CodeBlock } from '../../src/editor/documentParser';
import vscode from '../mocks/vscode';

describe('DocumentParser', () => {
  let parser: DocumentParser;
  
  beforeEach(() => {
    parser = new DocumentParser();
  });
  
  describe('findAllCodeBlocks', () => {
    it('should find PHP code blocks in a document', () => {
      // Create a mock document
      const mockDocument = {
        getText: () => '# Test Document\n\n```php\n$user = User::find(1);\necho $user->name;\n```\n\nSome text here\n\n```php\nDB::table("users")->get();\n```',
        positionAt: (offset: number) => {
          // Simple mock implementation that converts offset to position
          const text = mockDocument.getText().substring(0, offset);
          const lines = text.split('\n');
          const line = lines.length - 1;
          const character = lines[line].length;
          return new vscode.Position(line, character);
        }
      };
      
      const blocks = parser.findAllCodeBlocks(mockDocument as any);
      
      expect(blocks.length).toBe(2);
      expect(blocks[0].code).toBe('$user = User::find(1);\necho $user->name;');
      expect(blocks[1].code).toBe('DB::table("users")->get();');
    });
    
    it('should extract directives from code blocks', () => {
      const mockDocument = {
        getText: () => '```php\n// @tinker-new-session\n$user = User::find(1);\n// @tinker-hide-result\n```',
        positionAt: (offset: number) => new vscode.Position(0, offset)
      };
      
      const blocks = parser.findAllCodeBlocks(mockDocument as any);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].directives).toContain('@tinker-new-session');
      expect(blocks[0].directives).toContain('@tinker-hide-result');
    });
  });
  
  describe('findCodeBlockAtPosition', () => {
    it('should find the code block at a given position', () => {
      const mockDocument = {
        getText: () => '# Test\n\n```php\n$test = 1;\n```\n\nText\n\n```php\n$test2 = 2;\n```',
        positionAt: (offset: number) => {
          const text = mockDocument.getText().substring(0, offset);
          const lines = text.split('\n');
          const line = lines.length - 1;
          const character = lines[line].length;
          return new vscode.Position(line, character);
        }
      };
      
      // Mock the findAllCodeBlocks method to return predetermined blocks
      const mockBlocks: CodeBlock[] = [
        {
          code: '$test = 1;',
          range: new vscode.Range(
            new vscode.Position(2, 0),
            new vscode.Position(4, 3)
          ),
          language: 'php',
          directives: []
        },
        {
          code: '$test2 = 2;',
          range: new vscode.Range(
            new vscode.Position(8, 0),
            new vscode.Position(10, 3)
          ),
          language: 'php',
          directives: []
        }
      ];
      
      jest.spyOn(parser, 'findAllCodeBlocks').mockReturnValue(mockBlocks);
      
      // Position inside first code block
      const position1 = new vscode.Position(3, 5);
      const block1 = parser.findCodeBlockAtPosition(mockDocument as any, position1);
      
      expect(block1).toBe(mockBlocks[0]);
      
      // Position inside second code block
      const position2 = new vscode.Position(9, 5);
      const block2 = parser.findCodeBlockAtPosition(mockDocument as any, position2);
      
      expect(block2).toBe(mockBlocks[1]);
      
      // Position outside any code block
      const position3 = new vscode.Position(6, 2);
      const block3 = parser.findCodeBlockAtPosition(mockDocument as any, position3);
      
      expect(block3).toBeUndefined();
    });
  });
});
