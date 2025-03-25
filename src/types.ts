export interface ApiParam {
  group: string;
  type?: string;
  optional: boolean;
  field: string;
  allowedValues?: string[];
  description?: string;
}

export type ApiFields = Record<string, ApiParam[]>

export interface ApiFieldGroup {
  fields?: ApiFields,
}

export interface ApiAction {
  type: string;
  name: string;
  group: string;
  url: string;
  deprecated?: boolean | {
    content: string
  };
  description: string,
  parameter?: ApiFieldGroup;
  header?: ApiFieldGroup;
  body?: ApiParam[];
  query?: ApiParam[];
  success?: ApiFieldGroup;
}

export type ParamGroupName = string;
export type FieldName = string;

// nested fields
export interface NestedApiParam extends ApiParam {
  children?: NestedApiParams;
}

export type NestedApiParams = Record<string, NestedApiParam>;

