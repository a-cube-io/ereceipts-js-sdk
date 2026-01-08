/**
 * Compression utilities for cache adapters
 */

/**
 * Compression result
 */
export interface CompressionResult {
  data: string;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
}

/**
 * Decompression result
 */
export interface DecompressionResult {
  data: string;
  wasCompressed: boolean;
}

/**
 * Compress data if it exceeds the threshold
 */
export function compressData(data: string, threshold: number = 1024): CompressionResult {
  const originalSize = data.length * 2; // UTF-16 estimation

  // Don't compress if below threshold
  if (originalSize < threshold) {
    return {
      data,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  try {
    // Use simple base64 + LZ-string style compression for cross-platform compatibility
    const compressed = compressString(data);
    const compressedSize = compressed.length * 2;

    // Only use compression if it actually reduces size
    if (compressedSize < originalSize) {
      return {
        data: compressed,
        compressed: true,
        originalSize,
        compressedSize,
      };
    } else {
      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    }
  } catch (error) {
    // Fallback to uncompressed on error
    return {
      data,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }
}

/**
 * Decompress data if it was compressed
 */
export function decompressData(data: string, compressed: boolean): DecompressionResult {
  if (!compressed) {
    return {
      data,
      wasCompressed: false,
    };
  }

  try {
    const decompressed = decompressString(data);
    return {
      data: decompressed,
      wasCompressed: true,
    };
  } catch (error) {
    // Return original data if decompression fails
    return {
      data,
      wasCompressed: false,
    };
  }
}

/**
 * Simple string compression using run-length encoding and base64
 * Cross-platform compatible implementation
 */
function compressString(input: string): string {
  // Simple run-length encoding
  let compressed = '';
  let i = 0;

  while (i < input.length) {
    let count = 1;
    const char = input[i];

    // Count consecutive characters
    while (i + count < input.length && input[i + count] === char && count < 255) {
      count++;
    }

    if (count > 3) {
      // Use run-length encoding for sequences > 3
      compressed += `~${count}${char}`;
    } else {
      // Add characters normally
      for (let j = 0; j < count; j++) {
        compressed += char;
      }
    }

    i += count;
  }

  // Add compression marker
  return `COMP:${btoa(compressed)}`;
}

/**
 * Simple string decompression
 */
function decompressString(input: string): string {
  // Check for compression marker
  if (!input.startsWith('COMP:')) {
    return input;
  }

  try {
    const encodedData = input.substring(5);
    if (!encodedData) {
      return input;
    }
    const compressed = atob(encodedData);
    let decompressed = '';
    let i = 0;

    while (i < compressed.length) {
      if (compressed[i] === '~' && i + 2 < compressed.length) {
        // Run-length encoded sequence
        let countStr = '';
        i++; // Skip ~

        // Read count
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
  } catch (error) {
    // Return input if decompression fails
    return input;
  }
}

/**
 * Estimate compressed size without actually compressing
 */
export function estimateCompressionSavings(data: string): number {
  // Simple heuristic: look for repeated patterns
  const repeated = data.match(/(.)\1{3,}/g);
  if (!repeated) return 0;

  let savings = 0;
  for (const match of repeated) {
    // Estimate savings from run-length encoding
    const originalBytes = match.length * 2;
    const compressedBytes = 6; // ~NNN + char
    if (originalBytes > compressedBytes) {
      savings += originalBytes - compressedBytes;
    }
  }

  return Math.min(savings, data.length * 2 * 0.5); // Max 50% savings
}
