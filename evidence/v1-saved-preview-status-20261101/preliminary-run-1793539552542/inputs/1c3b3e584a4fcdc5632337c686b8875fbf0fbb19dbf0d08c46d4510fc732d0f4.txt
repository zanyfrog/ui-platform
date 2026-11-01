export const VALIDATION_STATES = Object.freeze({
  VALID: 'valid',
  INVALID: 'invalid',
  WARNING: 'warning',
  INFO: 'info'
});

function isEmpty(value) {
  return value === null || value === undefined || String(value).length === 0;
}

function hasConstraint(value) {
  return value !== null && value !== undefined && String(value) !== '';
}

export function validateValue(value, constraints = {}) {
  const label = constraints.label || constraints.name || 'Value';

  if (constraints.required && isEmpty(value)) {
    return {
      valid: false,
      state: VALIDATION_STATES.INVALID,
      message: constraints.error || `${label} is required.`
    };
  }

  if (!isEmpty(value) && hasConstraint(constraints.minlength)) {
    const minLength = Number(constraints.minlength);
    if (Number.isFinite(minLength) && String(value).length < minLength) {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: constraints.error || `${label} must be at least ${minLength} characters.`
      };
    }
  }

  if (!isEmpty(value) && hasConstraint(constraints.maxlength)) {
    const maxLength = Number(constraints.maxlength);
    if (Number.isFinite(maxLength) && String(value).length > maxLength) {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: constraints.error || `${label} must be no more than ${maxLength} characters.`
      };
    }
  }

  if (!isEmpty(value) && constraints.pattern) {
    try {
      const pattern = new RegExp(constraints.pattern);
      if (!pattern.test(String(value))) {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: constraints.error || `${label} is not in the expected format.`
        };
      }
    } catch {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: `The validation pattern for ${label} is invalid.`
      };
    }
  }

  if (!isEmpty(value) && constraints.type === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(String(value))) {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: constraints.error || `${label} must be a valid email address.`
      };
    }
  }

  if (!isEmpty(value) && constraints.type === 'number') {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: constraints.error || `${label} must be a number.`
      };
    }

    if (hasConstraint(constraints.min) && numberValue < Number(constraints.min)) {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: constraints.error || `${label} must be at least ${constraints.min}.`
      };
    }

    if (hasConstraint(constraints.max) && numberValue > Number(constraints.max)) {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: constraints.error || `${label} must be no more than ${constraints.max}.`
      };
    }
  }

  return {
    valid: true,
    state: VALIDATION_STATES.VALID,
    message: ''
  };
}
