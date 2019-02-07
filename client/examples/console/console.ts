// tslint:disable:no-console

import * as readline from 'readline';

import { SignalingClient } from '../../lib';

const helpString = `Commands:
    set-id [ID] : set the id of your peer
    get-id : print the id of your peer
    init: Initalize the client (must be called before 'connect' or 'echo')
    ping [ID] : initiate a connection to the remote ID
    echo : listen for connections and echo data sent on them

Use EOF (Ctrl-D) to exit.
`;

let state: {
    client?: SignalingClient,
    initialized: boolean
    myID?: string,
} = {
    initialized: false,
};

const rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt("rtc> ");

function handleLine(line: string): typeof state {
    const cmd = line.split(' ');
    switch (cmd[0]) {
        case "set-id":
            console.log("New id: " + cmd[1]);
            state.myID = cmd[1];
            return state;
        case "get-id":
            if (!state.initialized) {
                console.log("Not initialized!");
                return state;
            }
            console.log("My ID: " + state.client.id);
            return state;
        case "init":
            if (state.initialized) {
                console.log("Already initialized!");
                return state;
            }
            state.initialized = true;
            state.client = new SignalingClient({
                endpoint: "/graphql",
                host: "localhost",
                id: state.myID,
                port: 4000,
                secure: false,
                webRTCOptions: {
                    peerOptions: {
                        iceServers: [
                            {urls: [
                                'stuns:stun1.l.google.com:19302',
                                'stuns:stun2.l.google.com:19302',
                                'stuns:stun3.l.google.com:19302',
                                'stuns:stun4.l.google.com:19302']
                            }
                        ]
                    }
                },
            });
            state.client.start();
            return state;
        case "ping":
            if (!state.initialized) {
                console.log("Not initialized!");
                return state;
            }
            console.log("Connecting to " + cmd[1]);
            state.client.openDataChannel('comms', cmd[1]).then((channel) => {
                console.log("Connection opened: " + cmd[1]);
                console.log(channel);
                channel.onmessage = (message) => { console.log(message.data.toString()); };
                let i = 0;
                const f = () => {
                    channel.send("Ping " + i)
                    i += 1;
                    setTimeout(f, 2000);
                }
                f();
            }).catch((reason) => console.log("Data Channel rejected: " + reason));
            return state;
        case "echo":
            if (!state.initialized) {
                console.log("Not initialized!");
                return state;
            }
            console.log("Listening for connections, echoing");
            state.client.on("CONN_OPEN", (args) => {
                const channel: RTCDataChannel = args[1];
                console.log("Connection opened: " + args[2]);
                console.log(channel);
                channel.onmessage = (message) => {
                    console.log("Got data: " + message.data);
                    channel.send(message.data);
                }
            });
            return state;
        default:
            console.log("Unknown command: " + line);
        case "help":
            console.log(helpString);
            return state;
    }
}

rl.on('line', (line) => {
    state = handleLine(line);
    rl.prompt();
}).on('close', () => {
    process.exit(0);
});

rl.prompt();