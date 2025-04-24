import {setupServer} from 'msw/node';
//import {http}        from 'msw';

export const server = setupServer(
    /*http.get('https://test.api/rest', (req, res, ctx) => {
      return res(ctx.status(200), ctx.json({message: 'OK'}));
    }),*/
);
