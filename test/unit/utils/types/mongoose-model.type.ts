import { Query } from "mongoose";
import { MockProxy } from "jest-mock-extended";

/* 
  Allows Typescript to know that any function in "Model" that starts with "find" is a:
  - jest mock
  - function that when is called returns a Query mocked 
  
  for example:
  model.findOne().mockResolvedValue(...) -> Ok, it is a mock
  model.findOne().exec().mockResolvedValue(...) -> Ok, it is also a mock 
*/
export type MongooseModel<Model> = {
    [K in keyof Model]: K extends `find${string}`
    ? jest.MockedFunction<() => MockProxy<Query<any, any>>>
    : Model[K];
};