# Go AST CodeLens

A VSCode extension that displays AST node counts for Go functions via CodeLens, helping you identify functions suitable for inline optimization.

## Features

- **Real-time AST counting**: Shows the number of AST nodes in each function as you type
- **Inline optimization hints**: Highlights functions under the 80-node threshold that may be inlined by the Go compiler
- **Function call detection**: Marks functions with calls using `~` prefix, indicating potential inlining uncertainty
- **Noinline directive support**: Detects `//go:noinline` comments and optionally hides those functions
- **Configurable filtering**: Customize which functions to display based on node count and call count

## ⚠️ Important Notice

**This extension is for reference only.** The AST node count shown is an approximation and may not perfectly match the compiler's internal cost model. To verify whether a function will actually be inlined, always check the output of:

```bash
go build -gcflags="-m -m"
```

## Configuration

This extension contributes the following settings:

- `goAstCodeLens.debounceDelay` (default: `1000`): Delay in milliseconds before recalculating AST nodes after typing stops
- `goAstCodeLens.showOnlyInlineable` (default: `true`): Only show CodeLens for functions with less than 80 AST nodes
- `goAstCodeLens.maxFuncCalls` (default: `1`): Maximum number of function calls allowed to show CodeLens (0 = no function calls allowed)
- `goAstCodeLens.showNoinline` (default: `false`): Show CodeLens for functions with `//go:noinline` directive

## Commands

- `Go AST CodeLens: Delete AST Counter Binary`: Delete the compiled AST counter binary
- `Go AST CodeLens: Rebuild AST Counter Binary`: Rebuild the AST counter binary

## How It Works

The extension uses a Go helper program to parse your code and count AST nodes. The counting logic:

- Counts all statements and expressions
- Skips structural nodes (BlockStmt, FieldList, Field)
- For KeyValueExpr, only counts the value part
- Excludes built-in functions (append, len, make, etc.) from function call count

Functions with any function calls (including built-ins) are marked with `~` to indicate the actual node count may be higher if those calls get inlined.

## Requirements

- Go must be installed on your system
- The extension will automatically compile the AST counter on first use

## License

MIT
