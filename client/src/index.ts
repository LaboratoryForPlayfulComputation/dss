import { SignalingClient } from './signaling';

const isNode = !!(typeof process !== 'undefined' && process.versions && process.versions.node);

console.log("Node: " + isNode);

const client = new SignalingClient({
    id: "27c389da-babf-47a4-b021-1c2293112bb2",
    secure: false,
    host: "localhost",
    port: 4000,
    endpoint: "/graphql",
});

console.log(client.id);

client.start();

setTimeout(() => {
    client.connectTo('clientb');
}, 10000)