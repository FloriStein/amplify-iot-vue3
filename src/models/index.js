// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Distance } = initSchema(schema);

export {
  Distance
};