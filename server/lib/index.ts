import express from 'express';
import * as http from "http";

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

const server = new ApolloServer({
    resolvers,
    typeDefs: ServerSchema,
});

const app = express();
server.applyMiddleware({ app });

const httpServer = http.createServer(app);

server.installSubscriptionHandlers(httpServer);

const PORT = 4000;

httpServer.listen(PORT, () =>
    // tslint:disable-next-line:no-console
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
);