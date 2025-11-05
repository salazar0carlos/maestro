/**
 * Data validation layer for API requests
 * Provides type-safe validation for tasks, agents, and other entities
 */

export interface ValidationRule {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  values?: readonly (string | number)[];
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: { [field: string]: string };
}

/**
 * Validate data against a schema
 */
export function validate(data: any, schema: ValidationSchema): ValidationResult {
  const errors: { [field: string]: string } = {};

  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const value = data[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      return;
    }

    // Skip other validations if field is not required and not provided
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return;
    }

    // Type check
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (rules.type !== actualType && rules.type !== 'enum') {
        errors[field] = `${field} must be of type ${rules.type}`;
        return;
      }
    }

    // String validations
    if (rules.type === 'string' || typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`;
        return;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field] = `${field} must be at most ${rules.maxLength} characters`;
        return;
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = `${field} has invalid format`;
        return;
      }
    }

    // Number validations
    if (rules.type === 'number' || typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors[field] = `${field} must be at least ${rules.min}`;
        return;
      }
      if (rules.max !== undefined && value > rules.max) {
        errors[field] = `${field} must be at most ${rules.max}`;
        return;
      }
    }

    // Enum validation
    if (rules.values && !rules.values.includes(value)) {
      errors[field] = `${field} must be one of: ${rules.values.join(', ')}`;
      return;
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors[field] = customError;
        return;
      }
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validation schemas for common entities
 */
export const schemas = {
  /**
   * Task creation/update validation
   */
  task: {
    title: {
      type: 'string' as const,
      required: true,
      minLength: 3,
      maxLength: 200,
    },
    description: {
      type: 'string' as const,
      required: false,
      maxLength: 2000,
    },
    ai_prompt: {
      type: 'string' as const,
      required: false,
      maxLength: 10000,
    },
    assigned_to_agent: {
      type: 'string' as const,
      required: true,
      minLength: 1,
    },
    priority: {
      type: 'number' as const,
      required: true,
      values: [1, 2, 3, 4, 5] as const,
    },
    status: {
      type: 'enum' as const,
      required: false,
      values: ['todo', 'in-progress', 'done', 'blocked'] as const,
    },
  },

  /**
   * Task update validation (partial)
   */
  taskUpdate: {
    title: {
      type: 'string' as const,
      required: false,
      minLength: 3,
      maxLength: 200,
    },
    description: {
      type: 'string' as const,
      required: false,
      maxLength: 2000,
    },
    status: {
      type: 'enum' as const,
      required: false,
      values: ['todo', 'in-progress', 'done', 'blocked'] as const,
    },
    priority: {
      type: 'number' as const,
      required: false,
      values: [1, 2, 3, 4, 5] as const,
    },
    blocked_reason: {
      type: 'string' as const,
      required: false,
      maxLength: 500,
    },
  },

  /**
   * Agent creation/update validation
   */
  agent: {
    agent_name: {
      type: 'string' as const,
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    project_id: {
      type: 'string' as const,
      required: true,
      minLength: 1,
    },
    status: {
      type: 'enum' as const,
      required: false,
      values: ['active', 'idle', 'offline'] as const,
    },
  },

  /**
   * Project creation validation
   */
  project: {
    name: {
      type: 'string' as const,
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    description: {
      type: 'string' as const,
      required: true,
      minLength: 10,
      maxLength: 1000,
    },
    github_repo: {
      type: 'string' as const,
      required: false,
      pattern: /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/,
    },
    status: {
      type: 'enum' as const,
      required: false,
      values: ['active', 'paused', 'complete'] as const,
    },
  },

  /**
   * Improvement suggestion validation
   */
  improvement: {
    title: {
      type: 'string' as const,
      required: true,
      minLength: 5,
      maxLength: 200,
    },
    description: {
      type: 'string' as const,
      required: true,
      minLength: 10,
      maxLength: 2000,
    },
    project_id: {
      type: 'string' as const,
      required: true,
      minLength: 1,
    },
    suggested_by: {
      type: 'string' as const,
      required: true,
      minLength: 1,
    },
    priority: {
      type: 'number' as const,
      required: false,
      values: [1, 2, 3, 4, 5] as const,
    },
    estimated_impact: {
      type: 'enum' as const,
      required: false,
      values: ['low', 'medium', 'high'] as const,
    },
  },

  /**
   * Improvement update validation
   */
  improvementUpdate: {
    status: {
      type: 'enum' as const,
      required: false,
      values: ['pending', 'approved', 'rejected', 'implemented'] as const,
    },
    rejection_reason: {
      type: 'string' as const,
      required: false,
      maxLength: 500,
    },
    reviewed_by: {
      type: 'string' as const,
      required: false,
    },
  },
};

/**
 * Validate task data
 */
export function validateTask(data: any): ValidationResult {
  return validate(data, schemas.task);
}

/**
 * Validate task update data
 */
export function validateTaskUpdate(data: any): ValidationResult {
  return validate(data, schemas.taskUpdate);
}

/**
 * Validate agent data
 */
export function validateAgent(data: any): ValidationResult {
  return validate(data, schemas.agent);
}

/**
 * Validate project data
 */
export function validateProject(data: any): ValidationResult {
  return validate(data, schemas.project);
}

/**
 * Validate improvement suggestion data
 */
export function validateImprovement(data: any): ValidationResult {
  return validate(data, schemas.improvement);
}

/**
 * Validate improvement update data
 */
export function validateImprovementUpdate(data: any): ValidationResult {
  return validate(data, schemas.improvementUpdate);
}
