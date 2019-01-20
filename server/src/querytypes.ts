type ID = string;
type Data = string;

export interface PeerEvent {
    type: "offer" | "answer" | "candidate",
    from: ID,
    to: ID,
    data: Data,
}

export interface Response {
    status: string,
    code: number,
}