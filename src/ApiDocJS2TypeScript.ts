#!/usr/bin/env node

import path from 'path';
import fs   from 'fs';
import util from 'util';
import _set from 'lodash.set';

import {
  // ApiFields,
  ApiAction,
  ApiFields,
  ApiParam,
  ApiProject,
  NestedApiParams,
}                         from './types';
import TypeScriptRenderer from './TypeScriptRenderer';

export default class ApiDocJS2TypeScript {
  private readonly docsPath: string;
  private readonly outputPath: string;

  /**
   * @description The Name of the API. Will be used as root directory name
   *
   * @private
   */
  private readonly apiName: string;
  private readonly apiActions: ApiAction[];

  constructor(docsPath: string, outputPath: string = 'types') {
    const baseDir = process.cwd();

    this.docsPath = path.join(baseDir, docsPath);
    this.outputPath = path.join(baseDir, outputPath);

    const apiProjectFile = path.join(this.docsPath, 'api_project.json');
    const apiProject: ApiProject = JSON.parse(fs.readFileSync(apiProjectFile, {encoding: 'utf-8'}));
    this.apiName = apiProject.name;

    const apiDataFile = path.join(this.docsPath, 'api_data.json');
    this.apiActions = JSON.parse(fs.readFileSync(apiDataFile, {encoding: 'utf-8'}));

  }

  // getters
  private getRequestInterfaceName(apiAction: ApiAction) {
    return apiAction.name + 'Request';
  }

  private getResponseInterfaceName(apiAction: ApiAction) {
    return apiAction.name + 'Response';
  }

  private getRequestHeaderParameters(action: ApiAction): ApiParam[] {
    if (!action.header?.fields) {
      return [];
    }

    return this.getParameters(action.header?.fields);
  }

  private getRequestPathParameters(action: ApiAction): ApiParam[] {
    if (!action.parameter?.fields) {
      return [];
    }

    const url = action.url;
    return this.getParameters(action.parameter.fields)
        .filter(parameter => url.includes(`:${parameter.field}`));
  }

  private getRequestQueryParameters(action: ApiAction): ApiParam[] {
    if (!action.parameter?.fields) {
      return [];
    }

    const pathParameters = this.getRequestPathParameters(action);
    return this.getParameters(action.parameter.fields)
        .filter(parameter => !pathParameters.find(pathParam => pathParam.field === parameter.field));
  }

  private getParameters(apiFields: ApiFields): ApiParam[] {
    return Object.values(apiFields).flat();
  }

  private getRequestBodyParameters(action: ApiAction): ApiParam[] {
    return [
      ...action.body ?? [],
    ];
  }

  private get groupedActions(): Record<string, ApiAction[]> {
    const files: Record<string, ApiAction[]> = {};
    this.apiActions.forEach(apiAction => {
      files[apiAction.group] ??= [];
      files[apiAction.group].push(apiAction);
    });

    return files;
  }

  // supporting
  private static nestedFields(apiParams: ApiParam[]): NestedApiParams {
    const responseFields: NestedApiParams = {};
    let prevTopLevelField: string | undefined;

    for (const param of apiParams) {
      const paramNesting = param.field
          .replace(/\[([\w-]+)]/gi, '.$1')
          .replace(/\./g, '.children.')
          .split('.');

      if (paramNesting.length > 1) {
        if (!paramNesting[0]) {
          if (!prevTopLevelField) {
            throw new Error(`For field ${util.format(param)} can't found top level field`);
          }
          paramNesting[0] = prevTopLevelField;
        }

        // param.field = paramNesting.slice().pop()!;

        _set(responseFields, paramNesting, param);
      } else {

        if (!responseFields[param.field]) {
          responseFields[param.field] = param;
        } else {
          responseFields[param.field] = Object.assign(responseFields[param.field], param);
        }

        prevTopLevelField = param.field;
      }

    }

    return responseFields;
  }

  private writeOutputFile(filename: string, content: string) {
    const out = path.dirname(filename);
    if (!fs.existsSync(out)) {
      fs.mkdirSync(out, {recursive: true});
    }

    fs.writeFileSync(
        filename,
        content,
    );
  }

  // generate functions
  public generateRequestModels() {

    const files = this.groupedActions;

    for (const filename in files) {
      const renderedActions = files[filename]
          .map(apiAction => {
            const headerParams = this.getRequestHeaderParameters(apiAction);
            const pathParams = this.getRequestPathParameters(apiAction);
            const queryParams = this.getRequestQueryParameters(apiAction);
            const bodyParams = this.getRequestBodyParameters(apiAction);

            const requestParams: NestedApiParams = {
              header: {
                field: 'header',
                optional: headerParams.length === 0,
                group: 'header',
                children: ApiDocJS2TypeScript.nestedFields(headerParams),
              },
              path: {
                field: 'path',
                optional: pathParams.length === 0,
                group: 'path',
                children: ApiDocJS2TypeScript.nestedFields(pathParams),
              },
              query: {
                field: 'query',
                optional: queryParams.length === 0,
                group: 'query',
                children: ApiDocJS2TypeScript.nestedFields(queryParams),
              },
              body: {
                field: 'body',
                optional: bodyParams.length === 0,
                group: 'body',
                children: ApiDocJS2TypeScript.nestedFields(bodyParams),
              },
            };

            return [
              TypeScriptRenderer.renderJSDocsActionComment(apiAction),
              TypeScriptRenderer.renderInterface(this.getRequestInterfaceName(apiAction), requestParams),
            ].join('\n');
          });

      this.writeOutputFile(
          path.join(this.outputPath, this.apiName, 'requests', `${filename}.ts`),
          renderedActions.join('\n'),
      );

    }

  }

  public generateResponseModels() {

    const files = this.groupedActions;

    for (const filename in files) {
      const renderedActions = files[filename]
          .map(apiAction => {
            if (!apiAction.success?.fields) {
              return `export type ${apiAction.name}Response = unknown`;
            }

            return TypeScriptRenderer.renderInterface(this.getResponseInterfaceName(apiAction), ApiDocJS2TypeScript.nestedFields(this.getParameters(apiAction.success.fields)));

          });

      this.writeOutputFile(
          path.join(this.outputPath, this.apiName, 'responses', `${filename}.ts`),
          renderedActions.join('\n'),
      );
    }
  }

  public generateEndpointDefinitions() {

    const files = this.groupedActions;

    for (const filename in files) {
      const imports = [`import Endpoint from '../../Endpoint'`];
      const renderedEndpoints = files[filename]
          .map(apiAction => {

            imports.push(TypeScriptRenderer.renderTypeImport(this.getRequestInterfaceName(apiAction), `../requests/${filename}`));
            imports.push(TypeScriptRenderer.renderTypeImport(this.getResponseInterfaceName(apiAction), `../responses/${filename}`));

            return TypeScriptRenderer.renderEndpointDefinition(apiAction, this.getRequestInterfaceName(apiAction), this.getResponseInterfaceName(apiAction));
          });

      this.writeOutputFile(
          path.join(this.outputPath, this.apiName, 'endpoints', `${filename}.ts`),
          [...imports, ...renderedEndpoints].join('\n'),
      );
    }
  }

  public copyStaticClasses() {
    const sourceDir = path.join(__dirname, '../static');

    fs.mkdirSync(this.outputPath, {recursive: true});

    const items = fs.readdirSync(sourceDir);

    items.forEach(item => {
      const sourcePath = path.join(sourceDir, item);
      const destPath = path.join(this.outputPath, item);

      fs.cpSync(sourcePath, destPath);
    });
  }

}
