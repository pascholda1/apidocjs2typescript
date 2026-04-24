import {ApiAction, ApiParam, NestedApiParams} from './types';
import TypeHelper                             from './helper/TypeHelper';
import {TypeCollector}                        from './helper/TypeCollector';
import {toValidInterfaceName}                 from './helper/FormatHelper';

type JsDocParamName = `@${string}`
type JsDocParams = Record<JsDocParamName, string | null>

export default class TypeScriptRenderer {

  public static renderInterface(name: string, fields: NestedApiParams, collector: TypeCollector, topLevelNoDedup = false) {
    return `export interface ${name} {
      ${TypeScriptRenderer.renderNestedParams(fields, collector, name, 0, topLevelNoDedup)}
    }`;
  }

  public static renderArrayTypeAlias(name: string, itemFields: NestedApiParams, collector: TypeCollector) {
    return `export type ${name} = {
      ${TypeScriptRenderer.renderNestedParams(itemFields, collector, name)}
    }[];`;
  }

  private static renderNestedParams(fields: NestedApiParams, collector: TypeCollector, parentTypeName: string, depth = 0, topLevelNoDedup = false): string {
    let renderedFields: string[] = [];

    const forceUnique = topLevelNoDedup && depth === 0;

    for (const name in fields) {
      const field = fields[name];
      if (field.children) {
        const childTypeName = toValidInterfaceName(name);
        const isArray = field.type && TypeHelper.isArrayType(field.type);
        // Use the predicted resolved name as parentTypeName so that conflict
        // resolution at deeper levels produces unique, interface-scoped names.
        // For forceUnique parents the resolved name is deterministic; for
        // non-forceUnique parents childTypeName is the best available guess.
        const predictedChildName = forceUnique
            ? `${parentTypeName}${childTypeName}`
            : childTypeName;
        const childBody = TypeScriptRenderer.renderNestedParams(field.children, collector, predictedChildName, depth + 1, topLevelNoDedup);
        const resolvedName = collector.register(childTypeName, childBody, parentTypeName, false, forceUnique);
        const optionalModifier = TypeHelper.getOptionalModifier(field);
        const docs = TypeScriptRenderer.renderJSDocsParameterComment(field);
        const array = isArray ? '[]' : '';
        renderedFields.push(`${docs}
        ${name}${optionalModifier}: ${resolvedName}${array}`);
      } else {
        renderedFields.push(TypeScriptRenderer.renderApiParam(name, field, collector, parentTypeName, forceUnique));
      }
    }

    return renderedFields.join('\n');
  }

  private static renderApiParam(name: string, apiParam: ApiParam, collector: TypeCollector, parentTypeName: string, forceUnique = false) {
    let type: string;
    if (apiParam.allowedValues && apiParam.type && TypeHelper.isStringType(apiParam.type)) {
      const unionBody = apiParam.allowedValues
          .map(v => {
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
              return v;
            }
            return `'${v}'`;
          })
          .join(' | ');
      type = collector.register(toValidInterfaceName(name), unionBody, parentTypeName, true, forceUnique);
    } else {
      type = apiParam.type ? TypeHelper.getTsType(apiParam) : 'any';
    }

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
  '${apiAction.url}',
  '${apiAction.type.toUpperCase()}'
);`;
  }
}
