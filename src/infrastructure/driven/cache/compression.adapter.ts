import {
  CompressionResult,
  DecompressionResult,
  ICompressionPort,
} from '@/application/ports/driven/compression.port';

export class CompressionAdapter implements ICompressionPort {
  compress(data: string, threshold: number = 1024): CompressionResult {
    const originalSize = data.length * 2;

    if (originalSize < threshold) {
      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    }

    try {
      const compressed = this.compressString(data);
      const compressedSize = compressed.length * 2;

      if (compressedSize < originalSize) {
        return {
          data: compressed,
          compressed: true,
          originalSize,
          compressedSize,
        };
      }

      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    } catch {
      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    }
  }

  decompress(data: string, compressed: boolean): DecompressionResult {
    if (!compressed) {
      return { data, wasCompressed: false };
    }

    try {
      const decompressed = this.decompressString(data);
      return { data: decompressed, wasCompressed: true };
    } catch {
      return { data, wasCompressed: false };
    }
  }

  estimateSavings(data: string): number {
    const repeated = data.match(/(.)\1{3,}/g);
    if (!repeated) return 0;

    let savings = 0;
    for (const match of repeated) {
      const originalBytes = match.length * 2;
      const compressedBytes = 6;
      if (originalBytes > compressedBytes) {
        savings += originalBytes - compressedBytes;
      }
    }

    return Math.min(savings, data.length * 2 * 0.5);
  }

  private compressString(input: string): string {
    let compressed = '';
    let i = 0;

    while (i < input.length) {
      let count = 1;
      const char = input[i];

      while (i + count < input.length && input[i + count] === char && count < 255) {
        count++;
      }

      if (count > 3) {
        compressed += `~${count}${char}`;
      } else {
        for (let j = 0; j < count; j++) {
          compressed += char;
        }
      }

      i += count;
    }

    return `COMP:${btoa(compressed)}`;
  }

  private decompressString(input: string): string {
    if (!input.startsWith('COMP:')) {
      return input;
    }

    const encodedData = input.substring(5);
    if (!encodedData) {
      return input;
    }

    const compressed = atob(encodedData);
    let decompressed = '';
    let i = 0;

    while (i < compressed.length) {
      if (compressed[i] === '~' && i + 2 < compressed.length) {
        let countStr = '';
        i++;

        while (i < compressed.length) {
          const char = compressed[i];
          if (char && /\d/.test(char)) {
            countStr += char;
            i++;
          } else {
            break;
          }
        }

        if (countStr && i < compressed.length) {
          const count = parseInt(countStr, 10);
          const char = compressed[i];

          for (let j = 0; j < count; j++) {
            decompressed += char;
          }
          i++;
        }
      } else {
        decompressed += compressed[i];
        i++;
      }
    }

    return decompressed;
  }
}

export function compressData(data: string, threshold: number = 1024): CompressionResult {
  return new CompressionAdapter().compress(data, threshold);
}

export function decompressData(data: string, compressed: boolean): DecompressionResult {
  return new CompressionAdapter().decompress(data, compressed);
}

export function estimateCompressionSavings(data: string): number {
  return new CompressionAdapter().estimateSavings(data);
}
