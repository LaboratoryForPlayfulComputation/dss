import { isNode } from '../util/isnode';

function getWebSocketImplementation(): any {
    if (isNode) {
        try {
            return require('ws');
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                return undefined;
            }
            throw error;
        }
    } else {
        return (window as any).WebSocket;
    }
}

export const WebSocket = getWebSocketImplementation();