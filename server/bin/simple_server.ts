import { ServerManager } from '../lib';

const manager = new ServerManager();

const PORT = process.env.SERVER_PORT || 4000;

manager.mountServer().listen(PORT, () =>
    // tslint:disable-next-line:no-console
    console.log(`🚀 Server ready at http://localhost:${PORT}${manager.path}`)
);