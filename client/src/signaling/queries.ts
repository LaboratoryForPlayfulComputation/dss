import gql from 'graphql-tag';

export const connectionEventSubscription = gql`
subscription OnConnectionEvent($id: ID!) {
    connectionEvent(toID: $id) {
        type,
        from,
        sdp
    }
}`;

export const SDPEventMutation = gql`
mutation RaiseEventMutation($event: SDPInput!) {
    raise(event: $event) {
        code,
        status
    }
}`;

