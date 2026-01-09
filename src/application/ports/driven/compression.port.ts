export interface CompressionResult {
  data: string;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
}

export interface DecompressionResult {
  data: string;
  wasCompressed: boolean;
}

export interface ICompressionPort {
  compress(data: string, threshold?: number): CompressionResult;
  decompress(data: string, compressed: boolean): DecompressionResult;
  estimateSavings(data: string): number;
}
