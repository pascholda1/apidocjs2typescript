import {ApiParam} from '../types';

export default class TypeHelper {
  private static readonly stringTypes: Record<string, 'string'> = {
    'string': 'string',
    'char': 'string',
    'character': 'string',
  };

  private static readonly numberTypes: Record<string, 'number'> = {
    'number': 'number',
    'int': 'number',
    'long': 'number',
    'float': 'number',
    'double': 'number',
  };

  private static readonly booleanTypes: Record<string, 'boolean'> = {
    'boolean': 'boolean',
    'bool': 'boolean',
  };

  private static readonly objectTypes: Record<string, 'object'> = {
    'object': 'object',
    'record': 'object',
    'dictionary': 'object',
  };

  private static get arrayTypes(): Record<string, string> {
    const allTypes: Record<string, string> = {
      ...TypeHelper.stringTypes,
      ...TypeHelper.numberTypes,
      ...TypeHelper.booleanTypes,
      ...TypeHelper.objectTypes,
    };

    const arrayTypeEntries = Object.entries(allTypes)
        .map(([key, value]) => {
          return [
            key + '[]',
            value + '[]',
          ];
        });

    return Object.fromEntries(arrayTypeEntries);
  }

  private static get typeMap(): Record<string, string> {
    return {
      ...TypeHelper.stringTypes,
      ...TypeHelper.numberTypes,
      ...TypeHelper.booleanTypes,
      ...TypeHelper.objectTypes,
      ...TypeHelper.arrayTypes,
    };
  }

  public static getTsType(apiParam: ApiParam): string {
    const type = apiParam.type;
    if (!type) {
      return 'any';
    }

    if (apiParam.allowedValues) {
      if (TypeHelper.isStringType(type)) {
        return apiParam.allowedValues
            .map(allowedValue => {
              if (allowedValue.startsWith('"') && allowedValue.endsWith('"')) {
                return allowedValue;
              }

              if (allowedValue.startsWith('\'') && allowedValue.endsWith('\'')) {
                return allowedValue;
              }
              return `'${allowedValue}'`;
            })
            .join(' | ');
      }

      // TODO: impl String[]

    }

    return TypeHelper.typeMap[type.toLowerCase()] ?? type;
  }

  public static getOptionalModifier(apiParam: ApiParam) {
    return apiParam.optional ? '?' : '';
  }

  public static isStringType(type: string) {
    return !!TypeHelper.stringTypes[type.toLowerCase()];
  }

  public static isNumberType(type: string) {
    return !!TypeHelper.numberTypes[type.toLowerCase()];
  }

  public static isBoolType(type: string) {
    return !!TypeHelper.booleanTypes[type.toLowerCase()];
  }

  public static isArrayType(type: string) {
    return !!TypeHelper.arrayTypes[type.toLowerCase()];
  }
}
