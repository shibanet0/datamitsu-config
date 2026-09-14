export type IsolationTarget = "head" | "index";

export interface StashTransaction {
  marker: string;
  oid: string;
  repositoryRoot: string;
  target: IsolationTarget;
}

export class IsolationFailureError extends Error {
  readonly marker: string;
  readonly repositoryRoot: string;
  readonly transaction: StashTransaction | undefined;

  constructor(
    message: string,
    marker: string,
    repositoryRoot: string,
    transaction?: StashTransaction,
  ) {
    super(message);
    this.name = "IsolationFailureError";
    this.marker = marker;
    this.repositoryRoot = repositoryRoot;
    this.transaction = transaction;
  }
}
