export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export default class Endpoint<RequestData = unknown, ResponseData = unknown> {
  readonly path: string;
  readonly method: Method;

  // @ts-expect-error - required for Type Inference
  requestData: RequestData;
  // @ts-expect-error - required for Type Inference
  responseData: ResponseData;

  constructor(path: string, method: Method) {
    this.path = path;
    this.method = method;
  }
}
