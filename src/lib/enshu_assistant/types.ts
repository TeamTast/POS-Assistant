import type { DestroyFn, DocumentRootOptions, DocumentRootWithUrlOptions } from '@/lib/types.ts';

export interface EnshuAssistantContentOptions
  extends DocumentRootWithUrlOptions<Document> {}

export type EnshuAssistantContentInitializer = (
  options?: EnshuAssistantContentOptions
) => Promise<DestroyFn | void>;

export interface DownloadHandler {
  readonly label: string;
  matches(downloadItem: chrome.downloads.DownloadItem): boolean;
}

export type TitleCacheWriter = (rawTitle: string | null | undefined) => void;

export interface DownloadFilenameManager {
  refresh(): void;
  destroy: DestroyFn;
}

export interface DownloadFilenameManagerOptions extends DocumentRootOptions<Document> {
  readonly containerSelector?: string;
  readonly linkFilter?: (link: HTMLAnchorElement) => boolean;
  readonly logPrefix?: string;
}

export interface MondaiTitleObserverOptions extends DocumentRootOptions<Document> {
  readonly buttonSelector?: string;
  readonly titleSelectors?: readonly string[];
}

export interface KaisetsuTitleObserverOptions extends DocumentRootOptions<Document> {
  readonly titleSelectors?: readonly string[];
}

export interface DaimonNavigationOptions extends DocumentRootWithUrlOptions<Document> {}

export interface MondaiDownloadEnhancerOptions extends DocumentRootOptions<Document> {}

export interface KaisetsuDownloadEnhancerOptions extends DocumentRootOptions<Document> {}

export interface MarksheetDeletionOptions extends DocumentRootOptions<Document> {}

export interface DaimonCountRecord {
  readonly enshuSetId: string;
  readonly maxDaimon: number;
}

export type DaimonCountRecorder = (record: DaimonCountRecord) => void;
