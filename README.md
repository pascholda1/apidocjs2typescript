# (WIP) ApiDocJS2TypeScript

[APIDOC](http://apidocjs.com) to Typescript Definition file convertor.

## Installation

```
npm install apidocjs2typescript
```

## Usage

1. make sure you use only `Header`, `Path`, `Query` or `Body` as Group names for `@apiParam`, all other groups will be ignored
2. generate your [APIDOC](http://apidocjs.com) documentation
3. run `apidocjs2typescript ./path/to/documentation ./output/path`

## Example

The following sample will show how the generator will work.

The Documentation:

```injectablephp
/**
 * @apiVersion     1.0.0
 * @api            {post} /your/endpoint.json
 * @apiName        SampleAction
 * @apiDescription This is a simple sample
 * @apiGroup       Samples
 * @apiDeprecated
 * @apiHeader {String=application/x-www-form-urlencoded,multipart/formdata,application/json} Content-Type
 * @apiParam (Path) {String} pageId     a path param
 * @apiParam (Query) {String} search    a query param
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
