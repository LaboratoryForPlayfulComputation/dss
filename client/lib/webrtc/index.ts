import { isNode } from '../util/isnode';
import { try_require } from '../util/try_require';

export interface IWebRTCImplementation {
    RTCPeerConnection: any,
}

export function getWebRTCImplementation(): IWebRTCImplementation | undefined {
    if (isNode) {
        // Try to require wrtc.node and if it doesn't exist, it will be
        // undefined.
        return try_require('wrtc');
    } else {
        // The Adapter is just going to be required. We require these things to
        // be available to reference them from the window. Every example uses it
        // so we do to.
        const adapter = try_require('webrtc-adapter');

        if (!adapter) {
            return undefined;
        }

        return {
            // Why aren't these types compatible?
            RTCPeerConnection: (window as any).RTCPeerConnection,
        }

    }
}