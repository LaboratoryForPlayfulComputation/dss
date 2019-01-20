import gql from 'graphql-tag';

export const connectionEventSubscription = gql`
subscription OnConnectionEvent($id: ID!) {
    connectionEvent(toID: $id) {
        type,
        from,
        data
    }
}`;

export const PeerEventMutation = gql`
mutation RaiseEventMutation($event: EventInput!) {
    raise(event: $event) {
        code,
        status
    }
}`;

