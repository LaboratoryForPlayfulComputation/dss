import * as express from 'express';
import * as http from "http";
const { ApolloServer, PubSub, gql } = require('apollo-server-express');
const { withFilter } = require('apollo-server');

const pubsub = new PubSub();

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
    type PeerEvent {
        type: String
        from: String,
        to: String,
        data: String,
    },
    input EventInput {
        type: String
        from: String,
        to: String,
        data: String,
    },
    type Response {
        status: String,
        code : Int,
    },
    type Query {
        hello: String
    },
    type Mutation {
        raise(event: EventInput) : Response,
    },
    type Subscription {
        connectionEvent(toID: ID): PeerEvent,
    }
`;

const PEER_EVENT = "PEER_EVENT";

// Provide resolver functions for your schema fields
const resolvers = {
    Query: {
        hello: () => "world",
    },
    Mutation: {
        raise: (_obj: any, args: any) => {
            const event = args.event;
            console.log(_obj);
            console.log(args);
            pubsub.publish(PEER_EVENT, {
                connectionEvent: {
                    type: event.type,
                    from: event.from,
                    to: event.to,
                    data: event.data,
                },
            });
            return {
                status: "ok",
                code: 0,
            };
        },
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
    typeDefs,
    resolvers,
});

const app = express();
server.applyMiddleware({ app });

const httpServer = http.createServer(app);

server.installSubscriptionHandlers(httpServer);

const PORT = 4000;

httpServer.listen(PORT, () =>
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
);