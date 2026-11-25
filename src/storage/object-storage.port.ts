export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');

export type UploadObjectInput = {
  readonly key: string;
  readonly body: Buffer | Uint8Array;
  readonly contentType: string;
  readonly cacheControl: string;
};

export type UploadObjectResult = {
  readonly key: string;
  readonly publicUrl: string;
};

export type PresignedPutInput = {
  readonly key: string;
  readonly contentType: string;
  readonly contentLength: number;
  readonly cacheControl: string;
  readonly expiresInSeconds?: number;
};

export type PresignedPutResult = {
  readonly key: string;
  readonly uploadUrl: string;
  readonly publicUrl: string;
  readonly headers: Record<string, string>;
  readonly expiresInSeconds: number;
};

export interface ObjectStoragePort {
  isConfigured(): boolean;
  getPublicUrl(key: string): string;
  uploadObject(input: UploadObjectInput): Promise<UploadObjectResult>;
  createPresignedPutUrl(input: PresignedPutInput): Promise<PresignedPutResult>;
  readObjectHeaderBytes(key: string, byteCount?: number): Promise<Uint8Array | null>;
  deleteObject(key: string): Promise<void>;
}
