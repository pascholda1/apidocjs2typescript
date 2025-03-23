import ApiDocJS2TypeScript from './ApiDocJS2TypeScript';
import minimist            from 'minimist';

interface Params extends minimist.ParsedArgs {
  docs: string,
  out: string,
  'request-service'?: boolean
}

const {
        docs,
        out,
        'request-service': copyRequestService = true,
      } = minimist<Params>(process.argv.slice(2));
if (!docs) {
  throw new Error('--docs parameter is missing. See documentation for more details');
}

if (!out) {
  throw new Error('--out parameter is missing. See documentation for more details');
}

const generator = new ApiDocJS2TypeScript(docs, out, copyRequestService);
generator
    .loadData()
    .then(generator => generator.generateAll());
