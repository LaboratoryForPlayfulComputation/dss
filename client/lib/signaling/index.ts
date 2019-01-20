/**
 * dss-client/signaling
 * 
 * Provides an interface to dss-server using GraphQL subscription.  If no
 * implementation of `WebRTC` is available (`wrtc` or the browser's implementation),
 * then one must be provided.
 */

// This polyfill ensures that `fetch` is available on Node as in the browser
// as a global. It sucks that we have to do this, and we can't just pass `fetch`
// to Apollo, but the current version of node-fetch has a different
// type-signature from what Apollo expects, so until they work that out we can
// use this polyfill.
import 'cross-fetch/polyfill'

import { EventEmitter } from 'events';
import * as uuidv4 from 'uuid/v4';

import { InMemoryCache, NormalizedCacheObject } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { split } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';
import { ClientOptions, SubscriptionClient } from 'subscriptions-transport-ws';


import { getWebRTCImplementation, IWebRTCImplementation } from '../webrtc';
import { buildUrl } from './build-url';
import { connectionEventSubscription, PeerEventMutation } from './queries';
import { IPeerEvent, IRaiseFetchResponse, SubscriptionResponse } from './types';
import { WebSocket } from './websocket';

interface IConnectionEvent {
    connectionEvent: IPeerEvent
}

/** The types of events that can be emitted by SignalingClient */
export type SignalingEvent =
    "CONN_OPEN" |
    "PHONY_ANSWER" |
    "PHONY_CANDIDATE" |
    "ON_CONNECT" |
    "BAD_SDP_TYPE";

/**
 * Options for WebRTC, including ICE settings, STUN servers, and TURN servers
 */
export interface IRTCOptions {
    /** Passed to the RTCPeerConnection constructor */
    peerOptions: RTCConfiguration,
}

/**
 * Options for the Signaling Client
 */
export interface ISignalingOptions {
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
    /** The amount of time (in seconds) to wait for a DataChannel to open */
    timeout?: number,
    /**
     * Additional options for the SubscriptionClient. If undefined, the default options as defined by
     * DEFAULT_SUBSCRIPTION_OPTS will be used.
     */
    subscriptionClientOptions?: ClientOptions,
    /**
     * Optional WebRTCImplementation. If none is provided, a default implementation will be selected, or an error
     * will be thrown.
     */
    webRTCImplementation?: IWebRTCImplementation,
    /**
     * Options for WebRTC. See @RTCOptions for more details
     */
    webRTCOptions: IRTCOptions,
}

export const DEFAULT_SUBSCRIPTION_OPTS = {
    // Reconnect automatically when the websocket is closed.
    reconnect: true,
}

// Use secure connections unless opts.secure = false is explicitly specified
export const DEFAULT_SECURITY = true;

// Wait 30 seconds by default
export const DEFAULT_TIMEOUT = 30;

