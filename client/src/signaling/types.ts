export type SubscriptionResponse<T> = SignalingError | { data: T };

export interface SignalingError {
    error: any,
}

export interface SDPEvent {
    type: "offer" | "answer"
    from: string,
    to?: string,
    sdp: string,
}