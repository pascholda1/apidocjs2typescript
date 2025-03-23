# ApiDocJS2TypeScript

Generate a ready-to-use API client based on an [ApiDocJs](http://apidocjs.com) documentation.

## 🔧 Installation

```
npm install apidocjs2typescript
```

## 🚀 Usage

Make sure you are using [APIDOC](http://apidocjs.com) correctly

### Define the requests:

- use `@apiHeader` to define headers
- use `@apiParam` to define path parameters.
    - Path parameters **must** appear in the endpoint URL. Otherwise, the generator will log an error for each parameter that does not.
    - Path parameters **must** have a primitive type (String, Number or Boolean)
- use `@apiQuery` to define query parameters
- use `@apiBody` to define body parameters

> 📝 **Note**:
> - The generator will ignore grouping and combine all parameter groups into a single interface. Use parameter grouping only for organizational purposes.
> - Parameter size constraints (`{type{size}}`) are **not supported**.
> - A limited form of type aliasing is supported. See [Type Mapping](#type-mapping) for more details.

### Define the Response:

- use `@apiSuccess` to define the response
- (NYI) use `@apiError` to define the response

### Build the documentation and run the generator:

```shell
apidocjs2typescript --docs=./path/to/documentation --out=./output/path [--no-request-service]
```

Now you can use the included RequestService with the generated endpoint definitions to make API calls.\
See the [Example](#example) below for more details.

### 🛠️ CLI Options

| Option               | Required | Description                                                                                                                      |
|----------------------|----------|----------------------------------------------------------------------------------------------------------------------------------|
| --docs               | ✅        | Root directory of the generated ApiDocJS documentation. <br/>Can be a local path or an accessible URL starting with `http(s)://` |
| --out                | ✅        | Output directory. Must be a local path.                                                                                          |
| --no-request-service | ❌        | If set, the `RequestService` will not be copied to your project. Useful if you want to implement your own.                       |

You can generate multiple APIs for the same project by running the script multiple times with different ApiDocJS documentations, using the same output directory.

Feel free to build your own `RequestService` if the provided one doesn’t suit your needs.

## 🧪 Example

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
 * @apiQuery {String} search    a query param
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
     * @description <p>list of products</p>
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

The generated Error Interface:

```typescript
// TODO (NYI)
```

Making an API Call:

```typescript
import {RequestService}       from './output/path/RequestService';
import {SampleActionEndpoint} from './output/path/ApiName/endpoints/Secure.Files';
import {RequestServiceError}  from './output/path/RequestServiceError';

new RequestService(SampleActionEndpoint)
    .sendRequest({
      header: {
        'Content-Type': 'application/json',
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

## 🔄 Type Mapping

All ApiDocJS types are case-insensitive.

If a parameter has child parameters, it will always be represented as a nested object type.

### String types

| ApiDocJs type | TypeScript Type |
|---------------|-----------------|
| String        | string          |
| Char          | string          |
| Character     | string          |

### Number types

| ApiDocJs type | TypeScript Type |
|---------------|-----------------|
| Number        | number          |
| Int           | number          |
| Long          | number          |
| Float         | number          |
| Double        | number          |

### Boolean types

| ApiDocJs type | TypeScript Type |
|---------------|-----------------|
| Boolean       | boolean         |
| Bool          | boolean         |

### Object types

If an object type has defined child parameters, a nested type will be created.

| ApiDocJs type | TypeScript Type |
|---------------|-----------------|
| Object        | object          |
| Record        | object          |
| Dictionary    | object          |

### Array types

All types are also available as array types (`type[]`).

## 🙏 Inspiration

This project was inspired by [melmedia/apidoc2dts](https://github.com/melmedia/apidoc2dts).
Big thanks to the original author for the great groundwork!
