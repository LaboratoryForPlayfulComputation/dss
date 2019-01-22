type ID = string;
type Data = string;

export interface IPeerEvent {
    type: "offer" | "answer" | "candidate",
    from: ID,
    to: ID,
    data: Data,
}

export interface IResponse {
    status: string,
    code: number,
}