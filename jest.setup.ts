import { server } from './test/server'; // dein MSW-Server

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
