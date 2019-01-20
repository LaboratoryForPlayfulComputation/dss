import { FetchResult } from "apollo-link";

// export type SubscriptionResponse<T> = ISignalingError | { data: T };
export type SubscriptionResponse<T> = FetchResult<T, Record<string, any>, Record<string, any>>

export interface IRaiseFetchResponse {
    raise: {
        code: number,
        status: string,
    }
}

export interface ISignalingError {
    error: any,
}

export interface IPeerEvent {
    type: "offer" | "answer" | "candidate",
    from: string,
    to?: string,
    data: string,
}