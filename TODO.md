# Laravel Tinker Notebook - TODO List

This document outlines pending tasks, improvements, and features for the Laravel Tinker Notebook extension.

## Missing Tests



## Features to Implement

### From README.md

- [ ] **Maintain state between code executions**
  - Implement session management for code blocks
  - Add ability to reference variables across blocks
  - Add visual indicator for active/inactive sessions
  - Test it

- [ ] **Organize code snippets for reuse**
  - Add snippet library functionality
  - Implement import/export of snippets
  - Create UI for managing snippets
  - Test it

### From Documentation

- [ ] **Dedicated Snippet Files**
  - Implement support for `.tinker` and `.laravel-snippet` file extensions
  - Add examples into examples/
  - Add syntax highlighting for these file types
  - Create snippets for common Laravel operations
  - Test it

- [ ] **Special Directives**
  - Implement all directives mentioned in documentation:
    - `@tinker-new-session` - Start a new Tinker session
    - `@tinker-hide-result` - Hide execution results
    - `@tinker-show-raw` - Show raw output without formatting
  - Test it

- [ ] **Result Display Improvements**
  - Add support for different output formats (JSON, table, etc.)
  - Implement collapsible output sections
  - Add ability to export results to different formats
  - Test it

- [ ] **Error Handling**
  - Improve error message display
  - Add line-specific error highlighting
  - Implement quick fixes for common errors
  - Test it

## UI/UX Improvements

- [ ] **Code Block Decoration**
  - Add status indicators for code blocks (executed, error, etc.)
  - Implement syntax highlighting within Markdown
  - Add line numbers for code blocks
  - Test it

- [ ] **Interactive Interface**
  - Add ability to adjust block execution order
  - Implement drag-and-drop for code blocks
  - Add keyboard shortcuts for common operations
  - Test it

## Performance Improvements

- [ ] **Optimize Tinker Process Management**
  - Implement process pooling
  - Add timeout handling for long-running operations
  - Improve resource cleanup

- [ ] **Cache Results**
  - Add result caching for identical code blocks
  - Implement cache invalidation strategies
  - Add cache visualization

## Documentation

- [ ] **Enhanced User Guide**
  - Add screenshots and examples
  - Create video tutorials
  - Document all features and options

- [ ] **API Documentation**
  - Document extension API for potential integrations
  - Create developer guide for contributors
