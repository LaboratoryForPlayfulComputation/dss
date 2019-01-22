# Dead-Simple Signaling (DSS)

DSS is a peer-to-peer communications system based on WebRTC, with a Pub/Sub
signaling system based on GraphQL using
[ApolloServer](https://www.apollographql.com). It was created due to the lack
of a system that could uniformly mediate message-passing between a variety of
different clients.

## Server Features

- Uses GraphQL for easy Pub/Sub management on a variety of possible clients
- [WIP] Modularity for injecting into existing servers, or integrating auth
  solutions

## Client Features

- Runs in Node (using [node-webrtc](https://github.com/node-webrtc/node-webrtc)
  or any compliant implementation of `RTCPeerConnection`)
- Runs in the browser (using [webrtc-adapter]())
- Supports drop-in replacements for RTCPeerConnection
- Uniform data channel creation across heterogeneous clients