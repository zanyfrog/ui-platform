import path from 'node:path';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { assertNotVisualRole } from './runtime-revision.js';

export type HelperResolver = (request: string, importer: string) => Promise<string>;
const key = (id: string) => id.split('?')[0].replaceAll('\\', '/');
const visualVirtual = (id: string) => id.includes('virtual:uip-visual-') || id.includes('virtual:uip-application-composition');
export class VisualHelperBoundary {
  readonly helpers = new Set<string>();
  isHelper(id: string) { return this.helpers.has(key(id)); }
  constructor(private resolve: HelperResolver, private cached?: (id: string) => { code?: string; imports: string[] } | undefined) {}
  guard(request: string, importer?: string) {
    if (importer && this.helpers.has(key(importer)) && visualVirtual(request)) throw new Error('Shared helpers cannot cache a managed Visual revision. Import the pinned graph from the Application entry instead.');
  }
  check(code: string, id: string): string[] {
    const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true), imports: string[] = [];
    const moduleState = new Set<string>(), writes = new Set<string>(), exported = new Set<string>(); let domAccess = false;
    for (const statement of source.statements) {
      if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const entry of statement.exportClause.elements) exported.add((entry.propertyName ?? entry.name).text);
      if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) exported.add(statement.expression.text);
    }
    for (const statement of source.statements) if (ts.isVariableStatement(statement) && !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) {
      const value = declaration.initializer;
      if (!exported.has(declaration.name.text) && (!value || !ts.isArrowFunction(value) && !ts.isFunctionExpression(value))) moduleState.add(declaration.name.text);
    }
    const origin = (node: ts.Node): string | undefined => ts.isIdentifier(node) ? node.text : ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) ? origin(node.expression) : undefined;
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node) && ['document', 'window'].includes(node.text)) domAccess = true;
      if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        const target = origin(node.left);
        const scalar = ts.isIdentifier(node.left) && (ts.isStringLiteral(node.right) || ts.isNumericLiteral(node.right) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.right.kind));
        if (target && !scalar) writes.add(target);
      }
      if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) { const target = origin(node.expression.expression); if (target) writes.add(target); }
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && !(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) && !(ts.isExportDeclaration(node) && node.isTypeOnly)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) throw new Error(`Shared helper ${path.basename(id)} uses a computed import that could retain a Visual revision. Use explicit non-Visual imports.`);
          imports.push(node.arguments[0].text);
        }
        if (ts.isIdentifier(node.expression) && ['require', 'eval', 'Function'].includes(node.expression.text) || ts.isPropertyAccessExpression(node.expression) && ['glob', 'globEager'].includes(node.expression.name.text)) throw new Error(`Shared helper ${path.basename(id)} uses unsupported opaque module loading. Use explicit non-Visual imports.`);
      }
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') throw new Error(`Shared helper ${path.basename(id)} uses unsupported generated module code.`);
      ts.forEachChild(node, visit);
    }; visit(source);
    if ([...moduleState].some(name => writes.has(name))) throw new Error(`Shared helper ${path.basename(id)} has opaque private mutable state that could retain a Visual revision. Keep this cache in the Visual function, or expose inspectable ordinary state.`);
    if (domAccess && source.statements.some(statement => ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => !declaration.initializer || !ts.isArrowFunction(declaration.initializer) && !ts.isFunctionExpression(declaration.initializer)))) throw new Error(`Shared helper ${path.basename(id)} combines module state with global DOM access. Keep rendered-node state in the Visual function instance.`);
    return imports;
  }
  async inspect(id: string, seen = new Set<string>()): Promise<void> {
    if (visualVirtual(id) || id.startsWith('\0')) throw new Error('A shared helper cannot load a managed Visual graph or an opaque virtual module.');
    await assertNotVisualRole(id);
    const clean = key(id); if (seen.has(clean)) return; seen.add(clean);
    if (seen.size > 1000) throw new Error('Shared helper dependency audit exceeds its bounded graph limit.');
    if (!path.isAbsolute(clean) || !/\.[cm]?[jt]sx?$/.test(clean)) return;
    if (this.helpers.size >= 1000 && !this.helpers.has(clean)) throw new Error('Shared helper audit registry exceeds its bounded module limit. Restart the development server.');
    this.helpers.add(clean);
    const code = await readFile(clean, 'utf8'); if (code.length * 2 > 8 * 1024 * 1024) throw new Error('Shared helper exceeds its source audit limit.');
    const requests = this.check(code, clean);
    const cached = this.cached?.(id);
    if (cached?.code) this.check(cached.code, clean);
    for (const child of cached?.imports ?? []) await this.inspect(child, seen);
    for (const request of requests) await this.inspect(await this.resolve(request, id), seen);
  }
  async resolveFunction(request: string, importer: string): Promise<string> {
    const id = await this.resolve(request, importer); await this.inspect(id); return id;
  }
}

/** Instrument calls rather than replace helper bindings: aliases and shared
 * module/function identities remain intact. Optional chains are lowered first.
 */
