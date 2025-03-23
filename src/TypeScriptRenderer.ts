import {ApiAction, ApiParam, NestedApiParams} from './types';
import TypeHelper                             from './helper/TypeHelper';

type JsDocParamName = `@${string}`
type JsDocParams = Record<JsDocParamName, string | null>

export default class TypeScriptRenderer {

  public static renderInterface(name: string, fields: NestedApiParams) {
    return `export interface ${name} {
      ${TypeScriptRenderer.renderNestedParams(fields)}
    }`;
  }

  private static renderNestedParams(fields: NestedApiParams): string {
    let renderedFields: string[] = [];

    for (const name in fields) {
      const field = fields[name];
      if (field.children) {
        const optionalModifier = TypeHelper.getOptionalModifier(field);
        const docs = TypeScriptRenderer.renderJSDocsParameterComment(field);
        const array = field.type && TypeHelper.isArrayType(field.type) ? '[]' : '';
        renderedFields.push(`${docs}
        ${name}${optionalModifier}: {
        ${TypeScriptRenderer.renderNestedParams(field.children)}
        }${array}`);
      } else {
        renderedFields.push(TypeScriptRenderer.renderApiParam(name, field));
      }
    }

    return renderedFields.join('\n');
  }

  private static renderApiParam(name: string, apiParam: ApiParam) {
    const type = apiParam.type ? TypeHelper.getTsType(apiParam) : 'any';
    const fieldName = RegExp(/[-\s.]/).exec(name) ? `'${name}'` : name;
    const optionalModifier = TypeHelper.getOptionalModifier(apiParam);
    const docs = TypeScriptRenderer.renderJSDocsParameterComment(apiParam);

    return `
    ${docs}
    ${fieldName}${optionalModifier}:${type}`;
  }

  private static renderJSDocsParameterComment(apiParam: ApiParam): string {
    if (!apiParam.description) {
      return '';
    }

    return TypeScriptRenderer.renderJsDocComment({
      '@description': apiParam.description,
    });
  }

  public static renderJSDocsActionComment(apiAction: ApiAction): string {
    let jsDocParams: JsDocParams = {};
    if (apiAction.deprecated) {
      if (typeof apiAction.deprecated === 'boolean') {
        jsDocParams['@deprecated'] = null;
      } else {
        const {content} = apiAction.deprecated;
        jsDocParams['@deprecated'] = content;
      }
    }

    if (apiAction.description) {
      jsDocParams['@description'] = apiAction.description;
    }

    return TypeScriptRenderer.renderJsDocComment(jsDocParams);
  }

  private static renderJsDocComment(jsDocParams: JsDocParams) {
    const params = Object.entries(jsDocParams)
        .map(([name, value]) => {
          const valueString = value !== null
                              ? value.split('\n').join('\n  *')
                              : '';
          return [' *', name, valueString].join(' ');
        });

    if (params.length === 0) {
      return '';
    }

    return `/**
${params.join('\n')}
 */`;
  }

  public static renderTypeImport(type: string, from: string) {
    return `import type {${type}} from '${from}'`;
  }

  public static renderEndpointDefinition(apiAction: ApiAction, requestInterfaceName: string, responseInterfaceName: string) {
    return `
${TypeScriptRenderer.renderJSDocsActionComment(apiAction)}
export const ${apiAction.name}Endpoint = new Endpoint<${requestInterfaceName}, ${responseInterfaceName}>(
  new URL('${apiAction.url}'),
  '${apiAction.type.toUpperCase()}'
);`;
  }
}
