/** Canonical deterministic browser/server contract. No IO, clock, coercion or executable source. */
export type ScalarType = 'string' | 'number' | 'boolean';
export type ExpressionNode = { kind: 'literal'; value: string | number | boolean } | { kind: 'field'; fieldId: string }
  | { kind: 'operator'; operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'concat' | 'eq' | 'lt' | 'gt' | 'and' | 'or' | 'not' | 'if'; args: ExpressionNode[] };
export interface DeclarativeExpression { version: 1; expression: ExpressionNode }
export interface CalculatedField { fieldId: string; type: ScalarType; expression: DeclarativeExpression; persist: boolean }
export interface ExpressionField { fieldId: string; key: string; type: string; required?: boolean }
const deny = (): never => { throw new Error('EXPRESSION_INVALID'); };
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const exact = (x: object, keys: string[]) => Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x, k));
export function expressionDependencies(declaration: DeclarativeExpression): string[] {
  const ids = new Set<string>(); let count = 0;
  if (!declaration || !exact(declaration, ['version', 'expression']) || declaration.version !== 1) deny();
  const visit = (node: ExpressionNode, depth: number): void => {
    if (!node || typeof node !== 'object' || depth > 24 || ++count > 256) deny();
    if (node.kind === 'literal') { if (!exact(node, ['kind', 'value']) || !['string', 'number', 'boolean'].includes(typeof node.value) || typeof node.value === 'number' && !Number.isFinite(node.value)) deny(); }
    else if (node.kind === 'field') { if (!exact(node, ['kind', 'fieldId']) || typeof node.fieldId !== 'string' || !node.fieldId || unsafe.has(node.fieldId)) deny(); ids.add(node.fieldId); }
    else if (node.kind === 'operator') {
      if (!exact(node, ['kind', 'operator', 'args']) || !['add', 'subtract', 'multiply', 'divide', 'concat', 'eq', 'lt', 'gt', 'and', 'or', 'not', 'if'].includes(node.operator) || !Array.isArray(node.args) || node.args.length !== (node.operator === 'not' ? 1 : node.operator === 'if' ? 3 : 2)) deny();
      node.args.forEach(arg => visit(arg, depth + 1));
    } else deny();
  };
  visit(declaration.expression, 0); return [...ids];
}
export function expressionType(declaration: DeclarativeExpression, fields: ReadonlyMap<string, string>): ScalarType {
  expressionDependencies(declaration);
  const infer = (node: ExpressionNode): ScalarType => {
    if (node.kind === 'literal') return typeof node.value as ScalarType;
    if (node.kind === 'field') { const type = fields.get(node.fieldId); if (!type || !['string', 'number', 'boolean'].includes(type)) return deny(); return type as ScalarType; }
    const types = node.args.map(infer), op = node.operator;
    if (op === 'if') { if (types[0] !== 'boolean' || types[1] !== types[2]) deny(); return types[1]!; }
    if (op === 'not' || op === 'and' || op === 'or') { if (types.some(t => t !== 'boolean')) deny(); return 'boolean'; }
    if (op === 'eq') { if (types[0] !== types[1]) deny(); return 'boolean'; }
    if (op === 'concat') { if (types.some(t => t !== 'string')) deny(); return 'string'; }
    if (types.some(t => t !== 'number')) deny(); return op === 'lt' || op === 'gt' ? 'boolean' : 'number';
  };
  return infer(declaration.expression);
}
export function evaluateDeclarative(declaration: DeclarativeExpression, values: Readonly<Record<string, unknown>>): string | number | boolean {
  const types = new Map(expressionDependencies(declaration).map(id => { if (!Object.hasOwn(values, id)) throw new Error('EXPRESSION_DEPENDENCY_UNAVAILABLE'); return [id, typeof values[id]]; }));
  expressionType(declaration, types);
  const evaluate = (node: ExpressionNode): string | number | boolean => {
    if (node.kind === 'literal') return node.value;
    if (node.kind === 'field') { const v = values[node.fieldId]; if (typeof v === 'number' && !Number.isFinite(v)) return deny(); return v as string | number | boolean; }
    if (node.operator === 'if') return evaluate(node.args[0]!) ? evaluate(node.args[1]!) : evaluate(node.args[2]!);
    const [a, b] = node.args.map(evaluate);
    if (node.operator === 'not') return !a;
    if (node.operator === 'and') return Boolean(a && b);
    if (node.operator === 'or') return Boolean(a || b);
    if (node.operator === 'eq') return a === b;
    if (node.operator === 'concat') return (a as string) + (b as string);
    if (node.operator === 'lt') return (a as number) < (b as number);
    if (node.operator === 'gt') return (a as number) > (b as number);
    const result = node.operator === 'add' ? (a as number) + (b as number) : node.operator === 'subtract' ? (a as number) - (b as number) : node.operator === 'multiply' ? (a as number) * (b as number) : (a as number) / (b as number);
    if (!Number.isFinite(result)) throw new Error('EXPRESSION_RESULT_INVALID'); return result;
  };
  return evaluate(declaration.expression);
}
export function calculationOrder(calculations: readonly CalculatedField[], fields: readonly ExpressionField[]): CalculatedField[] {
  const known = new Map(fields.map(f => [f.fieldId, f.type])), byId = new Map(calculations.map(c => [c.fieldId, c]));
  if (known.size !== fields.length || byId.size !== calculations.length) deny();
  const ordered: CalculatedField[] = [], active = new Set<string>(), done = new Set<string>();
  const visit = (c: CalculatedField): void => {
    if (done.has(c.fieldId)) return;
    if (active.has(c.fieldId)) throw new Error('EXPRESSION_CYCLE'); active.add(c.fieldId);
    if (typeof c.persist !== 'boolean' || known.get(c.fieldId) !== c.type || expressionType(c.expression, known) !== c.type) deny();
    for (const id of expressionDependencies(c.expression)) { const next = byId.get(id); if (next) { if (c.persist && !next.persist) deny(); visit(next); } }
    active.delete(c.fieldId); done.add(c.fieldId); ordered.push(c);
  };
  calculations.forEach(visit); return ordered;
}
export function calculateFields(calculations: readonly CalculatedField[], fields: readonly ExpressionField[], row: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const values: Record<string, unknown> = Object.create(null);
  for (const field of fields) if (Object.hasOwn(row, field.key)) values[field.fieldId] = row[field.key];
  const result = { ...row };
  for (const c of calculationOrder(calculations, fields)) { const value = evaluateDeclarative(c.expression, values); values[c.fieldId] = value; result[fields.find(f => f.fieldId === c.fieldId)!.key] = value; }
  return result;
}
/** Compatibility branch for established presentation declarations, in this same evaluator. */
export type PresentationExpression = string | { literal: unknown } | { op: 'not' | 'eq' | 'and' | 'or'; args: PresentationExpression[] } | DeclarativeExpression;
export function evaluatePresentation(expression: PresentationExpression, scope: Record<string, unknown>): unknown {
  if (typeof expression === 'string') {
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expression)) throw new Error(`Expected a named-source path: ${expression}`);
    let value: unknown = scope;
    for (const part of expression.split('.')) { if (unsafe.has(part)) throw new Error('Unsafe binding path.'); value = value != null && Object.hasOwn(Object(value), part) ? (value as Record<string, unknown>)[part] : undefined; } return value;
  }
  if ('version' in expression) return evaluateDeclarative(expression, (scope.fields ?? {}) as Record<string, unknown>);
  if ('literal' in expression) return structuredClone(expression.literal);
  const args = expression.args.map(arg => evaluatePresentation(arg, scope));
  if (expression.op === 'not') return !args[0];
  if (expression.op === 'eq') return args[0] === args[1];
  if (expression.op === 'and') return args.every(Boolean);
  if (expression.op === 'or') return args.some(Boolean);
  return deny();
}
