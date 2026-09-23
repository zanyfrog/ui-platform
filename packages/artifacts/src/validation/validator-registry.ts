import type {
  ValueValidator,
  ValidatorConfiguration,
  ValidationDiagnostic,
} from "../types.js";

export const requiredValidator: ValueValidator = {
  name: "required",
  validateConfiguration: () => undefined,
  validate: (value, config) =>
    value == null ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && !value.length)
      ? (config.message ?? "This field is required.")
      : undefined,
};
export const maxLengthValidator: ValueValidator = {
  name: "max-length",
  validateConfiguration: (config) =>
    Number.isInteger(config.max) && Number(config.max) > 0
      ? undefined
      : "max-length requires a positive integer max.",
  validate: (value, config) =>
    value != null &&
    (typeof value !== "string" || value.length > Number(config.max))
      ? (config.message ?? `Must contain at most ${config.max} characters.`)
      : undefined,
};
export class ValidatorRegistry {
  private readonly entries = new Map<string, ValueValidator>();
  constructor() {
    this.register(requiredValidator);
    this.register(maxLengthValidator);
  }
  register(validator: ValueValidator): void {
    if (this.entries.has(validator.name))
      throw new Error(`Validator already registered: ${validator.name}`);
    this.entries.set(validator.name, validator);
  }
  get(name: string): ValueValidator | undefined {
    return this.entries.get(name);
  }
  list(): ValueValidator[] {
    return [...this.entries.values()];
  }
}
/** The same validator implementations serve browser/form and server/submission callers. */
export function validateValue(
  value: unknown,
  configurations: ValidatorConfiguration[],
  registry = new ValidatorRegistry(),
  field?: string,
): ValidationDiagnostic[] {
  return configurations.flatMap((config) => {
    const validator = registry.get(config.validator);
    const configurationError = validator?.validateConfiguration(config);
    const message = !validator
      ? `Unknown validator: ${config.validator}`
      : (configurationError ?? validator.validate(value, config));
    return message
      ? [
          {
            severity: "error" as const,
            code:
              !validator || configurationError
                ? "validator.configuration"
                : `value.${config.validator}`,
            message,
            field,
          },
        ]
      : [];
  });
}
