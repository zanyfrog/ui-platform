import type { Expression } from './model.js';
const denied = new Set(['__proto__', 'prototype', 'constructor']);
export function evaluate(expression: Expression, scope: Record<string, unknown>): unknown {
  if (typeof expression === 'string') {
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expression)) throw new Error(`Expected a named-source path: ${expression}`);
    let value: unknown = scope;
    for (const part of expression.split('.')) {
      if (denied.has(part)) throw new Error('Unsafe binding path.');
      value = value != null && Object.prototype.hasOwnProperty.call(Object(value), part) ? (value as Record<string, unknown>)[part] : undefined;
    }
    return value;
  }
  if ('literal' in expression) return structuredClone(expression.literal);
  const args = expression.args.map(arg => evaluate(arg, scope));
  if (expression.op === 'not') return !args[0];
  if (expression.op === 'eq') return args[0] === args[1];
  if (expression.op === 'and') return args.every(Boolean);
  if (expression.op === 'or') return args.some(Boolean);
  throw new Error('Unsupported expression operator.');
}
