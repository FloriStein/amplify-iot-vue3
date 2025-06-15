import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled } from "@aws-amplify/datastore";

export type CommandLog = {
  timestamp: number,
  direction: CommandDirection,
  command: Command,
  message: any | null
}

export type InputSchema = {
  field_name: string,
  field_type: string,
  is_required: boolean,
  validation_rule: any | null
}

export type UserData = {
  user : any;
  isAdmin : boolean;
}

export type SensorData = {
  lastSeen : string,
  lastValue : any,
  data : any,
};

export type MetaData = {
  id: any;
 // location: any;
  [key: string]: any;
};

export type NodeData = {
  loading: boolean;
  nodeId: string | null;
  node: {
    meta: MetaData | null;
    error: string | null;
  };
  vessel: {
    meta: MetaData | null;
    error: string | null;
  };
  sensors: {
    types: string[];
    metas: {
      [key : string]: MetaData,
    };
    data: {
      [key : string]: {
        [key : string]: SensorData
      }
    };
    error: string | null;
  };
};

type EagerDistance = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Distance, 'id'>;
  };
  readonly id: string;
  readonly distance: number;
  readonly timestamp: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyDistance = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Distance, 'id'>;
  };
  readonly id: string;
  readonly distance: number;
  readonly timestamp: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Distance = LazyLoading extends LazyLoadingDisabled ? EagerDistance : LazyDistance

export declare const Distance: (new (init: ModelInit<Distance>) => Distance) & {
  copyOf(source: Distance, mutator: (draft: MutableModel<Distance>) => MutableModel<Distance> | void): Distance;
}