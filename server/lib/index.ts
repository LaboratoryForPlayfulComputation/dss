import http from 'http';

import express from 'express';

import { withFilter } from 'apollo-server';
import { ApolloServer, PubSub } from 'apollo-server-express';
import { ServerSchema } from 'dss-common';

const pubsub = new PubSub();

const PEER_EVENT = "PEER_EVENT";

// Provide resolver functions for your schema fields
const resolvers = {
    Mutation: {
        raise: (_: any, args: any) => {
            const event = args.event;
            pubsub.publish(PEER_EVENT, {
                connectionEvent: {
                    data: event.data,
                    from: event.from,
                    to: event.to,
                    type: event.type,
                },
            });
            return {
                code: 0,
                status: "ok",
            };
        },
    },
    Query: {
        hello: () => "world",
    },
    Subscription: {
        connectionEvent: {
            subscribe: withFilter(
                () => pubsub.asyncIterator([PEER_EVENT]),
                (payload: any, variables: any) => {
                    return payload.connectionEvent.to === variables.toID;
                }
            ),
        },
    },
};

export class ServerManager {
    private app: express.Express;
    private server: ApolloServer;

    constructor(app?: express.Express) {
        this.app = app || express();
        this.server = new ApolloServer({
            resolvers,
            typeDefs: ServerSchema,
        });
    }

    get path() {
        return this.server.graphqlPath;
    }

    public mountServer(path?: string): http.Server {
        // Install the handlers and return an httpServer instance
        this.server.applyMiddleware({
            app: this.app,
            path
        });
        const httpServer = http.createServer(this.app);
        this.server.installSubscriptionHandlers(httpServer);
        return httpServer;

    }
}