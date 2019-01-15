const isNode = !!(typeof process !== 'undefined' && process.versions && process.versions.node);

export function getWebRTCImplementation()