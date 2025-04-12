/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getDistance = /* GraphQL */ `
  query GetDistance($id: ID!) {
    getDistance(id: $id) {
      distance
      timestamp
      createdAt
      updatedAt
      id
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const listDistances = /* GraphQL */ `
  query ListDistances(
    $filter: ModelDistanceFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listDistances(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        distance
        timestamp
        createdAt
        updatedAt
        id
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncDistances = /* GraphQL */ `
  query SyncDistances(
    $filter: ModelDistanceFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncDistances(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
        distance
        timestamp
        createdAt
        updatedAt
        id
        _version
        _deleted
        _lastChangedAt
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
