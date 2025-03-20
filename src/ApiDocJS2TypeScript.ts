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
    console.log(baseDir, typeof path);

    this.docsPath = path.join(baseDir, docsPath);
    this.outputPath = path.join(baseDir, outputPath);

    const apiProjectFile = path.join(this.docsPath, 'api_project.json');
    const apiProject: ApiProject = JSON.parse(fs.readFileSync(apiProjectFile, {encoding: 'utf-8'}));
    this.apiName = apiProject.name;

    const apiDataFile = path.join(this.docsPath, 'api_data.json');
    this.apiActions = JSON.parse(fs.readFileSync(apiDataFile, {encoding: 'utf-8'}));

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

    console.log('nesting -----------');
    console.log(JSON.stringify(responseFields));

    return responseFields;
  }

  public generateRequestModels() {
    const renderer = new TypeScriptRenderer();

    const files: Record<string, ApiAction[]> = {};
    this.apiActions.forEach(apiAction => {
      files[apiAction.group] ??= [];
      files[apiAction.group].push(apiAction);
    });

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
              renderer.renderJSDocsInterfaceComment(apiAction),
              renderer.renderInterface(apiAction.name + 'Request', requestParams),
            ].join('\n');
          });

      const out = path.join(this.outputPath, this.apiName, 'request');
      if (!fs.existsSync(out)) {
        fs.mkdirSync(out, {recursive: true});
      }

      fs.writeFileSync(
          path.join(out, `${filename}.ts`),
          renderedActions.join('\n'),
      );

    }

  }

}