export function instrumentVisualFunctions(code: string, id: string): string {
  const source = ts.createSourceFile(id, code || 'export {};', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = ['registerSharedHelperModule', 'registerSharedHelperImport', 'callVisualHelper', 'callVisualHelperMethod', 'constructVisualHelper', 'assignVisualHelper', 'readVisualHelper', 'visualHelperTag', 'visualHelperMethodTag', 'destructureVisualHelper', 'updateVisualHelper', 'compoundVisualHelper'];
  const bindings = new Map(names.map(name => [name, ts.factory.createUniqueName('__uip_' + name)]));
  const call = (name: string, args: ts.Expression[]) => ts.factory.createCallExpression(bindings.get(name)!, undefined, args);
  const list = (args: readonly ts.Expression[]) => ts.factory.createArrowFunction(undefined, undefined, [], undefined, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), ts.factory.createArrayLiteralExpression(args));
  const property = (node: ts.PropertyAccessExpression | ts.ElementAccessExpression): ts.Expression => ts.isPropertyAccessExpression(node) ? ts.factory.createStringLiteral(node.name.text) : node.argumentExpression;
  const ordinaryProperty = (node: ts.Node): node is ts.PropertyAccessExpression | ts.ElementAccessExpression => ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node) && !ts.isPrivateIdentifier(node.name) && node.expression.kind !== ts.SyntaxKind.SuperKeyword;
  const registrations: ts.Statement[] = [], namespaceImports: ts.Statement[] = [];
  for (const node of source.statements) if (ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly || ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) {
    const namespace = ts.factory.createUniqueName('__uip_sharedModule');
    namespaceImports.push(ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamespaceImport(namespace)), node.moduleSpecifier!));
    registrations.push(ts.factory.createExpressionStatement(call('registerSharedHelperModule', [namespace])));
  }
  const result = ts.transform(source, [context => root => {
    const visit: ts.Visitor = node => {
      const expression = (item: ts.Expression) => ts.visitNode(item, visit) as ts.Expression;
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) throw new Error('Computed Visual function imports are unsupported. Use explicit non-Visual helper imports.');
          return call('registerSharedHelperImport', [node]);
        }
        if (ts.isIdentifier(node.expression) && ['require', 'eval', 'Function'].includes(node.expression.text)) throw new Error('Opaque Visual function module loading is unsupported. Use explicit non-Visual imports.');
        if (node.expression.kind === ts.SyntaxKind.SuperKeyword) throw new Error('Visual functions cannot forward revision context through opaque superclass construction. Keep context in the Visual function.');
        const args = list(node.arguments.map(argument => ts.isSpreadElement(argument) ? ts.factory.updateSpreadElement(argument, expression(argument.expression)) : expression(argument)));
        if (ordinaryProperty(node.expression)) return call('callVisualHelperMethod', [expression(node.expression.expression), expression(property(node.expression)), args]);
        if (ts.isPropertyAccessExpression(node.expression) && (ts.isPrivateIdentifier(node.expression.name) || node.expression.expression.kind === ts.SyntaxKind.SuperKeyword)) return call('callVisualHelper', [node.expression, ts.factory.createThis(), args]);
        return call('callVisualHelper', [expression(node.expression), ts.factory.createVoidZero(), args]);
      }
      if (ts.isNewExpression(node)) return call('constructVisualHelper', [expression(node.expression), list((node.arguments ?? []).map(argument => expression(argument)))]);
      if (ts.isTaggedTemplateExpression(node)) {
        const tag = ordinaryProperty(node.tag) ? call('visualHelperMethodTag', [expression(node.tag.expression), expression(property(node.tag))]) : call('visualHelperTag', [expression(node.tag), ts.factory.createVoidZero()]);
        return ts.factory.updateTaggedTemplateExpression(node, tag, node.typeArguments, ts.visitNode(node.template, visit) as ts.TemplateLiteral);
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        if (ordinaryProperty(node.left) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) return call('assignVisualHelper', [expression(node.left.expression), expression(property(node.left)), expression(node.right)]);
        if (ordinaryProperty(node.left)) return call('compoundVisualHelper', [expression(node.left.expression), expression(property(node.left)), ts.factory.createArrowFunction(undefined, undefined, [], undefined, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), expression(node.right)), ts.factory.createStringLiteral(node.operatorToken.getText(source))]);
        return ts.factory.updateBinaryExpression(node, node.left, node.operatorToken, expression(node.right));
      }
      if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && ordinaryProperty(node.operand) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) return call('updateVisualHelper', [expression(node.operand.expression), expression(property(node.operand)), node.operator === ts.SyntaxKind.PlusPlusToken ? ts.factory.createTrue() : ts.factory.createFalse(), ts.isPostfixUnaryExpression(node) ? ts.factory.createTrue() : ts.factory.createFalse()]);
      if (ts.isVariableDeclaration(node) && node.initializer && !ts.isIdentifier(node.name)) return ts.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, call('destructureVisualHelper', [expression(node.initializer)]));
      if (ordinaryProperty(node)) return call('readVisualHelper', [expression(node.expression), expression(property(node))]);
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  const output = ts.factory.updateSourceFile(result.transformed[0], [
    ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([...bindings].map(([name, alias]) => ts.factory.createImportSpecifier(false, ts.factory.createIdentifier(name), alias)))), ts.factory.createStringLiteral('@ui-platform/visual-artifacts/revision-guard')),
    ...namespaceImports, ...registrations, ...result.transformed[0].statements,
  ]);
  const printed = ts.createPrinter().printFile(output); result.dispose(); return printed;
}
export function assertIsolatedPreviewFunctions(code: string): void {
  const source = ts.createSourceFile('preview.functions.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly || ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly || ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && ['require', 'eval', 'Function'].includes(node.expression.text))) throw new Error('This inspector preview cannot share Application helper modules. Open Current Preview to run this artifact in its Application Vite graph.');
    ts.forEachChild(node, visit);
  }; visit(source);
}
