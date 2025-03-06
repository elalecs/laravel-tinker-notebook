# Laravel Tinker Notebook - User Guide

## Introduction

Laravel Tinker Notebook is a VSCodeium extension that brings interactive PHP/Laravel code execution directly into your editor. Similar to Jupyter notebooks for Python, this extension allows you to write, document, and execute PHP code within Markdown files, providing immediate feedback without leaving your IDE.

## Installation and Setup Guide

### Prerequisites

- VSCodeium or VS Code (version 1.60.0 or higher)
- PHP 7.4+ installed and available in your PATH
- A Laravel project (version 8.0+) with Tinker installed
- Composer installed for dependency management

### Installing the Extension

#### From VS Code Marketplace

1. Open VSCodeium/VS Code
2. Go to Extensions (Ctrl+Shift+X or View → Extensions)
3. Search for "Laravel Tinker Notebook"
4. Click Install
5. Reload VS Code when prompted

#### Manual Installation

1. Download the `.vsix` file from the [GitHub releases page](https://github.com/your-username/laravel-tinker-notebook/releases)
2. In VS Code, go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu in the top-right of the Extensions panel
4. Select "Install from VSIX..."
5. Navigate to and select the downloaded `.vsix` file
6. Reload VS Code when prompted

### Verifying Installation

To verify that the extension is properly installed and working:

1. Open a Laravel project in VS Code
2. Create a new file with a `.tinker.md` extension
3. Enter some basic PHP code in a code block
4. Run the command "Laravel Tinker: Run Block" (Ctrl+Enter when cursor is in a code block)
5. You should see the output appear below the code block

### Configuration Options

The extension can be configured through VS Code's settings. To access these settings:

1. Go to File → Preferences → Settings (or press Ctrl+,)
2. Search for "Laravel Tinker Notebook"
3. Adjust the settings according to your preferences

#### Available Settings

| Setting | Description | Default |
|---------|-------------|--------|
| `laravelTinkerNotebook.phpPath` | Path to PHP executable | Auto-detected |
| `laravelTinkerNotebook.timeout` | Timeout for Tinker commands (ms) | 30000 |
| `laravelTinkerNotebook.maxProcesses` | Maximum number of Tinker processes | 5 |
| `laravelTinkerNotebook.idleTimeout` | Time before idle processes are cleaned up (ms) | 300000 |
| `laravelTinkerNotebook.autodetectLaravel` | Automatically detect Laravel projects | true |
| `laravelTinkerNotebook.defaultOutputFormat` | Default format for command output | "auto" |

### Troubleshooting Installation

#### Common Issues

1. **PHP Not Found**: Ensure PHP is installed and in your PATH. You can verify this by running `php -v` in your terminal.

2. **Laravel Project Not Detected**: Make sure you have opened a valid Laravel project folder in VS Code.

3. **Tinker Not Available**: Ensure Tinker is installed in your Laravel project. You can install it with `composer require laravel/tinker`.

4. **Permission Issues**: On Unix-based systems, ensure the PHP executable has execute permissions.

#### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/your-username/laravel-tinker-notebook/issues) for similar problems
2. Submit a new issue with detailed information about your environment and the problem
3. Join our [Discord community](https://discord.gg/your-discord) for real-time support

## Basic Usage Tutorial

### Creating Your First Notebook

1. Open a Laravel project in VS Code
2. Use one of these methods to create a new notebook:
   - Command Palette: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) and search for "Laravel Tinker: Create New Tinker File"
   - Explorer Context Menu: Right-click in the Explorer panel and select "Create New Tinker File"
   - Manual Creation: Create a new file with a `.tinker.md` or `.md` extension (e.g., `examples.tinker.md`)
3. Add some markdown content to document your code

### Writing and Executing Code

1. **Add a PHP Code Block**:
   ```markdown
   # My First Tinker Notebook
   
   This is a simple example of using Laravel Tinker Notebook.
   
   ```php
   // Get all users from the database
   $users = App\Models\User::all();
   $users;
   ```
   ```

2. **Execute the Code**:
   - Place your cursor inside the code block
   - Press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
   - Alternatively, use the command palette and search for "Laravel Tinker: Run Block"

3. **View the Results**:
   - Results appear directly below the code block
   - For large results, hover over them to see the full content
   - Use the buttons to copy, export, or toggle the view

### Working with Sessions

By default, all code blocks in a file share the same Tinker session, allowing you to reference variables defined in previous blocks.

#### Example of Session Continuity

```markdown
```php
// Define a variable
$name = "Laravel Tinker Notebook";
```

```php
// Use the variable from the previous block
echo "Hello, {$name}!";
```
```

#### Creating a New Session

To start a fresh session for a specific block, add the `@tinker-new-session` directive:

```markdown
```php
// @tinker-new-session
// This runs in a new session, previous variables are not available
echo $name; // Will result in an undefined variable error
```
```

### Organizing Your Notebook

Use markdown to structure your notebook with headings, lists, and text explanations:

```markdown
# Database Exploration

## User Model

First, let's retrieve all users:

```php
$users = App\Models\User::all();
$users->count();
```

## Post Model

Now, let's check the posts:

```php
$posts = App\Models\Post::all();
$posts->count();
```
```

### Saving and Sharing

- Your notebooks are saved as regular markdown files
- They can be committed to version control
- Other team members with the extension can execute the code blocks
- Without the extension, they're still readable as regular markdown files

## Advanced Features Documentation

### Code Block Types and Syntax

The extension supports multiple types of code blocks:

1. **Standard PHP Code Blocks**: 
   ```php
   $users = App\Models\User::all();
   $users;
   ```

2. **Tinker-specific Blocks**: 
   ```tinker
   $users = App\Models\User::all();
   $users;
   ```

3. **Laravel Blocks**: 
   ```laravel
   $users = User::all();
   $users;
   ```

### Special Directives

Control execution behavior with these special directives at the top of your code blocks:

| Directive | Description |
|-----------|-------------|
| `// @tinker-new-session` | Start a fresh Tinker session for this block |
| `// @tinker-continue` | Continue from the previous block (default behavior) |
| `// @tinker-show-raw` | Display raw output without formatting |
| `// @tinker-hide-result` | Execute but don't display results |
| `// @tinker-timeout=60000` | Set a custom timeout for this block (in milliseconds) |
| `// @tinker-format=json` | Force JSON formatting for the output |
| `// @tinker-format=table` | Force table formatting for the output |
| `// @tinker-format=raw` | Force raw text formatting for the output |

### Session Management

#### Managing Multiple Sessions

You can work with multiple Tinker sessions in a single notebook:

```php
// @tinker-new-session
// Session A
$sessionName = "Session A";
```

```php
// @tinker-new-session
// Session B
$sessionName = "Session B";
```

```php
// Continue in Session B
echo $sessionName; // Outputs: Session B
```

#### Session Persistence

Sessions persist between VS Code restarts. To clear all sessions:

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run "Laravel Tinker: Clear All Sessions"

### Snippet Library

The Snippet Library allows you to save, organize, and reuse code snippets across your projects.

#### Accessing the Snippet Library

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run "Laravel Tinker: Show Snippet Library"
3. The Snippet Library panel will appear in the sidebar

#### Creating Snippets

1. **From Selection**:
   - Select code in a Tinker notebook
   - Right-click and select "Add to Snippet Library"
   - Enter a name and optional description

2. **From Scratch**:
   - Click the "+" button in the Snippet Library panel
   - Enter a name, description, and code

#### Using Snippets

1. Click a snippet in the library to preview it
2. Click "Insert" to add it to your current document
3. Alternatively, start typing the snippet name in a code block for auto-completion

### Performance Optimization

#### Process Pooling

The extension uses process pooling to improve performance:

- Processes are reused for the same session
- Idle processes are automatically cleaned up
- The pool size can be configured in settings

#### Timeout Handling

Long-running operations are automatically terminated after the configured timeout:

- Default timeout is 30 seconds
- Can be adjusted globally in settings
- Can be overridden per code block with the `@tinker-timeout` directive

### Integration with Laravel Projects

#### Project Detection

The extension automatically detects Laravel projects by looking for:

- The presence of an `artisan` file
- A valid Laravel directory structure

#### Eloquent Model Autocompletion

When working in a Laravel project, the extension provides autocompletion for Eloquent models:

1. Start typing a model name
2. Press `Ctrl+Space` to see available methods and properties
3. Select a method to insert it with proper syntax

#### Artisan Command Integration

Run Artisan commands directly from your notebook:

```php
// Run an Artisan command and capture the output
$output = shell_exec('php artisan list');
echo $output;
```

## Result Display Features

### Smart Output Formatting

The extension automatically detects and formats different types of output:

#### JSON Formatting

When your code returns JSON data, it's automatically formatted for better readability:

```php
$data = ['name' => 'John', 'age' => 30, 'skills' => ['PHP', 'Laravel', 'Vue']];
return json_encode($data);
```

The output will be formatted as properly indented JSON.

#### Table Formatting

When your code returns an array of objects or associative arrays, it's displayed as a table:

```php
$users = App\Models\User::take(5)->get();
return $users;
```

The output will be formatted as a table with columns for each property.

#### PHP var_dump Formatting

When using `var_dump()`, the output is formatted for better readability:

```php
$user = App\Models\User::first();
var_dump($user);
```

### Interactive Results

#### Collapsible Results

For large results, you can toggle between expanded and collapsed views:

1. Hover over any result to see the full content
2. Click the **[Colapsar/Expandir]** button to toggle the view
3. Collapsed results show a summary, while expanded results show the full content

#### Copy and Export

Easily copy or export your results:

1. **Copy to Clipboard**: Click the **[Copiar]** button in the hover message or use the command `Laravel Tinker: Copy Result to Clipboard`

2. **Export Results**: Click the **[Exportar]** button in the hover message or use the command `Laravel Tinker: Export Result`

#### Export Formats

When exporting results, you can choose from several formats:

- **JSON**: Structured data in JSON format
- **CSV**: Comma-separated values for tabular data
- **HTML**: Formatted HTML output with styling
- **Plain Text**: Raw text output

## Troubleshooting Guide

### Common Runtime Errors

#### PHP Syntax Errors

**Symptom**: Error message indicating a syntax error in your code.

**Solution**:
1. Check the line number indicated in the error message
2. Look for missing semicolons, brackets, or quotes
3. Ensure all PHP expressions are properly terminated

#### Undefined Variables

**Symptom**: Error message: "Undefined variable: variableName"

**Solution**:
1. Check if the variable was defined in the current session
2. If you're using a new session, variables from previous blocks won't be available
3. Make sure the variable name is spelled correctly

#### Memory Limit Exceeded

**Symptom**: Error message about memory allocation or exhausted memory

**Solution**:
1. Limit the amount of data you're retrieving (e.g., use `->take(10)` with Eloquent queries)
2. Avoid loading large datasets into memory
3. Consider using generators or chunking for large data processing

#### Timeout Errors

**Symptom**: Operation times out or execution takes too long

**Solution**:
1. Increase the timeout setting in VS Code preferences
2. Use the `@tinker-timeout` directive to set a longer timeout for specific blocks
3. Optimize your queries to execute faster

### Extension Issues

#### Extension Not Activating

**Symptom**: Code blocks don't execute or commands aren't available

**Solution**:
1. Ensure you have a `.tinker.md` or `.md` file open
2. Check the VS Code output panel for extension errors
3. Reinstall the extension if necessary

#### Process Pool Issues

**Symptom**: Multiple processes running or high CPU usage

**Solution**:
1. Check the number of active processes in the task manager
2. Reduce the maximum process pool size in settings
3. Use the command "Laravel Tinker: Clear All Sessions" to reset all processes

## Performance Optimization Tips

### Writing Efficient Code

#### Database Queries

1. **Limit Retrieved Data**:
   ```php
   // Instead of
   $users = User::all();
   
   // Use
   $users = User::take(10)->get();
   ```

2. **Select Only Needed Columns**:
   ```php
   $users = User::select('id', 'name', 'email')->get();
   ```

3. **Use Eager Loading for Relationships**:
   ```php
   $posts = Post::with('author', 'comments')->get();
   ```

#### Memory Management

1. **Process Large Datasets in Chunks**:
   ```php
   User::chunk(100, function ($users) {
       foreach ($users as $user) {
           // Process each user
       }
   });
   ```

2. **Use Generators for Large Collections**:
   ```php
   function getUsers() {
       $users = User::cursor();
       foreach ($users as $user) {
           yield $user;
       }
   }
   
   $generator = getUsers();
   ```

3. **Clean Up After Large Operations**:
   ```php
   // After processing large data
   gc_collect_cycles();
   ```

### Extension Configuration

1. **Optimize Process Pool Size**:
   - Set `laravelTinkerNotebook.maxProcesses` to match your system's capabilities
   - Lower values use less memory but may require more process creation

2. **Adjust Idle Timeout**:
   - Set `laravelTinkerNotebook.idleTimeout` to clean up idle processes faster
   - Default is 5 minutes (300000ms)

3. **Use Raw Output for Large Results**:
   - Add `// @tinker-show-raw` to code blocks with large outputs
   - This bypasses formatting which can be expensive for large datasets
