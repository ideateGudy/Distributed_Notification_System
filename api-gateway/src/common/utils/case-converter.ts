// Per project spec, all req/res should be snake_case
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { snakeCase, camelCase } from 'lodash';

class CaseConverter {
  toSnakeCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.toSnakeCase(item));
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.keys(obj).reduce((acc, key) => {
        const newKey = snakeCase(key);
        acc[newKey] = this.toSnakeCase(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }

  toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.toCamelCase(item));
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.keys(obj).reduce((acc, key) => {
        const newKey = camelCase(key);
        acc[newKey] = this.toCamelCase(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */

// Export a singleton instance
export const caseConverter = new CaseConverter();
