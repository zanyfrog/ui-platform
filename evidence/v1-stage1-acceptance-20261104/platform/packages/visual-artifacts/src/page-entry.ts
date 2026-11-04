import ts from 'typescript';

/** Adapt the existing generated Page entry without changing its source files.
 * Only the complete, conventional Page entry shape participates. Helpers and
 * arbitrary raw imports continue through the fail-closed role-import guard.
 */
export function revisionPageEntry(code: string, id: string): string | undefined {
  if (!/\/(?:index|main)\.[cm]?[jt]s$/.test(id.replaceAll('\\', '/').split('?')[0]) || !code.includes('createVisualPage')) return;
  const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const roles = new Map([['./page.html?raw', 'source'], ['./page.css?raw', 'css'], ['./page.visual.json', 'metadata'], ['./page.functions', 'functions'], ['./page.functions.ts', 'functions']]);
  const declarations = source.statements.filter(ts.isImportDeclaration);
  const selected = declarations.filter(node => ts.isStringLiteral(node.moduleSpecifier) && roles.has(node.moduleSpecifier.text));
  const present = new Set(selected.map(node => roles.get((node.moduleSpecifier as ts.StringLiteral).text)));
  if (!['source', 'css', 'metadata'].every(role => present.has(role)) || !declarations.some(node => ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === '@ui-platform/visual-artifacts/runtime')) return;
  const page = ts.factory.createUniqueName('__uip_page');
  const statements: ts.Statement[] = [ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([ts.factory.createImportSpecifier(false, ts.factory.createIdentifier('page'), page)])), ts.factory.createStringLiteral('virtual:uip-visual-page'))];
  for (const node of source.statements) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const role = roles.get(node.moduleSpecifier.text);
      if (role) {
        const binding = node.importClause?.name ?? (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings) ? node.importClause.namedBindings.name : undefined);
        if (!binding) throw new Error('The Page entry uses an unsupported role import. Import its complete revision from virtual:uip-visual-page.');
        statements.push(ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([ts.factory.createVariableDeclaration(binding, undefined, undefined, ts.factory.createPropertyAccessExpression(page, role))], ts.NodeFlags.Const)));
        continue;
      }
      if (node.moduleSpecifier.text === 'virtual:uip-visual-artifacts') {
        statements.push(ts.factory.updateImportDeclaration(node, node.modifiers, node.importClause, ts.factory.createStringLiteral('virtual:uip-visual-page'), node.attributes)); continue;
      }
    }
    statements.push(node);
  }
  const roleBindings = new Map(selected.map(node => [roles.get((node.moduleSpecifier as ts.StringLiteral).text)!, node.importClause?.name?.text ?? (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings) ? node.importClause.namedBindings.name.text : '')]));
  const identifier = (node: ts.Expression): string | undefined => ts.isIdentifier(node) ? node.text : ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isParenthesizedExpression(node) ? identifier(node.expression) : undefined;
  const result = ts.transform(ts.factory.updateSourceFile(source, statements), [context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createVisualPage' && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
        const properties = node.arguments[0].properties;
        const conventional = properties.length === roleBindings.size && properties.every(property => ts.isShorthandPropertyAssignment(property) ? roleBindings.get(property.name.text) === property.name.text : ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && identifier(property.initializer) === roleBindings.get(property.name.text));
        if (conventional) return ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [page, ...node.arguments.slice(1)]);
      }
      return ts.visitEachChild(node, visit, context);
    }; return ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  const output = ts.createPrinter().printFile(result.transformed[0]); result.dispose(); return output;
}
