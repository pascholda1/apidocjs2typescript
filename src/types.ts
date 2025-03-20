export enum ParameterGroup {
  Header    = 'Header',
  Path      = 'Path',
  Query     = 'Query',
  Body      = 'Body',
  Parameter = 'Parameter'
};

export interface ApiProject {
  name: string;
}

export interface ApiParam {
  group: string;
  type?: string;
  optional: boolean;
  field: string;
  allowedValues?: string[];
  description?: string;
}

export type ApiFields = Partial<Record<ParameterGroup, ApiParam[]>>

export interface ApiFieldGroup {
  fields?: ApiFields,
}

export interface ApiAction {
  type: string;
  name: string;
  group: string;
  deprecated?: boolean | {
    content: string
  };
  description: string,
  parameter?: ApiFieldGroup;
  header?: ApiFieldGroup;
  body?: ApiParam[];
  success: {
    fields: {
      'Success 200': ApiParam[];
      201: ApiParam[];
      204: ApiParam[];
      400: ApiParam[];
      403: ApiParam[];
      [group: string]: ApiParam[];
    };
  };
}

export type ParamGroupName = string;
export type FieldName = string;
/**
 * @description represents a single endpoint params
 */
export type ApiParamGroups = Record<ParamGroupName, ApiParams>

/**
 * @description represents param group of a single endpoint (header, path, query, body)
 */
export type ApiParams = Record<FieldName, ApiParam>

// nested fields
export interface NestedApiParam extends ApiParam {
  children?: NestedApiParams;
}

export type NestedApiParams = Record<string, NestedApiParam>;

