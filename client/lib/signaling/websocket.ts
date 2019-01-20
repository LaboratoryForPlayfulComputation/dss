import { isNode } from '../util/isnode';
import { try_require } from '../util/try_require';

function getWebSocketImplementation(): any {
    if (isNode) {
        return try_require('ws');
    } else {
        return (window as any).WebSocket;
    }
}

export const WebSocket = getWebSocketImplementation();