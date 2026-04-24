#!/usr/bin/env node

import ApiDocJS2TypeScript from './ApiDocJS2TypeScript';
import minimist            from 'minimist';
import TypeHelper          from './helper/TypeHelper';

interface Params extends minimist.ParsedArgs {
  'docs-json': string,
  out: string,
  'api-name'?: string
  'request-service'?: boolean
  'string-types'?: string
  'inline-types'?: boolean
}

const {
        'docs-json': docs,
        out,
        'api-name': apiName                   = 'default',
        'request-service': copyRequestService = true,
        'string-types': stringTypes           = '',
        'inline-types': inlineTypes           = false,
      } = minimist<Params>(process.argv.slice(2));
if (!docs) {
  throw new Error('--docs parameter is missing. See documentation for more details');
}

if (!out) {
  throw new Error('--out parameter is missing. See documentation for more details');
}

TypeHelper.additionalStringTypes = stringTypes.split(',');

const generator = new ApiDocJS2TypeScript(docs, apiName, out, copyRequestService, inlineTypes);
generator
    .loadData()
    .then(generator => generator.generateAll());
