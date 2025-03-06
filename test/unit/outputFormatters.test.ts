import * as assert from 'assert';
import { 
    JsonFormatter, 
    TableFormatter, 
    PhpVarDumpFormatter, 
    PlainTextFormatter,
    OutputFormatterFactory
} from '../../src/editor/outputFormatters';

// Tests para JsonFormatter
suite('JsonFormatter Tests', () => {
    const formatter = new JsonFormatter();
    
    test('canFormat should return true for valid JSON objects', () => {
        assert.strictEqual(formatter.canFormat('{"name": "John", "age": 30}'), true);
    });
    
    test('canFormat should return true for valid JSON arrays', () => {
        assert.strictEqual(formatter.canFormat('[1, 2, 3]'), true);
    });
    
    test('canFormat should return false for invalid JSON', () => {
        assert.strictEqual(formatter.canFormat('{"name": "John", "age": 30'), false);
    });
    
    test('canFormat should return false for non-JSON strings', () => {
        assert.strictEqual(formatter.canFormat('Hello world'), false);
    });
    
    test('format should properly format JSON objects', () => {
        const input = '{"name":"John","age":30,"skills":["PHP","Laravel"]}';
        const expected = `{
  "name": "John",
  "age": 30,
  "skills": [
    "PHP",
    "Laravel"
  ]
}`;
        assert.strictEqual(formatter.format(input), expected);
    });
    
    test('getLanguageId should return "json"', () => {
        assert.strictEqual(formatter.getLanguageId(), 'json');
    });
});

// Tests para TableFormatter
suite('TableFormatter Tests', () => {
    const formatter = new TableFormatter();
    
    test('canFormat should return true for array of objects with same keys', () => {
        const input = '[{"name":"John","age":30},{"name":"Jane","age":25}]';
        assert.strictEqual(formatter.canFormat(input), true);
    });
    
    test('canFormat should return false for array of different objects', () => {
        const input = '[{"name":"John","age":30},{"name":"Jane","skills":["PHP"]}]';
        assert.strictEqual(formatter.canFormat(input), false);
    });
    
    test('canFormat should return false for non-array JSON', () => {
        assert.strictEqual(formatter.canFormat('{"name":"John"}'), false);
    });
    
    test('format should create a markdown table', () => {
        const input = '[{"name":"John","age":30},{"name":"Jane","age":25}]';
        const expected = '| name | age | \n| ---- | --- | \n| John | 30  | \n| Jane | 25  | \n';
        assert.strictEqual(formatter.format(input).replace(/\s+/g, ' ').trim(), expected.replace(/\s+/g, ' ').trim());
    });
    
    test('getLanguageId should return "markdown"', () => {
        assert.strictEqual(formatter.getLanguageId(), 'markdown');
    });
});

// Tests para PhpVarDumpFormatter
suite('PhpVarDumpFormatter Tests', () => {
    const formatter = new PhpVarDumpFormatter();
    
    test('canFormat should return true for PHP var_dump output', () => {
        assert.strictEqual(formatter.canFormat('array(3) {\n  [0]=>\n  int(1)\n}'), true);
    });
    
    test('canFormat should return true for object output', () => {
        assert.strictEqual(formatter.canFormat('object(stdClass)#1 (2) {\n  ["name"]=>\n  string(4) "John"\n}'), true);
    });
    
    test('canFormat should return false for non-PHP output', () => {
        assert.strictEqual(formatter.canFormat('Hello world'), false);
    });
    
    test('format should properly format PHP var_dump output', () => {
        const input = 'array(3) { [0]=> int(1) [1]=> int(2) [2]=> int(3) }';
        const formatted = formatter.format(input);
        assert.ok(formatted.includes('array(3)'));
        assert.ok(formatted.includes('[0]=>'));
        assert.ok(formatted.includes('int(1)'));
    });
    
    test('getLanguageId should return "php"', () => {
        assert.strictEqual(formatter.getLanguageId(), 'php');
    });
});

// Tests para PlainTextFormatter
suite('PlainTextFormatter Tests', () => {
    const formatter = new PlainTextFormatter();
    
    test('canFormat should always return true', () => {
        assert.strictEqual(formatter.canFormat('anything'), true);
    });
    
    test('format should return the input unchanged', () => {
        const input = 'Hello world';
        assert.strictEqual(formatter.format(input), input);
    });
    
    test('getLanguageId should return "plaintext"', () => {
        assert.strictEqual(formatter.getLanguageId(), 'plaintext');
    });
});

// Tests para OutputFormatterFactory
suite('OutputFormatterFactory Tests', () => {
    const factory = new OutputFormatterFactory();
    
    test('getFormatter should return JsonFormatter for JSON input', () => {
        const formatter = factory.getFormatter('{"name":"John"}');
        assert.strictEqual(formatter.getLanguageId(), 'json');
    });
    
    test('getFormatter should return TableFormatter for array of objects', () => {
        const formatter = factory.getFormatter('[{"name":"John","age":30},{"name":"Jane","age":25}]');
        assert.strictEqual(formatter.getLanguageId(), 'markdown');
    });
    
    test('getFormatter should return PhpVarDumpFormatter for PHP var_dump output', () => {
        const formatter = factory.getFormatter('array(3) { [0]=> int(1) }');
        assert.strictEqual(formatter.getLanguageId(), 'php');
    });
    
    test('getFormatter should return PlainTextFormatter for unrecognized input', () => {
        const formatter = factory.getFormatter('Hello world');
        assert.strictEqual(formatter.getLanguageId(), 'plaintext');
    });
});
