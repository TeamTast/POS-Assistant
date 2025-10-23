export type Nullable<T> = T | null | undefined;

export type DestroyFn = () => void;

export type MaybePromise<T> = T | Promise<T>;

export interface DocumentRootOptions<TDocument extends Document = Document> {
  readonly root?: TDocument;
}

export interface DocumentRootWithUrlOptions<TDocument extends Document = Document>
  extends DocumentRootOptions<TDocument> {
  readonly url?: string;
}

export interface WindowRootOptions<TRoot extends Window = Window> {
  readonly root?: TRoot;
}
