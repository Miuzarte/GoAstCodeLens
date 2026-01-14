package main

import (
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"strings"
)

type FuncInfo struct {
	Line          int  `json:"line"`
	AstCount      int  `json:"astCount"`
	FuncCallCount int  `json:"funcCallCount"`
	HasNoinline   bool `json:"hasNoinline"`
	HasAnyCalls   bool `json:"hasAnyCalls"`
}

func countNodes(node ast.Node) int {
	count := 0
	ast.Inspect(node, func(n ast.Node) bool {
		if n == nil {
			return false
		}
		switch t := n.(type) {
		case *ast.BlockStmt, *ast.FieldList, *ast.Field:
			return true
		case *ast.KeyValueExpr:
			count += countNodes(t.Value)
			return false
		case ast.Stmt, ast.Expr:
			count++
		}
		return true
	})
	return count
}

var builtins = map[string]struct{}{
	"append": {},
	"len":    {},
	"cap":    {},
	"copy":   {},
	"new":    {},
	"make":   {},
	"delete": {},
	"close":  {},

	"complex": {},
	"imag":    {},
	"real":    {},

	"print":   {},
	"println": {},
	"panic":   {},
	"recover": {},
}

func countFuncCalls(node ast.Node) int {
	count := 0
	ast.Inspect(node, func(n ast.Node) bool {
		if call, ok := n.(*ast.CallExpr); ok {
			if ident, ok := call.Fun.(*ast.Ident); ok {
				if _, isBuiltin := builtins[ident.Name]; !isBuiltin && ident.Obj != nil && ident.Obj.Kind == ast.Fun {
					count++
				}
			} else if _, ok := call.Fun.(*ast.SelectorExpr); ok {
				count++
			}
		}
		return true
	})
	return count
}

func hasAnyCalls(node ast.Node) bool {
	found := false
	ast.Inspect(node, func(n ast.Node) bool {
		if call, ok := n.(*ast.CallExpr); ok {
			if ident, ok := call.Fun.(*ast.Ident); ok {
				if _, isBuiltin := builtins[ident.Name]; isBuiltin || (ident.Obj != nil && ident.Obj.Kind == ast.Fun) {
					found = true
					return false
				}
			} else if _, ok := call.Fun.(*ast.SelectorExpr); ok {
				found = true
				return false
			}
		}
		return true
	})
	return found
}

func main() {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, "", os.Stdin, parser.ParseComments)
	if err != nil {
		os.Exit(1)
	}

	results := []FuncInfo{}
	cmap := ast.NewCommentMap(fset, file, file.Comments)

	ast.Inspect(file, func(n ast.Node) bool {
		switch fn := n.(type) {
		case *ast.FuncDecl:
			if fn.Body != nil {
				line := fset.Position(fn.Pos()).Line
				count := countNodes(fn.Body)
				callCount := countFuncCalls(fn.Body)
				hasNoinline := hasNoinlineDirective(fn, cmap)
				anyCalls := hasAnyCalls(fn.Body)
				results = append(results, FuncInfo{Line: line, AstCount: count, FuncCallCount: callCount, HasNoinline: hasNoinline, HasAnyCalls: anyCalls})
			}
		case *ast.FuncLit:
			line := fset.Position(fn.Pos()).Line
			count := countNodes(fn.Body)
			callCount := countFuncCalls(fn.Body)
			anyCalls := hasAnyCalls(fn.Body)
			results = append(results, FuncInfo{Line: line, AstCount: count, FuncCallCount: callCount, HasNoinline: false, HasAnyCalls: anyCalls})
		}
		return true
	})

	json.NewEncoder(os.Stdout).Encode(results)
}

func hasNoinlineDirective(fn *ast.FuncDecl, cmap ast.CommentMap) bool {
	comments := cmap[fn]
	for _, cg := range comments {
		for _, c := range cg.List {
			if strings.Contains(c.Text, "go:noinline") {
				return true
			}
		}
	}
	return false
}
