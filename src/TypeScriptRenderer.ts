import {ApiAction, ApiParam, NestedApiParams} from './types';
import TypeHelper                             from './helper/TypeHelper';

type JsDocParamName = `@${string}`
type JsDocParams = Record<JsDocParamName, string | null>

export default class TypeScriptRenderer {

  public renderInterface(name: string, fields: NestedApiParams) {
    return `export interface ${name} {
      ${this.renderNestedParams(fields)}
    }`;
  }

  private renderNestedParams(fields: NestedApiParams): string {
    let renderedFields: string[] = [];

    for (const name in fields) {
      const field = fields[name];
      if (field.children) {
        const optionalModifier = TypeHelper.getOptionalModifier(field);
        const docs = this.renderJSDocsParameterComment(field);
        renderedFields.push(`${docs}
        ${name}${optionalModifier}: {
        ${this.renderNestedParams(field.children)}
        }`);
      } else {
        renderedFields.push(this.renderApiParam(name, field));
      }
    }

    return renderedFields.join('\n');
  }

  private renderApiParam(name: string, apiParam: ApiParam) {
    const type = apiParam.type ? TypeHelper.getTsType(apiParam) : 'any';
    const fieldName = RegExp(/[-\s.]/).exec(name) ? `'${name}'` : name;
    const optionalModifier = TypeHelper.getOptionalModifier(apiParam);
    const docs = this.renderJSDocsParameterComment(apiParam);

    return `${docs}
    ${fieldName}${optionalModifier}:${type}`;
  }

  private renderJSDocsParameterComment(apiParam: ApiParam): string {
    if (!apiParam.description) {
      return '';
    }

    return this.renderJsDocComment({
      '@description': apiParam.description,
    });
  }

  public renderJSDocsInterfaceComment(apiHandler: ApiAction): string {
    let jsDocParams: JsDocParams = {};
    if (apiHandler.deprecated) {
      if (typeof apiHandler.deprecated === 'boolean') {
        jsDocParams['@deprecated'] = null;
      } else {
        const {content} = apiHandler.deprecated;
        jsDocParams['@deprecated'] = content;
      }
    }

    if (apiHandler.description) {
      jsDocParams['@description'] = apiHandler.description;
    }

    return this.renderJsDocComment(jsDocParams);
  }

  private renderJsDocComment(jsDocParams: JsDocParams) {
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
     */
    `;
  }
}
