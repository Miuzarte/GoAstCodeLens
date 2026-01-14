# Change Log

All notable changes to the "go-ast-codelens" extension will be documented in this file.

## [0.0.2] - 2026-01-14

### Fixed

- Exclude type conversions from function call count
- Automatic binary rebuild on extension update

## [0.0.1] - 2026-01-14

### Added

- Real-time AST node counting for Go functions
- CodeLens display showing node counts above each function
- Support for both top-level functions and closures (FuncLit)
- Configurable debounce delay for performance optimization
- Filter to show only inlineable functions (< 80 nodes)
- Function call detection with `~` prefix for uncertainty indication
- Built-in function exclusion from call count (append, len, make, etc.)
- `//go:noinline` directive detection
- Configuration option to show/hide functions with noinline directive
- Configurable maximum function call threshold for filtering
- Commands to delete and rebuild AST counter binary
- Runtime compilation of Go helper binary for cross-platform support
- Stdin-based file content processing for real-time updates
