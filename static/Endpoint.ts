export type Method = 'GET' | 'POST'

export default class Endpoint<RequestData = unknown, ResponseData = unknown> {
  readonly url: URL;
  readonly method: Method;

  // @ts-expect-error
  requestData: RequestData;
  // @ts-expect-error
  responseData: ResponseData;

  constructor(path: URL, method: Method) {
    this.url = path;
    this.method = method;
  }
}
