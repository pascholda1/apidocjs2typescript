export type Method = 'GET' | 'POST'

export default class Endpoint<RequestData = unknown, ResponseData = unknown> {
  readonly url: string;
  readonly method: Method;

  // @ts-expect-error - required for Type Inference
  requestData: RequestData;
  // @ts-expect-error - required for Type Inference
  responseData: ResponseData;

  constructor(path: string, method: Method) {
    this.url = path;
    this.method = method;
  }
}
