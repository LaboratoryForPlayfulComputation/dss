import { isNode } from '../util/isnode';

export interface IWebRTCImplementation {
    RTCPeerConnection: any,
}

export function getWebRTCImplementation(): IWebRTCImplementation | undefined {
    if (isNode) {
        // Try to require wrtc.node and if it doesn't exist, it will be
        // undefined.
        try {
            return require('wrtc');
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                return undefined;
            }
            throw error;
        }
    } else {
        return {
            // Why aren't these types compatible?
            RTCPeerConnection: (window as any).RTCPeerConnection,
        }

    }
}