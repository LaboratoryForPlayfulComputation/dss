// tslint:disable:no-console

import { buildSchema } from 'graphql';
import { specifiedRules, validate } from 'graphql/validation';

import { DocumentNode } from 'graphql/language';
import { ClientQueries, ServerSchema } from '../lib/index';

const schema = buildSchema(ServerSchema as any);

Object.keys(ClientQueries).forEach((k) => {
    if (ClientQueries.hasOwnProperty(k)) {
        console.log(`== Validating ${k} ==`);
        let hasError = false;
        validate(
            schema,
            (ClientQueries as any)[k] as DocumentNode,
            specifiedRules
        ).forEach((error) => {
            console.log(error);
            hasError = true;
        });
        if (!hasError) {
            console.log("  No errors!");
        }
    }
})