#!/usr/bin/env node

import path      from 'path';
import fs        from 'fs';
import util      from 'util';
import lodashSet from 'lodash.set';
// import lodashUpperFirst from 'lodash.upperfirst';
// import lodashMerge      from 'lodash.merge';

import {
  // ApiFields,
  ApiAction,
  ApiParam,
  ApiProject,
  NestedApiParams,
}                         from './types';
import TypeScriptRenderer from './TypeScriptRenderer';

export default class ApiDocJS2TypeScript {
  static readonly DEFAULT_API_GROUP: string = 'nogroup';

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

  private getRequestInterfaceName(apiAction: ApiAction) {
    return apiAction.name + 'Request';
  }

  private getRequestHeaderParameters(action: ApiAction): ApiParam[] {
    return [
      ...action.header?.fields?.Header ?? [],
      ...action.parameter?.fields?.Header ?? [],
    ];
  }

  private getRequestQueryParameters(action: ApiAction): ApiParam[] {
    return action.parameter?.fields?.Query ?? [];
  }

  private getRequestPathParameters(action: ApiAction): ApiParam[] {
    return action.parameter?.fields?.Path ?? [];
  }

  private getRequestBodyParameters(action: ApiAction): ApiParam[] {
    return [
      ...action.body ?? [],
      ...action.parameter?.fields?.Body ?? [],
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

  protected static nestedFields(apiParams: ApiParam[]): NestedApiParams {
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

        lodashSet(responseFields, paramNesting, param);
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

  public generateRequestModels() {

    const files = this.groupedActions;

    for (const filename in files) {
      const renderedActions = files[filename]
          .map(apiAction => {
            const requestParams: NestedApiParams = {
              header: {
                field: 'header',
                optional: this.getRequestHeaderParameters(apiAction).length === 0,
                group: 'header',
                children: ApiDocJS2TypeScript.nestedFields(this.getRequestHeaderParameters(apiAction)),
              },
              path: {
                field: 'path',
                optional: this.getRequestPathParameters(apiAction).length === 0,
                group: 'path',
                children: ApiDocJS2TypeScript.nestedFields(this.getRequestPathParameters(apiAction)),
              },
              query: {
                field: 'query',
                optional: this.getRequestQueryParameters(apiAction).length === 0,
                group: 'query',
                children: ApiDocJS2TypeScript.nestedFields(this.getRequestQueryParameters(apiAction)),
              },
              body: {
                field: 'body',
                optional: this.getRequestBodyParameters(apiAction).length === 0,
                group: 'body',
                children: ApiDocJS2TypeScript.nestedFields(this.getRequestBodyParameters(apiAction)),
              },
            };

            return [
              TypeScriptRenderer.renderJSDocsInterfaceComment(apiAction),
              TypeScriptRenderer.renderInterface(this.getRequestInterfaceName(apiAction), requestParams),
            ].join('\n');
          });

      const out = path.join(this.outputPath, this.apiName, 'requests');
      if (!fs.existsSync(out)) {
        fs.mkdirSync(out, {recursive: true});
      }

      fs.writeFileSync(
          path.join(out, `${filename}.ts`),
          renderedActions.join('\n'),
      );

    }

  }

  public generateResponseModels() {
    // TODO: implement response model generation
  }

  public generateEndpointDefinitions() {

    const files = this.groupedActions;

    for (const filename in files) {
      let imports = 'import Endpoint from \'../../Endpoint\'';
      const renderedEndpoints = files[filename]
          .map(apiAction => {

            imports += `
            import type {${this.getRequestInterfaceName(apiAction)}} from '../requests/${filename}'`;

            return `export const ${apiAction.name}Endpoint = new Endpoint<${this.getRequestInterfaceName(apiAction)}, unknown>(
  new URL('${apiAction.url}'),
  '${apiAction.type.toUpperCase()}'
);`;
          });

      const out = path.join(this.outputPath, this.apiName, 'endpoints');
      if (!fs.existsSync(out)) {
        fs.mkdirSync(out, {recursive: true});
      }

      fs.writeFileSync(
          path.join(out, `${filename}.ts`),
          `${imports}
${renderedEndpoints.join('\n')}`,
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
