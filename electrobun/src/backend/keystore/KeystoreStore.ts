export type KeystoreStore = {
  readonly path: string;
  load(): Record<string, string>;
  persist(nextStore: Record<string, string>): void;
};