// Helper method for constructing the split-link for the Apollo Client
function makeLink(opts: ISignalingOptions) {
    const isSecure = opts.secure === undefined ? DEFAULT_SECURITY : opts.secure;
    const httpLink = new HttpLink({
        uri: buildUrl({
            endpoint: opts.endpoint,
            host: opts.host,
            port: opts.port,
            protocol: isSecure ? "https" : "http",
        }),
    });

    const wsClient = new SubscriptionClient(
        buildUrl({
            endpoint: opts.endpoint,
            host: opts.host,
            port: opts.webSocketPort || opts.port,
            protocol: isSecure ? "wss" : "ws",
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

function addDebuggingStateListeners(conn: RTCPeerConnection, otherID: string) {
    function override(msg: string, x: (...args: any[]) => any, selector?: () => any) {
        return (e: any) => {
            console.log(msg + ": " + otherID);
            console.log(selector ? selector() : e);
            if (x) {
                x(e);
            }
        }
    }

    conn.onicecandidateerror = override(
        "[ICE] Candidate Error",
        conn.onicecandidateerror);

    conn.oniceconnectionstatechange = override(
        "[ICE] Connection state change",
        conn.oniceconnectionstatechange,
        () => conn.iceConnectionState);

    conn.onconnectionstatechange = override(
        "[CONN] Connection state change",
        conn.onconnectionstatechange,
        () => conn.connectionState);

    conn.onicegatheringstatechange = override(
        "[ICE] Gathering state change",
        conn.onicegatheringstatechange,
        () => conn.iceGatheringState);

    conn.onicecandidate = override(
        "[ICE] Candidate",
        conn.onicecandidate);

    conn.onnegotiationneeded = override(
        "[CONN] Negotiation needed",
        conn.onnegotiationneeded);

    conn.onsignalingstatechange = override(
        "[CONN] Signaling state change",
        conn.onsignalingstatechange,
        () => conn.signalingState);
}

export class SignalingClient extends EventEmitter {
    private opts: ISignalingOptions;
    private client: ApolloClient<NormalizedCacheObject>;
    // tslint:disable-next-line:variable-name
    private _id: string;
    private rtc: IWebRTCImplementation;
    private timeout: number;

    // When we send an offer, store an answer handler here.
    private peerConnections: { [k: string]: RTCPeerConnection }

    constructor(options: ISignalingOptions) {
        super();
        this.opts = options;

        this.peerConnections = {};

        this.client = new ApolloClient({
            cache: new InMemoryCache(),
            link: makeLink(this.opts),
        });

        this._id = this.opts.id || uuidv4();
        this.rtc = this.opts.webRTCImplementation || getWebRTCImplementation();

        if (this.rtc === undefined || this.rtc.RTCPeerConnection === undefined) {
            throw new Error("No WebRTC implementation is available. Either provide one as ISignalingOptions.webRTCImplementation or install 'wrtc' in Node.");
        }

        if (WebSocket === undefined) {
            throw new Error("No WebSocket implementation is available. DSS requires an impelementation of WebSocket (either require('ws') or window.WebSocket).");
        }

        this.timeout = this.opts.timeout || DEFAULT_TIMEOUT;
    }

    get id(): string {
        return this._id;
    }

    /**
     * Start listening for server events.
     */
    public start() {
        this._initSubscription();
    }

    // Overriding `on` and `emit` from EventEmitter gets us some nicer Type
    // Checking on event emission. I hope typescript is smart enough to just
    // optimize this out.
    public on(event: SignalingEvent, listener: (...args: any[]) => void) {
        return super.on(event, listener);
    }

    public emit(event: SignalingEvent, ...args: any[]) {
        return super.emit(event, ...args);
    }

    // TODO: stop() ... Apollo documentation is not very straightforward and I
    //   am not sure how to unsubscribe from the connection events.  Minimally,
    //   we need to (1) notify the server that we unsubscribe and (2) close the
    //   websocket underlying the wsLink.

    public openDataChannel(name: string, otherID: string): Promise<RTCDataChannel | undefined> {
        // I hate JavaScript
        // tslint:disable-next-line:variable-name
        const _this = this;
        const pc = _this.peerConnections[otherID];
        if (pc === undefined) {
            const peerConnection = (new _this.rtc.RTCPeerConnection(_this.opts.webRTCOptions.peerOptions)) as RTCPeerConnection;
            _this.peerConnections[otherID] = peerConnection;

            const candidateQueue: RTCPeerConnectionIceEvent[] = [];
            (peerConnection as any)._dssCandidateQueue = candidateQueue;

            this.addIceCandidateHandler(peerConnection, otherID, candidateQueue);
            addDebuggingStateListeners(peerConnection, otherID);

            const dc = peerConnection.createDataChannel(name);

            return new Promise((resolve, reject) => {
                // The promise is resolved as the DC if it is opened.
                // tslint:disable-next-line:no-console
                console.log("PROMISE EXECUTING");
                dc.onopen = (event) => {
                    _this.emit("CONN_OPEN", [event, dc, otherID]);
                    resolve(dc);
                }

                // Make sure this order is honored -- we set the onopen handler
                // THEN create and transmit the offer.
                peerConnection.createOffer()
                    .then((offer) => {
                        return peerConnection.setLocalDescription(offer)
                            .then(() => {
                                return _this.sendEvent({
                                    data: JSON.stringify(offer),
                                    from: _this._id,
                                    to: otherID,
                                    type: "offer",

                                });
                            });
                    }).then((result) => {
                        if (result.data === undefined || result.data.raise.status !== "ok") {
                            // The server threw an error, or returned no data
                            reject("Failed to send SDP to server: " + result.errors.toString());
                        }
                    });

                setTimeout(() => {
                    reject("Connection timed out for: " + otherID);
                }, _this.timeout * 1000);
            });

        } else { // TODO: else? maybe send the offer again or restart the ICE session... at least return the old DC
            return Promise.resolve(undefined);
        }
    }

    private addIceCandidateHandler(conn: RTCPeerConnection, otherID: string, queue: RTCPeerConnectionIceEvent[]) {
        // tslint:disable-next-line:variable-name
        const _this = this;
        conn.onicecandidate = (candidateEvent) => {
            if (!conn.remoteDescription) {
                queue.push(candidateEvent);
                return;
            } else if (candidateEvent.candidate) {
                _this.sendEvent({
                    data: JSON.stringify(candidateEvent.candidate),
                    from: _this._id,
                    to: otherID,
                    type: "candidate",
                });
            }
        }
    }

    private _onOfferReceived(e: IPeerEvent): Promise<void> {
        // I hate JavaScript
        // tslint:disable-next-line:variable-name
        const _this = this;
        const otherID = e.from;
        const sdp = (JSON.parse(e.data)) as RTCSessionDescriptionInit;
        const pc = _this.peerConnections[otherID];
        if (pc === undefined) {
            const peerConnection = (new _this.rtc.RTCPeerConnection(_this.opts.webRTCOptions.peerOptions)) as RTCPeerConnection;
            _this.peerConnections[otherID] = peerConnection;

            peerConnection.ondatachannel = (dcevent) => {
                const channel = dcevent.channel;
                channel.onopen = (ev) => {
                    _this.emit("CONN_OPEN", [ev, channel, otherID]);
                }
            }

            const candidateQueue: RTCPeerConnectionIceEvent[] = [];

            this.addIceCandidateHandler(peerConnection, otherID, candidateQueue);
            addDebuggingStateListeners(peerConnection, otherID);

            return new Promise((resolve, reject) => {
                peerConnection.setRemoteDescription(sdp)
                    .then(() => {
                        // Since we're setting the remote description now,
                        // we can flush the candidate queue we created above.
                        return candidateQueue.forEach((event) => {
                            console.log("Flushing " + event);
                            peerConnection.onicecandidate(event);
                        });
                    })
                    .then(() => {

                        return peerConnection.createAnswer()
                            .then((answer) => {
                                return peerConnection.setLocalDescription(answer).then(() => {
                                    return _this.sendEvent({
                                        data: JSON.stringify(answer),
                                        from: _this._id,
                                        to: otherID,
                                        type: "answer",
                                    })
                                });
                            }).then((result) => {
                                if (result.data === undefined || result.data.raise.status !== "ok") {
                                    reject("Failed to send SDP to server: " + result.errors.toString());
                                } else {
                                    // This method doesn't resolve _to_ anything, so just resolve it here.
                                    resolve();
                                }
                            });
                    });
            });
        } else { // TODO: else? might want to just cleanup the old connection and open it again
            return Promise.resolve();
        }
    }

    private _onAnswerReceived(e: IPeerEvent): Promise<void> {
        // I hate JavaScript
        // tslint:disable-next-line:variable-name
        const _this = this;
        const otherID = e.from;
        const sdp = (JSON.parse(e.data)) as RTCSessionDescriptionInit;
        const peerConnection = _this.peerConnections[otherID];

        // This is the only case where _pc === undefined is an error.
        if (peerConnection === undefined) {
            console.log("Phony answer from " + otherID);
            _this.emit("PHONY_ANSWER", [e]);
            return;
        }

        return peerConnection.setRemoteDescription(sdp)
            .then(() => {
                const cQ: RTCPeerConnectionIceEvent[] = (peerConnection as any)._dssCandidateQueue;
                cQ.forEach((event) => {
                    console.log("Flushing " + event);
                    peerConnection.onicecandidate(event);
                });

            });
    }

    private _onCandidateReceived(e: IPeerEvent) {
        // I hate JavaScript
        // tslint:disable-next-line:variable-name
        const _this = this;
        const candidate = JSON.parse(e.data) as RTCIceCandidate;
        const otherID = e.from;

        const pc = _this.peerConnections[otherID];
        if (pc === undefined) {
            console.log("Phony ICE candidate from " + otherID);
            _this.emit("PHONY_CANDIDATE", [e]);
            return;
        }

        return pc.addIceCandidate(candidate);
    }

    private _handlePeerEvent(e: IPeerEvent) {
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(e));
        switch (e.type) {
            case "answer":
                this._onAnswerReceived(e);
                break;
            case "offer":
                this._onOfferReceived(e);
                break;
            case "candidate":
                this._onCandidateReceived(e);
                break;
            default:
                this.emit("BAD_SDP_TYPE", [e]);
                break;
        }
    }


    private sendEvent(packedEvent: IPeerEvent) {
        return this.client.mutate<IRaiseFetchResponse>({
            mutation: PeerEventMutation,
            variables: {
                event: packedEvent
            }
        });
    }

    private _initSubscription() {
        const handler = this._handlePeerEvent.bind(this);
        this.client.subscribe({
            query: connectionEventSubscription,
            variables: {
                id: this._id
            }
        }).forEach((d: SubscriptionResponse<IConnectionEvent>) => {
            const data = d.data;
            if (data) {
                handler(data.connectionEvent);
            }
        });
    }
}