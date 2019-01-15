/**
 * dss-client/signaling
 * 
 * Provides an interface to dss-server using GraphQL subscription.  If no
 * implementation of `WebSocket` is available (`ws` or the browser's WebSocket),
 * then one must be provided.
 */

// This polyfill ensures that `fetch` is available on Node as in the browser
// as a global. It sucks that we have to do this, and we can't just pass `fetch`
// to Apollo, but the current version of node-fetch has a different
// type-signature from what Apollo expects, so until they work that out we can
// use this polyfill.
import 'cross-fetch/polyfill'

import { EventEmitter } from 'events';

import { ApolloClient } from 'apollo-client';
import { split } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { SubscriptionClient, ClientOptions } from 'subscriptions-transport-ws';
import { InMemoryCache, NormalizedCacheObject } from 'apollo-cache-inmemory';
import { getMainDefinition } from 'apollo-utilities';

import * as uuidv4 from 'uuid/v4';
import * as WebSocket from 'ws';

import { buildUrl } from './build-url';
import { SDPEvent, SubscriptionResponse } from './types';
import { connectionEventSubscription, SDPEventMutation } from './queries';

/**
 * Options for the Signaling Client
 */
export interface SignalingOptions {
    /** The client's unique identifier. If undefined, a random identifier will be generated */
    id?: string,
    /**
     * Whether the client should use secure connections (wss, https). If undefined, the default behavior as defined by
     * DEFAULT_SECURITY will be used.
     */
    secure?: boolean,
    /** hostname or IP address of the signaling server WITHOUT the port */
    host: string
    /** The port to use for HTTP(S) connections to the signaling server */,
    port?: number,
    /** The port to use for websocket connections if different from `port` */
    webSocketPort?: number
    /** The API endpoint (e.g. "/graphql") where the graphql signaling server is mounted */
    endpoint?: string,
    /**
     * Additional options for the SubscriptionClient. If undefined, the default options as defined by
     * DEFAULT_SUBSCRIPTION_OPTS will be used.
     */
    subscriptionClientOptions?: ClientOptions,
}

export const DEFAULT_SUBSCRIPTION_OPTS = {
    // Reconnect automatically when the websocket is closed.
    reconnect: true,
}

// Use secure connections unless opts.secure = false is explicitly specified
export const DEFAULT_SECURITY = true;

// Helper method for constructing the split-link for the Apollo Client
function makeLink(opts: SignalingOptions) {
    const _secure = opts.secure === undefined ? DEFAULT_SECURITY : opts.secure;
    const httpLink = new HttpLink({
        uri: buildUrl({
            protocol: _secure ? "https" : "http",
            host: opts.host,
            port: opts.port,
            endpoint: opts.endpoint
        }),
    });

    const wsClient = new SubscriptionClient(
        buildUrl({
            protocol: _secure ? "wss" : "ws",
            host: opts.host,
            port: opts.webSocketPort || opts.port,
            endpoint: opts.endpoint,
        }),
        opts.subscriptionClientOptions || DEFAULT_SUBSCRIPTION_OPTS,
        WebSocket
    );

    const wsLink = new WebSocketLink(wsClient);

    // This is our final link. We use the websocket for subscriptions and
    // hypertext for everything else.
    return split(
        ({ query }) => {
            const d = getMainDefinition(query);
            return d.kind === 'OperationDefinition' && d.operation === 'subscription';
        },
        wsLink,
        httpLink
    )

}

interface ConnectionEvent {
    connectionEvent: SDPEvent
}

// Emitted when an answer is received but no handler is available for it
export type SignalingEvent =
    "PHONY_ANSWER" |
    "ON_CONNECT";

export class SignalingClient extends EventEmitter {
    private opts: SignalingOptions;
    private client: ApolloClient<NormalizedCacheObject>;
    private _id: string;

    // When we send an offer, store an answer handler here.
    private answerHandlers: { [k: string]: (e: SDPEvent) => void };

    constructor(options: SignalingOptions) {
        super();
        this.opts = options;
        this.answerHandlers = {};

        this.client = new ApolloClient({
            cache: new InMemoryCache(),
            link: makeLink(this.opts),
        });

        this._id = this.opts.id || uuidv4();
    }

    get id(): string {
        return this._id;
    }

    public start() {
        this.initSubscription();
    }

    // TODO: stop() ... Apollo documentation is not very straightforward and I
    //   am not sure how to unsubscribe from the connection events.  Minimally,
    //   we need to (1) notify the server that we unsubscribe and (2) close the
    //   websocket underlying the wsLink.

    public connectTo(otherID: string) {
        this.answerHandlers[otherID] = (e) => {
            console.log("NOW A CONNECTION WOULD HERE BE ESTABLISHED WITH " + e.from);
        }
        this.sendEvent({
            type: "offer",
            from: this._id,
            to: otherID,
            sdp: "OFFER",
        })
    }

    // Overriding `on` and `emit` from EventEmitter gets us some nicer Type
    // Checking on event emission.
    public on(event: SignalingEvent, listener: (...args: any[]) => void) {
        return super.on(event, listener);
    }

    public emit(event: SignalingEvent, ...args: any[]) {
        return super.emit(event, ...args);
    }

    private _answer(e: SDPEvent) {
        this.sendEvent({
            type: "answer",
            from: this._id,
            to: e.from,
            sdp: "ANSWER",
        });
    }

    private sendEvent(packedEvent: SDPEvent) {
        return this.client.mutate({
            mutation: SDPEventMutation,
            variables: {
                event: packedEvent
            }
        }).then((r) => {
            console.log(`Response from server: ${r.errors}, ${r.data}`);
            return true;
        });
    }

    private handleEvent(e: SDPEvent) {
        console.log("Handling event: " + e.type);
        switch (e.type) {
            case "answer":
                const handler = this.answerHandlers[e.from];
                if (handler) {
                    handler(e);
                } else {
                    this.emit("PHONY_ANSWER", [e]);
                }
                break;
            case "offer":
                // TODO: want to support middlewares to validate these.
                this._answer(e);
                break;
        }
    }

    private initSubscription() {
        const handler = this.handleEvent.bind(this);
        this.client.subscribe({
            query: connectionEventSubscription,
            variables: {
                id: this._id
            }
        }).forEach((d: SubscriptionResponse<ConnectionEvent>) => {
            console.log("Received sub item: " + d.toString());
            if ((<any>d).data) {
                const _d = <ConnectionEvent>((<any>d).data);
                handler(_d.connectionEvent);
            }
        });
    }
}