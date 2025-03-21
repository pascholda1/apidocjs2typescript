# (WIP) ApiDocJS2TypeScript

[APIDOC](http://apidocjs.com) to the Typescript Generator.

The generator creates a ready-to-use API connection based on your ApiDocJs documentation.

## Installation

```
npm install apidocjs2typescript
```

## Usage

Make sure you use [APIDOC](http://apidocjs.com) correctly

- use `@apiHeader` for headers
- use `@apiParam` for path and query parameters
- use `@apiBody` for body parameters

Generate the documentation

Finally run `apidocjs2typescript ./path/to/documentation ./output/path`

Now you can use the shipped RequestService with a generated Endpoint definition to make API Calls. See the Example below for more details

## Example

The following sample will show how the generator will work.

The Documentation:

```injectablephp
/**
 * @apiVersion     1.0.0
 * @api            {post} /your/endpoint/:pageId.json
 * @apiName        SampleAction
 * @apiDescription This is a simple sample
 * @apiGroup       Samples
 * @apiDeprecated
 * @apiHeader {String=application/x-www-form-urlencoded,multipart/formdata,application/json} Content-Type
 * @apiParam {String} pageId     a path param
 * @apiParam {String} search    a query param
 * @apiBody {String[]} product          list of products
 * @apiBody {String=de,en} [language]   
 *               
 * @apiBody {Number} [no]   a number parameter
 *               
 * @apiBody {Object} nested a nested field
 * @apiBody {String} nested.value1 dot notation nesting
 * @apiBody {Object} nested[value2] bracket notation nesting
 * @apiBody {String} nested[value2].deepValue mixed notation nesting
 */
```

The generated Request Interface:

```typescript

export interface SampleActionRequest {

  header: {

    'Content-Type': 'application/x-www-form-urlencoded' | 'multipart/formdata' | 'application/json'
  };

  path: {
    pageId: string
  };

  query: {
    search: string
  };

  body: {
    /**
     * @description <p>list of products (possible products are SC, SCX, SC_INT, FK, NC, EM, EMX, PB, PBT, VATID, VATIDX)</p>
     */

    product: string[]

    language?: 'de' | 'en'

    /**
     * @description <p>a number parameter</p>
     */
    no: number

    /**
     * @description <p>a nested field</p>
     */
    nested: {
      /**
       * @description <p>dot notation nesting</p>
       */
      value1: string

      /**
       * @description <p>bracket notation nesting</p>
       */
      value2: {

        /**
         * @description <p>mixed notation nesting</p>
         */
        deepValue?: string
      }
    }
  };
}
```

The generated Endpoint:

```typescript
export const SampleActionEndpoint = new Endpoint<PostSingleRequest, unknown>(
    new URL('/your/endpoint/:pageId.json'),
    'POST'
);
```

The generated Response Interface:

```typescript
// TODO
```

Make an API Call to the generated Endpoint:

```typescript
import {RequestService}       from './output/path/RequestService';
import {SampleActionEndpoint} from './output/path/ApiName/endpoints/Secure.Files';
import {RequestServiceError}  from './output/path/RequestServiceError';

new RequestService(SampleActionEndpoint)
    .sendRequest({
      header: {
        'Content-Type': 'multipart/formdata,application/json',
      },
      path: {
        pageId: 'sample',
      },
      query: {
        search: 'sample',
      },
      body: {
        product: ['p1', 'p2'],
        no: 1,
        nested: {
          value1: 'value1',
          value2: {
            deepValue: 'deeeep',
          },
        },
      },
    })
    .then(result => console.log(result))
    .catch((error: RequestServiceError) => console.error(error));
```
