import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsSafeText(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeText',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          // 1. Check for HTML/Script injection
          const htmlTagPattern = /<\/?[a-z][a-z0-9]*\b[^>]*>/i;
          const javascriptUriPattern = /javascript:/i;
          const eventHandlerPattern = /\bon[a-z]+\s*=/i;

          if (
            htmlTagPattern.test(value) ||
            javascriptUriPattern.test(value) ||
            eventHandlerPattern.test(value)
          ) {
            return false;
          }

          // 2. Check for SQL Injection patterns
          const sqlTautologyPattern =
            /\b(or|and)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/i;
          const sqlUnionPattern = /\bunion\s+(all\s+)?select\b/i;
          const sqlCommandsPattern =
            /\b(drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set|truncate\s+table|alter\s+table)\b/i;

          if (
            sqlTautologyPattern.test(value) ||
            sqlUnionPattern.test(value) ||
            sqlCommandsPattern.test(value)
          ) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains unsafe content (HTML/scripts or potential SQL injection patterns).`;
        },
      },
    });
  };
}
