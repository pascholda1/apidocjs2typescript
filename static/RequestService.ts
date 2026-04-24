import Endpoint                                                  from './Endpoint';
import {RequestServiceError}                                     from './RequestServiceError';
import {type BooleanOptional, type IStringifyOptions, stringify} from 'qs';

interface BaseRequest {
  header?: object;
  path?: object;
  query?: object;
  body?: object;
}

export class RequestService<RequestData extends BaseRequest, ResponseData = unknown> {
  private readonly baseUrl: string;
  private readonly endpoint: Endpoint<RequestData, ResponseData>;
  public qsStringifyOptions: undefined | IStringifyOptions<BooleanOptional>;

  constructor(endpoint: Endpoint<RequestData, ResponseData>, baseUrl: string) {

    this.baseUrl = baseUrl;

    this.endpoint = endpoint;
  }

  sendRequest(data: typeof this.endpoint.requestData, responseType?: 'json'): Promise<typeof this.endpoint.responseData>;
  sendRequest(data: typeof this.endpoint.requestData, responseType: 'blob'): Promise<Blob>;
  sendRequest(data: typeof this.endpoint.requestData, responseType: 'arraybuffer'): Promise<ArrayBuffer>;
  sendRequest(data: typeof this.endpoint.requestData, responseType: 'text' | ''): Promise<string>;
  sendRequest(data: typeof this.endpoint.requestData, responseType: XMLHttpRequestResponseType = 'json'): Promise<typeof this.endpoint.responseData | Blob | ArrayBuffer | string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (data) {
        const url = new URL(this.baseUrl + this.endpoint.path);

        // set path params to URL
        const {path = {}} = data;
        Object.entries(path)
            .forEach(([name, value]) => {
              url.pathname = this.endpoint.path.replace(`:${name}`, value);
            });

        // set query params
        const {query} = data;
        if (query) {
          url.search = stringify(query, this.qsStringifyOptions);
        }

        xhr.open(this.endpoint.method, url, true);

        // responseType and headers must be set after open()
        xhr.responseType = responseType;

        const {header = {}} = data;
        Object.entries(header)
            .forEach(([name, value]) => {
              xhr.setRequestHeader(name, value);
            });

        if (this.endpoint.method !== 'GET' && data.body) {
          xhr.setRequestHeader('Content-Type', 'application/json');
        }
      } else {
        xhr.open(this.endpoint.method, this.endpoint.path, true);
        xhr.responseType = responseType;
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);

        } else {
          reject(new RequestServiceError(
              xhr.status,
              `Fehler ${xhr.status}: ${xhr.statusText}`,
              xhr.response || xhr.statusText,
          ));
        }
      };

      xhr.onerror = () => reject(new RequestServiceError(901, 'Network error'));

      if (this.endpoint.method === 'GET' || !data?.body) {
        xhr.send();
      } else {
        xhr.send(JSON.stringify(data?.body));
      }
    });
  }
}
