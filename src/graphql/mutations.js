/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createDistance = /* GraphQL */ `
  mutation CreateDistance(
    $input: CreateDistanceInput!
    $condition: ModelDistanceConditionInput
  ) {
    createDistance(input: $input, condition: $condition) {
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
export const updateDistance = /* GraphQL */ `
  mutation UpdateDistance(
    $input: UpdateDistanceInput!
    $condition: ModelDistanceConditionInput
  ) {
    updateDistance(input: $input, condition: $condition) {
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
export const deleteDistance = /* GraphQL */ `
  mutation DeleteDistance(
    $input: DeleteDistanceInput!
    $condition: ModelDistanceConditionInput
  ) {
    deleteDistance(input: $input, condition: $condition) {
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
