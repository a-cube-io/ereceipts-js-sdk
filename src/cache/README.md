# Simplified Cache System

A clean, efficient caching system with network-first strategy for offline resilience.

## 🚀 Quick Start

```typescript
import { CacheManager } from './cache';
import { WebCacheAdapter } from '../platforms/web/cache';

// Initialize cache adapter
const cache = new WebCacheAdapter({
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 10000,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
});

// Create cache manager
const cacheManager = new CacheManager(cache, {
  maxCacheSize: 100 * 1024 * 1024,
  maxEntries: 10000,
  cleanupInterval: 5 * 60 * 1000,
  memoryPressureThreshold: 0.8,
  memoryPressureCleanupPercentage: 30,
  minAgeForRemoval: 60 * 1000
});
```

## 🎯 Core Features

### 1. CacheManager
Simplified cache management with two cleanup strategies:
- **LRU (Least Recently Used)**: Removes least recently accessed items
- **Age-based**: Removes oldest items first

### 2. Network-First Strategy
- **Online**: Always fetch fresh data from network, update cache
- **Offline**: Use cached data when available
- **Resilient**: Queue offline operations for later sync

### 3. Platform Adapters
- **React Native**: SQLite-based storage with keychain integration
- **Web**: IndexedDB with localStorage fallback

## 📋 Cache Configuration

```typescript
interface CacheManagementConfig {
  maxCacheSize?: number;           // 100MB default
  maxEntries?: number;             // 10000 default
  cleanupInterval?: number;        // 5 minutes default
  memoryPressureThreshold?: number; // 0.8 (80%) default
  memoryPressureCleanupPercentage?: number; // 30% default
  minAgeForRemoval?: number;       // 1 minute default
}
```

## 🔧 Basic Usage

```typescript
// Get memory statistics
const stats = await cacheManager.getMemoryStats();

// Manual cleanup
const result = await cacheManager.performCleanup('lru');

// Handle memory pressure
if (stats.isMemoryPressure) {
  await cacheManager.handleMemoryPressure();
}

// Get cleanup recommendations
const recommendations = await cacheManager.getCleanupRecommendations();
```

## 🎨 Architecture

```
┌─────────────────┐
│  HTTP Client    │ ← Network-first strategy
└─────────────────┘
         │
┌─────────────────┐
│ Cache Manager   │ ← Simplified cleanup (LRU + age-based)
└─────────────────┘
         │
┌─────────────────┐
│ Cache Adapter   │ ← Platform-specific storage
└─────────────────┘
```

## 🔄 Cache Flow

1. **Online Request**: Fetch from network → Update cache → Return fresh data
2. **Offline Request**: Check cache → Return cached data or queue operation
3. **Memory Pressure**: Automatic cleanup using LRU or age-based strategies
4. **Sync**: Queue offline operations for when connectivity returns

## ⚡ Performance

- **Simplified Architecture**: ~40% code reduction from complex predecessor
- **Efficient Cleanup**: Only 2 strategies instead of 5
- **Memory Management**: Automatic pressure detection and cleanup
- **Offline Resilience**: Network-first with graceful offline fallback

The simplified cache system maintains all essential functionality while removing unnecessary complexity.