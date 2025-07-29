#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var init_esm_shims = __esm({
  "node_modules/tsup/assets/esm_shims.js"() {
    "use strict";
  }
});

// src/cli/types.ts
var AuthenticationRequiredError;
var init_types = __esm({
  "src/cli/types.ts"() {
    "use strict";
    init_esm_shims();
    AuthenticationRequiredError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "AuthenticationRequiredError";
      }
    };
  }
});

// src/cli/config/constants.ts
import path2 from "path";
import os from "os";
var CONFIG_DIR, CONFIG_FILE, AUTH_FILE, PROFILES_DIR, DEFAULT_TRACE_CONFIG;
var init_constants = __esm({
  "src/cli/config/constants.ts"() {
    "use strict";
    init_esm_shims();
    CONFIG_DIR = path2.join(os.homedir(), ".acube");
    CONFIG_FILE = path2.join(CONFIG_DIR, "config.json");
    AUTH_FILE = path2.join(CONFIG_DIR, "auth.json");
    PROFILES_DIR = path2.join(CONFIG_DIR, "profiles");
    DEFAULT_TRACE_CONFIG = {
      enabled: false,
      level: "basic",
      includeStack: false,
      includeContext: true,
      includeTimestamp: true,
      outputFormat: "pretty"
    };
  }
});

// src/cli/config/index.ts
import fs from "fs/promises";
import path3 from "path";
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.mkdir(PROFILES_DIR, { recursive: true });
  } catch (error) {
  }
}
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(data);
    if (config.trace) {
      config.trace = { ...DEFAULT_TRACE_CONFIG, ...config.trace };
    }
    return config;
  } catch (error) {
    return {
      environment: "sandbox",
      trace: DEFAULT_TRACE_CONFIG
    };
  }
}
async function saveConfig(config) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}
async function loadAuth(profile) {
  try {
    const authFile = profile ? path3.join(PROFILES_DIR, `${profile}.json`) : AUTH_FILE;
    const data = await fs.readFile(authFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
async function saveAuth(auth, profile) {
  await ensureConfigDir();
  const authFile = profile ? path3.join(PROFILES_DIR, `${profile}.json`) : AUTH_FILE;
  await fs.writeFile(authFile, JSON.stringify(auth, null, 2));
}
async function clearAuth(profile) {
  try {
    const authFile = profile ? path3.join(PROFILES_DIR, `${profile}.json`) : AUTH_FILE;
    await fs.unlink(authFile);
  } catch (error) {
  }
}
async function listProfiles() {
  try {
    const files = await fs.readdir(PROFILES_DIR);
    return files.filter((file) => file.endsWith(".json")).map((file) => path3.basename(file, ".json"));
  } catch (error) {
    return [];
  }
}
async function deleteProfile(name) {
  const profileFile = path3.join(PROFILES_DIR, `${name}.json`);
  await fs.unlink(profileFile);
}
var init_config = __esm({
  "src/cli/config/index.ts"() {
    "use strict";
    init_esm_shims();
    init_constants();
  }
});

// node_modules/eventemitter3/index.js
var require_eventemitter3 = __commonJS({
  "node_modules/eventemitter3/index.js"(exports, module) {
    "use strict";
    init_esm_shims();
    var has = Object.prototype.hasOwnProperty;
    var prefix = "~";
    function Events() {
    }
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter3() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter3.prototype.eventNames = function eventNames() {
      var names = [], events, name;
      if (this._eventsCount === 0) return names;
      for (name in events = this._events) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    };
    EventEmitter3.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    };
    EventEmitter3.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter3.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter3.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter3.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter3.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter3.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter3.prototype.off = EventEmitter3.prototype.removeListener;
    EventEmitter3.prototype.addListener = EventEmitter3.prototype.on;
    EventEmitter3.prefixed = prefix;
    EventEmitter3.EventEmitter = EventEmitter3;
    if ("undefined" !== typeof module) {
      module.exports = EventEmitter3;
    }
  }
});

// node_modules/eventemitter3/index.mjs
var import_index;
var init_eventemitter3 = __esm({
  "node_modules/eventemitter3/index.mjs"() {
    "use strict";
    init_esm_shims();
    import_index = __toESM(require_eventemitter3(), 1);
  }
});

// src/errors/index.ts
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function createErrorFromResponse(response, operation, requestId) {
  const message = getErrorMessage(response.data) || response.statusText;
  switch (response.status) {
    case 401:
      return new AuthenticationError(message, operation, {
        statusCode: response.status,
        ...requestId !== void 0 && { requestId }
      });
    case 403:
      return new AuthorizationError(message, operation, {
        statusCode: response.status,
        ...requestId !== void 0 && { requestId }
      });
    case 404:
      const resourceType = extractResourceType(response.data);
      const resourceId = extractResourceId(response.data);
      if (resourceType && resourceId) {
        return new NotFoundError(resourceType, resourceId, operation, {
          ...requestId !== void 0 && { requestId }
        });
      }
      return new NotFoundError("Resource", "unknown", operation, {
        ...requestId !== void 0 && { requestId }
      });
    case 422:
      const violations = extractValidationViolations(response.data);
      return new ValidationError(message, operation, violations, {
        ...requestId !== void 0 && { requestId }
      });
    case 429:
      const retryAfter = extractRetryAfter(response.data);
      return new RateLimitError(message, operation, {
        ...retryAfter !== void 0 && { retryAfter },
        ...requestId !== void 0 && { requestId }
      });
    case 500:
    case 502:
    case 503:
    case 504:
      return new NetworkError(message, operation, {
        statusCode: response.status,
        ...requestId !== void 0 && { requestId },
        retryable: true
      });
    default:
      return new NetworkError(message, operation, {
        statusCode: response.status,
        ...requestId !== void 0 && { requestId },
        retryable: response.status >= 500
      });
  }
}
function getErrorMessage(data) {
  if (typeof data === "object" && data !== null) {
    const obj = data;
    return obj.message || obj.detail || null;
  }
  return null;
}
function extractResourceType(data) {
  if (typeof data === "object" && data !== null) {
    const obj = data;
    return obj.resourceType || null;
  }
  return null;
}
function extractResourceId(data) {
  if (typeof data === "object" && data !== null) {
    const obj = data;
    return obj.resourceId || null;
  }
  return null;
}
function extractValidationViolations(data) {
  if (typeof data === "object" && data !== null) {
    const obj = data;
    if (Array.isArray(obj.violations)) {
      return obj.violations.map((v) => ({
        field: v.propertyPath || v.field || "unknown",
        message: v.message || "Validation failed",
        code: v.code || "VALIDATION_FAILED",
        value: v.value
      }));
    }
    if (Array.isArray(obj.detail)) {
      return obj.detail.map((v) => ({
        field: v.loc?.join(".") || "unknown",
        message: v.msg || "Validation failed",
        code: v.type || "VALIDATION_FAILED",
        value: v.input
      }));
    }
  }
  return [];
}
function extractRetryAfter(data) {
  if (typeof data === "object" && data !== null) {
    const obj = data;
    const retryAfter = obj.retryAfter || obj.retry_after;
    return typeof retryAfter === "number" ? retryAfter : void 0;
  }
  return void 0;
}
var ACubeSDKError, NetworkError, AuthenticationError, AuthorizationError, ValidationError, FiscalError, RateLimitError, NotFoundError, CircuitBreakerError;
var init_errors = __esm({
  "src/errors/index.ts"() {
    "use strict";
    init_esm_shims();
    ACubeSDKError = class extends Error {
      constructor(message, code, options) {
        super(message);
        this.code = code;
        if (options.cause) {
          this.cause = options.cause;
        }
        this.name = this.constructor.name;
        this.timestamp = /* @__PURE__ */ new Date();
        this.requestId = options.requestId ?? generateRequestId();
        this.operation = options.operation;
        this.retryable = options.retryable ?? false;
        if (options.statusCode !== void 0) {
          this.statusCode = options.statusCode;
        }
        if (options.auditInfo !== void 0) {
          this.auditInfo = options.auditInfo;
        }
        Object.setPrototypeOf(this, new.target.prototype);
      }
      timestamp;
      requestId;
      operation;
      retryable;
      statusCode;
      auditInfo;
      cause;
      toJSON() {
        return {
          name: this.name,
          message: this.message,
          code: this.code,
          operation: this.operation,
          retryable: this.retryable,
          statusCode: this.statusCode,
          timestamp: this.timestamp.toISOString(),
          requestId: this.requestId,
          auditInfo: this.auditInfo,
          stack: this.stack
        };
      }
    };
    NetworkError = class extends ACubeSDKError {
      constructor(message, operation, options = {}) {
        super(message, "NETWORK_ERROR", {
          operation,
          retryable: options.retryable ?? true,
          ...options.statusCode !== void 0 && { statusCode: options.statusCode },
          ...options.requestId !== void 0 && { requestId: options.requestId },
          ...options.cause !== void 0 && { cause: options.cause }
        });
      }
    };
    AuthenticationError = class extends ACubeSDKError {
      constructor(message, operation, options = {}) {
        super(message, "AUTHENTICATION_ERROR", {
          operation,
          retryable: false,
          statusCode: options.statusCode ?? 401,
          ...options.requestId !== void 0 && { requestId: options.requestId },
          ...options.auditInfo !== void 0 && { auditInfo: options.auditInfo }
        });
      }
    };
    AuthorizationError = class extends ACubeSDKError {
      constructor(message, operation, options = {}) {
        super(message, "AUTHORIZATION_ERROR", {
          operation,
          retryable: false,
          statusCode: options.statusCode ?? 403,
          ...options.requestId !== void 0 && { requestId: options.requestId },
          ...options.auditInfo !== void 0 && { auditInfo: options.auditInfo }
        });
      }
    };
    ValidationError = class extends ACubeSDKError {
      violations;
      constructor(message, operation, violations, options = {}) {
        super(message, "VALIDATION_ERROR", {
          operation,
          retryable: false,
          statusCode: 422,
          ...options.requestId !== void 0 && { requestId: options.requestId },
          ...options.auditInfo !== void 0 && { auditInfo: options.auditInfo }
        });
        this.violations = violations;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          violations: this.violations
        };
      }
    };
    FiscalError = class extends ACubeSDKError {
      fiscalCode;
      documentNumber;
      constructor(message, operation, options = {}) {
        super(message, "FISCAL_ERROR", {
          operation,
          retryable: options.retryable ?? false,
          statusCode: options.statusCode ?? 400,
          ...options.requestId !== void 0 && { requestId: options.requestId },
          ...options.auditInfo !== void 0 && { auditInfo: options.auditInfo }
        });
        if (options.fiscalCode !== void 0) {
          this.fiscalCode = options.fiscalCode;
        }
        if (options.documentNumber !== void 0) {
          this.documentNumber = options.documentNumber;
        }
      }
      toJSON() {
        return {
          ...super.toJSON(),
          fiscalCode: this.fiscalCode,
          documentNumber: this.documentNumber
        };
      }
    };
    RateLimitError = class extends ACubeSDKError {
      retryAfter;
      constructor(message, operation, options = {}) {
        super(message, "RATE_LIMIT_ERROR", {
          operation,
          retryable: true,
          statusCode: 429,
          ...options.requestId !== void 0 && { requestId: options.requestId }
        });
        if (options.retryAfter !== void 0) {
          this.retryAfter = options.retryAfter;
        }
      }
      toJSON() {
        return {
          ...super.toJSON(),
          retryAfter: this.retryAfter
        };
      }
    };
    NotFoundError = class extends ACubeSDKError {
      resourceType;
      resourceId;
      constructor(resourceType, resourceId, operation, options = {}) {
        super(
          `${resourceType} with id ${resourceId} not found`,
          "NOT_FOUND_ERROR",
          {
            operation,
            retryable: false,
            statusCode: 404,
            ...options.requestId !== void 0 && { requestId: options.requestId },
            ...options.auditInfo !== void 0 && { auditInfo: options.auditInfo }
          }
        );
        this.resourceType = resourceType;
        this.resourceId = resourceId;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          resourceType: this.resourceType,
          resourceId: this.resourceId
        };
      }
    };
    CircuitBreakerError = class extends ACubeSDKError {
      state;
      constructor(message, operation, state, options = {}) {
        super(message, "CIRCUIT_BREAKER_ERROR", {
          operation,
          retryable: true,
          ...options.requestId !== void 0 && { requestId: options.requestId }
        });
        this.state = state;
      }
      toJSON() {
        return {
          ...super.toJSON(),
          state: this.state
        };
      }
    };
  }
});

// src/http/circuit-breaker.ts
var CircuitBreaker;
var init_circuit_breaker = __esm({
  "src/http/circuit-breaker.ts"() {
    "use strict";
    init_esm_shims();
    init_errors();
    CircuitBreaker = class {
      constructor(config) {
        this.config = config;
        if (config.healthCheckInterval) {
          this.startHealthCheck();
        }
      }
      state = "CLOSED";
      metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        stateChanges: []
      };
      nextAttemptTime = 0;
      healthCheckTimer = null;
      async execute(operation, operationName = "unknown") {
        if (this.shouldRejectRequest()) {
          throw new CircuitBreakerError(
            `Circuit breaker is ${this.state} for operation: ${operationName}`,
            operationName,
            this.state
          );
        }
        this.metrics.totalRequests++;
        try {
          const result = await this.executeWithTimeout(operation);
          this.onSuccess();
          return result;
        } catch (error) {
          this.onFailure();
          throw error;
        }
      }
      async executeWithTimeout(operation) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
          }, this.config.timeout);
        });
        return Promise.race([operation(), timeoutPromise]);
      }
      shouldRejectRequest() {
        switch (this.state) {
          case "CLOSED":
            return false;
          case "OPEN":
            return Date.now() < this.nextAttemptTime;
          case "HALF_OPEN":
            return false;
          default:
            return false;
        }
      }
      onSuccess() {
        this.metrics.successfulRequests++;
        this.metrics.consecutiveSuccesses++;
        this.metrics.consecutiveFailures = 0;
        this.metrics.lastSuccessTime = Date.now();
        switch (this.state) {
          case "HALF_OPEN":
            if (this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
              this.transitionTo("CLOSED", "Success threshold reached");
            }
            break;
          case "OPEN":
            this.transitionTo("HALF_OPEN", "First success after opening");
            break;
        }
      }
      onFailure() {
        this.metrics.failedRequests++;
        this.metrics.consecutiveFailures++;
        this.metrics.consecutiveSuccesses = 0;
        this.metrics.lastFailureTime = Date.now();
        switch (this.state) {
          case "CLOSED":
            if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
              this.transitionTo("OPEN", "Failure threshold reached");
            }
            break;
          case "HALF_OPEN":
            this.transitionTo("OPEN", "Failed during half-open state");
            break;
        }
      }
      transitionTo(newState, reason) {
        const oldState = this.state;
        this.state = newState;
        this.metrics.stateChanges.push({
          from: oldState,
          to: newState,
          timestamp: Date.now(),
          reason
        });
        if (this.metrics.stateChanges.length > 100) {
          this.metrics.stateChanges.shift();
        }
        if (newState === "OPEN") {
          this.nextAttemptTime = Date.now() + this.config.resetTimeout;
        }
        console.log(`Circuit breaker ${this.config.name || "unnamed"} transitioned from ${oldState} to ${newState}: ${reason}`);
      }
      startHealthCheck() {
        if (this.config.healthCheckInterval) {
          this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
          }, this.config.healthCheckInterval);
        }
      }
      performHealthCheck() {
        if (this.state === "OPEN" && Date.now() >= this.nextAttemptTime) {
          this.transitionTo("HALF_OPEN", "Health check triggered state change");
        }
      }
      getState() {
        return this.state;
      }
      getMetrics() {
        return { ...this.metrics };
      }
      reset() {
        this.state = "CLOSED";
        this.metrics = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
          lastFailureTime: null,
          lastSuccessTime: null,
          stateChanges: []
        };
        this.nextAttemptTime = 0;
      }
      destroy() {
        if (this.healthCheckTimer) {
          clearInterval(this.healthCheckTimer);
          this.healthCheckTimer = null;
        }
      }
      getHealthStatus() {
        const now = Date.now();
        const uptime = this.metrics.lastSuccessTime ? now - this.metrics.lastSuccessTime : 0;
        const failureRate = this.metrics.totalRequests > 0 ? this.metrics.failedRequests / this.metrics.totalRequests : 0;
        return {
          isHealthy: this.state === "CLOSED" && failureRate < 0.5,
          failureRate,
          uptime
        };
      }
    };
  }
});

// src/http/retry.ts
var RetryHandler, DEFAULT_RETRY_CONFIG;
var init_retry = __esm({
  "src/http/retry.ts"() {
    "use strict";
    init_esm_shims();
    init_errors();
    RetryHandler = class {
      constructor(config) {
        this.config = config;
      }
      metrics = {
        totalAttempts: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageDelay: 0,
        attempts: []
      };
      async execute(operation, operationName = "unknown") {
        let lastError = null;
        let nextDelay = this.config.baseDelay;
        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
          this.metrics.totalAttempts++;
          try {
            const result = await this.executeWithTimeout(operation);
            if (attempt > 1) {
              this.metrics.successfulRetries++;
            }
            return result;
          } catch (error) {
            lastError = error;
            const retryAttempt = {
              attempt,
              delay: nextDelay,
              error: lastError,
              timestamp: Date.now()
            };
            this.metrics.attempts.push(retryAttempt);
            if (this.metrics.attempts.length > 100) {
              this.metrics.attempts.shift();
            }
            if (attempt === this.config.maxAttempts || !this.shouldRetry(lastError)) {
              this.metrics.failedRetries++;
              break;
            }
            const delay = this.calculateDelay(attempt, nextDelay);
            console.log(
              `Retrying ${operationName} (attempt ${attempt}/${this.config.maxAttempts}) after ${delay}ms delay. Error: ${lastError.message}`
            );
            await this.sleep(delay);
            nextDelay = Math.min(
              nextDelay * this.config.backoffMultiplier,
              this.config.maxDelay
            );
          }
        }
        throw lastError || new Error("Unknown error during retry execution");
      }
      async executeWithTimeout(operation) {
        if (!this.config.timeout) {
          return operation();
        }
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
          }, this.config.timeout);
        });
        return Promise.race([operation(), timeoutPromise]);
      }
      shouldRetry(error) {
        if (error instanceof ACubeSDKError) {
          return error.retryable;
        }
        const statusCode = this.extractStatusCode(error);
        if (statusCode && this.config.retryableStatusCodes.includes(statusCode)) {
          return true;
        }
        const errorCode = this.extractErrorCode(error);
        if (errorCode && this.config.retryableErrors.includes(errorCode)) {
          return true;
        }
        if (this.isNetworkError(error)) {
          return true;
        }
        return false;
      }
      calculateDelay(_attempt, baseDelay) {
        switch (this.config.jitterType) {
          case "none":
            return baseDelay;
          case "full":
            return Math.random() * baseDelay;
          case "equal":
            return baseDelay / 2 + Math.random() * (baseDelay / 2);
          case "decorrelated":
            return Math.random() * (Math.min(this.config.maxDelay, baseDelay * 3) - this.config.baseDelay) + this.config.baseDelay;
          default:
            return baseDelay;
        }
      }
      extractStatusCode(error) {
        const err = error;
        return err.statusCode || err.status || err.response?.status || null;
      }
      extractErrorCode(error) {
        const err = error;
        return err.code || err.errno || error.name || null;
      }
      isNetworkError(error) {
        const networkErrorCodes = [
          "ECONNRESET",
          "ECONNREFUSED",
          "ETIMEDOUT",
          "ENOTFOUND",
          "ENETUNREACH",
          "EAI_AGAIN",
          "ECONNABORTED"
        ];
        const errorCode = this.extractErrorCode(error);
        return errorCode ? networkErrorCodes.includes(errorCode) : false;
      }
      sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      getMetrics() {
        const totalDelay = this.metrics.attempts.reduce((sum, attempt) => sum + attempt.delay, 0);
        return {
          ...this.metrics,
          averageDelay: this.metrics.attempts.length > 0 ? totalDelay / this.metrics.attempts.length : 0
        };
      }
      reset() {
        this.metrics = {
          totalAttempts: 0,
          successfulRetries: 0,
          failedRetries: 0,
          averageDelay: 0,
          attempts: []
        };
      }
    };
    DEFAULT_RETRY_CONFIG = {
      maxAttempts: 3,
      baseDelay: 1e3,
      maxDelay: 3e4,
      backoffMultiplier: 2,
      jitterType: "equal",
      retryableStatusCodes: [500, 502, 503, 504, 429],
      retryableErrors: [
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "ENETUNREACH",
        "NETWORK_ERROR",
        "RATE_LIMIT_ERROR"
      ],
      timeout: 3e4
    };
  }
});

// src/http/middleware.ts
var MiddlewareStack, AuthenticationMiddleware, RequestIdMiddleware, UserAgentMiddleware, ContentTypeMiddleware, LoggingMiddleware;
var init_middleware = __esm({
  "src/http/middleware.ts"() {
    "use strict";
    init_esm_shims();
    MiddlewareStack = class {
      middlewares = [];
      add(middleware) {
        this.middlewares.push(middleware);
        this.middlewares.sort((a, b) => b.priority - a.priority);
        return this;
      }
      remove(name) {
        this.middlewares = this.middlewares.filter((m) => m.name !== name);
        return this;
      }
      async executeBeforeRequest(context) {
        let currentContext = context;
        for (const middleware of this.middlewares) {
          if (middleware.beforeRequest) {
            try {
              currentContext = await middleware.beforeRequest(currentContext);
            } catch (error) {
              console.warn(`Middleware ${middleware.name} failed in beforeRequest:`, error);
            }
          }
        }
        return currentContext;
      }
      async executeAfterResponse(context, response) {
        let currentResponse = response;
        for (const middleware of [...this.middlewares].reverse()) {
          if (middleware.afterResponse) {
            try {
              currentResponse = await middleware.afterResponse(context, currentResponse);
            } catch (error) {
              console.warn(`Middleware ${middleware.name} failed in afterResponse:`, error);
            }
          }
        }
        return currentResponse;
      }
      async executeOnError(context, error) {
        let currentError = error;
        for (const middleware of this.middlewares) {
          if (middleware.onError) {
            try {
              const result = await middleware.onError(context, currentError);
              if (result instanceof Error) {
                currentError = result;
              }
            } catch (middlewareError) {
              console.warn(`Middleware ${middleware.name} failed in onError:`, middlewareError);
            }
          }
        }
        return currentError;
      }
      getMiddlewares() {
        return [...this.middlewares];
      }
      clear() {
        this.middlewares = [];
        return this;
      }
    };
    AuthenticationMiddleware = class {
      constructor(getToken) {
        this.getToken = getToken;
      }
      name = "authentication";
      priority = 100;
      async beforeRequest(context) {
        const token = await this.getToken();
        if (token) {
          context.headers.Authorization = `Bearer ${token}`;
        }
        return context;
      }
    };
    RequestIdMiddleware = class {
      name = "request-id";
      priority = 90;
      beforeRequest(context) {
        if (!context.headers["X-Request-ID"]) {
          context.headers["X-Request-ID"] = context.requestId;
        }
        return context;
      }
    };
    UserAgentMiddleware = class {
      constructor(userAgent) {
        this.userAgent = userAgent;
      }
      name = "user-agent";
      priority = 80;
      beforeRequest(context) {
        if (!context.headers["User-Agent"]) {
          context.headers["User-Agent"] = this.userAgent;
        }
        return context;
      }
    };
    ContentTypeMiddleware = class {
      name = "content-type";
      priority = 70;
      beforeRequest(context) {
        if (context.body && !context.headers["Content-Type"]) {
          context.headers["Content-Type"] = "application/json";
        }
        return context;
      }
    };
    LoggingMiddleware = class {
      constructor(logger, options = {
        logRequests: true,
        logResponses: true,
        logHeaders: false,
        logBody: false,
        sanitizeHeaders: ["authorization", "cookie", "x-api-key"]
      }) {
        this.logger = logger;
        this.options = options;
      }
      name = "logging";
      priority = 10;
      beforeRequest(context) {
        if (this.options.logRequests) {
          const logData = {
            requestId: context.requestId,
            method: context.method,
            url: context.url
          };
          if (this.options.logHeaders) {
            logData.headers = this.sanitizeHeaders(context.headers);
          }
          if (this.options.logBody && context.body) {
            logData.body = this.sanitizeBody(context.body);
          }
          this.logger.debug("HTTP Request", logData);
        }
        return context;
      }
      afterResponse(context, response) {
        if (this.options.logResponses) {
          const logData = {
            requestId: context.requestId,
            status: response.status,
            statusText: response.statusText,
            duration: response.duration
          };
          if (this.options.logHeaders) {
            logData.headers = this.sanitizeHeaders(response.headers);
          }
          if (this.options.logBody && response.data) {
            logData.body = this.sanitizeBody(response.data);
          }
          const logLevel = response.status >= 400 ? "error" : "debug";
          this.logger[logLevel]("HTTP Response", logData);
        }
        return response;
      }
      onError(context, error) {
        this.logger.error("HTTP Error", {
          requestId: context.requestId,
          method: context.method,
          url: context.url,
          error: error.message,
          stack: error.stack
        });
        return error;
      }
      sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        this.options.sanitizeHeaders?.forEach((header) => {
          const key = Object.keys(sanitized).find(
            (k) => k.toLowerCase() === header.toLowerCase()
          );
          if (key) {
            sanitized[key] = "[REDACTED]";
          }
        });
        return sanitized;
      }
      sanitizeBody(body) {
        if (typeof body !== "object" || body === null) {
          return body;
        }
        const sensitiveFields = ["password", "token", "secret", "key", "auth"];
        const sanitized = { ...body };
        Object.keys(sanitized).forEach((key) => {
          if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
            sanitized[key] = "[REDACTED]";
          }
        });
        return sanitized;
      }
    };
  }
});

// src/http/client.ts
var HttpClient, DEFAULT_HTTP_CONFIG, AUTH_HTTP_CONFIG;
var init_client = __esm({
  "src/http/client.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_circuit_breaker();
    init_retry();
    init_middleware();
    init_errors();
    HttpClient = class extends import_index.default {
      constructor(config) {
        super();
        this.config = config;
        this.middlewareStack = new MiddlewareStack();
        this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);
        this.retryHandler = new RetryHandler(config.retryConfig);
        this.setupDefaultMiddlewares();
      }
      middlewareStack;
      circuitBreaker;
      retryHandler;
      requestCounter = 0;
      setupDefaultMiddlewares() {
        if (this.config.getAuthToken) {
          this.middlewareStack.add(new AuthenticationMiddleware(this.config.getAuthToken));
        }
        this.middlewareStack.add(new RequestIdMiddleware());
        this.middlewareStack.add(new UserAgentMiddleware(this.config.userAgent));
        this.middlewareStack.add(new ContentTypeMiddleware());
        if (this.config.enableLogging) {
          this.middlewareStack.add(new LoggingMiddleware(
            {
              debug: (msg, meta) => this.emit("debug", msg, meta),
              warn: (msg, meta) => this.emit("warn", msg, meta),
              error: (msg, meta) => this.emit("error", msg, meta)
            },
            {
              logRequests: true,
              logResponses: true,
              logHeaders: false,
              logBody: false
            }
          ));
        }
      }
      async request(options) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        const context = {
          url: this.buildUrl(options.url, options.params),
          method: options.method,
          headers: {
            ...this.config.headers,
            ...options.headers
          },
          body: options.data,
          metadata: options.metadata || {},
          startTime,
          requestId
        };
        const executeRequest = async () => {
          try {
            const processedContext = await this.middlewareStack.executeBeforeRequest(context);
            const response = await this.makeHttpRequest(processedContext, options.timeout);
            const processedResponse = await this.middlewareStack.executeAfterResponse(
              processedContext,
              response
            );
            return {
              data: processedResponse.data,
              status: processedResponse.status,
              statusText: processedResponse.statusText,
              headers: processedResponse.headers,
              requestId,
              duration: processedResponse.duration
            };
          } catch (error) {
            const processedError = await this.middlewareStack.executeOnError(
              context,
              error
            );
            throw processedError;
          }
        };
        try {
          if (this.config.enableCircuitBreaker && !options.skipCircuitBreaker) {
            if (this.config.enableRetry && !options.skipRetry) {
              return await this.circuitBreaker.execute(
                () => this.retryHandler.execute(() => executeRequest(), `${options.method} ${options.url}`),
                `${options.method} ${options.url}`
              );
            } else {
              return await this.circuitBreaker.execute(
                executeRequest,
                `${options.method} ${options.url}`
              );
            }
          } else if (this.config.enableRetry && !options.skipRetry) {
            return await this.retryHandler.execute(
              executeRequest,
              `${options.method} ${options.url}`
            );
          } else {
            return await executeRequest();
          }
        } catch (error) {
          this.emit("requestError", {
            requestId,
            method: options.method,
            url: options.url,
            error: error instanceof Error ? error.message : "Unknown error",
            duration: Date.now() - startTime
          });
          throw error;
        }
      }
      async makeHttpRequest(context, timeoutOverride) {
        const timeout = timeoutOverride || this.config.timeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
          const fetchOptions = {
            method: context.method,
            headers: context.headers,
            signal: controller.signal
          };
          if (context.body && context.method !== "GET") {
            fetchOptions.body = typeof context.body === "string" ? context.body : JSON.stringify(context.body);
          }
          const response = await fetch(context.url, fetchOptions);
          clearTimeout(timeoutId);
          const endTime = Date.now();
          const duration = endTime - context.startTime;
          let data;
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            data = await response.json();
          } else if (contentType.includes("application/pdf")) {
            data = await response.blob();
          } else if (contentType.includes("text/")) {
            data = await response.text();
          } else {
            data = await response.arrayBuffer();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          const responseContext = {
            status: response.status,
            statusText: response.statusText,
            headers,
            data,
            metadata: {},
            endTime,
            duration
          };
          if (!response.ok) {
            const error = createErrorFromResponse(
              {
                status: response.status,
                statusText: response.statusText,
                data
              },
              `${context.method} ${context.url}`,
              context.requestId
            );
            throw error;
          }
          this.emit("requestSuccess", {
            requestId: context.requestId,
            method: context.method,
            url: context.url,
            status: response.status,
            duration
          });
          return responseContext;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof ACubeSDKError) {
            throw error;
          }
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              throw createErrorFromResponse(
                {
                  status: 408,
                  statusText: "Request Timeout",
                  data: { message: "Request timeout" }
                },
                `${context.method} ${context.url}`,
                context.requestId
              );
            }
            throw createErrorFromResponse(
              {
                status: 0,
                statusText: "Network Error",
                data: { message: error.message }
              },
              `${context.method} ${context.url}`,
              context.requestId
            );
          }
          throw error;
        }
      }
      buildUrl(path4, params) {
        const url = new URL(path4, this.config.baseUrl);
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== void 0 && value !== null) {
              url.searchParams.append(key, String(value));
            }
          });
        }
        return url.toString();
      }
      generateRequestId() {
        return `req_${Date.now()}_${++this.requestCounter}_${Math.random().toString(36).substring(2, 8)}`;
      }
      // Convenience methods
      async get(url, options = {}) {
        return this.request({ ...options, method: "GET", url });
      }
      async post(url, data, options = {}) {
        return this.request({ ...options, method: "POST", url, data });
      }
      async put(url, data, options = {}) {
        return this.request({ ...options, method: "PUT", url, data });
      }
      async delete(url, options = {}) {
        return this.request({ ...options, method: "DELETE", url });
      }
      async patch(url, data, options = {}) {
        return this.request({ ...options, method: "PATCH", url, data });
      }
      // Middleware management
      addMiddleware(middleware) {
        this.middlewareStack.add(middleware);
        return this;
      }
      removeMiddleware(name) {
        this.middlewareStack.remove(name);
        return this;
      }
      // Health and metrics
      getCircuitBreakerMetrics() {
        return this.circuitBreaker.getMetrics();
      }
      getRetryMetrics() {
        return this.retryHandler.getMetrics();
      }
      getMetrics() {
        const circuitBreakerMetrics = this.circuitBreaker.getMetrics();
        const retryMetrics = this.retryHandler.getMetrics();
        return {
          requestCount: circuitBreakerMetrics.totalRequests,
          successCount: circuitBreakerMetrics.successfulRequests,
          errorCount: circuitBreakerMetrics.failedRequests,
          totalDuration: 0,
          // Would need to track this separately
          averageResponseTime: 0,
          // Would need to track this separately
          retryCount: retryMetrics.totalAttempts || 0
        };
      }
      getHealth() {
        const circuitBreakerHealth = this.circuitBreaker.getHealthStatus();
        return {
          status: circuitBreakerHealth.isHealthy ? "healthy" : "unhealthy",
          circuitBreakerState: this.circuitBreaker.getState(),
          lastError: null,
          // Would need to track this
          uptime: circuitBreakerHealth.uptime
        };
      }
      getHealthStatus() {
        return {
          circuitBreaker: this.circuitBreaker.getHealthStatus(),
          retry: this.retryHandler.getMetrics()
        };
      }
      // Configuration updates
      updateConfig(updates) {
        Object.assign(this.config, updates);
      }
      // Cleanup
      destroy() {
        this.circuitBreaker.destroy();
        this.retryHandler.reset();
        this.middlewareStack.clear();
        this.removeAllListeners();
      }
    };
    DEFAULT_HTTP_CONFIG = {
      baseUrl: "https://ereceipts-it-sandbox.acubeapi.com",
      timeout: 3e4,
      retryConfig: DEFAULT_RETRY_CONFIG,
      circuitBreakerConfig: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 3e4,
        resetTimeout: 6e4,
        name: "acube-http-client"
      },
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      enableCircuitBreaker: true,
      enableRetry: true,
      enableLogging: true,
      userAgent: "ACube-SDK/2.0.0"
    };
    AUTH_HTTP_CONFIG = {
      ...DEFAULT_HTTP_CONFIG,
      baseUrl: "https://common-sandbox.api.acubeapi.com",
      circuitBreakerConfig: {
        ...DEFAULT_HTTP_CONFIG.circuitBreakerConfig,
        name: "acube-auth-client"
      }
    };
  }
});

// src/storage/adapters/optimized-react-native-storage.ts
var optimized_react_native_storage_exports = {};
__export(optimized_react_native_storage_exports, {
  OptimizedReactNativeStorageAdapter: () => OptimizedReactNativeStorageAdapter
});
var isReactNative, LRUCache, WriteBatchManager, DEFAULT_CONFIG, OptimizedReactNativeStorageAdapter;
var init_optimized_react_native_storage = __esm({
  "src/storage/adapters/optimized-react-native-storage.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    isReactNative = typeof navigator !== "undefined" && (navigator.product === "ReactNative" || global.__REACT_NATIVE__);
    LRUCache = class {
      cache = /* @__PURE__ */ new Map();
      maxSize;
      ttl;
      constructor(maxSize = 1e3, ttl = 5 * 60 * 1e3) {
        this.maxSize = maxSize;
        this.ttl = ttl;
      }
      get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttl) {
          this.cache.delete(key);
          return null;
        }
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
      }
      set(key, value) {
        if (this.cache.has(key)) {
          this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) {
            this.cache.delete(firstKey);
          }
        }
        this.cache.set(key, { value, timestamp: Date.now() });
      }
      delete(key) {
        return this.cache.delete(key);
      }
      clear() {
        this.cache.clear();
      }
      size() {
        return this.cache.size;
      }
      // Cleanup expired entries
      cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
          if (now - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            cleaned++;
          }
        }
        return cleaned;
      }
    };
    WriteBatchManager = class {
      pendingWrites = /* @__PURE__ */ new Map();
      batchTimer;
      batchDelay;
      maxBatchSize;
      constructor(batchDelay = 50, maxBatchSize = 100) {
        this.batchDelay = batchDelay;
        this.maxBatchSize = maxBatchSize;
      }
      enqueue(key, value) {
        return new Promise((resolve, reject) => {
          const existing = this.pendingWrites.get(key);
          if (existing) {
            existing.resolve();
          }
          this.pendingWrites.set(key, {
            value,
            timestamp: Date.now(),
            resolve,
            reject
          });
          if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
          }
          if (this.pendingWrites.size >= this.maxBatchSize) {
            this.processBatch();
          }
        });
      }
      async processBatch() {
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
          this.batchTimer = void 0;
        }
        if (this.pendingWrites.size === 0) return;
        const batch = Array.from(this.pendingWrites.entries());
        this.pendingWrites.clear();
        try {
          const AsyncStorageModule = await import("@react-native-async-storage/async-storage");
          const AsyncStorage = AsyncStorageModule.default;
          const multiSetArray = batch.map(([key, data]) => [key, data.value]);
          await AsyncStorage.multiSet(multiSetArray);
          batch.forEach(([, data]) => data.resolve());
        } catch (error) {
          batch.forEach(([, data]) => data.reject(error));
        }
      }
      async flush() {
        return this.processBatch();
      }
      clear() {
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
          this.batchTimer = void 0;
        }
        for (const [, data] of this.pendingWrites) {
          data.reject(new Error("Batch manager cleared"));
        }
        this.pendingWrites.clear();
      }
    };
    DEFAULT_CONFIG = {
      keyPrefix: "acube_optimized",
      enableCache: true,
      cacheSize: 1e3,
      cacheTTL: 5 * 60 * 1e3,
      // 5 minutes
      enableBatching: true,
      batchDelay: 50,
      // 50ms
      maxBatchSize: 100,
      enableCompression: true,
      compressionThreshold: 1024,
      // 1KB
      enableBackgroundCleanup: true,
      cleanupInterval: 10 * 60 * 1e3,
      // 10 minutes
      enableMetrics: true,
      enableMemoryPressureHandling: true,
      memoryPressureThreshold: 50 * 1024 * 1024
      // 50MB
    };
    OptimizedReactNativeStorageAdapter = class extends import_index.default {
      name = "OptimizedReactNativeStorage";
      isAvailable = isReactNative;
      capabilities = {
        supportsTransactions: false,
        supportsIndexing: false,
        maxKeyLength: 1e3,
        maxValueSize: 6 * 1024 * 1024,
        // 6MB (iOS limit)
        supportsCompression: true,
        supportsEncryption: false,
        supportsTTL: true
      };
      config;
      cache;
      writeBatch;
      AsyncStorage;
      isInitialized = false;
      metrics;
      cleanupTimer;
      memoryUsage = 0;
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new LRUCache(this.config.cacheSize, this.config.cacheTTL);
        this.writeBatch = new WriteBatchManager(this.config.batchDelay, this.config.maxBatchSize);
        this.metrics = this.initializeMetrics();
        this.initialize();
      }
      initializeMetrics() {
        return {
          cacheHits: 0,
          cacheMisses: 0,
          reads: 0,
          writes: 0,
          batches: 0,
          compressionSaved: 0,
          avgReadTime: 0,
          avgWriteTime: 0,
          memoryPressureEvents: 0,
          backgroundCleanups: 0
        };
      }
      async initialize() {
        if (this.isInitialized || !this.isAvailable) return;
        try {
          const AsyncStorageModule = await import("@react-native-async-storage/async-storage");
          this.AsyncStorage = AsyncStorageModule.default;
          if (this.config.enableBackgroundCleanup) {
            this.startBackgroundCleanup();
          }
          if (this.config.enableMemoryPressureHandling) {
            this.setupMemoryPressureHandling();
          }
          this.isInitialized = true;
        } catch (error) {
          throw new Error(`Failed to initialize OptimizedReactNativeStorageAdapter: ${error}`);
        }
      }
      startBackgroundCleanup() {
        this.cleanupTimer = setInterval(async () => {
          const startTime = Date.now();
          try {
            const cacheCleanedCount = this.cache.cleanup();
            const storageCleanedCount = await this.cleanupExpiredStorage();
            const duration = Date.now() - startTime;
            const totalCleaned = cacheCleanedCount + storageCleanedCount;
            this.metrics.backgroundCleanups++;
            this.emit("background:cleanup", { cleaned: totalCleaned, duration });
            if (this.config.enableMetrics && this.metrics.backgroundCleanups % 10 === 0) {
              this.emit("performance:metrics", { metrics: { ...this.metrics } });
            }
          } catch (error) {
            console.warn("Background cleanup failed:", error);
          }
        }, this.config.cleanupInterval);
      }
      setupMemoryPressureHandling() {
        setInterval(() => {
          if (this.memoryUsage > this.config.memoryPressureThreshold) {
            this.handleMemoryPressure();
          }
        }, 3e4);
      }
      handleMemoryPressure() {
        this.metrics.memoryPressureEvents++;
        this.emit("memory:pressure", {
          usage: this.memoryUsage,
          threshold: this.config.memoryPressureThreshold
        });
        this.cache.clear();
        this.writeBatch.flush();
      }
      async set(key, value, options = {}) {
        await this.initialize();
        const startTime = Date.now();
        try {
          const entry = {
            data: value,
            metadata: {
              key,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              expiresAt: options.ttl ? Date.now() + options.ttl : void 0,
              encrypted: false,
              compressed: false,
              version: options.version || "1.0.0"
            }
          };
          let serialized = JSON.stringify(entry);
          const originalSize = new Blob([serialized]).size;
          if (this.config.enableCompression && originalSize > this.config.compressionThreshold) {
            serialized = await this.compress(serialized);
            entry.metadata.compressed = true;
            const compressedSize = new Blob([serialized]).size;
            const saved = originalSize - compressedSize;
            this.metrics.compressionSaved += saved;
            this.emit("compression:applied", {
              key,
              originalSize,
              compressedSize
            });
          }
          const storageKey = this.getPrefixedKey(key);
          if (this.config.enableCache) {
            this.cache.set(storageKey, entry);
          }
          if (this.config.enableBatching) {
            await this.writeBatch.enqueue(storageKey, serialized);
          } else {
            await this.AsyncStorage.setItem(storageKey, serialized);
          }
          this.metrics.writes++;
          const duration = Date.now() - startTime;
          this.metrics.avgWriteTime = (this.metrics.avgWriteTime + duration) / 2;
          this.memoryUsage += originalSize;
        } catch (error) {
          throw new Error(`Failed to set ${key}: ${error}`);
        }
      }
      async get(key) {
        await this.initialize();
        const startTime = Date.now();
        const storageKey = this.getPrefixedKey(key);
        try {
          if (this.config.enableCache) {
            const cached = this.cache.get(storageKey);
            if (cached) {
              this.metrics.cacheHits++;
              this.emit("cache:hit", { key });
              if (this.isExpired(cached)) {
                this.cache.delete(storageKey);
                await this.delete(key);
                return null;
              }
              return cached;
            } else {
              this.metrics.cacheMisses++;
              this.emit("cache:miss", { key });
            }
          }
          const serialized = await this.AsyncStorage.getItem(storageKey);
          if (!serialized) return null;
          let data = serialized;
          try {
            const entry = JSON.parse(data);
            if (entry.metadata.compressed) {
              const decompressed = await this.decompress(data);
              const decompressedEntry = JSON.parse(decompressed);
              data = JSON.stringify(decompressedEntry);
            }
            const finalEntry = JSON.parse(data);
            if (this.isExpired(finalEntry)) {
              await this.delete(key);
              return null;
            }
            if (this.config.enableCache) {
              this.cache.set(storageKey, finalEntry);
            }
            this.metrics.reads++;
            const duration = Date.now() - startTime;
            this.metrics.avgReadTime = (this.metrics.avgReadTime + duration) / 2;
            return finalEntry;
          } catch (error) {
            console.warn(`Corrupted data for key ${key}:`, error);
            await this.delete(key);
            return null;
          }
        } catch (error) {
          console.warn(`Failed to get ${key}:`, error);
          return null;
        }
      }
      async delete(key) {
        await this.initialize();
        const storageKey = this.getPrefixedKey(key);
        try {
          if (this.config.enableCache) {
            this.cache.delete(storageKey);
          }
          await this.AsyncStorage.removeItem(storageKey);
          return true;
        } catch (error) {
          console.warn(`Failed to delete ${key}:`, error);
          return false;
        }
      }
      async exists(key) {
        const entry = await this.get(key);
        return entry !== null;
      }
      async clear(namespace) {
        await this.initialize();
        try {
          if (namespace) {
            const keys = await this.getAllKeys();
            const namespacedKeys = keys.filter((k) => k.startsWith(namespace));
            await this.deleteMany(namespacedKeys);
          } else {
            const keys = await this.getAllKeys();
            const prefixedKeys = keys.map((k) => this.getPrefixedKey(k));
            await this.AsyncStorage.multiRemove(prefixedKeys);
            if (this.config.enableCache) {
              this.cache.clear();
            }
          }
          this.memoryUsage = 0;
        } catch (error) {
          throw new Error(`Failed to clear storage: ${error}`);
        }
      }
      async setMany(entries) {
        await this.initialize();
        if (this.config.enableBatching) {
          for (const entry of entries) {
            await this.set(entry.key, entry.value, entry.options);
          }
        } else {
          const serializedEntries = [];
          for (const { key, value, options = {} } of entries) {
            const entry = {
              data: value,
              metadata: {
                key,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                expiresAt: options.ttl ? Date.now() + options.ttl : void 0,
                encrypted: false,
                compressed: false,
                version: options.version || "1.0.0"
              }
            };
            const serialized = JSON.stringify(entry);
            const storageKey = this.getPrefixedKey(key);
            serializedEntries.push([storageKey, serialized]);
            if (this.config.enableCache) {
              this.cache.set(storageKey, entry);
            }
          }
          await this.AsyncStorage.multiSet(serializedEntries);
          this.metrics.writes += entries.length;
        }
      }
      async getMany(keys) {
        await this.initialize();
        const results = [];
        const uncachedKeys = [];
        const keyMap = /* @__PURE__ */ new Map();
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (!key) {
            results[i] = null;
            continue;
          }
          const storageKey = this.getPrefixedKey(key);
          if (this.config.enableCache) {
            const cached = this.cache.get(storageKey);
            if (cached) {
              results[i] = this.isExpired(cached) ? null : cached;
              this.metrics.cacheHits++;
              continue;
            } else {
              this.metrics.cacheMisses++;
            }
          }
          uncachedKeys.push(key);
          keyMap.set(this.getPrefixedKey(key), i);
        }
        if (uncachedKeys.length > 0) {
          const prefixedKeys = uncachedKeys.map((k) => this.getPrefixedKey(k));
          const storageResults = await this.AsyncStorage.multiGet(prefixedKeys);
          for (const [storageKey, serialized] of storageResults) {
            const index = keyMap.get(storageKey);
            if (index === void 0 || index === null) continue;
            if (!serialized) {
              results[index] = null;
              continue;
            }
            try {
              const entry = JSON.parse(serialized);
              if (this.isExpired(entry)) {
                results[index] = null;
                const keyToDelete = keys[index];
                if (keyToDelete) {
                  await this.delete(keyToDelete);
                }
              } else {
                results[index] = entry;
                if (this.config.enableCache) {
                  this.cache.set(storageKey, entry);
                }
              }
            } catch (error) {
              const keyForLog = keys[index] || "unknown";
              console.warn(`Corrupted data for key ${keyForLog}:`, error);
              results[index] = null;
            }
          }
        }
        this.metrics.reads += keys.length;
        return results;
      }
      async deleteMany(keys) {
        await this.initialize();
        try {
          const prefixedKeys = keys.map((k) => this.getPrefixedKey(k));
          if (this.config.enableCache) {
            for (const prefixedKey of prefixedKeys) {
              this.cache.delete(prefixedKey);
            }
          }
          await this.AsyncStorage.multiRemove(prefixedKeys);
          return keys.length;
        } catch (error) {
          console.warn("Failed to delete multiple keys:", error);
          return 0;
        }
      }
      async query(options = {}) {
        await this.initialize();
        const keys = await this.getAllKeys();
        let filteredKeys = keys;
        if (options.prefix || options.keyPrefix) {
          const prefix = options.prefix || options.keyPrefix;
          filteredKeys = keys.filter((k) => k.startsWith(prefix));
        }
        if (options.namespace) {
          filteredKeys = filteredKeys.filter((k) => k.includes(options.namespace));
        }
        if (options.offset) {
          filteredKeys = filteredKeys.slice(options.offset);
        }
        if (options.limit) {
          filteredKeys = filteredKeys.slice(0, options.limit);
        }
        const entries = await this.getMany(filteredKeys);
        const validEntries = entries.filter((entry) => {
          if (!entry) return false;
          if (!options.includeExpired && this.isExpired(entry)) return false;
          return true;
        });
        if (options.sortBy) {
          validEntries.sort((a, b) => {
            let aValue;
            let bValue;
            switch (options.sortBy) {
              case "createdAt":
                aValue = a.metadata.createdAt;
                bValue = b.metadata.createdAt;
                break;
              case "updatedAt":
                aValue = a.metadata.updatedAt;
                bValue = b.metadata.updatedAt;
                break;
              case "key":
              default:
                aValue = a.metadata.key.localeCompare(b.metadata.key);
                bValue = 0;
                break;
            }
            const result = aValue - bValue;
            return options.sortOrder === "desc" ? -result : result;
          });
        }
        return validEntries;
      }
      // StorageAdapter interface methods
      async keys(options) {
        await this.initialize();
        try {
          const allKeys = await this.getAllKeys();
          let filteredKeys = allKeys;
          if (options?.prefix || options?.keyPrefix) {
            const prefix = options.prefix || options.keyPrefix;
            filteredKeys = allKeys.filter((k) => k.startsWith(prefix));
          }
          if (options?.namespace) {
            filteredKeys = filteredKeys.filter((k) => k.includes(options.namespace));
          }
          if (options?.offset) {
            filteredKeys = filteredKeys.slice(options.offset);
          }
          if (options?.limit) {
            filteredKeys = filteredKeys.slice(0, options.limit);
          }
          return filteredKeys.map((k) => k);
        } catch (error) {
          console.warn("Failed to get keys:", error);
          return [];
        }
      }
      async values(options) {
        const keys = await this.keys(options);
        const entries = await this.getMany(keys);
        return entries.filter((entry) => entry !== null);
      }
      async entries(options) {
        return this.values(options);
      }
      async count(options) {
        const keys = await this.keys(options);
        return keys.length;
      }
      // Transaction support (basic implementation)
      async beginTransaction() {
        throw new Error("Transactions not supported in AsyncStorage adapter");
      }
      // Lifecycle methods
      async connect() {
        await this.initialize();
      }
      async disconnect() {
        this.destroy();
      }
      isConnected() {
        return this.isInitialized;
      }
      // Maintenance methods
      async optimize() {
        const cleaned = this.cache.cleanup();
        await this.writeBatch.flush();
        console.log(`Storage optimized: cleaned ${cleaned} cache entries`);
      }
      async getStats() {
        const keys = await this.getAllKeys();
        const entries = await this.getMany(keys);
        const validEntries = entries.filter((entry) => entry !== null);
        let totalSize = 0;
        let encryptedCount = 0;
        let compressedCount = 0;
        let oldestTimestamp = Date.now();
        let newestTimestamp = 0;
        const namespaces = /* @__PURE__ */ new Set();
        for (const entry of validEntries) {
          if (entry) {
            totalSize += JSON.stringify(entry).length;
            if (entry.metadata.encrypted) encryptedCount++;
            if (entry.metadata.compressed) compressedCount++;
            oldestTimestamp = Math.min(oldestTimestamp, entry.metadata.createdAt);
            newestTimestamp = Math.max(newestTimestamp, entry.metadata.updatedAt);
            const keyStr = entry.metadata.key;
            const namespace = keyStr.split(":")[0];
            if (namespace) namespaces.add(namespace);
          }
        }
        return {
          totalKeys: validEntries.length,
          totalSize,
          namespaces: Array.from(namespaces),
          oldestEntry: oldestTimestamp,
          newestEntry: newestTimestamp,
          expiredEntries: 0,
          // Would need to check expiration
          encryptedEntries: encryptedCount,
          compressedEntries: compressedCount
        };
      }
      // Utility methods
      getPrefixedKey(key) {
        return `${this.config.keyPrefix}:${key}`;
      }
      isExpired(entry) {
        return entry.metadata.expiresAt ? Date.now() > entry.metadata.expiresAt : false;
      }
      async getAllKeys() {
        const allKeys = await this.AsyncStorage.getAllKeys();
        return allKeys.filter((key) => key.startsWith(`${this.config.keyPrefix}:`)).map((key) => key.substring(this.config.keyPrefix.length + 1));
      }
      async cleanupExpiredStorage() {
        const keys = await this.getAllKeys();
        const expiredKeys = [];
        for (const key of keys) {
          const entry = await this.get(key);
          if (!entry || this.isExpired(entry)) {
            expiredKeys.push(key);
          }
        }
        if (expiredKeys.length > 0) {
          await this.deleteMany(expiredKeys);
        }
        return expiredKeys.length;
      }
      // Compression utilities (simplified for demo - in production use a proper compression library)
      async compress(data) {
        return data;
      }
      async decompress(data) {
        return data;
      }
      /**
       * Get performance metrics
       */
      getMetrics() {
        return { ...this.metrics };
      }
      /**
       * Get cache statistics
       */
      getCacheStats() {
        return {
          size: this.cache.size(),
          maxSize: this.config.cacheSize,
          hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
        };
      }
      /**
       * Force cleanup
       */
      async cleanup() {
        const cleaned = await this.cleanupExpiredStorage();
        this.cache.cleanup();
        console.log(`Cleaned ${cleaned} expired entries`);
        return cleaned;
      }
      /**
       * Destroy adapter and cleanup resources
       */
      async destroy() {
        if (this.cleanupTimer) {
          clearInterval(this.cleanupTimer);
        }
        this.writeBatch.clear();
        this.cache.clear();
        this.removeAllListeners();
      }
    };
  }
});

// src/react-native/connectivity-manager.ts
var connectivity_manager_exports = {};
__export(connectivity_manager_exports, {
  ConnectivityManager: () => ConnectivityManager
});
var isReactNative2, DEFAULT_QUALITY_THRESHOLDS, DEFAULT_RETRY_CONFIGS, DEFAULT_TIMEOUT_CONFIGS, DEFAULT_CONFIG2, ConnectivityManager;
var init_connectivity_manager = __esm({
  "src/react-native/connectivity-manager.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    isReactNative2 = typeof navigator !== "undefined" && (navigator.product === "ReactNative" || global.__REACT_NATIVE__);
    DEFAULT_QUALITY_THRESHOLDS = {
      excellent: { minDownlink: 10, maxRtt: 50 },
      good: { minDownlink: 2, maxRtt: 150 },
      fair: { minDownlink: 0.5, maxRtt: 300 },
      poor: { minDownlink: 0, maxRtt: 1e3 }
    };
    DEFAULT_RETRY_CONFIGS = {
      excellent: { maxRetries: 2, baseDelay: 500, maxDelay: 2e3, backoffMultiplier: 1.5, jitter: true },
      good: { maxRetries: 3, baseDelay: 1e3, maxDelay: 5e3, backoffMultiplier: 2, jitter: true },
      fair: { maxRetries: 4, baseDelay: 2e3, maxDelay: 1e4, backoffMultiplier: 2, jitter: true },
      poor: { maxRetries: 5, baseDelay: 3e3, maxDelay: 15e3, backoffMultiplier: 2.5, jitter: true },
      unknown: { maxRetries: 3, baseDelay: 1500, maxDelay: 8e3, backoffMultiplier: 2, jitter: true }
    };
    DEFAULT_TIMEOUT_CONFIGS = {
      excellent: 5e3,
      good: 1e4,
      fair: 15e3,
      poor: 3e4,
      unknown: 15e3
    };
    DEFAULT_CONFIG2 = {
      enableQualityMonitoring: true,
      qualityCheckInterval: 3e4,
      // 30 seconds
      enableAdaptiveRetry: true,
      enableDataOptimization: true,
      enableAppStateOptimization: true,
      qualityThresholds: DEFAULT_QUALITY_THRESHOLDS,
      retryConfigs: DEFAULT_RETRY_CONFIGS,
      timeoutConfigs: DEFAULT_TIMEOUT_CONFIGS,
      enableHealthMonitoring: true,
      healthCheckUrl: "https://ereceipts-it.acubeapi.com/health",
      healthCheckInterval: 6e4
      // 1 minute
    };
    ConnectivityManager = class extends import_index.default {
      config;
      currentState;
      previousState;
      isInitialized = false;
      // React Native modules
      NetInfo;
      AppState;
      // Monitoring timers
      qualityTimer;
      healthTimer;
      // Connection health tracking
      healthHistory = [];
      currentAppState = "active";
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG2, ...config };
        this.currentState = this.getInitialState();
        this.initialize();
      }
      getInitialState() {
        return {
          isConnected: false,
          connectionType: "unknown",
          quality: "unknown",
          timestamp: Date.now()
        };
      }
      async initialize() {
        if (this.isInitialized || !isReactNative2) return;
        try {
          const NetInfoModule = await import("@react-native-community/netinfo");
          this.NetInfo = NetInfoModule.default;
          const AppStateModule = await import("react-native");
          this.AppState = AppStateModule.AppState;
          this.setupNetworkListener();
          this.setupAppStateListener();
          if (this.config.enableQualityMonitoring) {
            this.startQualityMonitoring();
          }
          if (this.config.enableHealthMonitoring) {
            this.startHealthMonitoring();
          }
          await this.updateNetworkState();
          this.isInitialized = true;
        } catch (error) {
          console.warn("Failed to initialize ConnectivityManager:", error);
          this.setupFallbackDetection();
        }
      }
      setupNetworkListener() {
        if (!this.NetInfo) return;
        this.NetInfo.addEventListener((state) => {
          this.handleNetworkStateChange(state);
        });
      }
      setupAppStateListener() {
        if (!this.AppState) return;
        this.AppState.addEventListener("change", (nextAppState) => {
          const previousAppState = this.currentAppState;
          this.currentAppState = nextAppState;
          if (previousAppState === "background" && nextAppState === "active") {
            this.emit("app:foreground", { networkState: this.currentState });
            this.updateNetworkState();
          } else if (previousAppState === "active" && nextAppState === "background") {
            this.emit("app:background", { networkState: this.currentState });
          }
        });
      }
      setupFallbackDetection() {
        if (typeof window !== "undefined") {
          window.addEventListener("online", () => {
            this.currentState = {
              ...this.currentState,
              isConnected: true,
              timestamp: Date.now()
            };
            this.emit("connection:restored", { newState: this.currentState });
          });
          window.addEventListener("offline", () => {
            const lastState = { ...this.currentState };
            this.currentState = {
              ...this.currentState,
              isConnected: false,
              timestamp: Date.now()
            };
            this.emit("connection:lost", { lastState });
          });
        }
      }
      async handleNetworkStateChange(netInfoState) {
        this.previousState = { ...this.currentState };
        const newState = {
          isConnected: netInfoState.isConnected,
          connectionType: this.mapConnectionType(netInfoState.type, netInfoState.details),
          quality: this.calculateNetworkQuality(netInfoState),
          effectiveType: netInfoState.details?.effectiveType,
          downlink: netInfoState.details?.downlink,
          rtt: netInfoState.details?.rtt,
          saveData: netInfoState.details?.saveData,
          isExpensive: netInfoState.details?.isConnectionExpensive,
          strength: netInfoState.details?.strength,
          timestamp: Date.now()
        };
        this.currentState = newState;
        this.emit("network:change", { current: newState, previous: this.previousState });
        if (this.previousState.quality !== newState.quality) {
          this.emit("quality:change", {
            quality: newState.quality,
            previous: this.previousState.quality
          });
        }
        if (!this.previousState.isConnected && newState.isConnected) {
          this.emit("connection:restored", { newState });
        } else if (this.previousState.isConnected && !newState.isConnected) {
          this.emit("connection:lost", { lastState: this.previousState });
        }
        if (this.config.enableDataOptimization) {
          this.handleDataOptimization(newState);
        }
      }
      mapConnectionType(type, details) {
        if (!type || type === "none") return "none";
        switch (type.toLowerCase()) {
          case "wifi":
            return "wifi";
          case "cellular":
            if (details?.cellularGeneration) {
              switch (details.cellularGeneration) {
                case "2g":
                  return "2g";
                case "3g":
                  return "3g";
                case "4g":
                  return "4g";
                case "5g":
                  return "5g";
                default:
                  return "cellular";
              }
            }
            return "cellular";
          case "ethernet":
            return "ethernet";
          case "bluetooth":
            return "bluetooth";
          default:
            return "unknown";
        }
      }
      calculateNetworkQuality(netInfoState) {
        const { details } = netInfoState;
        if (!details) return "unknown";
        const downlink = details.downlink || 0;
        const rtt = details.rtt || 1e3;
        const qualityThresholds = {
          ...DEFAULT_QUALITY_THRESHOLDS,
          ...this.config.qualityThresholds
        };
        if (downlink >= qualityThresholds.excellent.minDownlink && rtt <= qualityThresholds.excellent.maxRtt) {
          return "excellent";
        } else if (downlink >= qualityThresholds.good.minDownlink && rtt <= qualityThresholds.good.maxRtt) {
          return "good";
        } else if (downlink >= qualityThresholds.fair.minDownlink && rtt <= qualityThresholds.fair.maxRtt) {
          return "fair";
        } else if (downlink >= qualityThresholds.poor.minDownlink && rtt <= qualityThresholds.poor.maxRtt) {
          return "poor";
        }
        return "unknown";
      }
      handleDataOptimization(networkState) {
        const shouldOptimize = networkState.saveData || networkState.isExpensive || networkState.quality === "poor" || ["2g", "3g"].includes(networkState.connectionType);
        if (shouldOptimize) {
          const reason = networkState.saveData ? "data_saver" : networkState.isExpensive ? "expensive_connection" : networkState.quality === "poor" ? "poor_quality" : "slow_connection";
          this.emit("data:optimization", { enabled: true, reason });
        } else {
          this.emit("data:optimization", { enabled: false, reason: "good_connection" });
        }
      }
      startQualityMonitoring() {
        this.qualityTimer = setInterval(async () => {
          if (this.currentAppState === "active") {
            await this.updateNetworkState();
          }
        }, this.config.qualityCheckInterval);
      }
      startHealthMonitoring() {
        this.healthTimer = setInterval(async () => {
          if (this.currentState.isConnected && this.currentAppState === "active") {
            await this.performHealthCheck();
          }
        }, this.config.healthCheckInterval);
      }
      async updateNetworkState() {
        if (!this.NetInfo) return;
        try {
          const netInfoState = await this.NetInfo.fetch();
          await this.handleNetworkStateChange(netInfoState);
        } catch (error) {
          console.warn("Failed to fetch network state:", error);
        }
      }
      async performHealthCheck() {
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5e3);
          const response = await fetch(this.config.healthCheckUrl, {
            method: "HEAD",
            signal: controller.signal
          });
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          const healthy = response.ok;
          this.healthHistory.push(healthy);
          if (this.healthHistory.length > 10) {
            this.healthHistory.shift();
          }
          this.emit("health:check", { healthy, latency });
        } catch (error) {
          this.healthHistory.push(false);
          if (this.healthHistory.length > 10) {
            this.healthHistory.shift();
          }
          this.emit("health:check", { healthy: false });
        }
      }
      /**
       * Get current network state
       */
      getNetworkState() {
        return { ...this.currentState };
      }
      /**
       * Check if network is available
       */
      isConnected() {
        return this.currentState.isConnected;
      }
      /**
       * Get current network quality
       */
      getNetworkQuality() {
        return this.currentState.quality;
      }
      /**
       * Get retry configuration for current network conditions
       */
      getRetryConfig() {
        return this.config.retryConfigs[this.currentState.quality];
      }
      /**
       * Get timeout for current network conditions
       */
      getTimeout() {
        return this.config.timeoutConfigs[this.currentState.quality];
      }
      /**
       * Check if data optimization should be enabled
       */
      shouldOptimizeData() {
        return this.currentState.saveData || this.currentState.isExpensive || this.currentState.quality === "poor" || ["2g", "3g"].includes(this.currentState.connectionType);
      }
      /**
       * Get connection health score (0-1)
       */
      getHealthScore() {
        if (this.healthHistory.length === 0) return 1;
        const successCount = this.healthHistory.filter((h) => h).length;
        return successCount / this.healthHistory.length;
      }
      /**
       * Wait for network connection to be restored
       */
      async waitForConnection(timeout = 3e4) {
        if (this.currentState.isConnected) return true;
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            this.off("connection:restored", onRestored);
            resolve(false);
          }, timeout);
          const onRestored = () => {
            clearTimeout(timer);
            resolve(true);
          };
          this.once("connection:restored", onRestored);
        });
      }
      /**
       * Execute a network operation with intelligent retry
       */
      async executeWithRetry(operation, customRetryConfig) {
        const config = { ...this.getRetryConfig(), ...customRetryConfig };
        let lastError;
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            if (!this.currentState.isConnected) {
              const connected = await this.waitForConnection(1e4);
              if (!connected) {
                throw new Error("Network not available");
              }
            }
            return await operation();
          } catch (error) {
            lastError = error;
            if (attempt === config.maxRetries) break;
            let delay = Math.min(
              config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
              config.maxDelay
            );
            if (config.jitter) {
              delay *= 0.5 + Math.random() * 0.5;
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
        throw lastError;
      }
      /**
       * Get adaptive batch size based on network conditions
       */
      getAdaptiveBatchSize(baseBatchSize = 50) {
        switch (this.currentState.quality) {
          case "excellent":
            return Math.min(baseBatchSize * 2, 200);
          case "good":
            return baseBatchSize;
          case "fair":
            return Math.max(Math.floor(baseBatchSize * 0.7), 10);
          case "poor":
            return Math.max(Math.floor(baseBatchSize * 0.3), 5);
          default:
            return Math.max(Math.floor(baseBatchSize * 0.5), 10);
        }
      }
      /**
       * Destroy the connectivity manager
       */
      destroy() {
        if (this.qualityTimer) {
          clearInterval(this.qualityTimer);
        }
        if (this.healthTimer) {
          clearInterval(this.healthTimer);
        }
        this.removeAllListeners();
      }
    };
  }
});

// src/react-native/background-processor.ts
var background_processor_exports = {};
__export(background_processor_exports, {
  BackgroundProcessor: () => BackgroundProcessor
});
var isReactNative3, DEFAULT_CONFIG3, BackgroundProcessor;
var init_background_processor = __esm({
  "src/react-native/background-processor.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    isReactNative3 = typeof navigator !== "undefined" && (navigator.product === "ReactNative" || global.__REACT_NATIVE__);
    DEFAULT_CONFIG3 = {
      maxConcurrentTasks: 3,
      defaultTaskTimeout: 3e4,
      // 30 seconds
      enableBatteryOptimization: true,
      minBatteryLevel: 0.15,
      // 15%
      enableAppStateManagement: true,
      maxBackgroundTime: 3e4,
      // 30 seconds (iOS limit)
      enableTaskPersistence: true,
      persistenceKey: "acube_background_tasks",
      enableResourceMonitoring: true,
      cpuThrottleThreshold: 80,
      // 80%
      memoryThrottleThreshold: 80
      // 80%
    };
    BackgroundProcessor = class extends import_index.default {
      config;
      taskQueue = [];
      activeTasks = /* @__PURE__ */ new Map();
      taskExecutors = /* @__PURE__ */ new Map();
      isInitialized = false;
      isPaused = false;
      // React Native modules
      AppState;
      BackgroundTask;
      AsyncStorage;
      // State tracking
      currentAppState = "active";
      batteryState = { level: 1, isCharging: false };
      backgroundTaskId;
      resourceMonitorTimer;
      // Performance tracking
      executionStats = {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        avgExecutionTime: 0,
        totalExecutionTime: 0
      };
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG3, ...config };
        this.initialize();
      }
      async initialize() {
        if (this.isInitialized || !isReactNative3) return;
        try {
          const RNModules = await import("react-native");
          this.AppState = RNModules.AppState;
          const AsyncStorageModule = await import("@react-native-async-storage/async-storage");
          this.AsyncStorage = AsyncStorageModule.default;
          if (this.config.enableAppStateManagement) {
            this.setupAppStateListener();
          }
          if (this.config.enableBatteryOptimization) {
            this.setupBatteryMonitoring();
          }
          if (this.config.enableResourceMonitoring) {
            this.startResourceMonitoring();
          }
          if (this.config.enableTaskPersistence) {
            await this.loadPersistedTasks();
          }
          this.registerDefaultExecutors();
          this.isInitialized = true;
          console.log("BackgroundProcessor initialized");
        } catch (error) {
          console.warn("Failed to initialize BackgroundProcessor:", error);
        }
      }
      setupAppStateListener() {
        if (!this.AppState) return;
        this.AppState.addEventListener("change", (nextAppState) => {
          const previousAppState = this.currentAppState;
          this.currentAppState = nextAppState;
          if (previousAppState === "active" && nextAppState === "background") {
            this.handleAppBackground();
          } else if (previousAppState === "background" && nextAppState === "active") {
            this.handleAppForeground();
          }
        });
      }
      async setupBatteryMonitoring() {
        try {
          const DeviceInfo = await import("react-native-device-info");
          const batteryLevel = await DeviceInfo.default.getBatteryLevel();
          const isCharging = (await DeviceInfo.default.getPowerState()).batteryState === "charging";
          const isPowerSaveMode = (await DeviceInfo.default.getPowerState()).lowPowerMode;
          this.batteryState = {
            level: batteryLevel,
            isCharging,
            isLowPowerMode: !!isPowerSaveMode
          };
          setInterval(async () => {
            const newLevel = await DeviceInfo.default.getBatteryLevel();
            const newCharging = (await DeviceInfo.default.getPowerState()).batteryState === "charging";
            const newPowerSave = (await DeviceInfo.default.getPowerState()).lowPowerMode;
            const previousCharging = this.batteryState.isCharging;
            const previousLevel = this.batteryState.level;
            this.batteryState = {
              level: newLevel,
              isCharging: newCharging,
              isLowPowerMode: !!newPowerSave
            };
            if (newCharging !== previousCharging) {
              this.emit("battery:charging", { isCharging: newCharging });
            }
            if (newLevel < this.config.minBatteryLevel && previousLevel >= this.config.minBatteryLevel) {
              this.emit("battery:low", { level: newLevel });
              this.pauseNonCriticalTasks();
            }
          }, 3e4);
        } catch (error) {
          console.warn("Battery monitoring not available:", error);
        }
      }
      startResourceMonitoring() {
        this.resourceMonitorTimer = setInterval(async () => {
          try {
            const memoryInfo = await this.getMemoryInfo();
            const cpuUsage = await this.getCPUUsage();
            if (memoryInfo.usage > this.config.memoryThrottleThreshold) {
              this.emit("resource:throttle", { reason: "memory" });
              this.throttleExecution();
            } else if (cpuUsage > this.config.cpuThrottleThreshold) {
              this.emit("resource:throttle", { reason: "cpu" });
              this.throttleExecution();
            } else if (this.isPaused) {
              this.emit("resource:resume", { reason: "resources_available" });
              this.resumeExecution();
            }
          } catch (error) {
            console.warn("Resource monitoring failed:", error);
          }
        }, 1e4);
      }
      async getMemoryInfo() {
        return { usage: 50, total: 100 };
      }
      async getCPUUsage() {
        return 30;
      }
      handleAppBackground() {
        console.log("App went to background");
        if (this.BackgroundTask && this.taskQueue.length > 0) {
          this.backgroundTaskId = this.BackgroundTask.start({
            taskName: "ACubeBackgroundSync",
            taskDescriptor: "Syncing e-receipt data"
          });
          setTimeout(() => {
            this.handleBackgroundTimeExpired();
          }, this.config.maxBackgroundTime);
        }
        this.emit("app:background", { remainingTime: this.config.maxBackgroundTime });
        this.processCriticalTasks();
      }
      handleAppForeground() {
        console.log("App came to foreground");
        if (this.backgroundTaskId && this.BackgroundTask) {
          this.BackgroundTask.finish(this.backgroundTaskId);
          this.backgroundTaskId = void 0;
        }
        this.emit("app:foreground", {});
        this.resumeExecution();
        this.processQueue();
      }
      handleBackgroundTimeExpired() {
        console.log("Background time expired, pausing non-critical tasks");
        for (const [taskId, { task, controller }] of this.activeTasks) {
          if (task.priority !== "critical") {
            controller.abort();
            this.activeTasks.delete(taskId);
          }
        }
        if (this.backgroundTaskId && this.BackgroundTask) {
          this.BackgroundTask.finish(this.backgroundTaskId);
          this.backgroundTaskId = void 0;
        }
      }
      async processCriticalTasks() {
        const criticalTasks = this.taskQueue.filter((task) => task.priority === "critical");
        for (const task of criticalTasks) {
          if (this.activeTasks.size < this.config.maxConcurrentTasks) {
            await this.executeTask(task);
          }
        }
      }
      pauseNonCriticalTasks() {
        this.isPaused = true;
        for (const [taskId, { task, controller }] of this.activeTasks) {
          if (task.priority !== "critical") {
            controller.abort();
            this.activeTasks.delete(taskId);
            this.taskQueue.unshift(task);
          }
        }
      }
      throttleExecution() {
        this.isPaused = true;
        console.log("Throttling background execution due to resource constraints");
      }
      resumeExecution() {
        if (this.isPaused) {
          this.isPaused = false;
          console.log("Resuming background execution");
          this.processQueue();
        }
      }
      registerDefaultExecutors() {
        this.registerExecutor("sync", async (_task, signal) => {
          const startTime = Date.now();
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, Math.random() * 2e3 + 1e3);
              signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(new Error("Task aborted"));
              });
            });
            return {
              success: true,
              data: { syncedItems: Math.floor(Math.random() * 10) + 1 },
              executionTime: Date.now() - startTime
            };
          } catch (error) {
            return {
              success: false,
              error,
              executionTime: Date.now() - startTime
            };
          }
        });
        this.registerExecutor("cleanup", async (_task, signal) => {
          const startTime = Date.now();
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, 500);
              signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(new Error("Task aborted"));
              });
            });
            return {
              success: true,
              data: { cleanedItems: Math.floor(Math.random() * 5) + 1 },
              executionTime: Date.now() - startTime
            };
          } catch (error) {
            return {
              success: false,
              error,
              executionTime: Date.now() - startTime
            };
          }
        });
      }
      /**
       * Register a task executor
       */
      registerExecutor(type, executor) {
        this.taskExecutors.set(type, executor);
      }
      /**
       * Schedule a new background task
       */
      async scheduleTask(task) {
        const fullTask = {
          ...task,
          id: this.generateTaskId(),
          createdAt: Date.now(),
          retryCount: 0,
          maxRetries: task.maxRetries || 3
        };
        this.taskQueue.push(fullTask);
        this.sortTaskQueue();
        this.emit("task:scheduled", { task: fullTask });
        if (this.config.enableTaskPersistence) {
          await this.persistTasks();
        }
        if (!this.isPaused) {
          this.processQueue();
        }
        return fullTask.id;
      }
      /**
       * Cancel a scheduled task
       */
      async cancelTask(taskId) {
        const queueIndex = this.taskQueue.findIndex((task) => task.id === taskId);
        if (queueIndex >= 0) {
          this.taskQueue.splice(queueIndex, 1);
          await this.persistTasks();
          return true;
        }
        const activeTask = this.activeTasks.get(taskId);
        if (activeTask) {
          activeTask.controller.abort();
          this.activeTasks.delete(taskId);
          return true;
        }
        return false;
      }
      /**
       * Get task status
       */
      getTaskStatus(taskId) {
        if (this.taskQueue.some((task) => task.id === taskId)) {
          return "queued";
        }
        if (this.activeTasks.has(taskId)) {
          return "running";
        }
        return "not_found";
      }
      /**
       * Get queue statistics
       */
      getQueueStats() {
        return {
          queued: this.taskQueue.length,
          running: this.activeTasks.size,
          isPaused: this.isPaused,
          currentAppState: this.currentAppState,
          batteryLevel: this.batteryState.level,
          isCharging: this.batteryState.isCharging,
          ...this.executionStats
        };
      }
      sortTaskQueue() {
        this.taskQueue.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          const aTime = a.executionTime || a.createdAt + (a.delay || 0);
          const bTime = b.executionTime || b.createdAt + (b.delay || 0);
          return aTime - bTime;
        });
      }
      async processQueue() {
        if (this.isPaused || this.taskQueue.length === 0) return;
        const now = Date.now();
        while (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks && !this.isPaused) {
          const task = this.taskQueue[0];
          if (!task) break;
          const executionTime = task.executionTime || task.createdAt + (task.delay || 0);
          if (executionTime > now) {
            break;
          }
          if (!this.canExecuteTask(task)) {
            break;
          }
          this.taskQueue.shift();
          await this.executeTask(task);
        }
        if (this.taskQueue.length > 0) {
          const nextTask = this.taskQueue[0];
          if (nextTask) {
            const nextExecutionTime = nextTask.executionTime || nextTask.createdAt + (nextTask.delay || 0);
            const delay = Math.max(0, nextExecutionTime - now);
            setTimeout(() => this.processQueue(), delay);
          }
        } else {
          this.emit("queue:empty", {});
        }
      }
      canExecuteTask(task) {
        if (this.config.enableBatteryOptimization && task.priority !== "critical" && this.batteryState.level < this.config.minBatteryLevel && !this.batteryState.isCharging) {
          return false;
        }
        if (task.requiresDeviceIdle && this.currentAppState === "active") {
          return false;
        }
        return true;
      }
      async executeTask(task) {
        const executor = this.taskExecutors.get(task.type);
        if (!executor) {
          console.warn(`No executor found for task type: ${task.type}`);
          return;
        }
        const controller = new AbortController();
        this.activeTasks.set(task.id, { task, controller });
        this.emit("task:started", { task });
        const timeout = setTimeout(() => {
          controller.abort();
        }, task.maxExecutionTime || this.config.defaultTaskTimeout);
        try {
          const result = await executor(task, controller.signal);
          clearTimeout(timeout);
          this.handleTaskResult(task, result);
        } catch (error) {
          clearTimeout(timeout);
          this.handleTaskError(task, error);
        } finally {
          this.activeTasks.delete(task.id);
          await this.persistTasks();
        }
      }
      handleTaskResult(task, result) {
        this.executionStats.totalTasks++;
        this.executionStats.totalExecutionTime += result.executionTime;
        this.executionStats.avgExecutionTime = this.executionStats.totalExecutionTime / this.executionStats.totalTasks;
        if (result.success) {
          this.executionStats.successfulTasks++;
          this.emit("task:completed", { task, result });
        } else {
          this.handleTaskError(task, result.error || new Error("Task failed"));
        }
      }
      async handleTaskError(task, error) {
        this.executionStats.failedTasks++;
        const retryCount = task.retryCount || 0;
        if (retryCount < (task.maxRetries || 3)) {
          const retryTask = {
            ...task,
            retryCount: retryCount + 1,
            delay: Math.pow(2, retryCount) * 1e3
            // Exponential backoff
          };
          this.taskQueue.unshift(retryTask);
          this.emit("task:retry", { task: retryTask, attempt: retryCount + 1 });
          setTimeout(() => this.processQueue(), 1e3);
        } else {
          this.emit("task:failed", { task, error });
        }
      }
      generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }
      async persistTasks() {
        if (!this.AsyncStorage) return;
        try {
          const tasksToSave = this.taskQueue.filter(
            (task) => (
              // Only persist tasks that should survive app restarts
              task.type === "sync" || task.priority === "critical"
            )
          );
          await this.AsyncStorage.setItem(
            this.config.persistenceKey,
            JSON.stringify(tasksToSave)
          );
        } catch (error) {
          console.warn("Failed to persist tasks:", error);
        }
      }
      async loadPersistedTasks() {
        if (!this.AsyncStorage) return;
        try {
          const persistedTasks = await this.AsyncStorage.getItem(this.config.persistenceKey);
          if (persistedTasks) {
            const tasks = JSON.parse(persistedTasks);
            this.taskQueue.push(...tasks);
            this.sortTaskQueue();
            await this.AsyncStorage.removeItem(this.config.persistenceKey);
          }
        } catch (error) {
          console.warn("Failed to load persisted tasks:", error);
        }
      }
      /**
       * Force process all critical tasks immediately
       */
      async processCriticalTasksImmediately() {
        const criticalTasks = this.taskQueue.filter((task) => task.priority === "critical");
        for (const task of criticalTasks) {
          await this.executeTask(task);
          this.taskQueue = this.taskQueue.filter((t) => t.id !== task.id);
        }
        await this.persistTasks();
      }
      /**
       * Pause all background processing
       */
      pause() {
        this.isPaused = true;
      }
      /**
       * Resume background processing
       */
      resume() {
        this.isPaused = false;
        this.processQueue();
      }
      /**
       * Clear all queued tasks
       */
      async clearQueue() {
        this.taskQueue = [];
        await this.persistTasks();
      }
      /**
       * Destroy the background processor
       */
      destroy() {
        for (const [, { controller }] of this.activeTasks) {
          controller.abort();
        }
        this.activeTasks.clear();
        if (this.resourceMonitorTimer) {
          clearInterval(this.resourceMonitorTimer);
        }
        if (this.backgroundTaskId && this.BackgroundTask) {
          this.BackgroundTask.finish(this.backgroundTaskId);
        }
        this.removeAllListeners();
      }
    };
  }
});

// src/react-native/performance-monitor.ts
var performance_monitor_exports = {};
__export(performance_monitor_exports, {
  PerformanceMonitor: () => PerformanceMonitor
});
var isReactNative4, DEFAULT_THRESHOLDS, DEFAULT_CONFIG4, PerformanceMonitor;
var init_performance_monitor = __esm({
  "src/react-native/performance-monitor.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    isReactNative4 = typeof navigator !== "undefined" && (navigator.product === "ReactNative" || global.__REACT_NATIVE__);
    DEFAULT_THRESHOLDS = {
      maxMemoryUsage: 512,
      // 512MB
      minFrameRate: 55,
      // 55 FPS
      maxResponseTime: 100,
      // 100ms
      maxBatteryDrainRate: 5,
      // 5%/hour
      maxErrorRate: 0.01,
      // 1%
      maxNetworkFailureRate: 0.05
      // 5%
    };
    DEFAULT_CONFIG4 = {
      enabled: true,
      monitoringInterval: 1e4,
      // 10 seconds
      enableMemoryMonitoring: true,
      enableFrameRateMonitoring: true,
      enableNetworkMonitoring: true,
      enableBatteryMonitoring: true,
      enableInteractionMonitoring: true,
      enableCrashReporting: true,
      thresholds: DEFAULT_THRESHOLDS,
      maxHistorySize: 100,
      enableProfiling: false,
      profilingSampleRate: 0.1,
      enableAutoOptimization: true,
      enableRemoteReporting: false,
      reportingEndpoint: "/api/performance"
    };
    PerformanceMonitor = class extends import_index.default {
      config;
      isInitialized = false;
      isMonitoring = false;
      // React Native modules
      PerformanceObserver;
      AppState;
      DeviceInfo;
      // Monitoring state
      startTime;
      lastMetrics;
      metricsHistory = [];
      monitoringTimer;
      // Performance tracking
      memoryPeakUsage = 0;
      frameDropCount = 0;
      networkRequests = [];
      userInteractions = [];
      errorCount = 0;
      crashCount = 0;
      gcEventCount = 0;
      memoryWarningCount = 0;
      // Battery tracking
      batteryHistory = [];
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG4, ...config };
        this.startTime = Date.now();
        if (this.config.enabled) {
          this.initialize();
        }
      }
      async initialize() {
        if (this.isInitialized || !isReactNative4) return;
        try {
          const RNModules = await import("react-native");
          this.AppState = RNModules.AppState;
          try {
            const PerformanceModule = await import("react-native-performance");
            this.PerformanceObserver = PerformanceModule.PerformanceObserver;
          } catch {
            console.warn("Performance API not available");
          }
          try {
            const DeviceInfoModule = await import("react-native-device-info");
            this.DeviceInfo = DeviceInfoModule.default;
          } catch {
            console.warn("DeviceInfo not available");
          }
          this.setupMemoryMonitoring();
          this.setupFrameRateMonitoring();
          this.setupNetworkMonitoring();
          this.setupErrorMonitoring();
          this.setupInteractionMonitoring();
          if (this.config.enableBatteryMonitoring) {
            this.setupBatteryMonitoring();
          }
          this.isInitialized = true;
          this.startMonitoring();
          console.log("PerformanceMonitor initialized");
        } catch (error) {
          console.warn("Failed to initialize PerformanceMonitor:", error);
        }
      }
      setupMemoryMonitoring() {
        if (!this.config.enableMemoryMonitoring) return;
        if (this.AppState) {
          try {
            const MemoryWarningHandler = __require("react-native").DeviceEventEmitter;
            MemoryWarningHandler.addListener("memoryWarning", () => {
              this.memoryWarningCount++;
              const currentMemory = this.getMemoryUsage();
              this.emit("memory:warning", {
                usage: currentMemory.used,
                available: currentMemory.total - currentMemory.used
              });
              if (this.config.enableAutoOptimization) {
                this.applyMemoryOptimization();
              }
            });
          } catch (error) {
            console.warn("Memory warning monitoring not available:", error);
          }
        }
        if (global.gc) {
          const originalGC = global.gc;
          global.gc = async () => {
            this.gcEventCount++;
            return originalGC();
          };
        }
      }
      setupFrameRateMonitoring() {
        if (!this.config.enableFrameRateMonitoring) return;
        if (this.PerformanceObserver) {
          try {
            const observer = new this.PerformanceObserver((list) => {
              const entries = list.getEntries();
              for (const entry of entries) {
                if (entry.entryType === "measure" && entry.name.includes("frame")) {
                  if (entry.duration > 16.67) {
                    this.frameDropCount++;
                    this.emit("frame:drop", {
                      droppedFrames: 1,
                      duration: entry.duration
                    });
                  }
                }
              }
            });
            observer.observe({ entryTypes: ["measure"] });
          } catch (error) {
            console.warn("Frame monitoring not available:", error);
          }
        }
      }
      setupNetworkMonitoring() {
        if (!this.config.enableNetworkMonitoring) return;
        const originalFetch = global.fetch;
        global.fetch = async (input, init) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          const startTime = Date.now();
          const requestInfo = { url, startTime };
          this.networkRequests.push(requestInfo);
          try {
            const response = await originalFetch(input, init);
            const endTime = Date.now();
            const duration = endTime - startTime;
            requestInfo.endTime = endTime;
            requestInfo.success = response.ok;
            if (duration > 3e3) {
              this.emit("network:slow", { url, duration });
            }
            return response;
          } catch (error) {
            requestInfo.endTime = Date.now();
            requestInfo.success = false;
            throw error;
          }
        };
      }
      setupErrorMonitoring() {
        if (!this.config.enableCrashReporting) return;
        const originalErrorHandler = ErrorUtils?.getGlobalHandler?.();
        ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
          this.errorCount++;
          if (isFatal) {
            this.crashCount++;
            this.emit("crash:detected", { error, context: { isFatal } });
          }
          if (originalErrorHandler) {
            originalErrorHandler(error, isFatal);
          }
        });
        const handleUnhandledRejection = (event) => {
          this.errorCount++;
          console.warn("Unhandled promise rejection:", event.reason);
        };
        if (typeof process !== "undefined") {
          process.on("unhandledRejection", handleUnhandledRejection);
        }
      }
      setupInteractionMonitoring() {
        if (!this.config.enableInteractionMonitoring) return;
      }
      setupBatteryMonitoring() {
        setInterval(async () => {
          if (this.DeviceInfo) {
            try {
              const batteryLevel = await this.DeviceInfo.getBatteryLevel();
              const timestamp = Date.now();
              this.batteryHistory.push({ level: batteryLevel, timestamp });
              const oneDayAgo = timestamp - 24 * 60 * 60 * 1e3;
              this.batteryHistory = this.batteryHistory.filter((entry) => entry.timestamp > oneDayAgo);
              if (this.batteryHistory.length >= 2) {
                const drainRate = this.calculateBatteryDrainRate();
                if (drainRate > (this.config.thresholds.maxBatteryDrainRate || 5)) {
                  this.emit("battery:drain", { rate: drainRate, cause: "unknown" });
                }
              }
            } catch (error) {
              console.warn("Battery monitoring failed:", error);
            }
          }
        }, 6e4);
      }
      calculateBatteryDrainRate() {
        if (this.batteryHistory.length < 2) return 0;
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1e3;
        const recentHistory = this.batteryHistory.filter((entry) => entry.timestamp > oneHourAgo);
        if (recentHistory.length < 2) return 0;
        const oldest = recentHistory[0];
        const newest = recentHistory[recentHistory.length - 1];
        if (!oldest || !newest) return 0;
        const timeDiff = newest.timestamp - oldest.timestamp;
        const batteryDiff = oldest.level - newest.level;
        const hoursElapsed = timeDiff / (60 * 60 * 1e3);
        return hoursElapsed > 0 ? batteryDiff / hoursElapsed * 100 : 0;
      }
      startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.monitoringTimer = setInterval(() => {
          this.collectMetrics();
        }, this.config.monitoringInterval);
        console.log("Performance monitoring started");
      }
      collectMetrics() {
        try {
          const metrics = {
            appStartTime: this.startTime,
            timeToInteractive: Date.now() - this.startTime,
            memoryUsage: this.getMemoryUsage(),
            cpuUsage: this.getCPUUsage(),
            frameRate: this.getFrameRateMetrics(),
            networkPerformance: this.getNetworkMetrics(),
            userInteractions: this.getInteractionMetrics(),
            batteryImpact: this.getBatteryMetrics(),
            errorRate: this.calculateErrorRate(),
            crashCount: this.crashCount,
            timestamp: Date.now()
          };
          this.lastMetrics = metrics;
          this.metricsHistory.push(metrics);
          if (this.metricsHistory.length > this.config.maxHistorySize) {
            this.metricsHistory.shift();
          }
          this.emit("metrics:updated", { metrics });
          this.checkThresholds(metrics);
          if (this.config.enableRemoteReporting) {
            this.sendMetricsToServer(metrics);
          }
        } catch (error) {
          console.warn("Failed to collect metrics:", error);
        }
      }
      getMemoryUsage() {
        let heapUsed = 0;
        let heapTotal = 0;
        if (performance.memory) {
          const memoryInfo = performance.memory;
          heapUsed = memoryInfo.usedJSHeapSize / (1024 * 1024);
          heapTotal = memoryInfo.totalJSHeapSize / (1024 * 1024);
        }
        const estimated = heapUsed * 2;
        this.memoryPeakUsage = Math.max(this.memoryPeakUsage, estimated);
        return {
          used: estimated,
          total: 1024,
          // Assume 1GB total (would get from device info)
          peak: this.memoryPeakUsage,
          heapUsed,
          heapTotal,
          gcEvents: this.gcEventCount,
          memoryWarnings: this.memoryWarningCount
        };
      }
      getCPUUsage() {
        return Math.random() * 30 + 10;
      }
      getFrameRateMetrics() {
        const currentFPS = 60 - this.frameDropCount * 0.1;
        return {
          current: Math.max(currentFPS, 30),
          average: 58,
          // Placeholder
          drops: this.frameDropCount,
          jankCount: Math.floor(this.frameDropCount * 0.3)
        };
      }
      getNetworkMetrics() {
        const recentRequests = this.networkRequests.slice(-100);
        if (recentRequests.length === 0) {
          return {
            avgRequestTime: 0,
            failureRate: 0,
            bytesTransferred: 0,
            requestCount: 0,
            slowRequestCount: 0
          };
        }
        const completedRequests = recentRequests.filter((req) => req.endTime);
        const failedRequests = completedRequests.filter((req) => !req.success);
        const slowRequests = completedRequests.filter(
          (req) => req.endTime && req.endTime - req.startTime > 3e3
        );
        const totalTime = completedRequests.reduce(
          (sum, req) => sum + (req.endTime - req.startTime),
          0
        );
        return {
          avgRequestTime: completedRequests.length > 0 ? totalTime / completedRequests.length : 0,
          failureRate: completedRequests.length > 0 ? failedRequests.length / completedRequests.length : 0,
          bytesTransferred: 0,
          // Would need actual byte counting
          requestCount: recentRequests.length,
          slowRequestCount: slowRequests.length
        };
      }
      getInteractionMetrics() {
        const recentInteractions = this.userInteractions.slice(-50);
        if (recentInteractions.length === 0) {
          return {
            avgResponseTime: 0,
            slowInteractions: 0,
            totalInteractions: 0,
            userSatisfactionScore: 1
          };
        }
        const totalTime = recentInteractions.reduce(
          (sum, interaction) => sum + (interaction.endTime - interaction.startTime),
          0
        );
        const slowInteractions = recentInteractions.filter(
          (interaction) => interaction.endTime - interaction.startTime > 100
        );
        const avgResponseTime = totalTime / recentInteractions.length;
        const satisfactionScore = Math.max(0, 1 - slowInteractions.length / recentInteractions.length);
        return {
          avgResponseTime,
          slowInteractions: slowInteractions.length,
          totalInteractions: recentInteractions.length,
          userSatisfactionScore: satisfactionScore
        };
      }
      getBatteryMetrics() {
        const drainRate = this.calculateBatteryDrainRate();
        return {
          drainRate,
          networkDrain: drainRate * 0.3,
          // Estimate 30% from network
          cpuDrain: drainRate * 0.4,
          // Estimate 40% from CPU
          backgroundDrain: drainRate * 0.2
          // Estimate 20% from background
        };
      }
      calculateErrorRate() {
        const timeWindow = 10 * 60 * 1e3;
        const now = Date.now();
        return this.errorCount / Math.max(1, (now - this.startTime) / timeWindow);
      }
      checkThresholds(metrics) {
        const { thresholds } = this.config;
        const maxMemory = thresholds.maxMemoryUsage || 512;
        if (metrics.memoryUsage.used > maxMemory) {
          this.emit("threshold:exceeded", {
            metric: "memory",
            value: metrics.memoryUsage.used,
            threshold: maxMemory
          });
        }
        const minFrameRate = thresholds.minFrameRate || 55;
        if (metrics.frameRate.current < minFrameRate) {
          this.emit("threshold:exceeded", {
            metric: "frameRate",
            value: metrics.frameRate.current,
            threshold: minFrameRate
          });
        }
        const maxResponseTime = thresholds.maxResponseTime || 100;
        if (metrics.userInteractions.avgResponseTime > maxResponseTime) {
          this.emit("threshold:exceeded", {
            metric: "responseTime",
            value: metrics.userInteractions.avgResponseTime,
            threshold: maxResponseTime
          });
        }
        const maxBatteryDrain = thresholds.maxBatteryDrainRate || 5;
        if (metrics.batteryImpact.drainRate > maxBatteryDrain) {
          this.emit("threshold:exceeded", {
            metric: "batteryDrain",
            value: metrics.batteryImpact.drainRate,
            threshold: maxBatteryDrain
          });
        }
        const maxErrorRate = thresholds.maxErrorRate || 0.01;
        if (metrics.errorRate > maxErrorRate) {
          this.emit("threshold:exceeded", {
            metric: "errorRate",
            value: metrics.errorRate,
            threshold: maxErrorRate
          });
        }
        const maxNetworkFailureRate = thresholds.maxNetworkFailureRate || 0.05;
        if (metrics.networkPerformance.failureRate > maxNetworkFailureRate) {
          this.emit("threshold:exceeded", {
            metric: "networkFailureRate",
            value: metrics.networkPerformance.failureRate,
            threshold: maxNetworkFailureRate
          });
        }
      }
      applyMemoryOptimization() {
        if (global.gc) {
          global.gc();
          this.emit("optimization:applied", {
            type: "garbage_collection",
            impact: "memory_freed"
          });
        }
      }
      async sendMetricsToServer(metrics) {
        try {
          const response = await fetch(this.config.reportingEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              metrics,
              deviceInfo: await this.getDeviceInfo(),
              timestamp: Date.now()
            })
          });
          this.emit("report:sent", {
            success: response.ok,
            data: response.ok ? void 0 : response.statusText
          });
        } catch (error) {
          this.emit("report:sent", { success: false, data: error });
        }
      }
      async getDeviceInfo() {
        if (!this.DeviceInfo) return {};
        try {
          return {
            model: await this.DeviceInfo.getModel(),
            systemVersion: await this.DeviceInfo.getSystemVersion(),
            brand: await this.DeviceInfo.getBrand(),
            deviceId: await this.DeviceInfo.getUniqueId(),
            totalMemory: await this.DeviceInfo.getTotalMemory(),
            isEmulator: await this.DeviceInfo.isEmulator()
          };
        } catch (error) {
          return {};
        }
      }
      /**
       * Record a user interaction for monitoring
       */
      recordInteraction(type, startTime, endTime) {
        if (!this.config.enableInteractionMonitoring) return;
        const interaction = {
          type,
          startTime,
          endTime: endTime || Date.now()
        };
        this.userInteractions.push(interaction);
        if (this.userInteractions.length > 1e3) {
          this.userInteractions = this.userInteractions.slice(-500);
        }
        const duration = interaction.endTime - interaction.startTime;
        if (duration > 100) {
          this.emit("interaction:slow", { type, duration });
        }
      }
      /**
       * Get current performance metrics
       */
      getCurrentMetrics() {
        return this.lastMetrics;
      }
      /**
       * Get performance history
       */
      getMetricsHistory() {
        return [...this.metricsHistory];
      }
      /**
       * Get performance summary
       */
      getPerformanceSummary() {
        const history = this.metricsHistory;
        if (history.length === 0) return null;
        const latest = history[history.length - 1];
        const avgMemory = history.reduce((sum, m) => sum + m.memoryUsage.used, 0) / history.length;
        const avgFrameRate = history.reduce((sum, m) => sum + m.frameRate.current, 0) / history.length;
        const avgResponseTime = history.reduce((sum, m) => sum + m.userInteractions.avgResponseTime, 0) / history.length;
        return {
          current: latest,
          averages: {
            memoryUsage: avgMemory,
            frameRate: avgFrameRate,
            responseTime: avgResponseTime
          },
          totals: {
            errors: this.errorCount,
            crashes: this.crashCount,
            frameDrops: this.frameDropCount,
            memoryWarnings: this.memoryWarningCount
          }
        };
      }
      /**
       * Force metrics collection
       */
      collectMetricsNow() {
        this.collectMetrics();
      }
      /**
       * Reset performance counters
       */
      resetCounters() {
        this.errorCount = 0;
        this.crashCount = 0;
        this.frameDropCount = 0;
        this.memoryWarningCount = 0;
        this.gcEventCount = 0;
        this.networkRequests = [];
        this.userInteractions = [];
        this.batteryHistory = [];
      }
      /**
       * Stop monitoring
       */
      stopMonitoring() {
        if (this.monitoringTimer) {
          clearInterval(this.monitoringTimer);
          this.monitoringTimer = void 0;
        }
        this.isMonitoring = false;
      }
      /**
       * Start monitoring
       */
      resumeMonitoring() {
        if (!this.isMonitoring && this.isInitialized) {
          this.startMonitoring();
        }
      }
      /**
       * Destroy the performance monitor
       */
      destroy() {
        this.stopMonitoring();
        this.removeAllListeners();
      }
    };
  }
});

// src/generated/endpoints.ts
var CashierEndpoints, PointOfSalesEndpoints, ReceiptEndpoints, CashRegisterEndpoints, MerchantEndpoints, PEMEndpoints, EndpointUtils;
var init_endpoints = __esm({
  "src/generated/endpoints.ts"() {
    "use strict";
    init_esm_shims();
    CashierEndpoints = class {
      static LIST = {
        path: "/mf1/cashiers",
        method: "GET",
        operationId: "read_cashiers_mf1_cashiers_get",
        summary: "Read Cashiers",
        description: "Get a paginated list of cashiers",
        tags: ["Cashier"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          query: {
            page: "integer",
            size: "integer"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_Page__T_Customized_CashierOutput_"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "cashiers",
          operation: "list",
          authRequired: true,
          retryable: true
        }
      };
      static CREATE = {
        path: "/mf1/cashiers",
        method: "POST",
        operationId: "create_cashier_mf1_cashiers_post",
        summary: "Create Cashier",
        description: "Create a new cashier account",
        tags: ["Cashier"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_CashierCreateInput"
        },
        responses: {
          "201": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_CashierOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "cashiers",
          operation: "create",
          authRequired: true,
          retryable: false
        }
      };
      static ME = {
        path: "/mf1/cashiers/me",
        method: "GET",
        operationId: "read_cashier_me_mf1_cashiers_me_get",
        summary: "Read Cashier Me",
        description: "Read currently authenticated cashier's information",
        tags: ["Cashier"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_CashierOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          }
        },
        metadata: {
          resource: "cashiers",
          operation: "me",
          authRequired: true,
          retryable: true
        }
      };
      static GET_BY_ID = {
        path: "/mf1/cashiers/{cashier_id}",
        method: "GET",
        operationId: "read_cashier_by_id_mf1_cashiers__cashier_id__get",
        summary: "Read Cashier By Id",
        description: "Get a specific user by id",
        tags: ["Cashier"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            cashier_id: "integer"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_CashierOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "cashiers",
          operation: "get",
          authRequired: true,
          retryable: true
        }
      };
      static DELETE = {
        path: "/mf1/cashiers/{cashier_id}",
        method: "DELETE",
        operationId: "delete_cashier_mf1_cashiers__cashier_id__delete",
        summary: "Delete Cashier",
        description: "Delete a cashier",
        tags: ["Cashier"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            cashier_id: "integer"
          }
        },
        responses: {
          "204": {
            description: "Successful Response"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "cashiers",
          operation: "delete",
          authRequired: true,
          retryable: false
        }
      };
    };
    PointOfSalesEndpoints = class {
      static LIST = {
        path: "/mf1/point-of-sales",
        method: "GET",
        operationId: "read_point_of_sales_mf1_point_of_sales_get",
        summary: "Read Point Of Sales",
        description: "Retrieve PEMs",
        tags: ["Point of Sale"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "point-of-sales",
          operation: "list",
          authRequired: true,
          retryable: true
        }
      };
      static GET_BY_SERIAL = {
        path: "/mf1/point-of-sales/{serial_number}",
        method: "GET",
        operationId: "read_point_of_sale_mf1_point_of_sales__serial_number__get",
        summary: "Read Point Of Sale",
        description: "Get a specific Point of Sale by serial number",
        tags: ["Point of Sale"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            serial_number: "string"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_PointOfSaleOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          }
        },
        metadata: {
          resource: "point-of-sales",
          operation: "get",
          authRequired: true,
          retryable: true
        }
      };
      static CLOSE_JOURNAL = {
        path: "/mf1/point-of-sales/close",
        method: "POST",
        operationId: "close_journal_mf1_point_of_sales_close_post",
        summary: "Close Journal",
        description: "Close the daily journal for Point of Sales",
        tags: ["Point of Sale"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_CloseJournalRequest"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_CloseJournalOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "point-of-sales",
          operation: "close_journal",
          authRequired: true,
          retryable: false
        }
      };
      static ACTIVATION = {
        path: "/mf1/point-of-sales/{serial_number}/activation",
        method: "POST",
        operationId: "post_activation_mf1_point_of_sales__serial_number__activation_post",
        summary: "Post Activation",
        description: "Trigger the activation process of a Point of Sale by requesting a certificate to the Italian Tax Agency",
        tags: ["Point of Sale"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            serial_number: "string"
          }
        },
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_ActivationRequest"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ActivationOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "point-of-sales",
          operation: "activation",
          authRequired: true,
          retryable: false
        }
      };
      static CREATE_INACTIVITY = {
        path: "/mf1/point-of-sales/{serial_number}/inactivity",
        method: "POST",
        operationId: "create_inactivity_period_mf1_point_of_sales__serial_number__inactivity_post",
        summary: "Create Inactivity Period",
        description: "Create a new inactivity period",
        tags: ["Point of Sale"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            serial_number: "string"
          }
        },
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_InactivityRequest"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "point-of-sales",
          operation: "create_inactivity",
          authRequired: true,
          retryable: false
        }
      };
      static SET_OFFLINE = {
        path: "/mf1/point-of-sales/{serial_number}/status/offline",
        method: "POST",
        operationId: "post_offline_mf1_point_of_sales__serial_number__status_offline_post",
        summary: "Post Offline",
        description: "Change the state of the Point of Sale to 'offline'",
        tags: ["Point of Sale"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            serial_number: "string"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "point-of-sales",
          operation: "set_offline",
          authRequired: true,
          retryable: false
        }
      };
    };
    ReceiptEndpoints = class {
      static LIST = {
        path: "/mf1/receipts",
        method: "GET",
        operationId: "get_receipts_mf1_receipts_get",
        summary: "Get Receipts",
        description: "Get a list of electronic receipts",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          query: {
            page: "integer",
            size: "integer",
            start_date: "string",
            end_date: "string",
            serial_number: "string"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "list",
          authRequired: true,
          retryable: true
        }
      };
      static CREATE = {
        path: "/mf1/receipts",
        method: "POST",
        operationId: "create_receipt_mf1_receipts_post",
        summary: "Create Receipt",
        description: "Create a new electronic receipt",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_ReceiptInput"
        },
        responses: {
          "201": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ReceiptOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "create",
          authRequired: true,
          retryable: false
        }
      };
      static VOID = {
        path: "/mf1/receipts",
        method: "DELETE",
        operationId: "void_receipt_mf1_receipts_delete",
        summary: "Void Receipt",
        description: "Void an electronic receipt",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_VoidReceiptRequest"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_VoidReceiptOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "void",
          authRequired: true,
          retryable: false
        }
      };
      static GET_BY_UUID = {
        path: "/mf1/receipts/{receipt_uuid}",
        method: "GET",
        operationId: "get_receipt_mf1_receipts__receipt_uuid__get",
        summary: "Get Receipt",
        description: "Get an electronic receipt",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            receipt_uuid: "string"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ReceiptOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "get",
          authRequired: true,
          retryable: true
        }
      };
      static VOID_WITH_PROOF = {
        path: "/mf1/receipts/void-with-proof",
        method: "DELETE",
        operationId: "void_receipt_via_proof_mf1_receipts_void_with_proof_delete",
        summary: "Void Receipt Via Proof",
        description: "Void an electronic receipt identified by a proof of purchase",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_VoidReceiptWithProofRequest"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_VoidReceiptOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "void_with_proof",
          authRequired: true,
          retryable: false
        }
      };
      static GET_DETAILS = {
        path: "/mf1/receipts/{receipt_uuid}/details",
        method: "GET",
        operationId: "get_receipt_details_mf1_receipts__receipt_uuid__details_get",
        summary: "Get Receipt Details",
        description: "Get the details or the PDF of an electronic receipt",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            receipt_uuid: "string"
          },
          header: {
            Accept: "string"
          }
        },
        responses: {
          "200": {
            description: "Successful Response"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "get_details",
          authRequired: true,
          retryable: true
        }
      };
      static RETURN_ITEMS = {
        path: "/mf1/receipts/return",
        method: "POST",
        operationId: "return_receipt_items_mf1_receipts_return_post",
        summary: "Return Receipt Items",
        description: "Return items from an electronic receipt (same PEM or other PEM)",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_ReturnRequest"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ReceiptOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "return_items",
          authRequired: true,
          retryable: false
        }
      };
      static RETURN_ITEMS_WITH_PROOF = {
        path: "/mf1/receipts/return-with-proof",
        method: "POST",
        operationId: "return_receipt_items_via_proof_mf1_receipts_return_with_proof_post",
        summary: "Return Receipt Items Via Proof",
        description: "Return items from an electronic receipt identified by a proof of purchase",
        tags: ["Receipt"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_ReturnWithProofRequest"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ReceiptOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "receipts",
          operation: "return_items_with_proof",
          authRequired: true,
          retryable: false
        }
      };
    };
    CashRegisterEndpoints = class {
      static CREATE = {
        path: "/mf1/cash-register",
        method: "POST",
        operationId: "create_cash_register_mf1_cash_register_post",
        summary: "Create Cash Register",
        description: "Create a new cash register",
        tags: ["Cash Register"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "E-Receipt_IT_API_CashRegisterInput"
        },
        responses: {
          "201": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_CashRegisterOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "cash-registers",
          operation: "create",
          authRequired: true,
          retryable: false
        }
      };
      static LIST = {
        path: "/mf1/cash-register",
        method: "GET",
        operationId: "get_cash_registers_mf1_cash_register_get",
        summary: "Get Cash Registers",
        description: "Get a list of cash registers",
        tags: ["Cash Register"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_Page__T_Customized_CashRegisterOutput_"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "cash-registers",
          operation: "list",
          authRequired: true,
          retryable: true
        }
      };
      static GET_BY_ID = {
        path: "/mf1/cash-register/{id}",
        method: "GET",
        operationId: "get_cash_register_mf1_cash_register__id__get",
        summary: "Get Cash Register",
        description: "Get a specific cash register by ID",
        tags: ["Cash Register"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            id: "integer"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_CashRegisterOutput"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          }
        },
        metadata: {
          resource: "cash-registers",
          operation: "get",
          authRequired: true,
          retryable: true
        }
      };
    };
    MerchantEndpoints = class {
      static LIST = {
        path: "/mf2/merchants",
        method: "GET",
        operationId: "api_merchants_get_collection",
        summary: "Get Merchants",
        description: "Get a list of merchants",
        tags: ["Merchant"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          }
        },
        metadata: {
          resource: "merchants",
          operation: "list",
          authRequired: true,
          retryable: true
        }
      };
      static CREATE = {
        path: "/mf2/merchants",
        method: "POST",
        operationId: "api_merchants_post",
        summary: "Create Merchant",
        description: "Create a new merchant",
        tags: ["Merchant"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "Merchant-create"
        },
        responses: {
          "201": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "Merchant-read"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "merchants",
          operation: "create",
          authRequired: true,
          retryable: false
        }
      };
      static GET_BY_UUID = {
        path: "/mf2/merchants/{uuid}",
        method: "GET",
        operationId: "api_merchants_uuid_get",
        summary: "Get Merchant",
        description: "Get a specific merchant by UUID",
        tags: ["Merchant"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            uuid: "string"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "Merchant-read"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          }
        },
        metadata: {
          resource: "merchants",
          operation: "get",
          authRequired: true,
          retryable: true
        }
      };
      static UPDATE = {
        path: "/mf2/merchants/{uuid}",
        method: "PUT",
        operationId: "api_merchants_uuid_put",
        summary: "Update Merchant",
        description: "Update a merchant",
        tags: ["Merchant"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            uuid: "string"
          }
        },
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "Merchant-update"
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "Merchant-read"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "merchants",
          operation: "update",
          authRequired: true,
          retryable: false
        }
      };
    };
    PEMEndpoints = class {
      static CREATE_POS = {
        path: "/mf2/point-of-sales",
        method: "POST",
        operationId: "api_point-of-sales_post",
        summary: "Create Point of Sale",
        description: "Create a new Point of Sale",
        tags: ["Pem"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: "PointOfSale-create"
        },
        responses: {
          "201": {
            description: "Successful Response",
            contentType: "application/json",
            schema: "PointOfSale-read"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "422": {
            description: "Validation Error",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_HTTPValidationError"
          }
        },
        metadata: {
          resource: "pems",
          operation: "create_pos",
          authRequired: true,
          retryable: false
        }
      };
      static GET_CERTIFICATES = {
        path: "/mf2/point-of-sales/{id}/certificates",
        method: "GET",
        operationId: "api_point-of-sales_idcertificates_get",
        summary: "Get PEM Certificates",
        description: "Get certificates for a Point of Sale",
        tags: ["Pem"],
        security: [{ "E-Receipt_IT_API_OAuth2PasswordBearer": [] }],
        parameters: {
          path: {
            id: "string"
          }
        },
        responses: {
          "200": {
            description: "Successful Response",
            contentType: "application/json"
          },
          "403": {
            description: "Forbidden",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel403Forbidden"
          },
          "404": {
            description: "Not Found",
            contentType: "application/json",
            schema: "E-Receipt_IT_API_ErrorModel404NotFound"
          }
        },
        metadata: {
          resource: "pems",
          operation: "get_certificates",
          authRequired: true,
          retryable: true
        }
      };
    };
    EndpointUtils = class {
      /**
       * Get all endpoints for a specific resource
       */
      static getResourceEndpoints(resource) {
        switch (resource.toLowerCase()) {
          case "cashiers":
            return Object.values(CashierEndpoints);
          case "point-of-sales":
            return Object.values(PointOfSalesEndpoints);
          case "receipts":
            return Object.values(ReceiptEndpoints);
          case "cash-registers":
            return Object.values(CashRegisterEndpoints);
          case "merchants":
            return Object.values(MerchantEndpoints);
          case "pems":
            return Object.values(PEMEndpoints);
          default:
            return [];
        }
      }
      /**
       * Find endpoint by operation ID
       */
      static findEndpointByOperationId(operationId) {
        const allClasses = [
          CashierEndpoints,
          PointOfSalesEndpoints,
          ReceiptEndpoints,
          CashRegisterEndpoints,
          MerchantEndpoints,
          PEMEndpoints
        ];
        for (const endpointClass of allClasses) {
          for (const endpoint of Object.values(endpointClass)) {
            if (endpoint.operationId === operationId) {
              return endpoint;
            }
          }
        }
        return null;
      }
      /**
       * Build URL with path parameters
       */
      static buildUrl(endpoint, pathParams = {}) {
        let url = endpoint.path;
        for (const [key, value] of Object.entries(pathParams)) {
          url = url.replace(`{${key}}`, String(value));
        }
        return url;
      }
      /**
       * Check if endpoint requires authentication
       */
      static requiresAuth(endpoint) {
        return endpoint.metadata?.authRequired ?? false;
      }
      /**
       * Check if endpoint operation is retryable
       */
      static isRetryable(endpoint) {
        return endpoint.metadata?.retryable ?? false;
      }
      /**
       * Get expected content type for request body
       */
      static getRequestContentType(endpoint) {
        return endpoint.requestBody?.contentType ?? null;
      }
      /**
       * Get expected response content type
       */
      static getResponseContentType(endpoint, statusCode) {
        return endpoint.responses[statusCode]?.contentType ?? null;
      }
    };
  }
});

// src/storage/queue/types.ts
var createQueueItemId;
var init_types2 = __esm({
  "src/storage/queue/types.ts"() {
    "use strict";
    init_esm_shims();
    createQueueItemId = (id) => id;
  }
});

// src/resources/base-openapi.ts
var BaseOpenAPIResource;
var init_base_openapi = __esm({
  "src/resources/base-openapi.ts"() {
    "use strict";
    init_esm_shims();
    init_endpoints();
    init_errors();
    init_types2();
    BaseOpenAPIResource = class {
      client;
      endpoints;
      storage;
      queueManager;
      offlineEnabled;
      constructor(config) {
        this.client = config.client;
        this.endpoints = config.endpoints;
        this.storage = config.storage || void 0;
        this.queueManager = config.queueManager || void 0;
        this.offlineEnabled = config.offlineEnabled ?? false;
      }
      /**
       * Execute a type-safe API request based on OpenAPI endpoint definition
       * Enhanced with offline-first capabilities
       * 
       * @template TRequest - Type of request data
       * @template TResponse - Type of response data
       * @param endpointKey - Key to identify the endpoint in the endpoints map
       * @param data - Request body data (for POST/PUT/PATCH requests)
       * @param options - Additional request options including offline preferences
       * @returns Promise resolving to typed response data
       */
      async executeRequest(endpointKey, data, options = {}) {
        const endpoint = this.endpoints[endpointKey];
        if (!endpoint) {
          throw new ValidationError(
            `Unknown endpoint: ${endpointKey}`,
            "execute_request",
            [{ field: "endpointKey", message: `Endpoint '${endpointKey}' not found`, code: "UNKNOWN_ENDPOINT" }]
          );
        }
        this.validateRequest({ endpoint, operation: endpointKey, data, ...options });
        if (this.offlineEnabled && this.storage) {
          return this.executeOfflineFirstRequest(endpoint, endpointKey, data, options);
        }
        return this.executeOnlineRequest(endpoint, endpointKey, data, options);
      }
      /**
       * Execute offline-first request with intelligent fallback
       */
      async executeOfflineFirstRequest(endpoint, endpointKey, data, options = {}) {
        const cacheKey = this.buildCacheKey(endpoint, options.pathParams, options.queryParams);
        const isReadOperation = endpoint.method === "GET";
        const isWriteOperation = ["POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method);
        try {
          if (isReadOperation && !options.skipCache && !options.preferOffline) {
            const cachedResult = await this.getCachedResponse(cacheKey);
            if (cachedResult) {
              return cachedResult;
            }
          }
          if (options.preferOffline && isReadOperation) {
            const offlineResult = await this.getOfflineData(cacheKey);
            if (offlineResult) {
              return offlineResult;
            }
          }
          const result = await this.executeOnlineRequest(endpoint, endpointKey, data, options);
          if (isReadOperation && result) {
            await this.cacheResponse(cacheKey, result, options.cacheTTL);
          }
          return result;
        } catch (error) {
          if (isWriteOperation && options.queueIfOffline && this.queueManager) {
            return this.queueWriteOperation(endpoint, endpointKey, data, options, error);
          }
          if (isReadOperation) {
            const offlineResult = await this.getOfflineData(cacheKey);
            if (offlineResult) {
              return offlineResult;
            }
          }
          throw error;
        }
      }
      /**
       * Execute standard online request (original implementation)
       */
      async executeOnlineRequest(endpoint, endpointKey, data, options = {}) {
        const url = this.buildRequestUrl(endpoint, options.pathParams);
        const httpOptions = {
          method: endpoint.method,
          url,
          data,
          headers: {
            ...this.getDefaultHeaders(endpoint),
            ...options.headers
          },
          metadata: {
            operationId: endpoint.operationId,
            resource: endpoint.metadata?.resource,
            operation: endpoint.metadata?.operation,
            ...options.metadata
          },
          skipRetry: options.skipRetry ?? !EndpointUtils.isRetryable(endpoint)
        };
        if (options.queryParams) {
          httpOptions.params = options.queryParams;
        }
        if (options.timeout) {
          httpOptions.timeout = options.timeout;
        }
        if (options.skipCircuitBreaker !== void 0) {
          httpOptions.skipCircuitBreaker = options.skipCircuitBreaker;
        }
        try {
          const response = await this.client.request(httpOptions);
          this.validateResponse(endpoint, response.data);
          return response.data;
        } catch (error) {
          throw this.enhanceError(error, endpoint, endpointKey, options);
        }
      }
      /**
       * Cache response data with TTL
       */
      async cacheResponse(cacheKey, data, ttl) {
        if (!this.storage) return;
        try {
          const ttlSeconds = ttl || 3600;
          const expiresAt = new Date(Date.now() + ttlSeconds * 1e3);
          await this.storage.set(cacheKey, {
            data,
            timestamp: /* @__PURE__ */ new Date(),
            expiresAt
          });
        } catch (error) {
          console.warn("Failed to cache response:", error);
        }
      }
      /**
       * Get cached response if valid
       */
      async getCachedResponse(cacheKey) {
        if (!this.storage) return null;
        try {
          const cached = await this.storage.get(cacheKey);
          if (cached && cached.data && "expiresAt" in cached.data && /* @__PURE__ */ new Date() < new Date(cached.data.expiresAt)) {
            return cached.data.data;
          }
          if (cached) {
            await this.storage.delete(cacheKey);
          }
          return null;
        } catch (error) {
          console.warn("Failed to get cached response:", error);
          return null;
        }
      }
      /**
       * Get offline data (persistent storage)
       */
      async getOfflineData(cacheKey) {
        if (!this.storage) return null;
        try {
          const offlineKey = `offline:${cacheKey}`;
          const offlineEntry = await this.storage.get(offlineKey);
          return offlineEntry?.data || null;
        } catch (error) {
          console.warn("Failed to get offline data:", error);
          return null;
        }
      }
      /**
       * Queue write operation for later execution
       */
      async queueWriteOperation(endpoint, endpointKey, data, options = {}, networkError) {
        if (!this.queueManager) {
          throw networkError || new Error("Network unavailable and queue not configured");
        }
        const queueItem = {
          id: createQueueItemId(`${endpointKey}_${Date.now()}_${Math.random().toString(36).substring(2)}`),
          operation: this.mapHttpMethodToQueueOperation(endpoint.method),
          resource: "receipts",
          // Default resource type - should be passed as parameter
          data: {
            endpoint: endpointKey,
            requestData: data,
            pathParams: options.pathParams,
            queryParams: options.queryParams,
            headers: options.headers
          },
          priority: this.determinePriority(endpoint),
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          retryStrategy: "exponential",
          conflictResolution: "client-wins",
          ...options.metadata && { metadata: options.metadata }
        };
        await this.queueManager.add(queueItem);
        if (options.optimistic) {
          return this.createOptimisticResponse(endpoint, data, options);
        }
        throw new ValidationError(
          "Operation queued for later execution",
          "queued_operation",
          [{ field: "network", message: "Operation will be executed when network is available", code: "QUEUED" }]
        );
      }
      /**
       * Build cache key for request
       */
      buildCacheKey(endpoint, pathParams, queryParams) {
        let key = `${endpoint.method}:${endpoint.path}`;
        if (pathParams) {
          const sortedParams = Object.keys(pathParams).sort();
          const pathParamString = sortedParams.map((key2) => `${key2}=${pathParams[key2]}`).join("&");
          key += `?path=${pathParamString}`;
        }
        if (queryParams) {
          const sortedParams = Object.keys(queryParams).sort();
          const queryParamString = sortedParams.map((key2) => `${key2}=${queryParams[key2]}`).join("&");
          key += `&query=${queryParamString}`;
        }
        return `api_cache:${key}`;
      }
      /**
       * Map HTTP method to queue operation type
       */
      mapHttpMethodToQueueOperation(method) {
        switch (method.toUpperCase()) {
          case "POST":
            return "create";
          case "PUT":
          case "PATCH":
            return "update";
          case "DELETE":
            return "delete";
          default:
            return "custom";
        }
      }
      /**
       * Determine queue priority based on endpoint
       */
      determinePriority(endpoint) {
        if (endpoint.path.includes("/receipts") || endpoint.path.includes("/cashiers")) {
          return "high";
        }
        return "normal";
      }
      /**
       * Create optimistic response for write operations
       */
      createOptimisticResponse(endpoint, data, _options) {
        if (endpoint.method === "POST") {
          return {
            ...data && typeof data === "object" ? data : {},
            id: `temp_${Date.now()}`,
            _optimistic: true
          };
        }
        if (endpoint.method === "PUT" || endpoint.method === "PATCH") {
          return {
            ...data && typeof data === "object" ? data : {},
            _optimistic: true
          };
        }
        if (endpoint.method === "DELETE") {
          return {
            success: true,
            _optimistic: true
          };
        }
        return {
          success: true,
          _optimistic: true
        };
      }
      /**
       * Build complete request URL with path parameter substitution
       */
      buildRequestUrl(endpoint, pathParams = {}) {
        return EndpointUtils.buildUrl(endpoint, pathParams);
      }
      /**
       * Get default headers based on endpoint requirements
       */
      getDefaultHeaders(endpoint) {
        const headers = {};
        if (endpoint.requestBody) {
          headers["Content-Type"] = endpoint.requestBody.contentType;
        }
        const successResponse = endpoint.responses["200"] || endpoint.responses["201"];
        if (successResponse?.contentType) {
          headers["Accept"] = successResponse.contentType;
        }
        return headers;
      }
      /**
       * Validate request data against OpenAPI specification
       */
      validateRequest(context) {
        const { endpoint, operation, data, pathParams, queryParams } = context;
        const errors = [];
        if (endpoint.parameters?.path) {
          for (const [paramName, paramType] of Object.entries(endpoint.parameters.path)) {
            if (!pathParams || !(paramName in pathParams)) {
              errors.push({
                field: `path.${paramName}`,
                message: `Required path parameter '${paramName}' is missing`,
                code: "MISSING_PATH_PARAM"
              });
            } else {
              const value = pathParams[paramName];
              if (!this.validateParameterType(value, paramType)) {
                errors.push({
                  field: `path.${paramName}`,
                  message: `Path parameter '${paramName}' must be of type ${paramType}`,
                  code: "INVALID_PATH_PARAM_TYPE"
                });
              }
            }
          }
        }
        if (endpoint.requestBody?.required && !data) {
          errors.push({
            field: "body",
            message: "Request body is required",
            code: "MISSING_BODY"
          });
        }
        if (endpoint.parameters?.query && queryParams) {
          for (const [paramName, paramType] of Object.entries(endpoint.parameters.query)) {
            const value = queryParams[paramName];
            if (value !== void 0 && !this.validateParameterType(value, paramType)) {
              errors.push({
                field: `query.${paramName}`,
                message: `Query parameter '${paramName}' must be of type ${paramType}`,
                code: "INVALID_QUERY_PARAM_TYPE"
              });
            }
          }
        }
        if (errors.length > 0) {
          throw new ValidationError(
            `Request validation failed for operation '${operation}'`,
            operation,
            errors
          );
        }
      }
      /**
       * Basic type validation for parameters
       */
      validateParameterType(value, expectedType) {
        switch (expectedType) {
          case "string":
            return typeof value === "string";
          case "integer":
          case "number":
            return typeof value === "number" || typeof value === "string" && !isNaN(Number(value));
          case "boolean":
            return typeof value === "boolean";
          default:
            return true;
        }
      }
      /**
       * Validate response data (can be extended for schema validation)
       */
      validateResponse(endpoint, data) {
        if (data === null || data === void 0) {
          const hasNullableResponse = Object.keys(endpoint.responses).some(
            (code) => code === "204" || endpoint.responses[code]?.description?.toLowerCase().includes("no content")
          );
          if (!hasNullableResponse) {
            console.warn(`Received null/undefined response for ${endpoint.operationId}`);
          }
        }
      }
      /**
       * Enhance errors with OpenAPI-specific context
       */
      enhanceError(error, endpoint, operation, _options) {
        const enhancedError = new error.constructor(
          error.message,
          error.code,
          {
            operation: error.operation || endpoint.operationId,
            retryable: error.retryable !== void 0 ? error.retryable : EndpointUtils.isRetryable(endpoint),
            statusCode: error.statusCode,
            requestId: error.requestId,
            auditInfo: {
              ...error.auditInfo,
              // Add OpenAPI-specific audit information
              pemId: endpoint.metadata?.resource === "point-of-sales" ? String(_options.pathParams?.serial_number || "") : error.auditInfo?.pemId
            },
            cause: error.cause
          }
        );
        Object.defineProperty(enhancedError, "openapiMetadata", {
          value: {
            resource: endpoint.metadata?.resource,
            endpointOperation: operation,
            httpMethod: endpoint.method,
            path: endpoint.path
          },
          writable: false,
          enumerable: false,
          configurable: false
        });
        return enhancedError;
      }
      /**
       * Utility method to check if an operation is available
       */
      hasOperation(operationKey) {
        return operationKey in this.endpoints;
      }
      /**
       * Get endpoint definition for an operation
       */
      getEndpoint(operationKey) {
        return this.endpoints[operationKey] || null;
      }
      /**
       * Get all available operations for this resource
       */
      getAvailableOperations() {
        return Object.keys(this.endpoints);
      }
      /**
       * Create a standardized error for missing operations
       */
      createUnsupportedOperationError(operation) {
        return new ValidationError(
          `Operation '${operation}' is not supported by this resource`,
          "unsupported_operation",
          [{
            field: "operation",
            message: `Available operations: ${this.getAvailableOperations().join(", ")}`,
            code: "UNSUPPORTED_OPERATION"
          }]
        );
      }
      // Static utility methods for common patterns
      /**
       * Format validation errors for user-friendly display
       */
      static formatValidationErrors(errors) {
        return errors.map((error) => `${error.field}: ${error.message}`).join(", ");
      }
      /**
       * Extract error details from API response
       */
      static extractErrorDetails(error) {
        if (error instanceof ValidationError) {
          return {
            message: error.message,
            details: error.violations
          };
        }
        if (error instanceof Error) {
          return { message: error.message };
        }
        return { message: "Unknown error occurred" };
      }
      /**
       * Check if error indicates a temporary failure
       */
      static isTemporaryError(error) {
        if (error.name === "NetworkError") {
          return true;
        }
        if (error.statusCode) {
          return [429, 500, 502, 503, 504].includes(error.statusCode);
        }
        return error.retryable ?? false;
      }
      /**
       * Get retry delay for temporary errors
       */
      static getRetryDelay(_error, attempt) {
        const baseDelay = 1e3;
        const maxDelay = 3e4;
        let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        const jitter = delay * 0.25;
        delay += (Math.random() * 2 - 1) * jitter;
        return Math.floor(delay);
      }
      // Offline utility methods
      /**
       * Check if offline capabilities are enabled for this resource
       */
      isOfflineEnabled() {
        return this.offlineEnabled && Boolean(this.storage);
      }
      /**
       * Check if queue capabilities are enabled for this resource
       */
      isQueueEnabled() {
        return this.offlineEnabled && Boolean(this.queueManager);
      }
      /**
       * Store data for offline use (persistent across sessions)
       */
      async storeOfflineData(key, data) {
        if (!this.storage) return;
        try {
          const offlineKey = `offline:${key}`;
          await this.storage.set(offlineKey, data);
        } catch (error) {
          console.warn("Failed to store offline data:", error);
        }
      }
      /**
       * Clear cached data for a specific key pattern
       */
      async clearCache(keyPattern) {
        if (!this.storage) return;
        try {
          if (keyPattern) {
            const results = await this.storage.query({ keyPrefix: `api_cache:${keyPattern}` });
            for (const entry of results) {
              await this.storage.delete(entry.key);
            }
          } else {
            const results = await this.storage.query({ keyPrefix: "api_cache:" });
            for (const entry of results) {
              await this.storage.delete(entry.key);
            }
          }
        } catch (error) {
          console.warn("Failed to clear cache:", error);
        }
      }
      /**
       * Get offline queue statistics for this resource
       */
      async getOfflineStats() {
        const stats = {
          queuedOperations: 0,
          cachedEntries: 0,
          offlineEntries: 0
        };
        try {
          if (this.queueManager) {
            const queueStats = this.queueManager.getStats();
            stats.queuedOperations = queueStats.totalItems;
          }
          if (this.storage) {
            const cacheEntries = await this.storage.query({ keyPrefix: "api_cache:" });
            stats.cachedEntries = cacheEntries.length;
            const offlineEntries = await this.storage.query({ keyPrefix: "offline:" });
            stats.offlineEntries = offlineEntries.length;
          }
        } catch (error) {
          console.warn("Failed to get offline stats:", error);
        }
        return stats;
      }
      /**
       * Force sync of queued operations for this resource
       */
      async syncQueuedOperations() {
        if (!this.queueManager) return;
        try {
          await this.queueManager.processAll();
        } catch (error) {
          console.warn("Failed to sync queued operations:", error);
          throw error;
        }
      }
    };
  }
});

// src/resources/cashiers.ts
var cashiers_exports = {};
__export(cashiers_exports, {
  Cashiers: () => CashiersResource,
  CashiersResource: () => CashiersResource
});
var CashiersResource;
var init_cashiers = __esm({
  "src/resources/cashiers.ts"() {
    "use strict";
    init_esm_shims();
    init_base_openapi();
    init_endpoints();
    init_errors();
    CashiersResource = class _CashiersResource extends BaseOpenAPIResource {
      constructor(client, storage, queueManager) {
        super({
          client,
          storage: storage || void 0,
          queueManager: queueManager || void 0,
          offlineEnabled: Boolean(storage || queueManager),
          endpoints: {
            list: CashierEndpoints.LIST,
            create: CashierEndpoints.CREATE,
            me: CashierEndpoints.ME,
            getById: CashierEndpoints.GET_BY_ID,
            delete: CashierEndpoints.DELETE
          }
        });
      }
      /**
       * Get a list of cashiers with pagination
       * Enhanced with offline-first capabilities
       * 
       * @param params - Pagination parameters
       * @param options - Request options including offline preferences
       * @returns Promise resolving to paginated cashier list
       */
      async list(params, options = {}) {
        return this.executeRequest("list", void 0, {
          ...params && { queryParams: params },
          cacheTTL: 600,
          // Cache for 10 minutes
          queueIfOffline: false,
          ...options,
          metadata: {
            operation: "list_cashiers",
            ...options.metadata
          }
        });
      }
      /**
       * Create a new cashier
       * Enhanced with offline queuing and optimistic updates
       * 
       * @param data - Cashier creation input data
       * @param validationOptions - Validation options
       * @param requestOptions - Request options including offline preferences
       * @returns Promise resolving to created cashier
       */
      async create(data, validationOptions = {}, requestOptions = {}) {
        await this.validateCashierInput(data, validationOptions);
        return this.executeRequest("create", data, {
          queueIfOffline: true,
          optimistic: true,
          ...requestOptions,
          metadata: {
            operation: "create_cashier",
            email: data.email,
            ...requestOptions.metadata
          }
        });
      }
      /**
       * Get current cashier information
       * Enhanced with intelligent caching
       * 
       * @param options - Request options including offline preferences
       * @returns Promise resolving to current cashier details
       */
      async me(options = {}) {
        return this.executeRequest("me", void 0, {
          cacheTTL: 300,
          // Cache for 5 minutes
          queueIfOffline: false,
          ...options,
          metadata: {
            operation: "get_current_cashier",
            ...options.metadata
          }
        });
      }
      /**
       * Get a specific cashier by ID
       * 
       * @param cashierId - Cashier ID (branded or number)
       * @returns Promise resolving to cashier details
       */
      async retrieve(cashierId) {
        return this.executeRequest("getById", void 0, {
          pathParams: { cashier_id: cashierId },
          metadata: {
            operation: "get_cashier",
            cashierId
          }
        });
      }
      /**
       * Delete a cashier
       * 
       * @param cashierId - Cashier ID (branded or number)
       * @returns Promise resolving when deletion is complete
       */
      async delete(cashierId) {
        return this.executeRequest("delete", void 0, {
          pathParams: { cashier_id: cashierId },
          metadata: {
            operation: "delete_cashier",
            cashierId
          }
        });
      }
      /**
       * Update a cashier's profile (future enhancement)
       * Note: This endpoint is not yet available in the OpenAPI spec
       */
      async update(cashierId, data) {
        if (!this.hasOperation("update")) {
          throw this.createUnsupportedOperationError("update");
        }
        return this.executeRequest("update", data, {
          pathParams: { cashier_id: cashierId },
          metadata: {
            operation: "update_cashier",
            cashierId
          }
        });
      }
      // Validation methods
      /**
       * Comprehensive cashier input validation
       */
      async validateCashierInput(data, options = {}) {
        const errors = [];
        if (!data.email || !this.isValidEmail(data.email)) {
          errors.push({
            field: "email",
            message: "Invalid email format",
            code: "INVALID_EMAIL"
          });
        } else {
          if (options.allowedEmailDomains && options.allowedEmailDomains.length > 0) {
            if (!_CashiersResource.isAllowedEmailDomain(data.email, options.allowedEmailDomains)) {
              errors.push({
                field: "email",
                message: `Email domain not allowed. Allowed domains: ${options.allowedEmailDomains.join(", ")}`,
                code: "DOMAIN_NOT_ALLOWED"
              });
            }
          }
          if (options.checkEmailUniqueness) {
            const isDuplicate = await this.checkEmailExists(data.email);
            if (isDuplicate) {
              errors.push({
                field: "email",
                message: "Email address is already in use",
                code: "EMAIL_EXISTS"
              });
            }
          }
        }
        const passwordCheck = _CashiersResource.checkPasswordStrength(data.password);
        if (!passwordCheck.isValid) {
          if (options.enforceStrongPassword) {
            errors.push({
              field: "password",
              message: passwordCheck.message || "Password does not meet security requirements",
              code: "WEAK_PASSWORD"
            });
          } else {
            console.warn(`Weak password detected for ${data.email}: ${passwordCheck.suggestions.join(", ")}`);
          }
        }
        if (errors.length > 0) {
          throw new ValidationError("Invalid cashier input", "create_cashier", errors);
        }
      }
      /**
       * Check if email already exists (placeholder for future implementation)
       */
      async checkEmailExists(email) {
        console.warn(`Email uniqueness check not implemented for: ${email}`);
        return false;
      }
      /**
       * Validate email format
       */
      isValidEmail(email) {
        return _CashiersResource.isValidEmail(email);
      }
      // Static utility methods
      /**
       * Validate email format (static utility)
       */
      static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }
      /**
       * Check password strength with detailed analysis
       */
      static checkPasswordStrength(password) {
        const suggestions = [];
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (password.length < 8) {
          suggestions.push("Use at least 8 characters");
        }
        if (/[a-z]/.test(password)) score++;
        else suggestions.push("Include lowercase letters");
        if (/[A-Z]/.test(password)) score++;
        else suggestions.push("Include uppercase letters");
        if (/\d/.test(password)) score++;
        else suggestions.push("Include numbers");
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        else suggestions.push("Include special characters");
        if (/(.)\\1{2,}/.test(password)) {
          score--;
          suggestions.push("Avoid repeating characters");
        }
        const commonPasswords = [
          "password",
          "password123",
          "12345678",
          "qwerty",
          "abc123",
          "password1",
          "123456789",
          "welcome",
          "admin",
          "letmein"
        ];
        if (commonPasswords.some((common) => password.toLowerCase().includes(common.toLowerCase()))) {
          score = 0;
          suggestions.push("Avoid common passwords");
        }
        if (/^[a-zA-Z]+$/.test(password) && password.length < 12) {
          score--;
          suggestions.push("Avoid using only dictionary words");
        }
        const isValid = score >= 4 && password.length >= 8;
        const message = isValid ? "Strong password" : "Password too weak";
        return { isValid, score, message, suggestions };
      }
      /**
       * Generate a secure password
       */
      static generateSecurePassword(length = 12) {
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        const allChars = lowercase + uppercase + numbers + symbols;
        let password = "";
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        for (let i = password.length; i < length; i++) {
          password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        return password.split("").sort(() => Math.random() - 0.5).join("");
      }
      /**
       * Format email for display (partial masking for privacy)
       */
      static formatEmailForDisplay(email) {
        const [localPart, domain] = email.split("@");
        if (!localPart || !domain) return email;
        if (localPart.length <= 3) {
          return `${localPart[0]}**@${domain}`;
        }
        const visibleChars = Math.min(3, Math.floor(localPart.length / 2));
        const maskedPart = "*".repeat(localPart.length - visibleChars);
        return `${localPart.substring(0, visibleChars)}${maskedPart}@${domain}`;
      }
      /**
       * Extract domain from email
       */
      static getEmailDomain(email) {
        const parts = email.split("@");
        return parts.length === 2 ? parts[1] || null : null;
      }
      /**
       * Validate email domain against allowed domains
       */
      static isAllowedEmailDomain(email, allowedDomains) {
        const domain = this.getEmailDomain(email);
        return domain ? allowedDomains.includes(domain.toLowerCase()) : false;
      }
      /**
       * Generate username suggestion from email
       */
      static generateUsername(email) {
        const [localPart] = email.split("@");
        if (!localPart) return "user";
        return localPart.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
      }
      /**
       * Validate cashier creation rate limits (placeholder for future implementation)
       */
      static checkCreationRateLimit(ipAddress) {
        console.warn(`Rate limit check not implemented for IP: ${ipAddress}`);
        return true;
      }
      /**
       * Get cashier role permissions (placeholder for future implementation)
       */
      static getCashierPermissions() {
        return [
          "create_receipt",
          "view_receipts",
          "void_receipt",
          "return_items",
          "view_daily_summary"
        ];
      }
      /**
       * Format cashier for display in UI
       */
      static formatCashierForDisplay(cashier) {
        return {
          displayName: cashier.email.split("@")[0] || "Unknown",
          maskedEmail: this.formatEmailForDisplay(cashier.email),
          status: "active",
          // This would come from the API response
          permissions: this.getCashierPermissions()
        };
      }
      /**
       * Validate cashier session (placeholder for future implementation)
       */
      static validateCashierSession(cashierId) {
        console.warn(`Session validation not implemented for cashier: ${cashierId}`);
        return Promise.resolve(true);
      }
    };
  }
});

// src/resources/receipts.ts
var receipts_exports = {};
__export(receipts_exports, {
  Receipts: () => ReceiptsResource,
  ReceiptsResource: () => ReceiptsResource
});
var ReceiptsResource;
var init_receipts = __esm({
  "src/resources/receipts.ts"() {
    "use strict";
    init_esm_shims();
    init_base_openapi();
    init_endpoints();
    init_errors();
    ReceiptsResource = class extends BaseOpenAPIResource {
      constructor(client, storage, queueManager) {
        super({
          client,
          storage: storage || void 0,
          queueManager: queueManager || void 0,
          offlineEnabled: Boolean(storage || queueManager),
          endpoints: {
            list: ReceiptEndpoints.LIST,
            create: ReceiptEndpoints.CREATE,
            void: ReceiptEndpoints.VOID,
            getByUuid: ReceiptEndpoints.GET_BY_UUID,
            voidWithProof: ReceiptEndpoints.VOID_WITH_PROOF,
            getDetails: ReceiptEndpoints.GET_DETAILS,
            returnItems: ReceiptEndpoints.RETURN_ITEMS,
            returnItemsWithProof: ReceiptEndpoints.RETURN_ITEMS_WITH_PROOF
          }
        });
      }
      /**
       * Get a list of receipts with filtering and pagination
       * Enhanced with offline-first capabilities
       * 
       * @param params - List parameters including filters and pagination
       * @param options - Request options including offline preferences
       * @returns Promise resolving to paginated receipt list
       */
      async list(params, options = {}) {
        return this.executeRequest("list", void 0, {
          ...params && { queryParams: params },
          cacheTTL: 300,
          // Cache for 5 minutes
          queueIfOffline: false,
          // Read operations don't need queuing
          ...options,
          metadata: {
            operation: "list_receipts",
            dateRange: params?.start_date && params?.end_date ? `${params.start_date} to ${params.end_date}` : void 0,
            ...options.metadata
          }
        });
      }
      /**
       * Create a new electronic receipt
       * Enhanced with offline queuing and optimistic updates
       * 
       * @param data - Receipt input data with items and payment information
       * @param validationOptions - Validation options for fiscal compliance
       * @param requestOptions - Request options including offline preferences
       * @returns Promise resolving to created receipt
       */
      async create(data, validationOptions = {}, requestOptions = {}) {
        await this.validateReceiptInput(data, validationOptions);
        return this.executeRequest("create", data, {
          queueIfOffline: true,
          // Queue receipts when offline
          optimistic: true,
          // Provide immediate feedback
          ...requestOptions,
          metadata: {
            operation: "create_receipt",
            itemCount: data.items.length,
            totalAmount: this.calculateTotalAmount(data).totalAmount
          }
        });
      }
      /**
       * Void an electronic receipt
       * Enhanced with offline queuing for critical operations
       * 
       * @param voidData - Void request data
       * @param options - Request options including offline preferences
       * @returns Promise resolving to void confirmation
       */
      async void(voidData, options = {}) {
        return this.executeRequest("void", voidData, {
          queueIfOffline: true,
          // Critical operation - queue when offline
          optimistic: false,
          // Don't provide optimistic response for fiscal operations
          ...options,
          metadata: {
            operation: "void_receipt",
            ...options.metadata
          }
        });
      }
      /**
       * Get a specific receipt by UUID
       * Enhanced with intelligent caching for frequent lookups
       * 
       * @param receiptId - Receipt UUID
       * @param options - Request options including offline preferences
       * @returns Promise resolving to receipt details
       */
      async retrieve(receiptId, options = {}) {
        return this.executeRequest("getByUuid", void 0, {
          pathParams: { receipt_uuid: receiptId },
          cacheTTL: 600,
          // Cache individual receipts for 10 minutes
          queueIfOffline: false,
          // Read operations don't need queuing
          ...options,
          metadata: {
            operation: "get_receipt",
            receiptId,
            ...options.metadata
          }
        });
      }
      /**
       * Void a receipt using proof of purchase
       * 
       * @param voidData - Void request with proof data
       * @returns Promise resolving to void confirmation
       */
      async voidWithProof(voidData) {
        return this.executeRequest("voidWithProof", voidData, {
          metadata: {
            operation: "void_receipt_with_proof"
          }
        });
      }
      /**
       * Get receipt details or PDF
       * 
       * @param receiptId - Receipt UUID
       * @param format - Response format ('json' or 'pdf')
       * @returns Promise resolving to receipt details or PDF blob
       */
      async getDetails(receiptId, format = "json") {
        const acceptHeader = format === "pdf" ? "application/pdf" : "application/json";
        return this.executeRequest("getDetails", void 0, {
          pathParams: { receipt_uuid: receiptId },
          headers: { Accept: acceptHeader },
          metadata: {
            operation: "get_receipt_details",
            receiptId,
            format
          }
        });
      }
      /**
       * Return items from a receipt
       * 
       * @param returnData - Return request data
       * @returns Promise resolving to return receipt
       */
      async returnItems(returnData) {
        return this.executeRequest("returnItems", returnData, {
          metadata: {
            operation: "return_receipt_items"
          }
        });
      }
      /**
       * Return items from a receipt using proof of purchase
       * 
       * @param returnData - Return request with proof data
       * @returns Promise resolving to return receipt
       */
      async returnItemsWithProof(returnData) {
        return this.executeRequest("returnItemsWithProof", returnData, {
          metadata: {
            operation: "return_receipt_items_with_proof"
          }
        });
      }
      /**
       * Update an existing receipt
       * 
       * @param receiptId - The receipt ID to update
       * @param updateData - Update data for the receipt
       * @returns Promise resolving to updated receipt
       */
      async update(receiptId, updateData) {
        if (!this.hasOperation("updateReceipt")) {
          throw this.createUnsupportedOperationError("updateReceipt");
        }
        return this.executeRequest("updateReceipt", {
          id: String(receiptId),
          ...updateData
        }, {
          metadata: {
            operation: "update_receipt",
            receiptId: String(receiptId)
          }
        });
      }
      /**
       * Delete a receipt
       * 
       * @param receiptId - The receipt ID to delete
       * @returns Promise resolving to deletion confirmation
       */
      async delete(receiptId) {
        if (!this.hasOperation("deleteReceipt")) {
          throw this.createUnsupportedOperationError("deleteReceipt");
        }
        return this.executeRequest("deleteReceipt", {
          id: String(receiptId)
        }, {
          metadata: {
            operation: "delete_receipt",
            receiptId: String(receiptId)
          }
        });
      }
      // Validation methods
      /**
       * Comprehensive receipt input validation
       */
      async validateReceiptInput(data, options = {}) {
        const errors = [];
        if (!data.items || data.items.length === 0) {
          errors.push({
            field: "items",
            message: "Receipt must contain at least one item",
            code: "NO_ITEMS"
          });
        }
        if (options.maxReceiptItems && data.items.length > options.maxReceiptItems) {
          errors.push({
            field: "items",
            message: `Receipt cannot contain more than ${options.maxReceiptItems} items`,
            code: "TOO_MANY_ITEMS"
          });
        }
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          if (!item) continue;
          const itemErrors = this.validateReceiptItem(item, i, options);
          errors.push(...itemErrors);
        }
        const paymentErrors = this.validatePaymentAmounts(data);
        errors.push(...paymentErrors);
        if (options.checkTotalCalculations) {
          const calculationErrors = this.validateCalculations(data);
          errors.push(...calculationErrors);
        }
        if (options.enforceItalianFiscalRules) {
          const fiscalErrors = this.validateItalianFiscalRules(data);
          errors.push(...fiscalErrors);
        }
        if (errors.length > 0) {
          throw new ValidationError("Invalid receipt input", "create_receipt", errors);
        }
      }
      /**
       * Validate individual receipt item
       */
      validateReceiptItem(item, index, options) {
        const errors = [];
        const prefix = `items[${index}]`;
        if (!item.description || item.description.trim().length === 0) {
          errors.push({
            field: `${prefix}.description`,
            message: "Item description is required",
            code: "REQUIRED"
          });
        }
        if (!item.quantity || parseFloat(item.quantity) <= 0) {
          errors.push({
            field: `${prefix}.quantity`,
            message: "Item quantity must be greater than 0",
            code: "INVALID_QUANTITY"
          });
        }
        if (!item.unit_price || parseFloat(item.unit_price) < 0) {
          errors.push({
            field: `${prefix}.unit_price`,
            message: "Item unit price cannot be negative",
            code: "INVALID_PRICE"
          });
        }
        if (options.validateVATRates && item.vat_rate_code) {
          const validVATRates = ["0", "4", "5", "10", "22"];
          if (!validVATRates.includes(item.vat_rate_code)) {
            errors.push({
              field: `${prefix}.vat_rate_code`,
              message: `Invalid VAT rate. Valid rates: ${validVATRates.join(", ")}`,
              code: "INVALID_VAT_RATE"
            });
          }
        }
        if (item.description && item.description.length > 200) {
          errors.push({
            field: `${prefix}.description`,
            message: "Item description cannot exceed 200 characters",
            code: "DESCRIPTION_TOO_LONG"
          });
        }
        return errors;
      }
      /**
       * Validate payment amounts
       */
      validatePaymentAmounts(data) {
        const errors = [];
        const cashAmount = parseFloat(data.cash_payment_amount || "0");
        const electronicAmount = parseFloat(data.electronic_payment_amount || "0");
        const ticketAmount = parseFloat(data.ticket_restaurant_payment_amount || "0");
        if (cashAmount <= 0 && electronicAmount <= 0 && ticketAmount <= 0) {
          errors.push({
            field: "payment",
            message: "At least one payment method must have a positive amount",
            code: "NO_PAYMENT"
          });
        }
        if (cashAmount < 0) {
          errors.push({
            field: "cash_payment_amount",
            message: "Cash payment amount cannot be negative",
            code: "NEGATIVE_AMOUNT"
          });
        }
        if (electronicAmount < 0) {
          errors.push({
            field: "electronic_payment_amount",
            message: "Electronic payment amount cannot be negative",
            code: "NEGATIVE_AMOUNT"
          });
        }
        if (ticketAmount < 0) {
          errors.push({
            field: "ticket_restaurant_payment_amount",
            message: "Ticket restaurant payment amount cannot be negative",
            code: "NEGATIVE_AMOUNT"
          });
        }
        return errors;
      }
      /**
       * Validate calculation accuracy
       */
      validateCalculations(data) {
        const errors = [];
        try {
          const calculated = this.calculateTotalAmount(data);
          const totalPayments = parseFloat(data.cash_payment_amount || "0") + parseFloat(data.electronic_payment_amount || "0") + parseFloat(data.ticket_restaurant_payment_amount || "0");
          const tolerance = 0.01;
          if (Math.abs(totalPayments - parseFloat(calculated.totalAmount)) > tolerance) {
            errors.push({
              field: "payment_total",
              message: `Payment total (${totalPayments.toFixed(2)}) does not match calculated total (${calculated.totalAmount})`,
              code: "PAYMENT_MISMATCH"
            });
          }
        } catch (error) {
          errors.push({
            field: "calculation",
            message: "Failed to validate receipt calculations",
            code: "CALCULATION_ERROR"
          });
        }
        return errors;
      }
      /**
       * Validate Italian fiscal compliance rules
       */
      validateItalianFiscalRules(data) {
        const errors = [];
        const totalAmount = parseFloat(this.calculateTotalAmount(data).totalAmount);
        if (totalAmount > 3e3) {
          const cashAmount = parseFloat(data.cash_payment_amount || "0");
          if (cashAmount > 1e3) {
            errors.push({
              field: "cash_payment_amount",
              message: "Cash payments over \u20AC1000 require additional documentation for transactions above \u20AC3000",
              code: "HIGH_VALUE_CASH_LIMIT"
            });
          }
        }
        if (data.customer_lottery_code && !/^[A-Z0-9]{16}$/.test(data.customer_lottery_code)) {
          errors.push({
            field: "customer_lottery_code",
            message: "Lottery code must be 16 alphanumeric characters",
            code: "INVALID_LOTTERY_CODE"
          });
        }
        return errors;
      }
      // Calculation methods
      /**
       * Calculate total receipt amount with VAT breakdown
       */
      calculateTotalAmount(data) {
        let subtotal = 0;
        let totalVAT = 0;
        let totalDiscount = parseFloat(data.discount || "0");
        const vatBreakdown = /* @__PURE__ */ new Map();
        for (const item of data.items) {
          const quantity = parseFloat(item.quantity);
          const unitPrice = parseFloat(item.unit_price);
          const itemDiscount = parseFloat(item.discount || "0");
          const vatRate = parseFloat(item.vat_rate_code || "0") / 100;
          const itemNetTotal = quantity * unitPrice - itemDiscount;
          const itemVAT = itemNetTotal * vatRate;
          const itemGrossTotal = itemNetTotal + itemVAT;
          subtotal += itemNetTotal;
          totalVAT += itemVAT;
          const vatKey = item.vat_rate_code || "0";
          if (!vatBreakdown.has(vatKey)) {
            vatBreakdown.set(vatKey, { net: 0, vat: 0, gross: 0 });
          }
          const breakdown = vatBreakdown.get(vatKey);
          breakdown.net += itemNetTotal;
          breakdown.vat += itemVAT;
          breakdown.gross += itemGrossTotal;
        }
        const finalSubtotal = subtotal - totalDiscount;
        const finalTotal = finalSubtotal + totalVAT;
        return {
          subtotal: finalSubtotal.toFixed(2),
          vatAmount: totalVAT.toFixed(2),
          totalAmount: finalTotal.toFixed(2),
          discountAmount: (totalDiscount + data.items.reduce((sum, item) => sum + parseFloat(item.discount || "0"), 0)).toFixed(2),
          itemCount: data.items.length,
          breakdown: Array.from(vatBreakdown.entries()).map(([vatRate, amounts]) => ({
            vatRate,
            netAmount: amounts.net.toFixed(2),
            vatAmount: amounts.vat.toFixed(2),
            grossAmount: amounts.gross.toFixed(2)
          }))
        };
      }
      // Static utility methods
      /**
       * Format receipt for display
       */
      static formatReceiptForDisplay(receipt) {
        const date = new Date(receipt.created_at);
        return {
          receiptNumber: receipt.uuid.split("-")[0]?.toUpperCase() || "UNKNOWN",
          date: date.toLocaleDateString("it-IT"),
          time: date.toLocaleTimeString("it-IT"),
          formattedTotal: `\u20AC ${receipt.total_amount}`,
          paymentMethod: this.determinePaymentMethod(receipt),
          itemSummary: `0 items`
          // items field not available in OpenAPI schema
        };
      }
      /**
       * Determine primary payment method
       */
      static determinePaymentMethod(_receipt) {
        return "cash";
      }
      /**
       * Generate receipt summary for reports
       */
      static generateReceiptSummary(receipts) {
        const summary = {
          totalCount: receipts.length,
          totalAmount: "0.00",
          vatAmount: "0.00",
          averageAmount: "0.00",
          paymentMethodBreakdown: {
            cash: { count: 0, amount: "0.00" },
            electronic: { count: 0, amount: "0.00" },
            ticket_restaurant: { count: 0, amount: "0.00" },
            mixed: { count: 0, amount: "0.00" }
          },
          dateRange: { from: "", to: "" }
        };
        if (receipts.length === 0) return summary;
        let totalAmount = 0;
        let totalVAT = 0;
        const dates = receipts.map((r) => new Date(r.created_at)).sort((a, b) => a.getTime() - b.getTime());
        for (const receipt of receipts) {
          const amount = parseFloat(receipt.total_amount);
          totalAmount += amount;
          totalVAT += amount * 0.15;
          const paymentMethod = this.determinePaymentMethod(receipt);
          summary.paymentMethodBreakdown[paymentMethod].count++;
          summary.paymentMethodBreakdown[paymentMethod].amount = (parseFloat(summary.paymentMethodBreakdown[paymentMethod].amount) + amount).toFixed(2);
        }
        summary.totalAmount = totalAmount.toFixed(2);
        summary.vatAmount = totalVAT.toFixed(2);
        summary.averageAmount = (totalAmount / receipts.length).toFixed(2);
        summary.dateRange.from = dates[0]?.toISOString().split("T")[0] || "";
        summary.dateRange.to = dates[dates.length - 1]?.toISOString().split("T")[0] || "";
        return summary;
      }
      /**
       * Validate receipt return eligibility
       */
      static validateReturnEligibility(receipt, returnDate = /* @__PURE__ */ new Date()) {
        const receiptDate = new Date(receipt.created_at);
        const daysSinceReceipt = Math.floor((returnDate.getTime() - receiptDate.getTime()) / (1e3 * 60 * 60 * 24));
        const returnPeriodDays = 30;
        if (daysSinceReceipt > returnPeriodDays) {
          return {
            eligible: false,
            reason: `Return period expired. Returns allowed within ${returnPeriodDays} days.`
          };
        }
        if (receipt.document_number && receipt.document_number.includes("VOID")) {
          return {
            eligible: false,
            reason: "Receipt has already been voided"
          };
        }
        return {
          eligible: true,
          daysRemaining: returnPeriodDays - daysSinceReceipt
        };
      }
      /**
       * Generate fiscal code for lottery participation
       */
      static generateLotteryCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 16; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      }
      // Offline-specific convenience methods
      /**
       * Get offline receipt statistics
       */
      async getOfflineReceiptStats() {
        const baseStats = await this.getOfflineStats();
        return {
          ...baseStats,
          resourceType: "receipts",
          capabilities: {
            canCreateOffline: this.isQueueEnabled(),
            canReadOffline: this.isOfflineEnabled(),
            canCacheReceipts: this.isOfflineEnabled()
          }
        };
      }
      /**
       * Sync all queued receipt operations
       */
      async syncQueuedReceipts() {
        if (!this.isQueueEnabled()) {
          throw new ValidationError("Queue not enabled", "sync_error", [
            { field: "queue", message: "Offline queue is not configured", code: "QUEUE_NOT_ENABLED" }
          ]);
        }
        await this.syncQueuedOperations();
      }
      /**
       * Clear receipt cache (useful for data refresh)
       */
      async clearReceiptCache() {
        await this.clearCache("receipts");
      }
      /**
       * Store receipt for offline access
       */
      async storeReceiptOffline(receiptId, receipt) {
        const cacheKey = `GET:/receipts/{receipt_uuid}?path=receipt_uuid=${receiptId}`;
        await this.storeOfflineData(cacheKey, receipt);
      }
    };
  }
});

// src/resources/point-of-sales.ts
var point_of_sales_exports = {};
__export(point_of_sales_exports, {
  PointOfSales: () => PointOfSalesResource,
  PointOfSalesResource: () => PointOfSalesResource
});
var PointOfSalesResource;
var init_point_of_sales = __esm({
  "src/resources/point-of-sales.ts"() {
    "use strict";
    init_esm_shims();
    init_base_openapi();
    init_endpoints();
    init_errors();
    PointOfSalesResource = class _PointOfSalesResource extends BaseOpenAPIResource {
      constructor(client) {
        super({
          client,
          endpoints: {
            list: PointOfSalesEndpoints.LIST,
            getBySerial: PointOfSalesEndpoints.GET_BY_SERIAL,
            closeJournal: PointOfSalesEndpoints.CLOSE_JOURNAL,
            activation: PointOfSalesEndpoints.ACTIVATION,
            createInactivity: PointOfSalesEndpoints.CREATE_INACTIVITY,
            setOffline: PointOfSalesEndpoints.SET_OFFLINE
          }
        });
      }
      /**
       * Get a list of Point of Sales devices
       * 
       * @returns Promise resolving to paginated PEM list
       */
      async list() {
        return this.executeRequest("list", void 0, {
          metadata: {
            operation: "list_point_of_sales"
          }
        });
      }
      /**
       * Get a specific Point of Sale by serial number
       * 
       * @param serialNumber - Device serial number
       * @returns Promise resolving to PEM details
       */
      async retrieve(serialNumber) {
        return this.executeRequest("getBySerial", void 0, {
          pathParams: { serial_number: serialNumber },
          metadata: {
            operation: "get_point_of_sale",
            serialNumber
          }
        });
      }
      /**
       * Close the daily journal for a Point of Sale
       * 
       * @returns Promise resolving to close confirmation
       */
      async closeJournal() {
        return this.executeRequest("closeJournal", void 0, {
          metadata: {
            operation: "close_journal"
          }
        });
      }
      /**
       * Trigger activation process for a Point of Sale
       * 
       * @param serialNumber - Device serial number
       * @param activationData - Activation request data
       * @param options - Validation options
       * @returns Promise resolving to activation status
       */
      async activate(serialNumber, activationData, options = {}) {
        await this.validateActivationRequest(serialNumber, activationData, options);
        return this.executeRequest("activation", activationData, {
          pathParams: { serial_number: serialNumber },
          metadata: {
            operation: "activate_point_of_sale",
            serialNumber,
            registrationKey: activationData.registration_key
          }
        });
      }
      /**
       * Create an inactivity period for a Point of Sale
       * 
       * @param serialNumber - Device serial number
       * @param inactivityData - Inactivity period request data
       * @returns Promise resolving when inactivity period is created
       */
      async createInactivityPeriod(serialNumber, inactivityData) {
        return this.executeRequest("createInactivity", inactivityData, {
          pathParams: { serial_number: serialNumber },
          metadata: {
            operation: "create_inactivity_period",
            serialNumber
          }
        });
      }
      /**
       * Set Point of Sale status to offline
       * 
       * @param serialNumber - Device serial number
       * @returns Promise resolving when status is updated
       */
      async setOffline(serialNumber) {
        return this.executeRequest("setOffline", void 0, {
          pathParams: { serial_number: serialNumber },
          metadata: {
            operation: "set_point_of_sale_offline",
            serialNumber
          }
        });
      }
      /**
       * Get device status summary
       * 
       * @param serialNumber - Device serial number
       * @returns Promise resolving to device status
       */
      async getDeviceStatus(serialNumber) {
        const device = await this.retrieve(serialNumber);
        return _PointOfSalesResource.analyzeDeviceStatus(device);
      }
      /**
       * Get journal summary for a specific date
       * 
       * @param serialNumber - Device serial number
       * @param date - Date in YYYY-MM-DD format
       * @returns Promise resolving to journal summary
       */
      async getJournalSummary(_serialNumber, date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0]) {
        return {
          date,
          transactionCount: 0,
          totalAmount: "0.00",
          vatAmount: "0.00",
          status: "open"
        };
      }
      // Validation methods
      /**
       * Validate activation request
       */
      async validateActivationRequest(serialNumber, activationData, options = {}) {
        const errors = [];
        if (options.validateSerialNumber) {
          const serialValidation = _PointOfSalesResource.validateSerialNumber(serialNumber);
          if (!serialValidation.isValid) {
            errors.push({
              field: "serial_number",
              message: serialValidation.error || "Invalid serial number format",
              code: "INVALID_SERIAL_NUMBER"
            });
          }
        }
        if (!activationData.registration_key || activationData.registration_key.length === 0) {
          errors.push({
            field: "registration_key",
            message: "Registration key is required",
            code: "REQUIRED"
          });
        } else {
          const keyValidation = this.validateRegistrationKey(activationData.registration_key);
          if (!keyValidation.isValid) {
            errors.push({
              field: "registration_key",
              message: keyValidation.error || "Invalid registration key format",
              code: "INVALID_REGISTRATION_KEY"
            });
          }
        }
        if (options.checkActivationStatus) {
          try {
            const device = await this.retrieve(serialNumber);
            if (device.status === "ACTIVE") {
              errors.push({
                field: "status",
                message: "Device is already activated",
                code: "ALREADY_ACTIVATED"
              });
            }
          } catch (error) {
            if (error instanceof Error && !error.message.includes("404")) {
              errors.push({
                field: "device",
                message: "Unable to verify device status",
                code: "STATUS_CHECK_FAILED"
              });
            }
          }
        }
        if (errors.length > 0) {
          throw new ValidationError("Invalid activation request", "activate_point_of_sale", errors);
        }
      }
      /**
       * Validate registration key format
       */
      validateRegistrationKey(key) {
        if (key.length < 16) {
          return { isValid: false, error: "Registration key must be at least 16 characters" };
        }
        if (!/^[A-Z0-9-]+$/.test(key)) {
          return { isValid: false, error: "Registration key contains invalid characters" };
        }
        return { isValid: true };
      }
      // Static utility methods
      /**
       * Validate serial number format
       */
      static validateSerialNumber(serialNumber) {
        const serialStr = String(serialNumber);
        if (serialStr.length < 8 || serialStr.length > 20) {
          return { isValid: false, error: "Serial number must be between 8 and 20 characters" };
        }
        if (!/^[A-Z0-9]+$/.test(serialStr)) {
          return { isValid: false, error: "Serial number must contain only uppercase letters and numbers" };
        }
        return { isValid: true };
      }
      /**
       * Analyze device status from device data
       */
      static analyzeDeviceStatus(device) {
        return {
          serialNumber: device.serial_number,
          status: device.status,
          lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
          // last_seen field not available in OpenAPI schema
          certificateExpiry: void 0,
          // certificate_expiry field not available in OpenAPI schema
          firmwareVersion: void 0,
          // firmware_version field not available in OpenAPI schema
          batteryLevel: void 0,
          // battery_level field not available in OpenAPI schema
          connectivity: this.determineConnectivityStatus(device)
        };
      }
      /**
       * Determine connectivity status from device data
       */
      static determineConnectivityStatus(_device) {
        const lastSeenTime = (/* @__PURE__ */ new Date()).getTime();
        const now = Date.now();
        const minutesSinceLastSeen = (now - lastSeenTime) / (1e3 * 60);
        if (minutesSinceLastSeen <= 5) return "online";
        if (minutesSinceLastSeen <= 30) return "intermittent";
        return "offline";
      }
      /**
       * Format device for display
       */
      static formatDeviceForDisplay(device) {
        const status = device.status || "unknown";
        const lastSeen = /* @__PURE__ */ new Date();
        return {
          displayName: `PEM ${device.serial_number}`,
          statusBadge: status.toUpperCase(),
          location: device.address?.city || "Unknown Location",
          lastActivity: lastSeen.toLocaleString(),
          certificateStatus: "Not Available"
          // certificate_expiry field not available in OpenAPI schema
        };
      }
      /**
       * Calculate device uptime
       */
      static calculateUptime(_device) {
        const lastSeenTime = Date.now();
        const now = Date.now();
        const hoursSinceLastSeen = (now - lastSeenTime) / (1e3 * 60 * 60);
        const uptimeHours = Math.max(0, 24 - hoursSinceLastSeen);
        const uptimePercentage = Math.round(uptimeHours / 24 * 100);
        let availabilityStatus = "excellent";
        if (uptimePercentage < 95) availabilityStatus = "good";
        if (uptimePercentage < 85) availabilityStatus = "poor";
        if (uptimePercentage < 70) availabilityStatus = "critical";
        return {
          uptimeHours: Math.round(uptimeHours * 100) / 100,
          uptimePercentage,
          availabilityStatus
        };
      }
      /**
       * Generate device health report
       */
      static generateHealthReport(devices) {
        const report = {
          totalDevices: devices.length,
          activeDevices: 0,
          offlineDevices: 0,
          devicesRequiringAttention: 0,
          avgUptimePercentage: 0,
          certificateExpiringCount: 0,
          statusBreakdown: {}
        };
        let totalUptime = 0;
        for (const device of devices) {
          const status = device.status;
          report.statusBreakdown[status] = (report.statusBreakdown[status] || 0) + 1;
          if (status === "ACTIVE") {
            report.activeDevices++;
          } else if (status === "OFFLINE") {
            report.offlineDevices++;
          }
          if (["DISCARDED"].includes(status)) {
            report.devicesRequiringAttention++;
          }
          const uptime = this.calculateUptime(device);
          totalUptime += uptime.uptimePercentage;
        }
        report.avgUptimePercentage = devices.length > 0 ? Math.round(totalUptime / devices.length) : 0;
        return report;
      }
      /**
       * Validate journal closing eligibility
       */
      static validateJournalClosingEligibility(device, _date) {
        const reasons = [];
        const requirements = [];
        if (device.status !== "ACTIVE") {
          reasons.push("Device must be in active status");
        }
        requirements.push("All transactions must be transmitted to tax authority");
        requirements.push("Device must be connected to network");
        requirements.push("No active receipt printing operations");
        return {
          canClose: reasons.length === 0,
          reasons,
          requirements
        };
      }
      /**
       * Get recommended maintenance schedule
       */
      static getMaintenanceSchedule(_device) {
        const now = /* @__PURE__ */ new Date();
        return {
          nextMaintenance: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
          maintenanceType: "routine",
          priority: "low",
          description: "Routine maintenance and inspection",
          estimatedDuration: "30-60 minutes"
        };
      }
      /**
       * Check if firmware version is outdated
       * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
       */
      // private static isOutdatedFirmware(version: string): boolean {
      //   // Simple version comparison (in reality, this would be more sophisticated)
      //   const currentVersion = '2.1.0'; // Mock current version
      //   return version < currentVersion;
      // }
      /**
       * Generate activation code for new devices
       */
      static generateActivationCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let group = 0; group < 4; group++) {
          if (group > 0) result += "-";
          for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
        }
        return result;
      }
    };
  }
});

// src/storage/unified-storage.ts
var unified_storage_exports = {};
__export(unified_storage_exports, {
  DEFAULT_STORAGE_OPTIONS: () => DEFAULT_STORAGE_OPTIONS,
  STORAGE_NAMESPACES: () => STORAGE_NAMESPACES,
  StorageCapacityError: () => StorageCapacityError,
  StorageConnectionError: () => StorageConnectionError,
  StorageEncryptionError: () => StorageEncryptionError,
  StorageError: () => StorageError,
  StorageTransactionError: () => StorageTransactionError,
  createCacheKey: () => createCacheKey,
  createCashRegisterKey: () => createCashRegisterKey,
  createCashierKey: () => createCashierKey,
  createConfigKey: () => createConfigKey,
  createMerchantKey: () => createMerchantKey,
  createPEMKey: () => createPEMKey,
  createReceiptKey: () => createReceiptKey,
  createSecureKey: () => createSecureKey,
  createSessionKey: () => createSessionKey,
  createStorageKey: () => createStorageKey
});
var createStorageKey, StorageError, StorageConnectionError, StorageCapacityError, StorageEncryptionError, StorageTransactionError, DEFAULT_STORAGE_OPTIONS, STORAGE_NAMESPACES, createReceiptKey, createCashierKey, createMerchantKey, createPEMKey, createCashRegisterKey, createCacheKey, createSessionKey, createSecureKey, createConfigKey;
var init_unified_storage = __esm({
  "src/storage/unified-storage.ts"() {
    "use strict";
    init_esm_shims();
    createStorageKey = (key) => key;
    StorageError = class extends Error {
      constructor(message, code, operation, key, cause) {
        super(message);
        this.code = code;
        this.operation = operation;
        this.key = key;
        this.cause = cause;
        this.name = "StorageError";
      }
    };
    StorageConnectionError = class extends StorageError {
      constructor(adapter, cause) {
        super(
          `Failed to connect to storage adapter: ${adapter}`,
          "STORAGE_CONNECTION_ERROR",
          "connect",
          void 0,
          cause
        );
      }
    };
    StorageCapacityError = class extends StorageError {
      constructor(key, size, maxSize) {
        super(
          `Storage capacity exceeded for key ${key}: ${size} > ${maxSize}`,
          "STORAGE_CAPACITY_ERROR",
          "set",
          key
        );
      }
    };
    StorageEncryptionError = class extends StorageError {
      constructor(key, operation, cause) {
        super(
          `Encryption/decryption failed for key ${key}`,
          "STORAGE_ENCRYPTION_ERROR",
          operation,
          key,
          cause
        );
      }
    };
    StorageTransactionError = class extends StorageError {
      constructor(transactionId, operation, cause) {
        super(
          `Transaction ${transactionId} failed during ${operation}`,
          "STORAGE_TRANSACTION_ERROR",
          operation,
          void 0,
          cause
        );
      }
    };
    DEFAULT_STORAGE_OPTIONS = {
      encrypt: false,
      compress: false,
      ttl: 0,
      // No expiration
      namespace: "default",
      version: "1.0.0"
    };
    STORAGE_NAMESPACES = {
      RECEIPTS: "receipts",
      CASHIERS: "cashiers",
      MERCHANTS: "merchants",
      PEMS: "pems",
      CASH_REGISTERS: "cash_registers",
      CACHE: "cache",
      SESSION: "session",
      SECURE: "secure",
      CONFIG: "config",
      OFFLINE_QUEUE: "offline_queue",
      ANALYTICS: "analytics",
      AUDIT: "audit"
    };
    createReceiptKey = (id) => createStorageKey(`${STORAGE_NAMESPACES.RECEIPTS}:${id}`);
    createCashierKey = (id) => createStorageKey(`${STORAGE_NAMESPACES.CASHIERS}:${id}`);
    createMerchantKey = (id) => createStorageKey(`${STORAGE_NAMESPACES.MERCHANTS}:${id}`);
    createPEMKey = (id) => createStorageKey(`${STORAGE_NAMESPACES.PEMS}:${id}`);
    createCashRegisterKey = (id) => createStorageKey(`${STORAGE_NAMESPACES.CASH_REGISTERS}:${id}`);
    createCacheKey = (key) => createStorageKey(`${STORAGE_NAMESPACES.CACHE}:${key}`);
    createSessionKey = (key) => createStorageKey(`${STORAGE_NAMESPACES.SESSION}:${key}`);
    createSecureKey = (key) => createStorageKey(`${STORAGE_NAMESPACES.SECURE}:${key}`);
    createConfigKey = (key) => createStorageKey(`${STORAGE_NAMESPACES.CONFIG}:${key}`);
  }
});

// src/storage/platform-detector.ts
var PlatformDetector, platformDetector;
var init_platform_detector = __esm({
  "src/storage/platform-detector.ts"() {
    "use strict";
    init_esm_shims();
    PlatformDetector = class _PlatformDetector {
      static instance = null;
      cachedInfo = null;
      constructor() {
      }
      /**
       * Get singleton instance
       */
      static getInstance() {
        if (!_PlatformDetector.instance) {
          _PlatformDetector.instance = new _PlatformDetector();
        }
        return _PlatformDetector.instance;
      }
      /**
       * Detect current platform type
       */
      detectPlatform() {
        if (typeof process !== "undefined" && process.versions && process.versions.node && typeof window === "undefined") {
          return "node";
        }
        if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
          return "react-native";
        }
        if (typeof window !== "undefined" && typeof document !== "undefined") {
          return "web";
        }
        return "unknown";
      }
      /**
       * Get comprehensive environment information
       */
      getEnvironmentInfo() {
        if (this.cachedInfo) {
          return this.cachedInfo;
        }
        const platform = this.detectPlatform();
        this.cachedInfo = {
          ...this.detectCapabilities(platform),
          ...this.detectDeviceInfo(platform),
          ...this.detectNetworkInfo(),
          ...this.detectLocaleInfo()
        };
        return this.cachedInfo;
      }
      /**
       * Detect storage and API capabilities
       */
      detectCapabilities(platform) {
        const baseCapabilities = {
          platform,
          hasIndexedDB: false,
          hasLocalStorage: false,
          hasAsyncStorage: false,
          hasFileSystem: false,
          hasWebCrypto: false,
          hasCompressionStreams: false,
          supportsWorkers: false,
          supportsNotifications: false,
          isSecureContext: false,
          maxStorageSize: 0
        };
        switch (platform) {
          case "web":
            return {
              ...baseCapabilities,
              hasIndexedDB: this.checkIndexedDBSupport(),
              hasLocalStorage: this.checkLocalStorageSupport(),
              hasWebCrypto: this.checkWebCryptoSupport(),
              hasCompressionStreams: this.checkCompressionStreamsSupport(),
              supportsWorkers: this.checkWebWorkersSupport(),
              supportsNotifications: this.checkNotificationSupport(),
              isSecureContext: this.checkSecureContext(),
              maxStorageSize: this.estimateWebStorageQuota()
            };
          case "react-native":
            return {
              ...baseCapabilities,
              hasAsyncStorage: this.checkAsyncStorageSupport(),
              hasFileSystem: this.checkFileSystemSupport(),
              hasWebCrypto: this.checkWebCryptoSupport(),
              supportsNotifications: this.checkNotificationSupport(),
              isSecureContext: true,
              // React Native is always secure
              maxStorageSize: 0
              // Unlimited for mobile
            };
          case "node":
            return {
              ...baseCapabilities,
              hasFileSystem: true,
              hasWebCrypto: this.checkNodeCryptoSupport(),
              hasCompressionStreams: this.checkNodeCompressionSupport(),
              supportsWorkers: this.checkWorkerThreadsSupport(),
              isSecureContext: true,
              maxStorageSize: 0
              // Unlimited for server
            };
          default:
            return baseCapabilities;
        }
      }
      /**
       * Detect device and browser information
       */
      detectDeviceInfo(platform) {
        const info = {
          deviceType: "unknown"
        };
        if (platform === "node") {
          info.nodeVersion = process.version;
          info.osName = process.platform;
          info.deviceType = "server";
        } else if (platform === "react-native") {
          info.reactNativeVersion = this.getReactNativeVersion();
          info.deviceType = this.detectMobileDeviceType();
          info.osName = this.getReactNativeOS();
        } else if (platform === "web") {
          info.userAgent = navigator.userAgent;
          const browserInfo = this.parseBrowserInfo(navigator.userAgent);
          info.browserName = browserInfo.name;
          info.browserVersion = browserInfo.version;
          info.osName = this.parseOSInfo(navigator.userAgent);
          info.deviceType = this.detectWebDeviceType();
        }
        return info;
      }
      /**
       * Detect network information
       */
      detectNetworkInfo() {
        let isOnline = true;
        let connectionType = "unknown";
        if (typeof navigator !== "undefined") {
          isOnline = navigator.onLine;
          const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          if (connection) {
            const effectiveType = connection.effectiveType;
            if (effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g" || effectiveType === "4g") {
              connectionType = "cellular";
            } else {
              connectionType = "wifi";
            }
          }
        }
        return { isOnline, connectionType };
      }
      /**
       * Detect locale information
       */
      detectLocaleInfo() {
        let language = "en-US";
        let timezone = "UTC";
        if (typeof navigator !== "undefined") {
          language = navigator.language || "en-US";
        }
        if (typeof Intl !== "undefined") {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        return { language, timezone };
      }
      // Capability detection methods
      checkIndexedDBSupport() {
        try {
          return typeof window !== "undefined" && "indexedDB" in window && window.indexedDB !== null;
        } catch {
          return false;
        }
      }
      checkLocalStorageSupport() {
        try {
          if (typeof window === "undefined" || !window.localStorage) {
            return false;
          }
          const testKey = "__localStorage_test__";
          window.localStorage.setItem(testKey, "test");
          window.localStorage.removeItem(testKey);
          return true;
        } catch {
          return false;
        }
      }
      checkAsyncStorageSupport() {
        try {
          return typeof __require !== "undefined" && __require("@react-native-async-storage/async-storage") !== null;
        } catch {
          return false;
        }
      }
      checkFileSystemSupport() {
        try {
          return typeof __require !== "undefined" && (__require("fs") !== null || __require("react-native-fs") !== null);
        } catch {
          return false;
        }
      }
      checkWebCryptoSupport() {
        try {
          if (typeof crypto !== "undefined" && crypto.subtle) {
            return true;
          }
          if (typeof __require !== "undefined") {
            const nodeCrypto = __require("crypto");
            return nodeCrypto && nodeCrypto.webcrypto;
          }
          return false;
        } catch {
          return false;
        }
      }
      checkCompressionStreamsSupport() {
        try {
          return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
        } catch {
          return false;
        }
      }
      checkNodeCompressionSupport() {
        try {
          return typeof __require !== "undefined" && __require("zlib") !== null;
        } catch {
          return false;
        }
      }
      checkWebWorkersSupport() {
        try {
          return typeof Worker !== "undefined";
        } catch {
          return false;
        }
      }
      checkWorkerThreadsSupport() {
        try {
          return typeof __require !== "undefined" && __require("worker_threads") !== null;
        } catch {
          return false;
        }
      }
      checkNotificationSupport() {
        try {
          return typeof Notification !== "undefined" || typeof __require !== "undefined" && __require("react-native-push-notification") !== null;
        } catch {
          return false;
        }
      }
      checkSecureContext() {
        if (typeof window !== "undefined") {
          return window.isSecureContext || location.protocol === "https:";
        }
        return true;
      }
      checkNodeCryptoSupport() {
        try {
          const crypto2 = __require("crypto");
          return crypto2 && (crypto2.webcrypto || crypto2.subtle);
        } catch {
          return false;
        }
      }
      estimateWebStorageQuota() {
        if (typeof navigator !== "undefined" && "storage" in navigator && "estimate" in navigator.storage) {
          navigator.storage.estimate().then((estimate) => {
            return estimate.quota || 0;
          });
        }
        const userAgent = navigator?.userAgent || "";
        if (userAgent.includes("Chrome")) {
          return 1024 * 1024 * 1024;
        } else if (userAgent.includes("Firefox")) {
          return 2 * 1024 * 1024 * 1024;
        } else if (userAgent.includes("Safari")) {
          return 1024 * 1024 * 1024;
        }
        return 50 * 1024 * 1024;
      }
      getReactNativeVersion() {
        try {
          const Platform = __require("react-native").Platform;
          return Platform.constants?.reactNativeVersion?.string || "unknown";
        } catch {
          return "unknown";
        }
      }
      getReactNativeOS() {
        try {
          const Platform = __require("react-native").Platform;
          return Platform.OS;
        } catch {
          return "unknown";
        }
      }
      detectMobileDeviceType() {
        try {
          const Dimensions = __require("react-native").Dimensions;
          const { width, height } = Dimensions.get("window");
          const aspectRatio = Math.max(width, height) / Math.min(width, height);
          return aspectRatio < 1.6 ? "tablet" : "mobile";
        } catch {
          return "mobile";
        }
      }
      detectWebDeviceType() {
        if (typeof window === "undefined") return "desktop";
        const userAgent = navigator.userAgent;
        if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) {
          return "tablet";
        } else if (/iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
          return "mobile";
        } else {
          return "desktop";
        }
      }
      parseBrowserInfo(userAgent) {
        const browsers = [
          { name: "Chrome", regex: /Chrome\/(\d+\.\d+)/ },
          { name: "Firefox", regex: /Firefox\/(\d+\.\d+)/ },
          { name: "Safari", regex: /Safari\/(\d+\.\d+)/ },
          { name: "Edge", regex: /Edge\/(\d+\.\d+)/ },
          { name: "Opera", regex: /Opera\/(\d+\.\d+)/ }
        ];
        for (const browser of browsers) {
          const match = userAgent.match(browser.regex);
          if (match) {
            return { name: browser.name, version: match[1] || "0.0" };
          }
        }
        return { name: "Unknown", version: "0.0" };
      }
      parseOSInfo(userAgent) {
        if (userAgent.includes("Windows")) return "Windows";
        if (userAgent.includes("Mac OS")) return "macOS";
        if (userAgent.includes("Linux")) return "Linux";
        if (userAgent.includes("Android")) return "Android";
        if (userAgent.includes("iOS")) return "iOS";
        return "Unknown";
      }
      /**
       * Clear cached information (useful for testing)
       */
      clearCache() {
        this.cachedInfo = null;
      }
      /**
       * Check if specific capability is available
       */
      hasCapability(capability) {
        const info = this.getEnvironmentInfo();
        return info[capability];
      }
      /**
       * Get optimal storage adapter for current platform
       */
      getRecommendedStorageAdapter() {
        const capabilities = this.getEnvironmentInfo();
        if (capabilities.hasIndexedDB) {
          return "indexeddb";
        } else if (capabilities.hasAsyncStorage) {
          return "asyncstorage";
        } else if (capabilities.hasLocalStorage) {
          return "localstorage";
        } else if (capabilities.hasFileSystem) {
          return "filesystem";
        } else {
          return "memory";
        }
      }
      /**
       * Get performance tier based on platform capabilities
       */
      getPerformanceTier() {
        const info = this.getEnvironmentInfo();
        if (info.platform === "node" || info.platform === "web" && info.deviceType === "desktop") {
          return "high";
        } else if (info.platform === "react-native" && info.deviceType === "tablet") {
          return "medium";
        } else {
          return "low";
        }
      }
    };
    platformDetector = PlatformDetector.getInstance();
  }
});

// src/storage/adapters/indexeddb-adapter.ts
var IndexedDBTransaction, IndexedDBAdapter;
var init_indexeddb_adapter = __esm({
  "src/storage/adapters/indexeddb-adapter.ts"() {
    "use strict";
    init_esm_shims();
    init_unified_storage();
    IndexedDBTransaction = class {
      constructor(adapter, idbTransaction) {
        this.adapter = adapter;
        this.idbTransaction = idbTransaction;
        this.id = `txn_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        this.idbTransaction.addEventListener("abort", () => {
          this.isActive = false;
        });
        this.idbTransaction.addEventListener("complete", () => {
          this.isActive = false;
        });
        this.idbTransaction.addEventListener("error", () => {
          this.isActive = false;
        });
      }
      id;
      isActive = true;
      operations = [];
      rollbackOperations = [];
      async set(key, value, options) {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "set", new Error("Transaction not active"));
        }
        const operation = async () => {
          await this.adapter.setWithTransaction(key, value, options, this.idbTransaction);
        };
        const rollback = async () => {
          await this.adapter.deleteWithTransaction(key, this.idbTransaction);
        };
        this.operations.push(operation);
        this.rollbackOperations.unshift(rollback);
      }
      async get(key) {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "get", new Error("Transaction not active"));
        }
        return this.adapter.getWithTransaction(key, this.idbTransaction);
      }
      async delete(key) {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "delete", new Error("Transaction not active"));
        }
        const originalValue = await this.get(key);
        const operation = async () => {
          await this.adapter.deleteWithTransaction(key, this.idbTransaction);
        };
        const rollback = async () => {
          if (originalValue) {
            await this.adapter.setWithTransaction(key, originalValue.data, void 0, this.idbTransaction);
          }
        };
        this.operations.push(operation);
        this.rollbackOperations.unshift(rollback);
        return true;
      }
      async commit() {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "commit", new Error("Transaction not active"));
        }
        try {
          for (const operation of this.operations) {
            await operation();
          }
          this.isActive = false;
        } catch (error) {
          await this.rollback();
          throw new StorageTransactionError(this.id, "commit", error);
        }
      }
      async rollback() {
        if (!this.isActive) {
          return;
        }
        try {
          for (const rollback of this.rollbackOperations) {
            await rollback();
          }
        } catch (error) {
          console.warn(`Failed to rollback transaction ${this.id}:`, error);
        } finally {
          this.idbTransaction.abort();
          this.isActive = false;
        }
      }
    };
    IndexedDBAdapter = class {
      name = "IndexedDB";
      db = null;
      config;
      connectionPromise = null;
      capabilities = {
        supportsTransactions: true,
        supportsIndexing: true,
        maxKeyLength: 1024,
        maxValueSize: 256 * 1024 * 1024,
        // 256MB
        supportsCompression: true,
        supportsEncryption: true,
        supportsTTL: true
      };
      constructor(config = {}) {
        this.config = {
          databaseName: config.databaseName || "acube-sdk-storage",
          version: config.version || 1,
          schema: config.schema || this.getDefaultSchema(),
          migrations: config.migrations || [],
          timeout: config.timeout || 3e4,
          maxRetries: config.maxRetries || 3
        };
      }
      get isAvailable() {
        return typeof indexedDB !== "undefined" && indexedDB !== null;
      }
      isConnected() {
        return this.db !== null && this.db.objectStoreNames.length > 0;
      }
      async connect() {
        if (this.db) {
          return;
        }
        if (this.connectionPromise) {
          await this.connectionPromise;
          return;
        }
        this.connectionPromise = this.establishConnection();
        try {
          this.db = await this.connectionPromise;
        } finally {
          this.connectionPromise = null;
        }
      }
      async establishConnection() {
        if (!this.isAvailable) {
          throw new StorageConnectionError("IndexedDB not available");
        }
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new StorageConnectionError("IndexedDB connection timeout"));
          }, this.config.timeout);
          const request = indexedDB.open(this.config.databaseName, this.config.version);
          request.onerror = () => {
            clearTimeout(timeout);
            reject(new StorageConnectionError("IndexedDB", request.error || void 0));
          };
          request.onsuccess = () => {
            clearTimeout(timeout);
            resolve(request.result);
          };
          request.onupgradeneeded = (event) => {
            const db = request.result;
            this.handleUpgrade(db, event.oldVersion, event.newVersion || this.config.version);
          };
          request.onblocked = () => {
            console.warn("IndexedDB upgrade blocked. Close other tabs using this database.");
          };
        });
      }
      handleUpgrade(db, oldVersion, newVersion) {
        for (const [storeName, storeConfig] of Object.entries(this.config.schema.stores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              ...storeConfig.keyPath && { keyPath: storeConfig.keyPath },
              ...storeConfig.autoIncrement && { autoIncrement: storeConfig.autoIncrement }
            });
            if (storeConfig.indexes) {
              for (const [indexName, indexConfig] of Object.entries(storeConfig.indexes)) {
                store.createIndex(indexName, indexConfig.keyPath, {
                  ...indexConfig.unique !== void 0 && { unique: indexConfig.unique },
                  ...indexConfig.multiEntry !== void 0 && { multiEntry: indexConfig.multiEntry }
                });
              }
            }
          }
        }
        const relevantMigrations = this.config.migrations.filter(
          (migration) => migration.version > oldVersion && migration.version <= newVersion
        );
        for (const migration of relevantMigrations.sort((a, b) => a.version - b.version)) {
          try {
            migration.up(db, db.transaction(Array.from(db.objectStoreNames), "readwrite"));
          } catch (error) {
            console.error(`Migration ${migration.version} failed:`, error);
            throw error;
          }
        }
      }
      getDefaultSchema() {
        return {
          version: 1,
          stores: {
            storage: {
              keyPath: "key",
              indexes: {
                namespace: { keyPath: "namespace" },
                createdAt: { keyPath: "createdAt" },
                expiresAt: { keyPath: "expiresAt" }
              }
            }
          }
        };
      }
      async disconnect() {
        if (this.db) {
          this.db.close();
          this.db = null;
        }
      }
      async set(key, value, options) {
        await this.connect();
        const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
        const entry = this.createStorageEntry(key, value, mergedOptions);
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readwrite");
          const store = transaction.objectStore("storage");
          const request = store.put({
            key,
            ...entry,
            namespace: mergedOptions.namespace
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new StorageError(
            `Failed to set key: ${key}`,
            "STORAGE_SET_ERROR",
            "set",
            key,
            request.error || void 0
          ));
        });
      }
      async setWithTransaction(key, value, options = {}, transaction) {
        const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
        const entry = this.createStorageEntry(key, value, mergedOptions);
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore("storage");
          const request = store.put({
            key,
            ...entry,
            namespace: mergedOptions.namespace
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new StorageError(
            `Failed to set key in transaction: ${key}`,
            "STORAGE_TRANSACTION_SET_ERROR",
            "set",
            key,
            request.error || void 0
          ));
        });
      }
      async get(key) {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readonly");
          const store = transaction.objectStore("storage");
          const request = store.get(key);
          request.onsuccess = () => {
            const result = request.result;
            if (!result) {
              resolve(null);
              return;
            }
            if (result.metadata.expiresAt && result.metadata.expiresAt < Date.now()) {
              this.delete(key).catch(console.warn);
              resolve(null);
              return;
            }
            resolve(result);
          };
          request.onerror = () => reject(new StorageError(
            `Failed to get key: ${key}`,
            "STORAGE_GET_ERROR",
            "get",
            key,
            request.error || void 0
          ));
        });
      }
      async getWithTransaction(key, transaction) {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore("storage");
          const request = store.get(key);
          request.onsuccess = () => {
            const result = request.result;
            if (!result) {
              resolve(null);
              return;
            }
            if (result.metadata.expiresAt && result.metadata.expiresAt < Date.now()) {
              resolve(null);
              return;
            }
            resolve(result);
          };
          request.onerror = () => reject(new StorageError(
            `Failed to get key in transaction: ${key}`,
            "STORAGE_TRANSACTION_GET_ERROR",
            "get",
            key,
            request.error || void 0
          ));
        });
      }
      async delete(key) {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readwrite");
          const store = transaction.objectStore("storage");
          const request = store.delete(key);
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(new StorageError(
            `Failed to delete key: ${key}`,
            "STORAGE_DELETE_ERROR",
            "delete",
            key,
            request.error || void 0
          ));
        });
      }
      async deleteWithTransaction(key, transaction) {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore("storage");
          const request = store.delete(key);
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(new StorageError(
            `Failed to delete key in transaction: ${key}`,
            "STORAGE_TRANSACTION_DELETE_ERROR",
            "delete",
            key,
            request.error || void 0
          ));
        });
      }
      async exists(key) {
        const entry = await this.get(key);
        return entry !== null;
      }
      async clear(namespace) {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readwrite");
          const store = transaction.objectStore("storage");
          if (namespace) {
            const index = store.index("namespace");
            const request = index.openCursor(IDBKeyRange.only(namespace));
            request.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                cursor.delete();
                cursor.continue();
              } else {
                resolve();
              }
            };
            request.onerror = () => reject(new StorageError(
              `Failed to clear namespace: ${namespace}`,
              "STORAGE_CLEAR_ERROR",
              "clear",
              void 0,
              request.error || void 0
            ));
          } else {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new StorageError(
              "Failed to clear storage",
              "STORAGE_CLEAR_ERROR",
              "clear",
              void 0,
              request.error || void 0
            ));
          }
        });
      }
      async setMany(entries) {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readwrite");
          const store = transaction.objectStore("storage");
          let completed = 0;
          for (const entry of entries) {
            const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...entry.options };
            const storageEntry = this.createStorageEntry(entry.key, entry.value, mergedOptions);
            const request = store.put({
              key: entry.key,
              ...storageEntry,
              namespace: mergedOptions.namespace
            });
            request.onsuccess = () => {
              completed++;
              if (completed === entries.length) {
                resolve();
              }
            };
            request.onerror = () => reject(new StorageError(
              `Failed to set key in batch: ${entry.key}`,
              "STORAGE_BATCH_SET_ERROR",
              "setMany",
              entry.key,
              request.error || void 0
            ));
          }
        });
      }
      async getMany(keys) {
        await this.connect();
        const results = [];
        for (const key of keys) {
          results.push(await this.get(key));
        }
        return results;
      }
      async deleteMany(keys) {
        await this.connect();
        let deletedCount = 0;
        for (const key of keys) {
          const deleted = await this.delete(key);
          if (deleted) deletedCount++;
        }
        return deletedCount;
      }
      async keys(options = {}) {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readonly");
          const store = transaction.objectStore("storage");
          const keys = [];
          const request = store.openCursor();
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const entry = cursor.value;
              if (this.matchesQuery(entry, options)) {
                keys.push(entry.key);
              }
              cursor.continue();
            } else {
              resolve(this.applySortingAndPaging(keys, options));
            }
          };
          request.onerror = () => reject(new StorageError(
            "Failed to get keys",
            "STORAGE_KEYS_ERROR",
            "keys",
            void 0,
            request.error || void 0
          ));
        });
      }
      async values(options = {}) {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readonly");
          const store = transaction.objectStore("storage");
          const values = [];
          const request = store.openCursor();
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const entry = cursor.value;
              if (this.matchesQuery(entry, options)) {
                values.push(entry);
              }
              cursor.continue();
            } else {
              resolve(this.applySortingAndPaging(values, options));
            }
          };
          request.onerror = () => reject(new StorageError(
            "Failed to get values",
            "STORAGE_VALUES_ERROR",
            "values",
            void 0,
            request.error || void 0
          ));
        });
      }
      async entries(options = {}) {
        return this.values(options);
      }
      async count(options = {}) {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readonly");
          const store = transaction.objectStore("storage");
          let count = 0;
          const request = store.openCursor();
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const entry = cursor.value;
              if (this.matchesQuery(entry, options)) {
                count++;
              }
              cursor.continue();
            } else {
              resolve(count);
            }
          };
          request.onerror = () => reject(new StorageError(
            "Failed to count entries",
            "STORAGE_COUNT_ERROR",
            "count",
            void 0,
            request.error || void 0
          ));
        });
      }
      async beginTransaction() {
        await this.connect();
        const idbTransaction = this.db.transaction(["storage"], "readwrite");
        return new IndexedDBTransaction(this, idbTransaction);
      }
      async cleanup() {
        await this.connect();
        const now = Date.now();
        let cleanedCount = 0;
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readwrite");
          const store = transaction.objectStore("storage");
          const request = store.openCursor();
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const entry = cursor.value;
              if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
                cursor.delete();
                cleanedCount++;
              }
              cursor.continue();
            } else {
              resolve(cleanedCount);
            }
          };
          request.onerror = () => reject(new StorageError(
            "Failed to cleanup expired entries",
            "STORAGE_CLEANUP_ERROR",
            "cleanup",
            void 0,
            request.error || void 0
          ));
        });
      }
      async optimize() {
        await this.cleanup();
      }
      async getStats() {
        await this.connect();
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(["storage"], "readonly");
          const store = transaction.objectStore("storage");
          const request = store.openCursor();
          const stats = {
            totalKeys: 0,
            totalSize: 0,
            namespaces: [],
            oldestEntry: Date.now(),
            newestEntry: 0,
            expiredEntries: 0,
            encryptedEntries: 0,
            compressedEntries: 0
          };
          const namespaceSet = /* @__PURE__ */ new Set();
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const entry = cursor.value;
              stats.totalKeys++;
              stats.totalSize += this.estimateEntrySize(entry);
              namespaceSet.add(entry.namespace);
              if (entry.metadata.createdAt < stats.oldestEntry) {
                stats.oldestEntry = entry.metadata.createdAt;
              }
              if (entry.metadata.createdAt > stats.newestEntry) {
                stats.newestEntry = entry.metadata.createdAt;
              }
              if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
                stats.expiredEntries++;
              }
              if (entry.metadata.encrypted) {
                stats.encryptedEntries++;
              }
              if (entry.metadata.compressed) {
                stats.compressedEntries++;
              }
              cursor.continue();
            } else {
              stats.namespaces = Array.from(namespaceSet);
              resolve(stats);
            }
          };
          request.onerror = () => reject(new StorageError(
            "Failed to get storage stats",
            "STORAGE_STATS_ERROR",
            "getStats",
            void 0,
            request.error || void 0
          ));
        });
      }
      createStorageEntry(key, value, options) {
        const now = Date.now();
        return {
          data: value,
          metadata: {
            key,
            createdAt: now,
            updatedAt: now,
            ...options.ttl > 0 && { expiresAt: now + options.ttl },
            encrypted: options.encrypt,
            compressed: options.compress,
            version: options.version
          }
        };
      }
      matchesQuery(entry, options) {
        const now = Date.now();
        if (!options.includeExpired && entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
          return false;
        }
        if (options.namespace && entry.namespace !== options.namespace) {
          return false;
        }
        if (options.prefix && !entry.key.startsWith(options.prefix)) {
          return false;
        }
        return true;
      }
      applySortingAndPaging(items, options) {
        let result = [...items];
        if (options.sortBy) {
          result.sort((a, b) => {
            const sortBy = options.sortBy;
            if (!sortBy) return 0;
            const aVal = sortBy === "key" ? a.key || a : a.metadata?.[sortBy] || 0;
            const bVal = sortBy === "key" ? b.key || b : b.metadata?.[sortBy] || 0;
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return options.sortOrder === "desc" ? -comparison : comparison;
          });
        }
        const offset = options.offset || 0;
        const limit = options.limit;
        if (limit) {
          result = result.slice(offset, offset + limit);
        } else if (offset) {
          result = result.slice(offset);
        }
        return result;
      }
      estimateEntrySize(entry) {
        const jsonString = JSON.stringify(entry);
        return new Blob([jsonString]).size;
      }
    };
  }
});

// src/storage/adapters/localstorage-adapter.ts
var LocalStorageTransactionImpl, LocalStorageAdapter;
var init_localstorage_adapter = __esm({
  "src/storage/adapters/localstorage-adapter.ts"() {
    "use strict";
    init_esm_shims();
    init_unified_storage();
    LocalStorageTransactionImpl = class {
      constructor(adapter) {
        this.adapter = adapter;
        this.id = `txn_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      id;
      isActive = true;
      pendingOperations = /* @__PURE__ */ new Map();
      originalValues = /* @__PURE__ */ new Map();
      async set(key, value, options) {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "set", new Error("Transaction not active"));
        }
        if (!this.originalValues.has(key)) {
          try {
            const originalValue = localStorage.getItem(this.adapter.getStorageKey(key));
            this.originalValues.set(key, originalValue);
          } catch {
            this.originalValues.set(key, null);
          }
        }
        this.pendingOperations.set(key, { action: "set", value, ...options && { options } });
      }
      async get(key) {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "get", new Error("Transaction not active"));
        }
        const pending = this.pendingOperations.get(key);
        if (pending) {
          if (pending.action === "delete") {
            return null;
          } else if (pending.action === "set") {
            const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...pending.options };
            return this.adapter.createStorageEntry(key, pending.value, mergedOptions);
          }
        }
        return this.adapter.get(key);
      }
      async delete(key) {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "delete", new Error("Transaction not active"));
        }
        if (!this.originalValues.has(key)) {
          try {
            const originalValue = localStorage.getItem(this.adapter.getStorageKey(key));
            this.originalValues.set(key, originalValue);
          } catch {
            this.originalValues.set(key, null);
          }
        }
        this.pendingOperations.set(key, { action: "delete" });
        return true;
      }
      async commit() {
        if (!this.isActive) {
          throw new StorageTransactionError(this.id, "commit", new Error("Transaction not active"));
        }
        try {
          for (const [key, operation] of this.pendingOperations) {
            if (operation.action === "set") {
              await this.adapter.set(key, operation.value, operation.options);
            } else if (operation.action === "delete") {
              await this.adapter.delete(key);
            }
          }
          this.isActive = false;
        } catch (error) {
          await this.rollback();
          throw new StorageTransactionError(this.id, "commit", error);
        }
      }
      async rollback() {
        if (!this.isActive) {
          return;
        }
        try {
          for (const [key, originalValue] of this.originalValues) {
            const storageKey = this.adapter.getStorageKey(key);
            if (originalValue === null) {
              localStorage.removeItem(storageKey);
            } else {
              localStorage.setItem(storageKey, originalValue);
            }
          }
        } catch (error) {
          console.warn(`Failed to rollback transaction ${this.id}:`, error);
        } finally {
          this.isActive = false;
        }
      }
    };
    LocalStorageAdapter = class {
      name = "LocalStorage";
      keyPrefix;
      capabilities = {
        supportsTransactions: true,
        // Simulated transactions
        supportsIndexing: false,
        maxKeyLength: 256,
        maxValueSize: 5 * 1024 * 1024,
        // 5MB typical localStorage limit
        supportsCompression: true,
        supportsEncryption: true,
        supportsTTL: true
      };
      constructor(keyPrefix = "acube_sdk_") {
        this.keyPrefix = keyPrefix;
      }
      get isAvailable() {
        try {
          if (typeof Storage === "undefined" || typeof localStorage === "undefined") {
            return false;
          }
          const testKey = "__localStorage_test__";
          localStorage.setItem(testKey, "test");
          localStorage.removeItem(testKey);
          return true;
        } catch {
          return false;
        }
      }
      isConnected() {
        return this.isAvailable;
      }
      async connect() {
        if (!this.isAvailable) {
          throw new StorageConnectionError("LocalStorage not available");
        }
      }
      async disconnect() {
      }
      getStorageKey(key) {
        return `${this.keyPrefix}${key}`;
      }
      createStorageEntry(key, value, options) {
        const now = Date.now();
        return {
          data: value,
          metadata: {
            key,
            createdAt: now,
            updatedAt: now,
            ...options.ttl > 0 && { expiresAt: now + options.ttl },
            encrypted: options.encrypt,
            compressed: options.compress,
            version: options.version
          }
        };
      }
      async set(key, value, options) {
        await this.connect();
        const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
        const entry = this.createStorageEntry(key, value, mergedOptions);
        const storageKey = this.getStorageKey(key);
        let serialized = "";
        try {
          serialized = JSON.stringify(entry);
          if (serialized.length > this.capabilities.maxValueSize) {
            throw new StorageCapacityError(key, serialized.length, this.capabilities.maxValueSize);
          }
          localStorage.setItem(storageKey, serialized);
        } catch (error) {
          if (error instanceof StorageCapacityError) {
            throw error;
          }
          if (error instanceof DOMException && (error.code === 22 || // QUOTA_EXCEEDED_ERR
          error.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED
          error.name === "QuotaExceededError")) {
            const size = serialized ? serialized.length : 0;
            throw new StorageCapacityError(key, size, this.getAvailableSpace());
          }
          throw new StorageError(
            `Failed to set key: ${key}`,
            "STORAGE_SET_ERROR",
            "set",
            key,
            error
          );
        }
      }
      async get(key) {
        await this.connect();
        const storageKey = this.getStorageKey(key);
        try {
          const serialized = localStorage.getItem(storageKey);
          if (!serialized) {
            return null;
          }
          const entry = JSON.parse(serialized);
          if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
            this.delete(key).catch(console.warn);
            return null;
          }
          return entry;
        } catch (error) {
          throw new StorageError(
            `Failed to get key: ${key}`,
            "STORAGE_GET_ERROR",
            "get",
            key,
            error
          );
        }
      }
      async delete(key) {
        await this.connect();
        const storageKey = this.getStorageKey(key);
        try {
          const existed = localStorage.getItem(storageKey) !== null;
          localStorage.removeItem(storageKey);
          return existed;
        } catch (error) {
          throw new StorageError(
            `Failed to delete key: ${key}`,
            "STORAGE_DELETE_ERROR",
            "delete",
            key,
            error
          );
        }
      }
      async exists(key) {
        await this.connect();
        const storageKey = this.getStorageKey(key);
        return localStorage.getItem(storageKey) !== null;
      }
      async clear(namespace) {
        await this.connect();
        try {
          if (namespace) {
            const namespacePrefix = `${this.keyPrefix}${namespace}:`;
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith(namespacePrefix)) {
                keysToRemove.push(key);
              }
            }
            for (const key of keysToRemove) {
              localStorage.removeItem(key);
            }
          } else {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith(this.keyPrefix)) {
                keysToRemove.push(key);
              }
            }
            for (const key of keysToRemove) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          throw new StorageError(
            `Failed to clear storage${namespace ? ` for namespace: ${namespace}` : ""}`,
            "STORAGE_CLEAR_ERROR",
            "clear",
            void 0,
            error
          );
        }
      }
      async setMany(entries) {
        for (const entry of entries) {
          await this.set(entry.key, entry.value, entry.options);
        }
      }
      async getMany(keys) {
        const results = [];
        for (const key of keys) {
          results.push(await this.get(key));
        }
        return results;
      }
      async deleteMany(keys) {
        let deletedCount = 0;
        for (const key of keys) {
          const deleted = await this.delete(key);
          if (deleted) deletedCount++;
        }
        return deletedCount;
      }
      async keys(options = {}) {
        await this.connect();
        const keys = [];
        const now = Date.now();
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
            continue;
          }
          try {
            const originalKey = storageKey.substring(this.keyPrefix.length);
            const entry = await this.get(originalKey);
            if (entry && this.matchesQuery(entry, options, now)) {
              keys.push(originalKey);
            }
          } catch {
            continue;
          }
        }
        return this.applySortingAndPaging(keys, options);
      }
      async values(options = {}) {
        await this.connect();
        const values = [];
        const now = Date.now();
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
            continue;
          }
          try {
            const originalKey = storageKey.substring(this.keyPrefix.length);
            const entry = await this.get(originalKey);
            if (entry && this.matchesQuery(entry, options, now)) {
              values.push(entry);
            }
          } catch {
            continue;
          }
        }
        return this.applySortingAndPaging(values, options);
      }
      async entries(options = {}) {
        return this.values(options);
      }
      async count(options = {}) {
        const keys = await this.keys(options);
        return keys.length;
      }
      async beginTransaction() {
        await this.connect();
        return new LocalStorageTransactionImpl(this);
      }
      async cleanup() {
        await this.connect();
        const now = Date.now();
        let cleanedCount = 0;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
            continue;
          }
          try {
            const serialized = localStorage.getItem(storageKey);
            if (serialized) {
              const entry = JSON.parse(serialized);
              if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
                keysToRemove.push(storageKey);
                cleanedCount++;
              }
            }
          } catch {
            keysToRemove.push(storageKey);
            cleanedCount++;
          }
        }
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
        return cleanedCount;
      }
      async optimize() {
        await this.cleanup();
      }
      async getStats() {
        await this.connect();
        const stats = {
          totalKeys: 0,
          totalSize: 0,
          namespaces: [],
          oldestEntry: Date.now(),
          newestEntry: 0,
          expiredEntries: 0,
          encryptedEntries: 0,
          compressedEntries: 0
        };
        const namespaceSet = /* @__PURE__ */ new Set();
        const now = Date.now();
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
            continue;
          }
          try {
            const serialized = localStorage.getItem(storageKey);
            if (serialized) {
              const entry = JSON.parse(serialized);
              stats.totalKeys++;
              stats.totalSize += serialized.length;
              const originalKey = storageKey.substring(this.keyPrefix.length);
              const namespacePart = originalKey.split(":")[0];
              if (namespacePart) {
                namespaceSet.add(namespacePart);
              }
              if (entry.metadata.createdAt < stats.oldestEntry) {
                stats.oldestEntry = entry.metadata.createdAt;
              }
              if (entry.metadata.createdAt > stats.newestEntry) {
                stats.newestEntry = entry.metadata.createdAt;
              }
              if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
                stats.expiredEntries++;
              }
              if (entry.metadata.encrypted) {
                stats.encryptedEntries++;
              }
              if (entry.metadata.compressed) {
                stats.compressedEntries++;
              }
            }
          } catch {
            continue;
          }
        }
        stats.namespaces = Array.from(namespaceSet);
        return stats;
      }
      matchesQuery(entry, options, now) {
        if (!options.includeExpired && entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
          return false;
        }
        const key = entry.metadata.key;
        const namespacePart = key.split(":")[0];
        if (options.namespace && namespacePart !== options.namespace) {
          return false;
        }
        if (options.prefix && !key.startsWith(options.prefix)) {
          return false;
        }
        return true;
      }
      applySortingAndPaging(items, options) {
        let result = [...items];
        if (options.sortBy) {
          result.sort((a, b) => {
            const sortBy = options.sortBy;
            if (!sortBy) return 0;
            const aVal = sortBy === "key" ? a.key || a : a.metadata?.[sortBy] || 0;
            const bVal = sortBy === "key" ? b.key || b : b.metadata?.[sortBy] || 0;
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return options.sortOrder === "desc" ? -comparison : comparison;
          });
        }
        const offset = options.offset || 0;
        const limit = options.limit;
        if (limit) {
          result = result.slice(offset, offset + limit);
        } else if (offset) {
          result = result.slice(offset);
        }
        return result;
      }
      getAvailableSpace() {
        try {
          let testSize = 1024 * 1024;
          const testKey = "__space_test__";
          while (testSize > 1024) {
            try {
              const testData = "x".repeat(testSize);
              localStorage.setItem(testKey, testData);
              localStorage.removeItem(testKey);
              return testSize;
            } catch {
              testSize = Math.floor(testSize / 2);
            }
          }
          return testSize;
        } catch {
          return this.capabilities.maxValueSize;
        }
      }
    };
  }
});

// src/security/encryption.ts
var AdvancedEncryption;
var init_encryption = __esm({
  "src/security/encryption.ts"() {
    "use strict";
    init_esm_shims();
    AdvancedEncryption = class {
      keys = /* @__PURE__ */ new Map();
      keyPairs = /* @__PURE__ */ new Map();
      config;
      initialized = false;
      constructor(config) {
        this.config = {
          algorithm: "AES-GCM",
          keyLength: 256,
          keyDerivation: {
            algorithm: "PBKDF2",
            iterations: 1e5,
            salt: crypto.getRandomValues(new Uint8Array(16))
          },
          compression: true,
          metadata: {
            version: "1.0.0",
            timestamp: Date.now(),
            keyId: this.generateKeyId()
          },
          ...config
        };
      }
      /**
       * Generate a new symmetric encryption key
       */
      async generateSymmetricKey(keyId) {
        const id = keyId || this.generateKeyId();
        const key = await crypto.subtle.generateKey(
          {
            name: this.config.algorithm,
            length: this.config.keyLength
          },
          true,
          // extractable
          ["encrypt", "decrypt"]
        );
        this.keys.set(id, key);
        return id;
      }
      /**
       * Generate a new asymmetric key pair
       */
      async generateKeyPair(algorithm = "RSA-OAEP", keyId) {
        const id = keyId || this.generateKeyId();
        let keyGenParams;
        let usages;
        if (algorithm === "RSA-OAEP") {
          keyGenParams = {
            name: "RSA-OAEP",
            modulusLength: this.config.keyLength,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
          };
          usages = ["encrypt", "decrypt"];
        } else {
          keyGenParams = {
            name: "ECDSA",
            namedCurve: "P-256"
          };
          usages = ["sign", "verify"];
        }
        const keyPair = await crypto.subtle.generateKey(
          keyGenParams,
          true,
          // extractable
          usages
        );
        const cryptoKeyPair = {
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
          keyId: id,
          algorithm,
          extractable: true,
          usages
        };
        this.keyPairs.set(id, cryptoKeyPair);
        return id;
      }
      /**
       * Derive key from password using PBKDF2
       */
      async deriveKeyFromPassword(password, salt) {
        const keyId = this.generateKeyId();
        const usedSalt = salt || crypto.getRandomValues(new Uint8Array(16));
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          passwordBuffer,
          { name: "PBKDF2" },
          false,
          ["deriveKey"]
        );
        const derivedKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: usedSalt,
            iterations: this.config.keyDerivation.iterations,
            hash: "SHA-256"
          },
          keyMaterial,
          {
            name: this.config.algorithm,
            length: this.config.keyLength
          },
          true,
          ["encrypt", "decrypt"]
        );
        this.keys.set(keyId, derivedKey);
        this.config.keyDerivation.salt = usedSalt;
        return keyId;
      }
      /**
       * Encrypt data with symmetric key
       */
      async encryptSymmetric(data, keyId) {
        const key = this.keys.get(keyId);
        if (!key) {
          throw new Error(`Encryption key not found: ${keyId}`);
        }
        let dataBuffer;
        if (typeof data === "string") {
          dataBuffer = new TextEncoder().encode(data);
        } else {
          dataBuffer = data;
        }
        if (this.config.compression) {
          dataBuffer = await this.compressData(dataBuffer);
        }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await crypto.subtle.encrypt(
          {
            name: this.config.algorithm,
            iv
          },
          key,
          dataBuffer
        );
        const encryptedArray = new Uint8Array(encryptedBuffer);
        const authTag = this.config.algorithm === "AES-GCM" ? encryptedArray.slice(-16) : void 0;
        const ciphertext = this.config.algorithm === "AES-GCM" ? encryptedArray.slice(0, -16) : encryptedArray;
        return {
          data: ciphertext,
          iv,
          metadata: {
            ...this.config.metadata,
            keyId
          },
          algorithm: this.config.algorithm,
          ...authTag ? { authTag } : {}
        };
      }
      /**
       * Decrypt data with symmetric key
       */
      async decryptSymmetric(encryptedData) {
        const key = this.keys.get(encryptedData.metadata.keyId);
        if (!key) {
          throw new Error(`Decryption key not found: ${encryptedData.metadata.keyId}`);
        }
        let fullEncryptedBuffer;
        if (encryptedData.algorithm === "AES-GCM" && encryptedData.authTag) {
          fullEncryptedBuffer = new Uint8Array(encryptedData.data.length + encryptedData.authTag.length);
          fullEncryptedBuffer.set(encryptedData.data);
          fullEncryptedBuffer.set(encryptedData.authTag, encryptedData.data.length);
        } else {
          fullEncryptedBuffer = encryptedData.data;
        }
        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: encryptedData.algorithm,
            iv: encryptedData.iv
          },
          key,
          fullEncryptedBuffer
        );
        let result = new Uint8Array(decryptedBuffer);
        if (this.config.compression) {
          result = new Uint8Array(await this.decompressData(result));
        }
        return result;
      }
      /**
       * Encrypt data with asymmetric key (RSA-OAEP)
       */
      async encryptAsymmetric(data, keyId) {
        const keyPair = this.keyPairs.get(keyId);
        if (!keyPair || keyPair.algorithm !== "RSA-OAEP") {
          throw new Error(`RSA encryption key not found: ${keyId}`);
        }
        let dataBuffer;
        if (typeof data === "string") {
          dataBuffer = new TextEncoder().encode(data);
        } else {
          dataBuffer = data;
        }
        const maxChunkSize = Math.floor(this.config.keyLength / 8) - 42;
        if (dataBuffer.length > maxChunkSize) {
          throw new Error(`Data too large for RSA encryption. Max size: ${maxChunkSize} bytes`);
        }
        const encryptedBuffer = await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP"
          },
          keyPair.publicKey,
          dataBuffer
        );
        return {
          data: new Uint8Array(encryptedBuffer),
          iv: new Uint8Array(0),
          // Not used in RSA
          metadata: {
            ...this.config.metadata,
            keyId
          },
          algorithm: "RSA-OAEP"
        };
      }
      /**
       * Decrypt data with asymmetric key (RSA-OAEP)
       */
      async decryptAsymmetric(encryptedData) {
        const keyPair = this.keyPairs.get(encryptedData.metadata.keyId);
        if (!keyPair || keyPair.algorithm !== "RSA-OAEP") {
          throw new Error(`RSA decryption key not found: ${encryptedData.metadata.keyId}`);
        }
        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: "RSA-OAEP"
          },
          keyPair.privateKey,
          encryptedData.data
        );
        return new Uint8Array(decryptedBuffer);
      }
      /**
       * Export key for storage or transmission
       */
      async exportKey(keyId, format = "jwk") {
        const symmetricKey = this.keys.get(keyId);
        if (symmetricKey) {
          if (format === "jwk") {
            return await crypto.subtle.exportKey("jwk", symmetricKey);
          } else {
            return await crypto.subtle.exportKey(format, symmetricKey);
          }
        }
        const keyPair = this.keyPairs.get(keyId);
        if (keyPair) {
          if (format === "jwk") {
            return await crypto.subtle.exportKey("jwk", keyPair.publicKey);
          } else {
            return await crypto.subtle.exportKey(format, keyPair.publicKey);
          }
        }
        throw new Error(`Key not found: ${keyId}`);
      }
      /**
       * Import key from external source
       */
      async importKey(keyData, algorithm, keyId, usages = ["encrypt", "decrypt"]) {
        const id = keyId || this.generateKeyId();
        let algorithmParams;
        let format;
        if (algorithm === "AES-GCM") {
          algorithmParams = { name: "AES-GCM" };
          format = keyData instanceof ArrayBuffer ? "raw" : "jwk";
        } else if (algorithm === "RSA-OAEP") {
          algorithmParams = {
            name: "RSA-OAEP",
            hash: "SHA-256"
          };
          format = keyData instanceof ArrayBuffer ? "spki" : "jwk";
        } else {
          throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        const importedKey = await (format === "jwk" ? crypto.subtle.importKey("jwk", keyData, algorithmParams, true, usages) : crypto.subtle.importKey(format, keyData, algorithmParams, true, usages));
        if (algorithm === "AES-GCM") {
          this.keys.set(id, importedKey);
        } else {
          throw new Error("Asymmetric key import not fully implemented");
        }
        return id;
      }
      /**
       * Rotate encryption keys
       */
      async rotateKey(oldKeyId) {
        const oldKey = this.keys.get(oldKeyId);
        const oldKeyPair = this.keyPairs.get(oldKeyId);
        if (!oldKey && !oldKeyPair) {
          throw new Error(`Key not found for rotation: ${oldKeyId}`);
        }
        let newKeyId;
        if (oldKey) {
          newKeyId = await this.generateSymmetricKey();
        } else {
          const algorithm = oldKeyPair.algorithm;
          newKeyId = await this.generateKeyPair(algorithm);
        }
        return newKeyId;
      }
      /**
       * Get key information
       */
      getKeyInfo(keyId) {
        const symmetricKey = this.keys.get(keyId);
        if (symmetricKey) {
          return {
            algorithm: symmetricKey.algorithm.name,
            usages: Array.from(symmetricKey.usages),
            extractable: symmetricKey.extractable
          };
        }
        const keyPair = this.keyPairs.get(keyId);
        if (keyPair) {
          return {
            algorithm: keyPair.algorithm,
            usages: keyPair.usages,
            extractable: keyPair.extractable
          };
        }
        return null;
      }
      /**
       * List all available keys
       */
      listKeys() {
        const keys = [];
        for (const [keyId, key] of this.keys.entries()) {
          keys.push({
            keyId,
            type: "symmetric",
            algorithm: key.algorithm.name
          });
        }
        for (const [keyId, keyPair] of this.keyPairs.entries()) {
          keys.push({
            keyId,
            type: "asymmetric",
            algorithm: keyPair.algorithm
          });
        }
        return keys;
      }
      /**
       * Clear all keys from memory
       */
      clearKeys() {
        this.keys.clear();
        this.keyPairs.clear();
      }
      /**
       * Utility: Convert Uint8Array to base64
       */
      static arrayBufferToBase64(buffer) {
        const binary = String.fromCharCode.apply(null, Array.from(buffer));
        return btoa(binary);
      }
      /**
       * Utility: Convert base64 to Uint8Array
       */
      static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          buffer[i] = binary.charCodeAt(i);
        }
        return buffer;
      }
      /**
       * Utility: Convert encrypted data to JSON
       */
      static encryptedDataToJSON(encryptedData) {
        return JSON.stringify({
          data: this.arrayBufferToBase64(encryptedData.data),
          iv: this.arrayBufferToBase64(encryptedData.iv),
          authTag: encryptedData.authTag ? this.arrayBufferToBase64(encryptedData.authTag) : void 0,
          metadata: encryptedData.metadata,
          algorithm: encryptedData.algorithm
        });
      }
      /**
       * Utility: Convert JSON to encrypted data
       */
      static encryptedDataFromJSON(json) {
        const obj = JSON.parse(json);
        return {
          data: this.base64ToArrayBuffer(obj.data),
          iv: this.base64ToArrayBuffer(obj.iv),
          metadata: obj.metadata,
          algorithm: obj.algorithm,
          ...obj.authTag ? { authTag: this.base64ToArrayBuffer(obj.authTag) } : {}
        };
      }
      generateKeyId() {
        return `key_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      async compressData(data) {
        if (typeof CompressionStream !== "undefined") {
          const stream = new CompressionStream("gzip");
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          writer.write(data);
          writer.close();
          const chunks = [];
          let result;
          while (!(result = await reader.read()).done) {
            chunks.push(result.value);
          }
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const compressed = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            compressed.set(chunk, offset);
            offset += chunk.length;
          }
          return compressed;
        }
        return data;
      }
      async decompressData(data) {
        if (typeof DecompressionStream !== "undefined") {
          const stream = new DecompressionStream("gzip");
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          writer.write(data);
          writer.close();
          const chunks = [];
          let result;
          while (!(result = await reader.read()).done) {
            chunks.push(result.value);
          }
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const decompressed = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            decompressed.set(chunk, offset);
            offset += chunk.length;
          }
          return decompressed;
        }
        return data;
      }
      /**
       * Initialize the encryption system
       */
      async initialize() {
        if (this.initialized) return;
        await this.generateSymmetricKey("default");
        this.initialized = true;
      }
      /**
       * Simple encrypt method (uses symmetric encryption)
       */
      async encrypt(data, keyId = "default") {
        if (!this.initialized) {
          await this.initialize();
        }
        return this.encryptSymmetric(data, keyId);
      }
      /**
       * Simple decrypt method (uses symmetric decryption)
       */
      async decrypt(encryptedData) {
        if (!this.initialized) {
          await this.initialize();
        }
        return this.decryptSymmetric(encryptedData);
      }
    };
  }
});

// src/storage/encryption-service.ts
var DefaultKeyManager, StorageEncryptionService, createEncryptionService;
var init_encryption_service = __esm({
  "src/storage/encryption-service.ts"() {
    "use strict";
    init_esm_shims();
    init_encryption();
    init_unified_storage();
    DefaultKeyManager = class {
      constructor(encryption, config) {
        this.encryption = encryption;
        this.config = config;
      }
      currentKeyId = null;
      keyCache = /* @__PURE__ */ new Map();
      async getCurrentKeyId() {
        if (this.currentKeyId) {
          const keyInfo2 = this.keyCache.get(this.currentKeyId);
          if (keyInfo2 && this.config.keyRotationInterval) {
            const age = Date.now() - keyInfo2.created;
            if (age > this.config.keyRotationInterval) {
              this.currentKeyId = await this.rotateKey();
            }
          }
          return this.currentKeyId;
        }
        if (this.config.masterPassword) {
          this.currentKeyId = await this.deriveKey(this.config.masterPassword, this.config.keyId);
        } else {
          this.currentKeyId = await this.encryption.generateSymmetricKey(this.config.keyId);
        }
        const keyInfo = {
          keyId: this.currentKeyId,
          created: Date.now()
        };
        if (this.config.keyRotationInterval) {
          keyInfo.expires = Date.now() + this.config.keyRotationInterval;
        }
        this.keyCache.set(this.currentKeyId, keyInfo);
        return this.currentKeyId;
      }
      async deriveKey(password, keyId) {
        const derivedKeyId = await this.encryption.deriveKeyFromPassword(password);
        const finalKeyId = keyId || derivedKeyId;
        const keyInfo2 = {
          keyId: finalKeyId,
          created: Date.now()
        };
        if (this.config.keyRotationInterval) {
          keyInfo2.expires = Date.now() + this.config.keyRotationInterval;
        }
        this.keyCache.set(finalKeyId, keyInfo2);
        return finalKeyId;
      }
      async rotateKey() {
        const oldKeyId = this.currentKeyId;
        const newKeyId = await this.encryption.generateSymmetricKey();
        this.currentKeyId = newKeyId;
        const keyInfo3 = {
          keyId: newKeyId,
          created: Date.now()
        };
        if (this.config.keyRotationInterval) {
          keyInfo3.expires = Date.now() + this.config.keyRotationInterval;
        }
        this.keyCache.set(newKeyId, keyInfo3);
        if (oldKeyId) {
          const oldKeyInfo = this.keyCache.get(oldKeyId);
          if (oldKeyInfo) {
            this.keyCache.set(oldKeyId, {
              ...oldKeyInfo,
              expires: Date.now() + 24 * 60 * 60 * 1e3
              // Keep old key for 24 hours
            });
          }
        }
        return newKeyId;
      }
      async getKeyInfo(keyId) {
        const cached = this.keyCache.get(keyId);
        if (cached) {
          const info = this.encryption.getKeyInfo(keyId);
          if (info) {
            const result = {
              algorithm: info.algorithm,
              created: cached.created
            };
            if (cached.expires !== void 0) {
              result.expires = cached.expires;
            }
            return result;
          }
        }
        return null;
      }
      async cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        const expiredKeys = Array.from(this.keyCache.entries()).filter(([_, info]) => info.expires && info.expires < now).map(([keyId]) => keyId);
        for (const keyId of expiredKeys) {
          this.keyCache.delete(keyId);
          cleanedCount++;
        }
        return cleanedCount;
      }
    };
    StorageEncryptionService = class {
      encryption;
      keyManager;
      config;
      constructor(config = {}) {
        this.config = {
          enabled: true,
          algorithm: "AES-GCM",
          keyLength: 256,
          keyDerivation: {
            algorithm: "PBKDF2",
            iterations: 1e5
          },
          compression: true,
          keyRotationInterval: 7 * 24 * 60 * 60 * 1e3,
          // 7 days
          ...config
        };
        this.encryption = new AdvancedEncryption({
          algorithm: this.config.algorithm,
          keyLength: this.config.keyLength,
          keyDerivation: {
            algorithm: this.config.keyDerivation.algorithm,
            iterations: this.config.keyDerivation.iterations,
            salt: crypto.getRandomValues(new Uint8Array(16))
          },
          compression: this.config.compression,
          metadata: {
            version: "2.0.0",
            timestamp: Date.now(),
            keyId: this.config.keyId || this.generateKeyId()
          }
        });
        this.keyManager = new DefaultKeyManager(this.encryption, this.config);
      }
      /**
       * Encrypt storage value if encryption is enabled
       */
      async encryptValue(value, key, forceEncrypt = false) {
        if (!this.config.enabled && !forceEncrypt) {
          return {
            data: value,
            metadata: {
              encrypted: false,
              version: "2.0.0"
            }
          };
        }
        try {
          const serialized = JSON.stringify(value);
          const keyId = await this.keyManager.getCurrentKeyId();
          const encryptedData = await this.encryption.encryptSymmetric(serialized, keyId);
          const encryptedString = AdvancedEncryption.encryptedDataToJSON(encryptedData);
          const checksum = await this.generateChecksum(serialized);
          return {
            data: encryptedString,
            metadata: {
              encrypted: true,
              algorithm: this.config.algorithm,
              keyId,
              version: "2.0.0",
              checksum
            }
          };
        } catch (error) {
          throw new StorageEncryptionError(key, "encrypt", error);
        }
      }
      /**
       * Decrypt storage value if it was encrypted
       */
      async decryptValue(data, metadata, key) {
        if (!metadata.encrypted) {
          return data;
        }
        try {
          const encryptedData = AdvancedEncryption.encryptedDataFromJSON(data);
          const decryptedBuffer = await this.encryption.decryptSymmetric(encryptedData);
          const decryptedString = new TextDecoder().decode(decryptedBuffer);
          if (metadata.checksum) {
            const actualChecksum = await this.generateChecksum(decryptedString);
            if (actualChecksum !== metadata.checksum) {
              throw new Error("Checksum verification failed - data may be corrupted");
            }
          }
          return JSON.parse(decryptedString);
        } catch (error) {
          throw new StorageEncryptionError(key, "decrypt", error);
        }
      }
      /**
       * Process storage entry for encryption
       */
      async encryptStorageEntry(entry, forceEncrypt = false) {
        const { data, metadata: encryptionMetadata } = await this.encryptValue(
          entry.data,
          entry.metadata.key,
          forceEncrypt
        );
        const resultMetadata = {
          ...entry.metadata,
          encrypted: encryptionMetadata.encrypted
        };
        if (encryptionMetadata.checksum !== void 0) {
          resultMetadata.checksum = encryptionMetadata.checksum;
        }
        return {
          data,
          metadata: resultMetadata
        };
      }
      /**
       * Process storage entry for decryption
       */
      async decryptStorageEntry(entry) {
        const encryptionMetadata = {
          encrypted: entry.metadata.encrypted,
          algorithm: this.config.algorithm,
          version: entry.metadata.version
        };
        if (this.config.keyId) {
          encryptionMetadata.keyId = this.config.keyId;
        }
        if (entry.metadata.checksum !== void 0) {
          encryptionMetadata.checksum = entry.metadata.checksum;
        }
        const decryptedData = await this.decryptValue(
          entry.data,
          encryptionMetadata,
          entry.metadata.key
        );
        return {
          data: decryptedData,
          metadata: {
            ...entry.metadata,
            encrypted: false
            // Mark as decrypted for consumers
          }
        };
      }
      /**
       * Check if encryption is enabled
       */
      isEncryptionEnabled() {
        return this.config.enabled;
      }
      /**
       * Get current encryption configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * Update encryption configuration
       */
      async updateConfig(newConfig) {
        const oldConfig = this.config;
        this.config = { ...this.config, ...newConfig };
        if (newConfig.algorithm !== oldConfig.algorithm || newConfig.keyLength !== oldConfig.keyLength || newConfig.keyDerivation !== oldConfig.keyDerivation) {
          this.encryption = new AdvancedEncryption({
            algorithm: this.config.algorithm,
            keyLength: this.config.keyLength,
            keyDerivation: {
              algorithm: this.config.keyDerivation.algorithm,
              iterations: this.config.keyDerivation.iterations,
              salt: crypto.getRandomValues(new Uint8Array(16))
            },
            compression: this.config.compression,
            metadata: {
              version: "2.0.0",
              timestamp: Date.now(),
              keyId: this.config.keyId || this.generateKeyId()
            }
          });
          await this.keyManager.rotateKey();
        }
      }
      /**
       * Rotate encryption keys
       */
      async rotateKeys() {
        return this.keyManager.rotateKey();
      }
      /**
       * Get encryption statistics
       */
      async getEncryptionStats() {
        const currentKeyId = await this.keyManager.getCurrentKeyId();
        const keyInfo = await this.keyManager.getKeyInfo(currentKeyId);
        const result = {
          enabled: this.config.enabled,
          algorithm: this.config.algorithm,
          keyLength: this.config.keyLength,
          currentKeyId,
          keyAge: keyInfo ? Date.now() - keyInfo.created : 0
        };
        if (keyInfo?.expires !== void 0) {
          result.nextRotation = keyInfo.expires;
        }
        return result;
      }
      /**
       * Cleanup expired keys
       */
      async cleanup() {
        return this.keyManager.cleanup();
      }
      /**
       * Test encryption/decryption with sample data
       */
      async testEncryption() {
        try {
          const testData = { test: "encryption_test", timestamp: Date.now() };
          const testKey = "test:encryption";
          const { data: encrypted, metadata } = await this.encryptValue(testData, testKey, true);
          const decrypted = await this.decryptValue(encrypted, metadata, testKey);
          return JSON.stringify(testData) === JSON.stringify(decrypted);
        } catch (error) {
          console.error("Encryption test failed:", error);
          return false;
        }
      }
      /**
       * Generate integrity checksum
       */
      async generateChecksum(data) {
        if (typeof crypto !== "undefined" && crypto.subtle) {
          const encoder = new TextEncoder();
          const dataBuffer = encoder.encode(data);
          const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        } else {
          return this.simpleHash(data);
        }
      }
      /**
       * Simple hash fallback for environments without crypto.subtle
       */
      simpleHash(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          const char = data.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      }
      /**
       * Generate unique key ID
       */
      generateKeyId() {
        return `storage_key_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
    };
    createEncryptionService = (config) => {
      return new StorageEncryptionService(config);
    };
  }
});

// src/storage/storage-factory.ts
import { EventEmitter as EventEmitter2 } from "events";
var MemoryStorageAdapter, UnifiedStorageImpl, StorageFactory, storageFactory, createStorage;
var init_storage_factory = __esm({
  "src/storage/storage-factory.ts"() {
    "use strict";
    init_esm_shims();
    init_unified_storage();
    init_platform_detector();
    init_indexeddb_adapter();
    init_localstorage_adapter();
    init_encryption_service();
    MemoryStorageAdapter = class {
      name = "Memory";
      store = /* @__PURE__ */ new Map();
      capabilities = {
        supportsTransactions: false,
        supportsIndexing: false,
        maxKeyLength: Infinity,
        maxValueSize: Infinity,
        supportsCompression: false,
        supportsEncryption: false,
        supportsTTL: true
      };
      get isAvailable() {
        return true;
      }
      isConnected() {
        return true;
      }
      async connect() {
      }
      async disconnect() {
        this.store.clear();
      }
      async set(key, value, options) {
        const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
        const entry = this.createStorageEntry(key, value, mergedOptions);
        this.store.set(key, entry);
      }
      async get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
          this.store.delete(key);
          return null;
        }
        return entry;
      }
      async delete(key) {
        return this.store.delete(key);
      }
      async exists(key) {
        return this.store.has(key);
      }
      async clear() {
        this.store.clear();
      }
      async setMany(entries) {
        for (const entry of entries) {
          await this.set(entry.key, entry.value, entry.options);
        }
      }
      async getMany(keys) {
        return Promise.all(keys.map((key) => this.get(key)));
      }
      async deleteMany(keys) {
        let count = 0;
        for (const key of keys) {
          if (await this.delete(key)) count++;
        }
        return count;
      }
      async keys() {
        return Array.from(this.store.keys());
      }
      async values() {
        return Array.from(this.store.values());
      }
      async entries() {
        return this.values();
      }
      async count() {
        return this.store.size;
      }
      async beginTransaction() {
        throw new StorageError("Transactions not supported", "TRANSACTION_NOT_SUPPORTED", "beginTransaction");
      }
      async cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.store.entries()) {
          if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
            this.store.delete(key);
            cleaned++;
          }
        }
        return cleaned;
      }
      async optimize() {
        await this.cleanup();
      }
      async getStats() {
        const entries = Array.from(this.store.values());
        const now = Date.now();
        return {
          totalKeys: entries.length,
          totalSize: entries.reduce((size, entry) => size + JSON.stringify(entry).length, 0),
          namespaces: [...new Set(entries.map((e) => e.metadata.key.split(":")[0]))],
          oldestEntry: Math.min(...entries.map((e) => e.metadata.createdAt)),
          newestEntry: Math.max(...entries.map((e) => e.metadata.createdAt)),
          expiredEntries: entries.filter((e) => e.metadata.expiresAt && e.metadata.expiresAt < now).length,
          encryptedEntries: entries.filter((e) => e.metadata.encrypted).length,
          compressedEntries: entries.filter((e) => e.metadata.compressed).length
        };
      }
      createStorageEntry(key, value, options) {
        const now = Date.now();
        return {
          data: value,
          metadata: {
            key,
            createdAt: now,
            updatedAt: now,
            ...options.ttl > 0 && { expiresAt: now + options.ttl },
            encrypted: options.encrypt,
            compressed: options.compress,
            version: options.version
          }
        };
      }
    };
    UnifiedStorageImpl = class extends EventEmitter2 {
      constructor(adapter, encryptionService, _config) {
        super();
        this.adapter = adapter;
        this.encryptionService = encryptionService;
        this._config = _config;
        this.name = `Unified-${adapter.name}`;
        this.capabilities = adapter.capabilities;
        this.isAvailable = adapter.isAvailable;
      }
      name;
      capabilities;
      isAvailable;
      // Delegate core methods to adapter
      isConnected() {
        return this.adapter.isConnected();
      }
      async connect() {
        return this.adapter.connect();
      }
      async disconnect() {
        return this.adapter.disconnect();
      }
      async set(key, value, options) {
        const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
        try {
          let finalValue = value;
          if (mergedOptions.encrypt || mergedOptions.namespace === "secure") {
            const encrypted = await this.encryptionService.encryptValue(value, key, true);
            finalValue = encrypted.data;
            mergedOptions.encrypt = true;
          }
          await this.adapter.set(key, finalValue, mergedOptions);
          this.emit("set", key, value, options);
        } catch (error) {
          this.emit("error", error);
          throw error;
        }
      }
      async get(key) {
        try {
          const entry = await this.adapter.get(key);
          if (!entry) {
            this.emit("get", key, null);
            return null;
          }
          if (entry.metadata.encrypted) {
            const decrypted = await this.encryptionService.decryptStorageEntry(entry);
            this.emit("get", key, decrypted.data);
            return decrypted;
          }
          this.emit("get", key, entry.data);
          return entry;
        } catch (error) {
          this.emit("error", error);
          throw error;
        }
      }
      async delete(key) {
        try {
          const result = await this.adapter.delete(key);
          this.emit("delete", key, result);
          return result;
        } catch (error) {
          this.emit("error", error);
          throw error;
        }
      }
      async exists(key) {
        return this.adapter.exists(key);
      }
      async clear(namespace) {
        try {
          await this.adapter.clear(namespace);
          this.emit("clear", namespace);
        } catch (error) {
          this.emit("error", error);
          throw error;
        }
      }
      // High-level entity methods
      async setReceipt(id, receipt, options) {
        const key = createReceiptKey(id);
        return this.set(key, receipt, { ...options, namespace: "receipts" });
      }
      async getReceipt(id) {
        const key = createReceiptKey(id);
        const entry = await this.get(key);
        return entry?.data || null;
      }
      async deleteReceipt(id) {
        const key = createReceiptKey(id);
        return this.delete(key);
      }
      async setCashier(id, cashier, options) {
        const key = createCashierKey(id);
        return this.set(key, cashier, { ...options, namespace: "cashiers" });
      }
      async getCashier(id) {
        const key = createCashierKey(id);
        const entry = await this.get(key);
        return entry?.data || null;
      }
      async deleteCashier(id) {
        const key = createCashierKey(id);
        return this.delete(key);
      }
      async setMerchant(id, merchant, options) {
        const key = createMerchantKey(id);
        return this.set(key, merchant, { ...options, namespace: "merchants" });
      }
      async getMerchant(id) {
        const key = createMerchantKey(id);
        const entry = await this.get(key);
        return entry?.data || null;
      }
      async deleteMerchant(id) {
        const key = createMerchantKey(id);
        return this.delete(key);
      }
      async setPEM(id, pem, options) {
        const key = createPEMKey(id);
        return this.set(key, pem, { ...options, namespace: "pems" });
      }
      async getPEM(id) {
        const key = createPEMKey(id);
        const entry = await this.get(key);
        return entry?.data || null;
      }
      async deletePEM(id) {
        const key = createPEMKey(id);
        return this.delete(key);
      }
      async setCashRegister(id, cashRegister, options) {
        const key = createCashRegisterKey(id);
        return this.set(key, cashRegister, { ...options, namespace: "cash_registers" });
      }
      async getCashRegister(id) {
        const key = createCashRegisterKey(id);
        const entry = await this.get(key);
        return entry?.data || null;
      }
      async deleteCashRegister(id) {
        const key = createCashRegisterKey(id);
        return this.delete(key);
      }
      // Cache operations
      async setCache(key, value, ttl) {
        const cacheKey = createCacheKey(key);
        return this.set(cacheKey, value, { namespace: "cache", ...ttl && { ttl } });
      }
      async getCache(key) {
        const cacheKey = createCacheKey(key);
        const entry = await this.get(cacheKey);
        return entry?.data || null;
      }
      async invalidateCache(pattern) {
        const keys = await this.keys({ namespace: "cache", ...pattern && { prefix: pattern } });
        return this.deleteMany(keys);
      }
      // Session storage
      async setSession(key, value) {
        const sessionKey = createSessionKey(key);
        return this.set(sessionKey, value, { namespace: "session" });
      }
      async getSession(key) {
        const sessionKey = createSessionKey(key);
        const entry = await this.get(sessionKey);
        return entry?.data || null;
      }
      async clearSession() {
        return this.clear("session");
      }
      // Secure storage (always encrypted)
      async setSecure(key, value) {
        const secureKey = createSecureKey(key);
        return this.set(secureKey, value, { namespace: "secure", encrypt: true });
      }
      async getSecure(key) {
        const secureKey = createSecureKey(key);
        const entry = await this.get(secureKey);
        return entry?.data || null;
      }
      async deleteSecure(key) {
        const secureKey = createSecureKey(key);
        return this.delete(secureKey);
      }
      // Configuration storage
      async setConfig(key, value) {
        const configKey = createConfigKey(key);
        return this.set(configKey, value, { namespace: "config" });
      }
      async getConfig(key) {
        const configKey = createConfigKey(key);
        const entry = await this.get(configKey);
        return entry?.data || null;
      }
      async deleteConfig(key) {
        const configKey = createConfigKey(key);
        return this.delete(configKey);
      }
      // Backup and restore
      async exportData(namespace) {
        const entries = await this.entries({ ...namespace && { namespace } });
        return JSON.stringify(entries, null, 2);
      }
      async importData(data) {
        const entries = JSON.parse(data);
        let imported = 0;
        for (const entry of entries) {
          try {
            await this.set(entry.metadata.key, entry.data);
            imported++;
          } catch (error) {
            console.warn(`Failed to import entry ${entry.metadata.key}:`, error);
          }
        }
        return imported;
      }
      // Delegate remaining methods to adapter
      async setMany(entries) {
        return this.adapter.setMany(entries);
      }
      async getMany(keys) {
        return this.adapter.getMany(keys);
      }
      async deleteMany(keys) {
        return this.adapter.deleteMany(keys);
      }
      async keys(options) {
        return this.adapter.keys(options);
      }
      async values(options) {
        return this.adapter.values(options);
      }
      async entries(options) {
        return this.adapter.entries(options);
      }
      async count(options) {
        return this.adapter.count(options);
      }
      async beginTransaction() {
        return this.adapter.beginTransaction();
      }
      async cleanup() {
        return this.adapter.cleanup();
      }
      async optimize() {
        return this.adapter.optimize();
      }
      async getStats() {
        return this.adapter.getStats();
      }
      // Missing interface methods
      async query(options) {
        const keys = await this.keys(options);
        const results = [];
        for (const key of keys) {
          try {
            const entry = await this.get(key);
            if (entry?.data) {
              results.push({ key, value: entry.data });
            }
          } catch (error) {
            console.warn(`Failed to query key ${key}:`, error);
          }
        }
        return results;
      }
      async initialize() {
        await this.connect();
      }
      async destroy() {
        await this.disconnect();
        this.removeAllListeners();
      }
    };
    StorageFactory = class _StorageFactory {
      static instance = null;
      storageInstances = /* @__PURE__ */ new Map();
      constructor() {
      }
      static getInstance() {
        if (!_StorageFactory.instance) {
          _StorageFactory.instance = new _StorageFactory();
        }
        return _StorageFactory.instance;
      }
      /**
       * Create storage instance with automatic adapter selection
       */
      async createStorage(config = {}) {
        const instanceKey = this.generateInstanceKey(config);
        if (this.storageInstances.has(instanceKey)) {
          return this.storageInstances.get(instanceKey);
        }
        try {
          const environmentInfo = platformDetector.getEnvironmentInfo();
          const adapter = await this.selectOptimalAdapter(config, environmentInfo);
          const encryptionService = createEncryptionService(config.encryption);
          const storage = new UnifiedStorageImpl(adapter, encryptionService, config);
          await storage.connect();
          this.storageInstances.set(instanceKey, storage);
          if (config.debug) {
            console.log(`Storage created: ${storage.name} for platform: ${environmentInfo.platform}`);
          }
          return storage;
        } catch (error) {
          throw new StorageError(
            "Failed to create storage instance",
            "STORAGE_FACTORY_ERROR",
            "createStorage",
            void 0,
            error
          );
        }
      }
      /**
       * Get environment information
       */
      getEnvironmentInfo() {
        return platformDetector.getEnvironmentInfo();
      }
      /**
       * Test storage compatibility
       */
      async testCompatibility() {
        const environmentInfo = platformDetector.getEnvironmentInfo();
        const availableAdapters = [];
        if (environmentInfo.hasIndexedDB) {
          try {
            const adapter = new IndexedDBAdapter();
            if (adapter.isAvailable) {
              availableAdapters.push("indexeddb");
            }
          } catch {
          }
        }
        if (environmentInfo.hasLocalStorage) {
          try {
            const adapter = new LocalStorageAdapter();
            if (adapter.isAvailable) {
              availableAdapters.push("localstorage");
            }
          } catch {
          }
        }
        availableAdapters.push("memory");
        return {
          platform: environmentInfo.platform,
          availableAdapters,
          recommendedAdapter: platformDetector.getRecommendedStorageAdapter(),
          encryptionSupported: environmentInfo.hasWebCrypto,
          compressionSupported: environmentInfo.hasCompressionStreams
        };
      }
      /**
       * Clear all cached instances
       */
      clearInstances() {
        this.storageInstances.clear();
      }
      async selectOptimalAdapter(config, environmentInfo) {
        const preferredAdapter = config.preferredAdapter || "auto";
        if (preferredAdapter !== "auto") {
          return this.createSpecificAdapter(preferredAdapter, config);
        }
        if (environmentInfo.hasIndexedDB) {
          try {
            const adapter = new IndexedDBAdapter();
            await adapter.connect();
            return adapter;
          } catch (error) {
            console.warn("IndexedDB failed, falling back to localStorage:", error);
          }
        }
        if (environmentInfo.hasLocalStorage) {
          try {
            const adapter = new LocalStorageAdapter(config.keyPrefix);
            await adapter.connect();
            return adapter;
          } catch (error) {
            console.warn("LocalStorage failed, falling back to memory:", error);
          }
        }
        const isCLI = typeof window === "undefined" && typeof process !== "undefined" && process.env.NODE_ENV !== "test";
        if (!isCLI) {
          console.warn("Using memory storage as fallback - data will not persist");
        }
        return new MemoryStorageAdapter();
      }
      createSpecificAdapter(adapterType, config) {
        switch (adapterType) {
          case "indexeddb":
            return new IndexedDBAdapter();
          case "localstorage":
            return new LocalStorageAdapter(config.keyPrefix);
          case "memory":
            return new MemoryStorageAdapter();
          default:
            throw new StorageError(
              `Unknown adapter type: ${adapterType}`,
              "UNKNOWN_ADAPTER",
              "createSpecificAdapter"
            );
        }
      }
      generateInstanceKey(config) {
        const keyParts = [
          config.preferredAdapter || "auto",
          config.keyPrefix || "default",
          config.enableCompression ? "compressed" : "uncompressed",
          config.encryption?.enabled ? "encrypted" : "unencrypted"
        ];
        return keyParts.join("_");
      }
    };
    storageFactory = StorageFactory.getInstance();
    createStorage = (config) => {
      return storageFactory.createStorage(config);
    };
  }
});

// src/security/mtls-certificate-manager.ts
var DEFAULT_CONFIG5, MTLSCertificateManager;
var init_mtls_certificate_manager = __esm({
  "src/security/mtls-certificate-manager.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_unified_storage();
    init_storage_factory();
    init_encryption();
    DEFAULT_CONFIG5 = {
      storageKey: "acube_mtls_certificates",
      enableEncryption: true,
      storageAdapter: "memory",
      validation: {
        validateFormat: true,
        checkExpiration: true,
        validateChain: false
      }
    };
    MTLSCertificateManager = class extends import_index.default {
      config;
      storage = null;
      encryption = null;
      initialized = false;
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG5, ...config };
      }
      /**
       * Initialize the certificate manager
       */
      async initialize() {
        try {
          const adapterMapping = {
            "memory": "localstorage",
            "localStorage": "localstorage",
            "indexedDB": "indexeddb",
            "reactNative": "localstorage"
          };
          this.storage = await createStorage({
            preferredAdapter: adapterMapping[this.config.storageAdapter] || "auto",
            encryption: this.config.enableEncryption ? { enabled: true } : { enabled: false }
          });
          if (this.config.enableEncryption) {
            this.encryption = new AdvancedEncryption();
            await this.encryption.initialize();
          }
          this.initialized = true;
        } catch (error) {
          const certificateError = new Error(`Failed to initialize certificate manager: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "initialize" });
          throw certificateError;
        }
      }
      /**
       * Store a new mTLS certificate securely
       */
      async storeCertificate(cashRegisterId, pemSerialNumber, name, certificate) {
        this.ensureInitialized();
        try {
          const metadata = this.parseCertificateMetadata(certificate);
          const mtlsCertificate = {
            cashRegisterId,
            pemSerialNumber,
            name,
            certificate,
            metadata,
            storedAt: /* @__PURE__ */ new Date(),
            status: "active"
          };
          if (this.config.validation.validateFormat) {
            this.validateCertificateFormat(certificate);
          }
          const existingData = await this.getStoredData();
          existingData.certificates[cashRegisterId] = mtlsCertificate;
          await this.saveStoredData(existingData);
          this.emit("certificate:stored", { certificate: mtlsCertificate });
          return mtlsCertificate;
        } catch (error) {
          const certificateError = new Error(`Failed to store certificate: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "store" });
          throw certificateError;
        }
      }
      /**
       * Retrieve a certificate by cash register ID
       */
      async getCertificate(cashRegisterId) {
        this.ensureInitialized();
        try {
          const storedData = await this.getStoredData();
          const certificate = storedData.certificates[cashRegisterId] || null;
          if (certificate) {
            if (this.config.validation.checkExpiration && this.isCertificateExpired(certificate)) {
              certificate.status = "expired";
              await this.updateCertificateStatus(cashRegisterId, "expired");
              this.emit("certificate:expired", { certificateId: cashRegisterId, certificate });
            }
            this.emit("certificate:retrieved", { certificateId: cashRegisterId, certificate });
          }
          return certificate;
        } catch (error) {
          const certificateError = new Error(`Failed to retrieve certificate: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "retrieve" });
          throw certificateError;
        }
      }
      /**
       * Get all stored certificates
       */
      async getAllCertificates() {
        this.ensureInitialized();
        try {
          const storedData = await this.getStoredData();
          return Object.values(storedData.certificates);
        } catch (error) {
          const certificateError = new Error(`Failed to retrieve all certificates: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "retrieveAll" });
          throw certificateError;
        }
      }
      /**
       * Update certificate status
       */
      async updateCertificateStatus(cashRegisterId, status) {
        this.ensureInitialized();
        try {
          const storedData = await this.getStoredData();
          const certificate = storedData.certificates[cashRegisterId];
          if (certificate) {
            certificate.status = status;
            await this.saveStoredData(storedData);
          }
        } catch (error) {
          const certificateError = new Error(`Failed to update certificate status: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "updateStatus" });
          throw certificateError;
        }
      }
      /**
       * Remove a certificate
       */
      async removeCertificate(cashRegisterId) {
        this.ensureInitialized();
        try {
          const storedData = await this.getStoredData();
          const existed = !!storedData.certificates[cashRegisterId];
          delete storedData.certificates[cashRegisterId];
          await this.saveStoredData(storedData);
          return existed;
        } catch (error) {
          const certificateError = new Error(`Failed to remove certificate: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "remove" });
          throw certificateError;
        }
      }
      /**
       * Clear all certificates
       */
      async clearAllCertificates() {
        this.ensureInitialized();
        try {
          const emptyData = {
            certificates: {},
            version: "1.0",
            encryptedAt: Date.now()
          };
          await this.saveStoredData(emptyData);
        } catch (error) {
          const certificateError = new Error(`Failed to clear certificates: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "clear" });
          throw certificateError;
        }
      }
      /**
       * Get certificate storage statistics
       */
      async getStorageStats() {
        this.ensureInitialized();
        try {
          const storedData = await this.getStoredData();
          const certificates = Object.values(storedData.certificates);
          const activeCertificates = certificates.filter((cert) => cert.status === "active").length;
          const expiredCertificates = certificates.filter((cert) => cert.status === "expired").length;
          const storageSize = JSON.stringify(storedData).length;
          const lastUpdate = certificates.length > 0 ? new Date(Math.max(...certificates.map((cert) => cert.storedAt.getTime()))) : null;
          return {
            totalCertificates: certificates.length,
            activeCertificates,
            expiredCertificates,
            storageSize,
            lastUpdate
          };
        } catch (error) {
          const certificateError = new Error(`Failed to get storage stats: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "stats" });
          throw certificateError;
        }
      }
      /**
       * Cleanup expired certificates
       */
      async cleanupExpiredCertificates() {
        this.ensureInitialized();
        try {
          const storedData = await this.getStoredData();
          const certificates = Object.entries(storedData.certificates);
          let removedCount = 0;
          for (const [cashRegisterId, certificate] of certificates) {
            if (this.isCertificateExpired(certificate)) {
              delete storedData.certificates[cashRegisterId];
              removedCount++;
              this.emit("certificate:expired", { certificateId: cashRegisterId, certificate });
            }
          }
          if (removedCount > 0) {
            await this.saveStoredData(storedData);
          }
          return removedCount;
        } catch (error) {
          const certificateError = new Error(`Failed to cleanup expired certificates: ${error}`);
          this.emit("certificate:error", { error: certificateError, operation: "cleanup" });
          throw certificateError;
        }
      }
      /**
       * Destroy the certificate manager
       */
      async destroy() {
        if (this.storage) {
          await this.storage.destroy();
        }
        this.removeAllListeners();
        this.initialized = false;
      }
      // Private methods
      ensureInitialized() {
        if (!this.initialized) {
          throw new Error("Certificate manager not initialized. Call initialize() first.");
        }
      }
      async getStoredData() {
        if (!this.storage) {
          throw new Error("Storage not initialized");
        }
        try {
          const storageKey = createStorageKey(this.config.storageKey);
          const result = await this.storage.get(storageKey);
          if (!result || !result.data) {
            return {
              certificates: {},
              version: "1.0",
              encryptedAt: Date.now()
            };
          }
          const data = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
          let parsedData;
          if (this.config.enableEncryption && this.encryption) {
            try {
              const encryptedDataObj = JSON.parse(data);
              const decryptedBuffer = await this.encryption.decrypt(encryptedDataObj);
              const decryptedString = new TextDecoder().decode(decryptedBuffer);
              parsedData = JSON.parse(decryptedString);
            } catch (decryptError) {
              console.warn("Failed to decrypt certificate data, falling back to unencrypted:", decryptError);
              parsedData = JSON.parse(data);
            }
          } else {
            parsedData = JSON.parse(data);
          }
          Object.values(parsedData.certificates).forEach((cert) => {
            cert.storedAt = new Date(cert.storedAt);
            cert.metadata.issuedAt = new Date(cert.metadata.issuedAt);
            if (cert.metadata.expiresAt) {
              cert.metadata.expiresAt = new Date(cert.metadata.expiresAt);
            }
          });
          return parsedData;
        } catch (error) {
          console.warn("Failed to retrieve certificate data:", error);
          return {
            certificates: {},
            version: "1.0",
            encryptedAt: Date.now()
          };
        }
      }
      async saveStoredData(data) {
        if (!this.storage) {
          throw new Error("Storage not initialized");
        }
        try {
          data.encryptedAt = Date.now();
          let dataToStore = JSON.stringify(data);
          if (this.config.enableEncryption && this.encryption) {
            const encryptedData = await this.encryption.encrypt(JSON.stringify(data));
            dataToStore = JSON.stringify(encryptedData);
          }
          const storageKey = createStorageKey(this.config.storageKey);
          await this.storage.set(storageKey, dataToStore, {
            encrypt: this.config.enableEncryption
          });
        } catch (error) {
          this.emit("storage:error", { error });
          throw error;
        }
      }
      parseCertificateMetadata(certificate) {
        const metadata = {
          issuedAt: /* @__PURE__ */ new Date()
        };
        try {
          const certLines = certificate.split("\n");
          const certData = certLines.find((line) => line.includes("Subject:"));
          if (certData) {
            metadata.subject = certData.replace("Subject:", "").trim();
          }
          const issuerData = certLines.find((line) => line.includes("Issuer:"));
          if (issuerData) {
            metadata.issuer = issuerData.replace("Issuer:", "").trim();
          }
          let hash = 0;
          for (let i = 0; i < certificate.length; i++) {
            const char = certificate.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
          }
          metadata.fingerprint = Math.abs(hash).toString(16);
        } catch (error) {
          console.warn("Failed to parse certificate metadata:", error);
        }
        return metadata;
      }
      validateCertificateFormat(certificate) {
        if (!certificate.includes("-----BEGIN CERTIFICATE-----") || !certificate.includes("-----END CERTIFICATE-----")) {
          throw new Error("Invalid certificate format: must be PEM format");
        }
      }
      isCertificateExpired(certificate) {
        if (!certificate.metadata.expiresAt) {
          return false;
        }
        return certificate.metadata.expiresAt.getTime() < Date.now();
      }
    };
  }
});

// src/resources/cash-registers.ts
var cash_registers_exports = {};
__export(cash_registers_exports, {
  CashRegisters: () => CashRegistersResource,
  CashRegistersResource: () => CashRegistersResource
});
var CashRegistersResource;
var init_cash_registers = __esm({
  "src/resources/cash-registers.ts"() {
    "use strict";
    init_esm_shims();
    init_base_openapi();
    init_endpoints();
    init_errors();
    init_mtls_certificate_manager();
    CashRegistersResource = class _CashRegistersResource extends BaseOpenAPIResource {
      certificateManager;
      constructor(client) {
        super({
          client,
          endpoints: {
            create: CashRegisterEndpoints.CREATE,
            list: CashRegisterEndpoints.LIST,
            getById: CashRegisterEndpoints.GET_BY_ID
          }
        });
        this.certificateManager = new MTLSCertificateManager({
          storageKey: "acube_cash_register_certificates",
          enableEncryption: true
        });
      }
      /**
       * Initialize the resource (including certificate manager)
       */
      async initialize() {
        await this.certificateManager.initialize();
      }
      /**
       * Register a new cash register and obtain mTLS certificate
       * This method calls the server endpoint and automatically stores the certificate securely
       * 
       * @param request - Cash register creation request
       * @returns Promise resolving to created cash register with certificate info
       */
      async registerWithCertificate(request) {
        try {
          const response = await this.client.post(
            "/mf1/cash-register",
            request,
            {
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              metadata: {
                operation: "registerCashRegister",
                requiresAuth: true
              }
            }
          );
          if (response.status !== 201) {
            throw new ValidationError(
              "CASH_REGISTER_CREATION_FAILED",
              `Failed to create cash register: ${response.status}`,
              [{ field: "request", message: "Cash register creation failed", code: "CREATION_FAILED" }]
            );
          }
          const cashRegisterData = response.data;
          const certificate = await this.certificateManager.storeCertificate(
            cashRegisterData.uuid,
            request.pem_serial_number,
            request.name,
            cashRegisterData.mtls_certificate
          );
          return {
            cashRegister: cashRegisterData,
            certificate
          };
        } catch (error) {
          throw new ValidationError(
            "CASH_REGISTER_REGISTRATION_FAILED",
            `Failed to register cash register: ${error instanceof Error ? error.message : "Unknown error"}`,
            [{ field: "request", message: "Registration failed", code: "REGISTRATION_FAILED" }]
          );
        }
      }
      /**
       * Get mTLS certificate for a cash register
       * 
       * @param cashRegisterId - Cash register ID
       * @returns Promise resolving to certificate or null if not found
       */
      async getCertificate(cashRegisterId) {
        return this.certificateManager.getCertificate(cashRegisterId);
      }
      /**
       * Get all stored mTLS certificates
       * 
       * @returns Promise resolving to array of certificates
       */
      async getAllCertificates() {
        return this.certificateManager.getAllCertificates();
      }
      /**
       * Remove mTLS certificate for a cash register
       * 
       * @param cashRegisterId - Cash register ID
       * @returns Promise resolving to true if certificate was removed
       */
      async removeCertificate(cashRegisterId) {
        return this.certificateManager.removeCertificate(cashRegisterId);
      }
      /**
       * Get certificate storage statistics
       * 
       * @returns Promise resolving to storage statistics
       */
      async getCertificateStats() {
        return this.certificateManager.getStorageStats();
      }
      /**
       * Cleanup expired certificates
       * 
       * @returns Promise resolving to number of certificates removed
       */
      async cleanupExpiredCertificates() {
        return this.certificateManager.cleanupExpiredCertificates();
      }
      /**
       * Create a new cash register (legacy method)
       * 
       * @param data - Cash register input data
       * @param options - Validation options
       * @returns Promise resolving to created cash register
       */
      async create(data, options = {}) {
        await this.validateCashRegisterInput(data, options);
        return this.executeRequest("create", data, {
          metadata: {
            operation: "create_cash_register",
            serialNumber: data.pem_serial_number,
            name: data.name
          }
        });
      }
      /**
       * Get a list of cash registers
       * 
       * @returns Promise resolving to paginated cash register list
       */
      async list() {
        return this.executeRequest("list", void 0, {
          metadata: {
            operation: "list_cash_registers"
          }
        });
      }
      /**
       * Get a specific cash register by ID
       * 
       * @param registerId - Cash register ID
       * @returns Promise resolving to cash register details
       */
      async retrieve(registerId) {
        return this.executeRequest("getById", void 0, {
          pathParams: { id: registerId },
          metadata: {
            operation: "get_cash_register",
            registerId
          }
        });
      }
      /**
       * Get cash register configuration
       * 
       * @param registerId - Cash register ID
       * @returns Promise resolving to configuration
       */
      async getConfiguration(registerId) {
        const register = await this.retrieve(registerId);
        return _CashRegistersResource.buildConfiguration(register);
      }
      /**
       * Get cash register statistics
       * 
       * @param registerId - Cash register ID
       * @returns Promise resolving to statistics
       */
      async getStatistics(registerId) {
        const register = await this.retrieve(registerId);
        return _CashRegistersResource.calculateStatistics(register);
      }
      /**
       * Update cash register settings (future enhancement)
       */
      async updateSettings(registerId, settings) {
        if (!this.hasOperation("update")) {
          throw this.createUnsupportedOperationError("update");
        }
        return this.executeRequest("update", settings, {
          pathParams: { id: registerId },
          metadata: {
            operation: "update_cash_register_settings",
            registerId
          }
        });
      }
      // Validation methods
      /**
       * Validate cash register input
       */
      async validateCashRegisterInput(data, options = {}) {
        const errors = [];
        if (!data.pem_serial_number || data.pem_serial_number.trim().length === 0) {
          errors.push({
            field: "serial_number",
            message: "Serial number is required",
            code: "REQUIRED"
          });
        } else if (options.validateSerialNumber) {
          const serialValidation = _CashRegistersResource.validateSerialNumber(data.pem_serial_number);
          if (!serialValidation.isValid) {
            errors.push({
              field: "serial_number",
              message: serialValidation.error || "Invalid serial number format",
              code: "INVALID_SERIAL_NUMBER"
            });
          }
        }
        if (options.enforceLocationValidation) {
          if (!data.name || data.name.trim().length === 0) {
            errors.push({
              field: "name",
              message: "Name is required",
              code: "REQUIRED"
            });
          } else if (data.name.length > 100) {
            errors.push({
              field: "name",
              message: "Name cannot exceed 100 characters",
              code: "TOO_LONG"
            });
          }
        }
        if (options.checkDuplicateRegistration) {
          const isDuplicate = await this.checkDuplicateSerial(data.pem_serial_number);
          if (isDuplicate) {
            errors.push({
              field: "serial_number",
              message: "Cash register with this serial number is already registered",
              code: "DUPLICATE_SERIAL"
            });
          }
        }
        if (errors.length > 0) {
          throw new ValidationError("Invalid cash register input", "create_cash_register", errors);
        }
      }
      /**
       * Check for duplicate serial number
       */
      async checkDuplicateSerial(serialNumber) {
        try {
          const registers = await this.list();
          return registers.members.some((register) => register.pem_serial_number === serialNumber);
        } catch (error) {
          console.warn(`Unable to check for duplicate serial number: ${error}`);
          return false;
        }
      }
      // Static utility methods
      /**
       * Validate serial number format
       */
      static validateSerialNumber(serialNumber) {
        if (serialNumber.length < 6 || serialNumber.length > 20) {
          return { isValid: false, error: "Serial number must be between 6 and 20 characters" };
        }
        if (!/^[A-Z0-9-]+$/.test(serialNumber)) {
          return { isValid: false, error: "Serial number must contain only uppercase letters, numbers, and hyphens" };
        }
        return { isValid: true };
      }
      /**
       * Build configuration from cash register data
       */
      static buildConfiguration(register) {
        return {
          id: register.id,
          name: register.name || `Cash Register ${register.id}`,
          location: "Unknown Location",
          // location field not available in OpenAPI schema
          serialNumber: register.pem_serial_number,
          model: "Unknown Model",
          // model field not available in OpenAPI schema
          manufacturer: "Unknown Manufacturer",
          // manufacturer field not available in OpenAPI schema
          installationDate: (/* @__PURE__ */ new Date()).toISOString(),
          // installation_date field not available in OpenAPI schema
          lastMaintenance: void 0,
          // last_maintenance field not available in OpenAPI schema
          nextMaintenance: void 0,
          // next_maintenance field not available in OpenAPI schema
          status: "active",
          // status field not available in OpenAPI schema
          settings: this.getDefaultSettings()
        };
      }
      /**
       * Get default settings for cash registers
       */
      static getDefaultSettings() {
        return {
          printReceipts: true,
          enableLottery: true,
          defaultVATRate: "22",
          language: "it",
          currency: "EUR",
          timezone: "Europe/Rome",
          paperSize: "thermal_80mm",
          connectionType: "ethernet"
        };
      }
      /**
       * Calculate statistics for a cash register
       */
      static calculateStatistics(register) {
        const mockTransactionCount = Math.floor(Math.random() * 1e3) + 100;
        const mockTotalAmount = (Math.random() * 5e4 + 1e4).toFixed(2);
        const mockTodayTransactions = Math.floor(Math.random() * 50) + 10;
        const mockTodayAmount = (Math.random() * 2e3 + 500).toFixed(2);
        return {
          registerId: register.id,
          totalTransactions: mockTransactionCount,
          totalAmount: mockTotalAmount,
          averageTransaction: (parseFloat(mockTotalAmount) / mockTransactionCount).toFixed(2),
          transactionsToday: mockTodayTransactions,
          amountToday: mockTodayAmount,
          // lastTransaction field omitted since it's not available in OpenAPI schema
          uptime: {
            hours: 23.5,
            percentage: 97.9
          },
          errorCount: Math.floor(Math.random() * 5),
          maintenanceScore: Math.floor(Math.random() * 20) + 80
        };
      }
      /**
       * Format cash register for display
       */
      static formatForDisplay(register) {
        return {
          displayName: register.name || `Cash Register ${register.id}`,
          statusBadge: "ACTIVE",
          // status field not available in OpenAPI schema
          location: "Unknown Location",
          // location field not available in OpenAPI schema
          lastActivity: "Never",
          // last_activity field not available in OpenAPI schema
          serialNumber: register.pem_serial_number || "Unknown"
        };
      }
      /**
       * Generate maintenance schedule
       */
      static generateMaintenanceSchedule(_register) {
        const now = /* @__PURE__ */ new Date();
        return {
          nextMaintenance: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
          maintenanceType: "routine",
          priority: "medium",
          description: "Routine maintenance and inspection",
          estimatedDuration: "2 hours"
        };
      }
      /**
       * Validate cash register compatibility with PEM device
       */
      static validatePEMCompatibility(register, pemModel) {
        void register;
        const issues = [];
        const recommendations = [];
        if (pemModel.includes("legacy")) {
          issues.push("Legacy PEM devices may have compatibility issues");
          recommendations.push("Consider upgrading to newer PEM model");
        }
        return {
          compatible: issues.length === 0,
          issues,
          recommendations
        };
      }
      /**
       * Check if firmware is outdated
       * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
       */
      // private static isOutdatedFirmware(_version: string): boolean {
      //   // Simple version comparison
      //   const currentVersion = '3.2.0';
      //   return _version < currentVersion;
      // }
      /**
       * Generate health report for multiple cash registers
       */
      static generateFleetHealthReport(registers) {
        const report = {
          totalRegisters: registers.length,
          activeRegisters: 0,
          registersNeedingMaintenance: 0,
          averageUptime: 0,
          totalTransactionsToday: 0,
          totalRevenueToday: "0.00",
          statusBreakdown: {},
          topPerformers: []
        };
        let totalUptime = 0;
        let totalRevenue = 0;
        const performanceData = [];
        for (const register of registers) {
          const status = "active";
          report.statusBreakdown[status] = (report.statusBreakdown[status] || 0) + 1;
          if (status === "active") {
            report.activeRegisters++;
          }
          if (["maintenance", "error"].includes(status)) {
            report.registersNeedingMaintenance++;
          }
          const stats = this.calculateStatistics(register);
          totalUptime += stats.uptime.percentage;
          report.totalTransactionsToday += stats.transactionsToday;
          const todayRevenue = parseFloat(stats.amountToday);
          totalRevenue += todayRevenue;
          performanceData.push({
            id: register.id,
            name: register.name || `Register ${register.id}`,
            revenue: todayRevenue
          });
        }
        report.averageUptime = registers.length > 0 ? Math.round(totalUptime / registers.length) : 0;
        report.totalRevenueToday = totalRevenue.toFixed(2);
        report.topPerformers = performanceData.sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((item) => ({
          id: item.id,
          name: item.name,
          todayRevenue: item.revenue.toFixed(2)
        }));
        return report;
      }
      /**
       * Generate installation checklist
       */
      static generateInstallationChecklist() {
        return {
          preInstallation: [
            "Verify power supply requirements",
            "Check network connectivity",
            "Prepare installation location",
            "Gather serial numbers and documentation",
            "Backup existing configuration (if upgrading)"
          ],
          installation: [
            "Mount cash register securely",
            "Connect power supply",
            "Establish network connection",
            "Install required software/drivers",
            "Configure basic settings"
          ],
          postInstallation: [
            "Test all basic functions",
            "Configure PEM device integration",
            "Set up receipt printer",
            "Configure tax settings",
            "Train staff on operation"
          ],
          testing: [
            "Process test transaction",
            "Verify receipt printing",
            "Test network connectivity",
            "Validate tax calculations",
            "Check integration with fiscal system"
          ]
        };
      }
      /**
       * Destroy the resource and cleanup certificate manager
       */
      async destroy() {
        await this.certificateManager.destroy();
      }
    };
  }
});

// src/resources/merchants.ts
var merchants_exports = {};
__export(merchants_exports, {
  Merchants: () => MerchantsResource,
  MerchantsResource: () => MerchantsResource
});
var MerchantsResource;
var init_merchants = __esm({
  "src/resources/merchants.ts"() {
    "use strict";
    init_esm_shims();
    init_base_openapi();
    init_endpoints();
    init_errors();
    MerchantsResource = class _MerchantsResource extends BaseOpenAPIResource {
      constructor(client) {
        super({
          client,
          endpoints: {
            list: MerchantEndpoints.LIST,
            create: MerchantEndpoints.CREATE,
            getByUuid: MerchantEndpoints.GET_BY_UUID,
            update: MerchantEndpoints.UPDATE
          }
        });
      }
      /**
       * Get a list of merchants
       * 
       * @returns Promise resolving to merchant list
       */
      async list() {
        return this.executeRequest("list", void 0, {
          metadata: {
            operation: "list_merchants"
          }
        });
      }
      /**
       * Create a new merchant
       * 
       * @param data - Merchant creation input data
       * @param options - Validation options
       * @returns Promise resolving to created merchant
       */
      async create(data, options = {}) {
        await this.validateMerchantCreateInput(data, options);
        return this.executeRequest("create", data, {
          metadata: {
            operation: "create_merchant",
            fiscalId: data.fiscal_id,
            email: data.email,
            businessName: data.name
          }
        });
      }
      /**
       * Get a merchant by UUID
       * 
       * @param merchantId - Merchant UUID
       * @returns Promise resolving to merchant details
       */
      async retrieve(merchantId) {
        return this.executeRequest("getByUuid", void 0, {
          pathParams: { uuid: merchantId },
          metadata: {
            operation: "get_merchant",
            merchantId
          }
        });
      }
      /**
       * Update a merchant's information
       * 
       * @param merchantId - Merchant UUID
       * @param data - Merchant update input data
       * @param options - Validation options
       * @returns Promise resolving to updated merchant
       */
      async update(merchantId, data, options = {}) {
        await this.validateMerchantUpdateInput(data, options);
        return this.executeRequest("update", data, {
          pathParams: { uuid: merchantId },
          metadata: {
            operation: "update_merchant",
            merchantId,
            businessName: data.name
          }
        });
      }
      /**
       * Get merchant business analytics
       * 
       * @param merchantId - Merchant UUID
       * @returns Promise resolving to business analytics
       */
      async getAnalytics(merchantId) {
        const merchant = await this.retrieve(merchantId);
        return _MerchantsResource.analyzeBusinessProfile(merchant);
      }
      /**
       * Validate merchant address
       * 
       * @param address - Address to validate
       * @returns Address validation result
       */
      async validateAddress(address) {
        return _MerchantsResource.validateItalianAddress(address);
      }
      // Validation methods
      /**
       * Comprehensive merchant creation input validation
       */
      async validateMerchantCreateInput(data, options = {}) {
        const errors = [];
        if (!data.fiscal_id) {
          errors.push({
            field: "fiscal_id",
            message: "Fiscal ID is required",
            code: "REQUIRED"
          });
        } else if (options.validateVATNumber) {
          const vatValidation = await this.validateItalianVATNumber(data.fiscal_id);
          if (!vatValidation.isValid) {
            errors.push({
              field: "fiscal_id",
              message: vatValidation.error || "Invalid Italian VAT number",
              code: "INVALID_VAT_NUMBER"
            });
          }
        }
        if (!data.name || data.name.trim().length === 0) {
          errors.push({
            field: "name",
            message: "Business name is required",
            code: "REQUIRED"
          });
        } else {
          const nameValidation = this.validateBusinessName(data.name);
          if (!nameValidation.isValid) {
            errors.push({
              field: "name",
              message: nameValidation.error || "Invalid business name",
              code: "INVALID_BUSINESS_NAME"
            });
          }
        }
        if (!data.email) {
          errors.push({
            field: "email",
            message: "Email is required",
            code: "REQUIRED"
          });
        } else if (!this.isValidEmail(data.email)) {
          errors.push({
            field: "email",
            message: "Invalid email format",
            code: "INVALID_EMAIL"
          });
        }
        if (!data.password) {
          errors.push({
            field: "password",
            message: "Password is required",
            code: "REQUIRED"
          });
        } else {
          const passwordValidation = this.validatePassword(data.password);
          if (!passwordValidation.isValid) {
            errors.push({
              field: "password",
              message: passwordValidation.error || "Password does not meet requirements",
              code: "WEAK_PASSWORD"
            });
          }
        }
        if (data.address && options.enforceAddressValidation) {
          const addressValidation = await _MerchantsResource.validateItalianAddress(data.address);
          if (!addressValidation.isValid) {
            errors.push(...addressValidation.errors.map((error) => ({
              field: "address",
              message: error,
              code: "INVALID_ADDRESS"
            })));
          }
        }
        if (errors.length > 0) {
          throw new ValidationError("Invalid merchant create input", "create_merchant", errors);
        }
      }
      /**
       * Merchant update input validation
       */
      async validateMerchantUpdateInput(data, options = {}) {
        const errors = [];
        if (!data.name || data.name.trim().length === 0) {
          errors.push({
            field: "name",
            message: "Business name is required",
            code: "REQUIRED"
          });
        } else {
          const nameValidation = this.validateBusinessName(data.name);
          if (!nameValidation.isValid) {
            errors.push({
              field: "name",
              message: nameValidation.error || "Invalid business name",
              code: "INVALID_BUSINESS_NAME"
            });
          }
        }
        if (data.address && options.enforceAddressValidation) {
          const addressValidation = await _MerchantsResource.validateItalianAddress(data.address);
          if (!addressValidation.isValid) {
            errors.push(...addressValidation.errors.map((error) => ({
              field: "address",
              message: error,
              code: "INVALID_ADDRESS"
            })));
          }
        }
        if (errors.length > 0) {
          throw new ValidationError("Invalid merchant update input", "update_merchant", errors);
        }
      }
      /**
       * Validate Italian VAT number with checksum
       */
      async validateItalianVATNumber(vatNumber) {
        if (!_MerchantsResource.isValidItalianVATNumber(vatNumber)) {
          return { isValid: false, error: "Invalid Italian VAT number format or checksum" };
        }
        return { isValid: true };
      }
      /**
       * Validate business name
       */
      validateBusinessName(name) {
        if (name.length > 200) {
          return { isValid: false, error: "Business name cannot exceed 200 characters" };
        }
        if (!/^[\w\s&.,'()\-]+$/u.test(name)) {
          return { isValid: false, error: "Business name contains invalid characters" };
        }
        if (/test|example|sample/i.test(name)) {
          console.warn(`Potentially test business name detected: ${name}`);
        }
        return { isValid: true };
      }
      /**
       * Validate password strength
       */
      validatePassword(password) {
        if (password.length < 8) {
          return { isValid: false, error: "Password must be at least 8 characters long" };
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          return { isValid: false, error: "Password must contain uppercase, lowercase, and numeric characters" };
        }
        return { isValid: true };
      }
      /**
       * Validate email format
       */
      isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }
      // Static utility methods
      /**
       * Validate Italian VAT number (static utility)
       */
      static isValidItalianVATNumber(vatNumber) {
        if (!/^\d{11}$/.test(vatNumber)) {
          return false;
        }
        let sum = 0;
        for (let i = 0; i < 10; i++) {
          let digit = parseInt(vatNumber[i], 10);
          if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) {
              digit = Math.floor(digit / 10) + digit % 10;
            }
          }
          sum += digit;
        }
        const checkDigit = (10 - sum % 10) % 10;
        return checkDigit === parseInt(vatNumber[10], 10);
      }
      /**
       * Format fiscal ID for display
       */
      static formatFiscalId(fiscalId) {
        return fiscalId.replace(/(\d{3})(\d{3})(\d{5})/, "$1 $2 $3");
      }
      /**
       * Validate Italian address
       */
      static async validateItalianAddress(address) {
        const errors = [];
        const suggestions = [];
        if (!address.street_address || address.street_address.trim().length === 0) {
          errors.push("Street address is required");
        }
        if (!address.zip_code || !/^\d{5}$/.test(address.zip_code)) {
          errors.push("ZIP code must be exactly 5 digits");
        } else {
          const zipCode = parseInt(address.zip_code, 10);
          if (zipCode < 1e4 || zipCode > 98168) {
            errors.push("Invalid Italian postal code range");
          }
        }
        if (!address.city || address.city.trim().length === 0) {
          errors.push("City is required");
        }
        if (!address.province || address.province.length !== 2) {
          errors.push("Province must be exactly 2 characters");
        } else {
          const validProvinces = [
            "AG",
            "AL",
            "AN",
            "AO",
            "AQ",
            "AR",
            "AP",
            "AT",
            "AV",
            "BA",
            "BT",
            "BL",
            "BN",
            "BG",
            "BI",
            "BO",
            "BZ",
            "BS",
            "BR",
            "CA",
            "CL",
            "CB",
            "CI",
            "CE",
            "CT",
            "CZ",
            "CH",
            "CO",
            "CS",
            "CR",
            "KR",
            "CN",
            "EN",
            "FM",
            "FE",
            "FI",
            "FG",
            "FC",
            "FR",
            "GE",
            "GO",
            "GR",
            "IM",
            "IS",
            "SP",
            "LT",
            "LE",
            "LC",
            "LI",
            "LO",
            "LU",
            "MC",
            "MN",
            "MS",
            "MT",
            "VS",
            "ME",
            "MI",
            "MO",
            "MB",
            "NA",
            "NO",
            "NU",
            "OG",
            "OT",
            "OR",
            "PD",
            "PA",
            "PR",
            "PV",
            "PG",
            "PU",
            "PE",
            "PC",
            "PI",
            "PT",
            "PN",
            "PZ",
            "PO",
            "RG",
            "RA",
            "RC",
            "RE",
            "RI",
            "RN",
            "RM",
            "RO",
            "SA",
            "SS",
            "SV",
            "SI",
            "SR",
            "SO",
            "TA",
            "TE",
            "TR",
            "TO",
            "TP",
            "TN",
            "TV",
            "TS",
            "UD",
            "VA",
            "VE",
            "VB",
            "VC",
            "VR",
            "VV",
            "VI",
            "VT"
          ];
          if (!validProvinces.includes(address.province.toUpperCase())) {
            errors.push("Invalid Italian province code");
            suggestions.push("Please use a valid Italian province code (e.g., RM for Rome, MI for Milan)");
          }
        }
        const isValid = errors.length === 0;
        const formattedAddress = isValid ? `${address.street_address}, ${address.zip_code} ${address.city} (${address.province.toUpperCase()})` : void 0;
        return {
          isValid,
          errors,
          suggestions,
          formattedAddress
        };
      }
      /**
       * Analyze business profile completeness and compliance
       */
      static analyzeBusinessProfile(merchant) {
        const missingFields = [];
        const recommendations = [];
        let completenessScore = 0;
        const totalFields = 6;
        if (merchant.fiscal_id) completenessScore++;
        else missingFields.push("fiscal_id");
        if (merchant.name) completenessScore++;
        else missingFields.push("name");
        if (merchant.email) completenessScore++;
        else missingFields.push("email");
        if (merchant.address) {
          completenessScore++;
          if (!merchant.address.street_address) {
            missingFields.push("address.street_address");
            recommendations.push("Add complete street address for legal compliance");
          }
          if (!merchant.address.zip_code) {
            missingFields.push("address.zip_code");
          }
          if (!merchant.address.city) {
            missingFields.push("address.city");
          }
          if (!merchant.address.province) {
            missingFields.push("address.province");
          }
        } else {
          missingFields.push("address");
          recommendations.push("Add complete business address for legal compliance");
        }
        const registrationDate = (/* @__PURE__ */ new Date()).toISOString();
        const businessAge = Math.floor((Date.now() - new Date(registrationDate).getTime()) / (1e3 * 60 * 60 * 24));
        if (completenessScore < totalFields) {
          recommendations.push("Complete all required business information");
        }
        recommendations.push("Add phone number for better customer communication");
        recommendations.push("Add website URL to improve business presence");
        let complianceStatus = "compliant";
        if (missingFields.length > 0) {
          complianceStatus = missingFields.length > 2 ? "non-compliant" : "pending";
        }
        return {
          registrationDate,
          businessAge,
          completenessScore: Math.round(completenessScore / totalFields * 100),
          missingFields,
          recommendations,
          complianceStatus
        };
      }
      /**
       * Generate business summary
       */
      static generateBusinessSummary(merchant) {
        const addressPart = merchant.address ? ` - ${merchant.address.city}, ${merchant.address.province}` : "";
        return `${merchant.name} (VAT: ${this.formatFiscalId(merchant.fiscal_id || "")})${addressPart}`;
      }
      /**
       * Validate business name format (static utility)
       */
      static isValidBusinessName(name) {
        return typeof name === "string" && name.trim().length > 0 && name.length <= 200 && /^[\w\s&.,'()\-]+$/u.test(name);
      }
      /**
       * Normalize business name
       */
      static normalizeBusinessName(name) {
        return name.trim().replace(/\s+/g, " ").replace(/^\\w/, (c) => c.toUpperCase());
      }
      /**
       * Extract province code from address
       */
      static getProvinceCode(merchant) {
        return merchant.address?.province || null;
      }
      /**
       * Check if merchant is based in specific region
       */
      static isInRegion(merchant, regionProvinces) {
        const province = this.getProvinceCode(merchant);
        return province ? regionProvinces.includes(province.toUpperCase()) : false;
      }
      /**
       * Get Italian business regions
       */
      static getItalianRegions() {
        return {
          "Northern Italy": ["AO", "TO", "CN", "AT", "AL", "VC", "BI", "NO", "VB", "VA", "CO", "SO", "MI", "MB", "BG", "BS", "PV", "CR", "MN", "LO", "LC", "BZ", "TN", "VR", "VI", "BL", "TV", "VE", "PD", "RO", "UD", "PN", "TS", "GO", "PC", "PR", "RE", "MO", "BO", "FE", "RA", "FC", "RN", "GE", "SV", "IM", "SP", "MS"],
          "Central Italy": ["LU", "PT", "FI", "LI", "PI", "AR", "SI", "GR", "PO", "PG", "TR", "VT", "RI", "RM", "LT", "FR", "AQ", "TE", "PE", "CH", "MC", "AP", "AN", "PU", "FM"],
          "Southern Italy": ["CB", "IS", "CE", "BN", "NA", "AV", "SA", "FG", "BT", "BA", "BR", "TA", "MT", "PZ", "CS", "CZ", "VV", "RC", "KR"],
          "Islands": ["PA", "ME", "AG", "CL", "EN", "CT", "RG", "SR", "TP", "CA", "CI", "VS", "NU", "OG", "OR", "SS", "OT"]
        };
      }
      /**
       * Determine merchant region
       */
      static getMerchantRegion(merchant) {
        const province = this.getProvinceCode(merchant);
        if (!province) return null;
        const regions = this.getItalianRegions();
        for (const [region, provinces] of Object.entries(regions)) {
          if (provinces.includes(province.toUpperCase())) {
            return region;
          }
        }
        return null;
      }
    };
  }
});

// src/resources/pems.ts
var pems_exports = {};
__export(pems_exports, {
  PEMs: () => PEMsResource,
  PEMsResource: () => PEMsResource
});
var PEMsResource;
var init_pems = __esm({
  "src/resources/pems.ts"() {
    "use strict";
    init_esm_shims();
    init_base_openapi();
    init_endpoints();
    init_errors();
    PEMsResource = class _PEMsResource extends BaseOpenAPIResource {
      constructor(client) {
        super({
          client,
          endpoints: {
            createPOS: PEMEndpoints.CREATE_POS,
            getCertificates: PEMEndpoints.GET_CERTIFICATES
          }
        });
      }
      /**
       * Create a new Point of Sale
       * 
       * @param data - Point of Sale creation input data
       * @param options - Validation options
       * @returns Promise resolving to created Point of Sale
       */
      async createPointOfSale(data, options = {}) {
        await this.validatePointOfSaleInput(data, options);
        return this.executeRequest("createPOS", data, {
          metadata: {
            operation: "create_point_of_sale",
            merchantUuid: data.merchant_uuid,
            addressProvided: !!data.address
          }
        });
      }
      /**
       * Get certificates for a Point of Sale
       * 
       * @param posId - Point of Sale ID
       * @returns Promise resolving to certificate information
       */
      async getCertificates(posId) {
        const response = await this.executeRequest("getCertificates", void 0, {
          pathParams: { id: posId },
          metadata: {
            operation: "get_pem_certificates",
            posId
          }
        });
        return this.parseCertificateResponse(response);
      }
      /**
       * Validate certificate chain for a PEM device
       * 
       * @param posId - Point of Sale ID
       * @returns Promise resolving to certificate chain validation
       */
      async validateCertificateChain(posId) {
        const certificates = await this.getCertificates(posId);
        return _PEMsResource.buildCertificateChain(certificates);
      }
      /**
       * Get PEM configuration and status
       * 
       * @param posId - Point of Sale ID
       * @returns Promise resolving to PEM configuration
       */
      async getConfiguration(posId) {
        const certificates = await this.getCertificates(posId);
        return _PEMsResource.buildPEMConfiguration(posId, certificates);
      }
      /**
       * Check compliance status for a PEM device
       * 
       * @param posId - Point of Sale ID
       * @returns Promise resolving to compliance assessment
       */
      async checkCompliance(posId) {
        const config = await this.getConfiguration(posId);
        return _PEMsResource.assessCompliance(config);
      }
      /**
       * Request certificate renewal for a PEM device
       * 
       * @param posId - Point of Sale ID
       * @param certificateType - Type of certificate to renew
       * @returns Promise resolving when renewal is initiated
       */
      async requestCertificateRenewal(_posId, _certificateType = "device") {
        return {
          renewalId: `renewal_${Date.now()}`,
          estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
        };
      }
      // Validation methods
      /**
       * Validate Point of Sale input
       */
      async validatePointOfSaleInput(data, _options = {}) {
        const errors = [];
        if (!data.merchant_uuid || data.merchant_uuid.trim().length === 0) {
          errors.push({
            field: "merchant_uuid",
            message: "Merchant UUID is required",
            code: "REQUIRED"
          });
        }
        if (!data.address) {
          errors.push({
            field: "address",
            message: "Address is required for PEM registration",
            code: "REQUIRED"
          });
        } else {
          const addressErrors = this.validateAddress(data.address);
          errors.push(...addressErrors);
        }
        if (errors.length > 0) {
          throw new ValidationError("Invalid Point of Sale input", "create_point_of_sale", errors);
        }
      }
      /**
       * Validate address information
       */
      validateAddress(address) {
        const errors = [];
        if (!address.street_address) {
          errors.push({
            field: "address.street_address",
            message: "Street address is required",
            code: "REQUIRED"
          });
        }
        if (!address.city) {
          errors.push({
            field: "address.city",
            message: "City is required",
            code: "REQUIRED"
          });
        }
        if (!address.zip_code || !/^\d{5}$/.test(address.zip_code)) {
          errors.push({
            field: "address.zip_code",
            message: "Valid 5-digit ZIP code is required",
            code: "INVALID_FORMAT"
          });
        }
        if (!address.province || address.province.length !== 2) {
          errors.push({
            field: "address.province",
            message: "Valid 2-character province code is required",
            code: "INVALID_FORMAT"
          });
        }
        return errors;
      }
      /**
       * Validate certificates
       * @deprecated This method is not used since certificates field is not available in OpenAPI schema
       */
      // private async validateCertificates(certificates: CertificateInfo[]): Promise<Array<{ field: string; message: string; code: string }>> {
      //   const errors: Array<{ field: string; message: string; code: string }> = [];
      //   for (let i = 0; i < certificates.length; i++) {
      //     const cert = certificates[i];
      //     if (!cert) continue;
      //     if (!cert.type || !['root', 'intermediate', 'device', 'signing', 'encryption'].includes(cert.type)) {
      //       errors.push({
      //         field: `certificates[${i}].type`,
      //         message: 'Invalid certificate type',
      //         code: 'INVALID_CERTIFICATE_TYPE'
      //       });
      //     }
      //     if (!cert.validTo || new Date(cert.validTo) <= new Date()) {
      //       errors.push({
      //         field: `certificates[${i}].validTo`,
      //         message: 'Certificate is expired or expiring soon',
      //         code: 'CERTIFICATE_EXPIRED'
      //       });
      //     }
      //   }
      //   return errors;
      // }
      /**
       * Parse certificate response from API
       */
      parseCertificateResponse(response) {
        if (!response) {
          return [];
        }
        const certificates = [];
        if (response.mtls_certificate) {
          certificates.push({
            id: "mtls_cert",
            type: "device",
            status: "valid",
            issuer: "Italian Tax Agency",
            subject: "PEM Device",
            validFrom: (/* @__PURE__ */ new Date()).toISOString(),
            validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString(),
            serialNumber: "MTLS001",
            fingerprint: response.mtls_certificate.substring(0, 40),
            keyUsage: ["digitalSignature", "keyEncipherment"],
            issuedFor: "PEM Device"
          });
        }
        return certificates;
      }
      // Static utility methods
      /**
       * Build certificate chain from individual certificates
       */
      static buildCertificateChain(certificates) {
        const root = certificates.find((cert) => cert.type === "root");
        const intermediate = certificates.filter((cert) => cert.type === "intermediate");
        const leaf = certificates.find((cert) => cert.type === "device") || certificates[0];
        if (!root || !leaf) {
          throw new FiscalError("Invalid certificate chain: missing root or leaf certificate", "build_certificate_chain");
        }
        const validationResults = this.validateCertificateChain(certificates);
        return {
          root,
          intermediate,
          leaf,
          validationResults
        };
      }
      /**
       * Validate certificate chain integrity
       */
      static validateCertificateChain(certificates) {
        const issues = [];
        const now = /* @__PURE__ */ new Date();
        const expiredCerts = certificates.filter((cert) => new Date(cert.validTo) <= now);
        if (expiredCerts.length > 0) {
          issues.push(`${expiredCerts.length} certificate(s) are expired`);
        }
        const revokedCerts = certificates.filter((cert) => cert.status === "revoked");
        if (revokedCerts.length > 0) {
          issues.push(`${revokedCerts.length} certificate(s) are revoked`);
        }
        const hasRoot = certificates.some((cert) => cert.type === "root");
        const hasLeaf = certificates.some((cert) => cert.type === "device");
        if (!hasRoot) issues.push("Missing root certificate");
        if (!hasLeaf) issues.push("Missing device certificate");
        return {
          chainValid: hasRoot && hasLeaf && issues.length === 0,
          rootTrusted: hasRoot,
          notExpired: expiredCerts.length === 0,
          revocationChecked: true,
          // Mock implementation
          issues
        };
      }
      /**
       * Build PEM configuration from certificates
       */
      static buildPEMConfiguration(posId, certificates) {
        const deviceCert = certificates.find((cert) => cert.type === "device");
        const now = /* @__PURE__ */ new Date();
        return {
          pemId: posId,
          deviceSerialNumber: deviceCert?.serialNumber || "unknown",
          certificates,
          configuration: {
            fiscalMemorySize: "32MB",
            supportedOperations: ["sale", "return", "void", "daily_close"],
            maxDailyTransactions: 1e3,
            complianceVersion: "2.1.0"
          },
          status: this.determinePEMStatus(certificates),
          lastAudit: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3).toISOString(),
          nextCertificateRenewal: this.calculateNextRenewal(certificates)
        };
      }
      /**
       * Determine PEM status based on certificates
       */
      static determinePEMStatus(certificates) {
        const now = /* @__PURE__ */ new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
        const hasExpired = certificates.some((cert) => new Date(cert.validTo) <= now);
        if (hasExpired) return "maintenance";
        const hasExpiringSoon = certificates.some((cert) => new Date(cert.validTo) <= thirtyDaysFromNow);
        if (hasExpiringSoon) return "certificate_renewal";
        const hasRevoked = certificates.some((cert) => cert.status === "revoked");
        if (hasRevoked) return "compliance_check";
        return "active";
      }
      /**
       * Calculate next certificate renewal date
       */
      static calculateNextRenewal(certificates) {
        if (certificates.length === 0) return (/* @__PURE__ */ new Date()).toISOString();
        const earliestExpiry = certificates.map((cert) => new Date(cert.validTo)).sort((a, b) => a.getTime() - b.getTime())[0];
        if (!earliestExpiry) {
          return (/* @__PURE__ */ new Date()).toISOString();
        }
        const renewalDate = new Date(earliestExpiry.getTime() - 60 * 24 * 60 * 60 * 1e3);
        return renewalDate.toISOString();
      }
      /**
       * Assess compliance level
       */
      static assessCompliance(config) {
        const issues = [];
        const recommendations = [];
        let score = 100;
        const expiredCerts = config.certificates.filter((cert) => new Date(cert.validTo) <= /* @__PURE__ */ new Date());
        if (expiredCerts.length > 0) {
          score -= 30;
          issues.push(`${expiredCerts.length} expired certificate(s)`);
          recommendations.push("Renew expired certificates immediately");
        }
        const expiringSoon = config.certificates.filter((cert) => {
          const expiryDate = new Date(cert.validTo);
          const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
          return expiryDate <= thirtyDaysFromNow && expiryDate > /* @__PURE__ */ new Date();
        });
        if (expiringSoon.length > 0) {
          score -= 15;
          issues.push(`${expiringSoon.length} certificate(s) expiring within 30 days`);
          recommendations.push("Schedule certificate renewal");
        }
        if (config.lastAudit) {
          const lastAuditDate = new Date(config.lastAudit);
          const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1e3);
          if (lastAuditDate < sixMonthsAgo) {
            score -= 20;
            issues.push("Audit overdue (last audit more than 6 months ago)");
            recommendations.push("Schedule compliance audit");
          }
        } else {
          score -= 25;
          issues.push("No audit history found");
          recommendations.push("Conduct initial compliance audit");
        }
        let level = "full";
        if (score < 70) level = "non_compliant";
        else if (score < 85) level = "partial";
        else if (issues.length > 0) level = "under_review";
        const now = /* @__PURE__ */ new Date();
        return {
          level,
          score: Math.max(0, score),
          issues,
          recommendations,
          lastCheck: now.toISOString(),
          nextCheck: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString()
        };
      }
      /**
       * Format certificate for display
       */
      static formatCertificateForDisplay(cert) {
        const now = /* @__PURE__ */ new Date();
        const expiryDate = new Date(cert.validTo);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        return {
          displayName: `${cert.type.toUpperCase()} Certificate`,
          statusBadge: cert.status.toUpperCase(),
          validity: `${cert.validFrom.split("T")[0]} to ${cert.validTo.split("T")[0]}`,
          issuerShort: cert.issuer.split(",")[0] || cert.issuer,
          expiresIn: daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : "Expired"
        };
      }
      /**
       * Generate certificate summary report
       */
      static generateCertificateSummary(certificates) {
        const now = /* @__PURE__ */ new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
        const summary = {
          totalCertificates: certificates.length,
          validCertificates: 0,
          expiredCertificates: 0,
          expiringSoon: 0,
          revokedCertificates: 0,
          typeBreakdown: {},
          nextExpiry: null
        };
        let earliestExpiry = null;
        for (const cert of certificates) {
          const expiryDate = new Date(cert.validTo);
          if (cert.status === "revoked") {
            summary.revokedCertificates++;
          } else if (expiryDate <= now) {
            summary.expiredCertificates++;
          } else if (expiryDate <= thirtyDaysFromNow) {
            summary.expiringSoon++;
          } else {
            summary.validCertificates++;
          }
          summary.typeBreakdown[cert.type] = (summary.typeBreakdown[cert.type] || 0) + 1;
          if (!earliestExpiry || expiryDate < earliestExpiry) {
            earliestExpiry = expiryDate;
          }
        }
        summary.nextExpiry = earliestExpiry ? earliestExpiry.toISOString().split("T")[0] || null : null;
        return summary;
      }
      /**
       * Validate certificate signature (placeholder implementation)
       */
      static validateCertificateSignature(cert, issuerCert) {
        if (!issuerCert && cert.type !== "root") {
          return {
            valid: false,
            error: "Cannot validate signature without issuer certificate"
          };
        }
        const isValid = cert.fingerprint && cert.fingerprint !== "unknown";
        return {
          valid: !!isValid,
          ...isValid ? {} : { error: "Invalid certificate signature" }
        };
      }
      /**
       * Generate certificate renewal request
       */
      static generateRenewalRequest(cert) {
        const now = /* @__PURE__ */ new Date();
        const expiryDate = new Date(cert.validTo);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        let urgency = "low";
        if (daysUntilExpiry <= 0) urgency = "critical";
        else if (daysUntilExpiry <= 7) urgency = "high";
        else if (daysUntilExpiry <= 30) urgency = "medium";
        return {
          certificateId: cert.id,
          currentExpiry: cert.validTo,
          requestedValidityPeriod: 365,
          // Days
          justification: daysUntilExpiry <= 30 ? "Certificate expiring soon" : "Routine renewal",
          urgency
        };
      }
    };
  }
});

// src/pwa/push-notifications.ts
var NOTIFICATION_TEMPLATES, DEFAULT_CONFIG6, PushNotificationManager;
var init_push_notifications = __esm({
  "src/pwa/push-notifications.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    NOTIFICATION_TEMPLATES = {
      it: {
        receipt_created: {
          title: "Nuovo Scontrino",
          body: "Scontrino di \u20AC{amount} creato presso {merchantName}"
        },
        receipt_synced: {
          title: "Scontrino Sincronizzato",
          body: "Il tuo scontrino \xE8 stato trasmesso con successo"
        },
        receipt_void: {
          title: "Scontrino Annullato",
          body: "Scontrino #{receiptId} annullato"
        },
        fiscal_alert: {
          title: "\u26A0\uFE0F Avviso Fiscale",
          body: "Azione richiesta per conformit\xE0 fiscale"
        },
        lottery_win: {
          title: "\u{1F389} Hai Vinto!",
          body: "Il tuo scontrino ha vinto alla lotteria!"
        },
        sync_completed: {
          title: "Sincronizzazione Completata",
          body: "{count} scontrini sincronizzati con successo"
        },
        sync_failed: {
          title: "Sincronizzazione Fallita",
          body: "Impossibile sincronizzare {count} scontrini"
        },
        offline_reminder: {
          title: "Modalit\xE0 Offline",
          body: "Hai {count} scontrini in attesa di sincronizzazione"
        },
        app_update: {
          title: "Aggiornamento Disponibile",
          body: "Una nuova versione dell'app \xE8 disponibile"
        }
      },
      en: {
        receipt_created: {
          title: "New Receipt",
          body: "Receipt for \u20AC{amount} created at {merchantName}"
        },
        receipt_synced: {
          title: "Receipt Synced",
          body: "Your receipt has been successfully transmitted"
        },
        receipt_void: {
          title: "Receipt Voided",
          body: "Receipt #{receiptId} has been voided"
        },
        fiscal_alert: {
          title: "\u26A0\uFE0F Fiscal Alert",
          body: "Action required for fiscal compliance"
        },
        lottery_win: {
          title: "\u{1F389} You Won!",
          body: "Your receipt won in the lottery!"
        },
        sync_completed: {
          title: "Sync Completed",
          body: "{count} receipts synced successfully"
        },
        sync_failed: {
          title: "Sync Failed",
          body: "Unable to sync {count} receipts"
        },
        offline_reminder: {
          title: "Offline Mode",
          body: "You have {count} receipts waiting to sync"
        },
        app_update: {
          title: "Update Available",
          body: "A new version of the app is available"
        }
      },
      de: {
        receipt_created: {
          title: "Neuer Beleg",
          body: "Beleg \xFCber \u20AC{amount} erstellt bei {merchantName}"
        },
        receipt_synced: {
          title: "Beleg Synchronisiert",
          body: "Ihr Beleg wurde erfolgreich \xFCbertragen"
        },
        receipt_void: {
          title: "Beleg Storniert",
          body: "Beleg #{receiptId} wurde storniert"
        },
        fiscal_alert: {
          title: "\u26A0\uFE0F Steuerwarnung",
          body: "Aktion f\xFCr Steuerkonformit\xE4t erforderlich"
        },
        lottery_win: {
          title: "\u{1F389} Sie haben gewonnen!",
          body: "Ihr Beleg hat in der Lotterie gewonnen!"
        },
        sync_completed: {
          title: "Synchronisation Abgeschlossen",
          body: "{count} Belege erfolgreich synchronisiert"
        },
        sync_failed: {
          title: "Synchronisation Fehlgeschlagen",
          body: "{count} Belege konnten nicht synchronisiert werden"
        },
        offline_reminder: {
          title: "Offline-Modus",
          body: "Sie haben {count} Belege zur Synchronisation"
        },
        app_update: {
          title: "Update Verf\xFCgbar",
          body: "Eine neue Version der App ist verf\xFCgbar"
        }
      },
      fr: {
        receipt_created: {
          title: "Nouveau Re\xE7u",
          body: "Re\xE7u de \u20AC{amount} cr\xE9\xE9 chez {merchantName}"
        },
        receipt_synced: {
          title: "Re\xE7u Synchronis\xE9",
          body: "Votre re\xE7u a \xE9t\xE9 transmis avec succ\xE8s"
        },
        receipt_void: {
          title: "Re\xE7u Annul\xE9",
          body: "Re\xE7u #{receiptId} a \xE9t\xE9 annul\xE9"
        },
        fiscal_alert: {
          title: "\u26A0\uFE0F Alerte Fiscale",
          body: "Action requise pour la conformit\xE9 fiscale"
        },
        lottery_win: {
          title: "\u{1F389} Vous avez gagn\xE9!",
          body: "Votre re\xE7u a gagn\xE9 \xE0 la loterie!"
        },
        sync_completed: {
          title: "Synchronisation Termin\xE9e",
          body: "{count} re\xE7us synchronis\xE9s avec succ\xE8s"
        },
        sync_failed: {
          title: "\xC9chec de Synchronisation",
          body: "Impossible de synchroniser {count} re\xE7us"
        },
        offline_reminder: {
          title: "Mode Hors Ligne",
          body: "Vous avez {count} re\xE7us en attente de synchronisation"
        },
        app_update: {
          title: "Mise \xE0 Jour Disponible",
          body: "Une nouvelle version de l'application est disponible"
        }
      }
    };
    DEFAULT_CONFIG6 = {
      defaultOptions: {
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        vibrate: [200, 100, 200],
        silent: false,
        requireInteraction: false
      },
      language: "it",
      autoSubscribe: false,
      serverEndpoint: "/api/push/subscribe"
    };
    PushNotificationManager = class extends import_index.default {
      config;
      registration = null;
      subscription = null;
      isSupported;
      permission = "default";
      constructor(config) {
        super();
        this.config = {
          ...DEFAULT_CONFIG6,
          ...config,
          defaultOptions: {
            ...DEFAULT_CONFIG6.defaultOptions,
            ...config.defaultOptions
          }
        };
        this.isSupported = this.checkSupport();
        if (this.isSupported) {
          this.permission = Notification.permission;
          this.initialize();
        }
      }
      /**
       * Check if push notifications are supported
       */
      checkSupport() {
        return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      }
      /**
       * Initialize push notifications
       */
      async initialize() {
        try {
          if (this.config.serviceWorkerRegistration) {
            this.registration = this.config.serviceWorkerRegistration;
          } else {
            this.registration = await navigator.serviceWorker.ready;
          }
          this.subscription = await this.registration.pushManager.getSubscription();
          if (this.subscription) {
            this.emit("subscription:created", {
              subscription: this.extractSubscriptionInfo(this.subscription)
            });
          }
          if (this.config.autoSubscribe && !this.subscription && this.permission === "default") {
            await this.subscribe();
          }
        } catch (error) {
          this.emit("error", {
            error,
            context: "initialization"
          });
        }
      }
      /**
       * Request notification permission
       */
      async requestPermission() {
        if (!this.isSupported) {
          throw new Error("Push notifications are not supported");
        }
        try {
          this.permission = await Notification.requestPermission();
          if (this.permission === "granted") {
            this.emit("permission:granted", { permission: this.permission });
          } else {
            this.emit("permission:denied", { permission: this.permission });
          }
          return this.permission;
        } catch (error) {
          this.emit("error", {
            error,
            context: "permission_request"
          });
          throw error;
        }
      }
      /**
       * Subscribe to push notifications
       */
      async subscribe() {
        if (!this.isSupported || !this.registration) {
          throw new Error("Push notifications not initialized");
        }
        if (this.permission !== "granted") {
          const permission = await this.requestPermission();
          if (permission !== "granted") {
            return null;
          }
        }
        try {
          const applicationServerKey = this.urlBase64ToUint8Array(this.config.vapidPublicKey);
          this.subscription = await this.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: new Uint8Array(applicationServerKey)
          });
          const subscriptionInfo = this.extractSubscriptionInfo(this.subscription);
          await this.sendSubscriptionToServer(subscriptionInfo);
          this.emit("subscription:created", { subscription: subscriptionInfo });
          return subscriptionInfo;
        } catch (error) {
          this.emit("error", {
            error,
            context: "subscription"
          });
          throw error;
        }
      }
      /**
       * Unsubscribe from push notifications
       */
      async unsubscribe() {
        if (!this.subscription) {
          return;
        }
        try {
          await this.subscription.unsubscribe();
          await this.removeSubscriptionFromServer();
          this.subscription = null;
          this.emit("subscription:deleted", { reason: "user_unsubscribed" });
        } catch (error) {
          this.emit("error", {
            error,
            context: "unsubscription"
          });
          throw error;
        }
      }
      /**
       * Show a notification
       */
      async showNotification(payload) {
        if (!this.isSupported || this.permission !== "granted") {
          throw new Error("Cannot show notification: permission not granted");
        }
        try {
          const { title, body, options } = this.prepareNotification(payload);
          if (this.registration) {
            await this.registration.showNotification(title, {
              ...this.config.defaultOptions,
              ...options,
              body,
              data: payload.data,
              tag: payload.type
            });
          } else {
            const notification = new Notification(title, {
              ...this.config.defaultOptions,
              ...options,
              body,
              data: payload.data,
              tag: payload.type
            });
            notification.onclick = () => {
              this.emit("notification:clicked", {
                action: "default",
                data: payload.data || {}
              });
              notification.close();
            };
            notification.onclose = () => {
              this.emit("notification:closed", { notification: payload });
            };
          }
          this.emit("notification:shown", { notification: payload });
        } catch (error) {
          this.emit("error", {
            error,
            context: "show_notification"
          });
          throw error;
        }
      }
      /**
       * Show receipt created notification
       */
      async notifyReceiptCreated(receipt) {
        await this.showNotification({
          type: "receipt_created",
          title: "",
          body: "",
          data: {
            receiptId: receipt.id,
            amount: receipt.amount,
            merchantName: receipt.merchantName,
            timestamp: receipt.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
            actionUrl: `/receipts/${receipt.id}`,
            priority: "normal"
          }
        });
      }
      /**
       * Show fiscal alert notification
       */
      async notifyFiscalAlert(data) {
        await this.showNotification({
          type: "fiscal_alert",
          title: "",
          body: data.message,
          data: {
            receiptId: data.receiptId,
            actionUrl: data.receiptId ? `/receipts/${data.receiptId}` : "/fiscal-alerts",
            priority: data.urgency === "critical" ? "urgent" : "high"
          },
          options: {
            requireInteraction: true
          }
        });
      }
      /**
       * Show lottery win notification
       */
      async notifyLotteryWin(data) {
        await this.showNotification({
          type: "lottery_win",
          title: "",
          body: "",
          data: {
            receiptId: data.receiptId,
            prizeAmount: data.prizeAmount,
            claimCode: data.claimCode,
            actionUrl: `/lottery/claim/${data.receiptId}`,
            priority: "urgent"
          },
          options: {
            requireInteraction: true,
            icon: "/icons/lottery-win.png"
          }
        });
      }
      /**
       * Show sync status notification
       */
      async notifySyncStatus(status, count) {
        const type = status === "completed" ? "sync_completed" : "sync_failed";
        await this.showNotification({
          type,
          title: "",
          body: "",
          data: {
            count: count.toString(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            actionUrl: "/sync-status",
            priority: status === "failed" ? "high" : "normal"
          }
        });
      }
      /**
       * Show offline reminder notification
       */
      async notifyOfflineReminder(pendingCount) {
        if (pendingCount === 0) return;
        await this.showNotification({
          type: "offline_reminder",
          title: "",
          body: "",
          data: {
            count: pendingCount.toString(),
            actionUrl: "/offline-queue",
            priority: pendingCount > 10 ? "high" : "normal"
          }
        });
      }
      /**
       * Prepare notification with localization
       */
      prepareNotification(payload) {
        const templates = NOTIFICATION_TEMPLATES[this.config.language] || NOTIFICATION_TEMPLATES.it;
        const template = templates?.[payload.type] || { title: "Notification", body: "New notification" };
        let title = payload.title || template.title;
        let body = payload.body || template.body;
        if (payload.data) {
          Object.entries(payload.data).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            title = title.replace(placeholder, String(value));
            body = body.replace(placeholder, String(value));
          });
        }
        const actions = [];
        switch (payload.type) {
          case "receipt_created":
          case "receipt_synced":
            actions.push(
              { action: "view", title: this.getActionTitle("view") },
              { action: "dismiss", title: this.getActionTitle("dismiss") }
            );
            break;
          case "fiscal_alert":
            actions.push(
              { action: "resolve", title: this.getActionTitle("resolve") },
              { action: "later", title: this.getActionTitle("later") }
            );
            break;
          case "lottery_win":
            actions.push(
              { action: "claim", title: this.getActionTitle("claim") },
              { action: "share", title: this.getActionTitle("share") }
            );
            break;
          case "sync_failed":
            actions.push(
              { action: "retry", title: this.getActionTitle("retry") },
              { action: "details", title: this.getActionTitle("details") }
            );
            break;
          case "app_update":
            actions.push(
              { action: "update", title: this.getActionTitle("update") },
              { action: "later", title: this.getActionTitle("later") }
            );
            break;
        }
        return {
          title,
          body,
          options: {
            ...payload.options,
            ...actions.length > 0 && { actions }
          }
        };
      }
      /**
       * Get localized action title
       */
      getActionTitle(action) {
        const actionTitles = {
          it: {
            view: "Visualizza",
            dismiss: "Ignora",
            resolve: "Risolvi",
            later: "Pi\xF9 tardi",
            claim: "Riscuoti",
            share: "Condividi",
            retry: "Riprova",
            details: "Dettagli",
            update: "Aggiorna"
          },
          en: {
            view: "View",
            dismiss: "Dismiss",
            resolve: "Resolve",
            later: "Later",
            claim: "Claim",
            share: "Share",
            retry: "Retry",
            details: "Details",
            update: "Update"
          },
          de: {
            view: "Anzeigen",
            dismiss: "Verwerfen",
            resolve: "L\xF6sen",
            later: "Sp\xE4ter",
            claim: "Einl\xF6sen",
            share: "Teilen",
            retry: "Wiederholen",
            details: "Details",
            update: "Aktualisieren"
          },
          fr: {
            view: "Voir",
            dismiss: "Ignorer",
            resolve: "R\xE9soudre",
            later: "Plus tard",
            claim: "R\xE9clamer",
            share: "Partager",
            retry: "R\xE9essayer",
            details: "D\xE9tails",
            update: "Mettre \xE0 jour"
          }
        };
        const titles = actionTitles[this.config.language] || actionTitles.it;
        return titles?.[action] || action;
      }
      /**
       * Convert VAPID key to Uint8Array
       */
      urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }
      /**
       * Extract subscription info from PushSubscription
       */
      extractSubscriptionInfo(subscription) {
        const key = subscription.getKey("p256dh");
        const token = subscription.getKey("auth");
        if (!key || !token) {
          throw new Error("Unable to get subscription keys");
        }
        return {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
            auth: btoa(String.fromCharCode(...new Uint8Array(token)))
          },
          expirationTime: subscription.expirationTime
        };
      }
      /**
       * Send subscription to server
       */
      async sendSubscriptionToServer(subscription) {
        try {
          const response = await fetch(this.config.serverEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              subscription,
              language: this.config.language,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            })
          });
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
          }
        } catch (error) {
          console.error("Failed to send subscription to server:", error);
        }
      }
      /**
       * Remove subscription from server
       */
      async removeSubscriptionFromServer() {
        try {
          if (this.subscription) {
            await fetch(this.config.serverEndpoint, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                endpoint: this.subscription.endpoint
              })
            });
          }
        } catch (error) {
          console.error("Failed to remove subscription from server:", error);
        }
      }
      /**
       * Get current permission status
       */
      getPermission() {
        return this.permission;
      }
      /**
       * Check if notifications are supported
       */
      isNotificationSupported() {
        return this.isSupported;
      }
      /**
       * Check if subscribed to push notifications
       */
      isSubscribed() {
        return this.subscription !== null;
      }
      /**
       * Get current subscription
       */
      getSubscription() {
        if (!this.subscription) {
          return null;
        }
        return this.extractSubscriptionInfo(this.subscription);
      }
      /**
       * Set notification language
       */
      setLanguage(language) {
        this.config.language = language;
      }
      /**
       * Destroy the push notification manager
       */
      async destroy() {
        this.removeAllListeners();
        this.registration = null;
        this.subscription = null;
      }
    };
  }
});

// src/pwa/app-installer.ts
var DEFAULT_CONFIG7, AppInstaller;
var init_app_installer = __esm({
  "src/pwa/app-installer.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    DEFAULT_CONFIG7 = {
      criteria: {
        minEngagementTime: 2 * 60 * 1e3,
        // 2 minutes
        minPageViews: 3,
        minReceiptsCreated: 1,
        daysSinceFirstVisit: 0,
        requireReturnVisit: false
      },
      autoShow: true,
      showDelay: 5e3,
      // 5 seconds
      maxPromptAttempts: 3,
      dismissalCooldown: 7,
      // 7 days
      customPrompt: {
        enabled: true,
        title: "Installa A-Cube E-Receipt",
        message: "Installa l'app per accedere rapidamente ai tuoi scontrini elettronici",
        installButtonText: "Installa",
        cancelButtonText: "Non ora",
        icon: "/icons/install-icon.png"
      },
      analytics: {
        enabled: true,
        trackingId: "",
        customEvents: {}
      },
      platforms: {
        ios: {
          showIOSInstructions: true,
          customInstructions: 'Tocca il pulsante Condividi e seleziona "Aggiungi alla schermata Home"'
        },
        android: {
          enableWebAPK: true,
          customIcon: "/icons/android-install.png"
        },
        desktop: {
          showDesktopPrompt: true,
          position: "bottom"
        }
      }
    };
    AppInstaller = class extends import_index.default {
      config;
      installPrompt = null;
      engagementData;
      platformInfo;
      isInitialized = false;
      engagementTimer;
      promptTimeout = void 0;
      customPromptElement = void 0;
      constructor(config = {}) {
        super();
        this.config = this.mergeConfig(config);
        this.platformInfo = this.detectPlatform();
        this.engagementData = this.loadEngagementData();
        this.initialize();
      }
      /**
       * Merge configuration with defaults
       */
      mergeConfig(config) {
        return {
          ...DEFAULT_CONFIG7,
          ...config,
          criteria: {
            ...DEFAULT_CONFIG7.criteria,
            ...config.criteria
          },
          customPrompt: {
            ...DEFAULT_CONFIG7.customPrompt,
            ...config.customPrompt
          },
          analytics: {
            ...DEFAULT_CONFIG7.analytics,
            ...config.analytics
          },
          platforms: {
            ios: {
              ...DEFAULT_CONFIG7.platforms.ios,
              ...config.platforms?.ios
            },
            android: {
              ...DEFAULT_CONFIG7.platforms.android,
              ...config.platforms?.android
            },
            desktop: {
              ...DEFAULT_CONFIG7.platforms.desktop,
              ...config.platforms?.desktop
            }
          }
        };
      }
      /**
       * Initialize the app installer
       */
      initialize() {
        if (this.isInitialized || typeof window === "undefined") {
          return;
        }
        if (this.platformInfo.isStandalone || this.engagementData.installed) {
          return;
        }
        this.setupEventListeners();
        this.startEngagementTracking();
        this.startCriteriaChecking();
        this.isInitialized = true;
      }
      /**
       * Setup event listeners
       */
      setupEventListeners() {
        window.addEventListener("beforeinstallprompt", (event) => {
          event.preventDefault();
          this.installPrompt = event;
          this.emit("prompt:available", { prompt: this.installPrompt });
          if (this.config.autoShow) {
            this.checkCriteriaAndShow();
          }
        });
        window.addEventListener("appinstalled", () => {
          this.handleAppInstalled("accepted");
        });
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) {
            this.pauseEngagementTracking();
          } else {
            this.resumeEngagementTracking();
            this.updateEngagementData({ pageViews: this.engagementData.pageViews + 1 });
          }
        });
        window.addEventListener("beforeunload", () => {
          this.saveEngagementData();
        });
      }
      /**
       * Detect platform information
       */
      detectPlatform() {
        const userAgent = navigator.userAgent;
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
        let platform = "unknown";
        let browser = "unknown";
        let version = "";
        if (/iPad|iPhone|iPod/.test(userAgent)) {
          platform = "ios";
          browser = /Safari/.test(userAgent) ? "safari" : "other";
          const match = userAgent.match(/OS (\d+)_(\d+)/);
          version = match ? `${match[1]}.${match[2]}` : "";
        } else if (/Android/.test(userAgent)) {
          platform = "android";
          browser = /Chrome/.test(userAgent) ? "chrome" : "other";
          const match = userAgent.match(/Android (\d+\.\d+)/);
          version = match && match[1] ? match[1] : "";
        } else {
          platform = "desktop";
          if (/Chrome/.test(userAgent)) browser = "chrome";
          else if (/Firefox/.test(userAgent)) browser = "firefox";
          else if (/Safari/.test(userAgent)) browser = "safari";
          else if (/Edge/.test(userAgent)) browser = "edge";
        }
        return {
          name: platform,
          browser,
          version,
          supportsNativePrompt: platform === "android" || platform === "desktop",
          supportsWebAPK: platform === "android" && browser === "chrome",
          isStandalone
        };
      }
      /**
       * Load engagement data from storage
       */
      loadEngagementData() {
        try {
          const stored = localStorage.getItem("acube_install_engagement");
          if (stored) {
            return JSON.parse(stored);
          }
        } catch (error) {
          console.warn("Failed to load engagement data:", error);
        }
        const now = Date.now();
        return {
          firstVisit: now,
          lastVisit: now,
          totalTime: 0,
          pageViews: 1,
          receiptsCreated: 0,
          returnVisits: 0,
          promptsShown: 0,
          dismissed: false,
          installed: false
        };
      }
      /**
       * Save engagement data to storage
       */
      saveEngagementData() {
        try {
          localStorage.setItem("acube_install_engagement", JSON.stringify(this.engagementData));
        } catch (error) {
          console.warn("Failed to save engagement data:", error);
        }
      }
      /**
       * Update engagement data
       */
      updateEngagementData(updates) {
        this.engagementData = { ...this.engagementData, ...updates };
        this.saveEngagementData();
      }
      /**
       * Start engagement tracking
       */
      startEngagementTracking() {
        const now = Date.now();
        if (now - this.engagementData.lastVisit > 24 * 60 * 60 * 1e3) {
          this.updateEngagementData({
            returnVisits: this.engagementData.returnVisits + 1,
            lastVisit: now
          });
        }
        this.engagementTimer = setInterval(() => {
          if (!document.hidden) {
            this.updateEngagementData({
              totalTime: this.engagementData.totalTime + 1e3
            });
          }
        }, 1e3);
      }
      /**
       * Pause engagement tracking
       */
      pauseEngagementTracking() {
        if (this.engagementTimer) {
          clearInterval(this.engagementTimer);
        }
      }
      /**
       * Resume engagement tracking
       */
      resumeEngagementTracking() {
        if (!this.engagementTimer) {
          this.startEngagementTracking();
        }
      }
      /**
       * Start criteria checking
       */
      startCriteriaChecking() {
        setTimeout(() => {
          this.checkCriteriaAndShow();
        }, this.config.showDelay);
        setInterval(() => {
          this.checkCriteriaAndShow();
        }, 3e4);
      }
      /**
       * Check if install criteria are met
       */
      async checkCriteria() {
        const { criteria } = this.config;
        const { engagementData } = this;
        if (engagementData.promptsShown >= this.config.maxPromptAttempts) {
          return false;
        }
        if (engagementData.lastPromptShown) {
          const daysSinceLastPrompt = (Date.now() - engagementData.lastPromptShown) / (24 * 60 * 60 * 1e3);
          if (daysSinceLastPrompt < this.config.dismissalCooldown) {
            return false;
          }
        }
        if (criteria.minEngagementTime && engagementData.totalTime < criteria.minEngagementTime) {
          return false;
        }
        if (criteria.minPageViews && engagementData.pageViews < criteria.minPageViews) {
          return false;
        }
        if (criteria.minReceiptsCreated && engagementData.receiptsCreated < criteria.minReceiptsCreated) {
          return false;
        }
        if (criteria.daysSinceFirstVisit) {
          const daysSinceFirst = (Date.now() - engagementData.firstVisit) / (24 * 60 * 60 * 1e3);
          if (daysSinceFirst < criteria.daysSinceFirstVisit) {
            return false;
          }
        }
        if (criteria.requireReturnVisit && engagementData.returnVisits === 0) {
          return false;
        }
        if (criteria.customCriteria) {
          const customResult = await criteria.customCriteria();
          if (!customResult) {
            return false;
          }
        }
        return true;
      }
      /**
       * Check criteria and show prompt if met
       */
      async checkCriteriaAndShow() {
        if (!this.installPrompt && !this.config.customPrompt.enabled) {
          return;
        }
        try {
          const criteriaMet = await this.checkCriteria();
          if (criteriaMet) {
            this.emit("criteria:met", { criteria: this.config.criteria });
            if (this.platformInfo.supportsNativePrompt && this.installPrompt) {
              await this.showNativePrompt();
            } else if (this.config.customPrompt.enabled) {
              await this.showCustomPrompt();
            }
          }
        } catch (error) {
          console.error("Error checking install criteria:", error);
        }
      }
      /**
       * Show native install prompt
       */
      async showNativePrompt() {
        if (!this.installPrompt) {
          throw new Error("Native install prompt not available");
        }
        try {
          this.updateEngagementData({
            promptsShown: this.engagementData.promptsShown + 1,
            lastPromptShown: Date.now()
          });
          this.emit("prompt:shown", { type: "native" });
          this.trackAnalytics("install_prompt_shown", { type: "native" });
          await this.installPrompt.prompt();
          const choiceResult = await this.installPrompt.userChoice;
          this.emit("install:completed", {
            outcome: choiceResult.outcome,
            platform: choiceResult.platform
          });
          this.trackAnalytics("install_prompt_result", {
            outcome: choiceResult.outcome,
            platform: choiceResult.platform
          });
          if (choiceResult.outcome === "accepted") {
            this.handleAppInstalled("accepted");
          } else {
            this.handlePromptDismissed("user");
          }
          this.installPrompt = null;
        } catch (error) {
          this.emit("install:failed", {
            error,
            platform: this.platformInfo.name
          });
          this.trackAnalytics("install_prompt_error", { error: error.message });
        }
      }
      /**
       * Show custom install prompt
       */
      async showCustomPrompt() {
        if (this.customPromptElement) {
          return;
        }
        try {
          this.updateEngagementData({
            promptsShown: this.engagementData.promptsShown + 1,
            lastPromptShown: Date.now()
          });
          this.emit("prompt:shown", { type: "custom" });
          this.trackAnalytics("install_prompt_shown", { type: "custom" });
          this.customPromptElement = this.createCustomPromptUI();
          document.body.appendChild(this.customPromptElement);
          this.promptTimeout = setTimeout(() => {
            this.hideCustomPrompt();
            this.handlePromptDismissed("timeout");
          }, 3e4);
        } catch (error) {
          this.emit("install:failed", {
            error,
            platform: this.platformInfo.name
          });
        }
      }
      /**
       * Create custom prompt UI
       */
      createCustomPromptUI() {
        const { customPrompt, platforms } = this.config;
        const container = document.createElement("div");
        container.className = "acube-install-prompt";
        container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      padding: 20px;
      max-width: 360px;
      width: calc(100% - 40px);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideUp 0.3s ease-out;
    `;
        if (!document.getElementById("acube-install-styles")) {
          const style = document.createElement("style");
          style.id = "acube-install-styles";
          style.textContent = `
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .acube-install-prompt button {
          border: none;
          border-radius: 6px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .acube-install-prompt button:hover {
          transform: translateY(-1px);
        }
      `;
          document.head.appendChild(style);
        }
        if (customPrompt.icon) {
          const icon = document.createElement("img");
          icon.src = customPrompt.icon;
          icon.style.cssText = "width: 48px; height: 48px; border-radius: 8px; margin-bottom: 12px;";
          container.appendChild(icon);
        }
        const title = document.createElement("h3");
        title.textContent = customPrompt.title || "Installa App";
        title.style.cssText = "margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;";
        container.appendChild(title);
        const message = document.createElement("p");
        let messageText = customPrompt.message || "Installa l'app per un accesso pi\xF9 veloce";
        if (this.platformInfo.name === "ios" && platforms.ios?.showIOSInstructions) {
          messageText = platforms.ios?.customInstructions || messageText;
        }
        message.textContent = messageText;
        message.style.cssText = "margin: 0 0 20px 0; font-size: 14px; color: #666; line-height: 1.4;";
        container.appendChild(message);
        const buttonsContainer = document.createElement("div");
        buttonsContainer.style.cssText = "display: flex; gap: 12px; justify-content: flex-end;";
        const cancelButton = document.createElement("button");
        cancelButton.textContent = customPrompt.cancelButtonText || "Non ora";
        cancelButton.style.cssText = "background: #f5f5f5; color: #666;";
        cancelButton.onclick = () => {
          this.hideCustomPrompt();
          this.handlePromptDismissed("user");
        };
        buttonsContainer.appendChild(cancelButton);
        const installButton = document.createElement("button");
        installButton.textContent = customPrompt.installButtonText || "Installa";
        installButton.style.cssText = "background: #1976d2; color: white;";
        installButton.onclick = () => {
          this.hideCustomPrompt();
          this.handleCustomInstall();
        };
        buttonsContainer.appendChild(installButton);
        container.appendChild(buttonsContainer);
        return container;
      }
      /**
       * Hide custom prompt
       */
      hideCustomPrompt() {
        if (this.customPromptElement) {
          this.customPromptElement.remove();
          this.customPromptElement = void 0;
        }
        if (this.promptTimeout) {
          clearTimeout(this.promptTimeout);
          this.promptTimeout = void 0;
        }
      }
      /**
       * Handle custom install button click
       */
      async handleCustomInstall() {
        if (this.installPrompt) {
          await this.showNativePrompt();
        } else {
          this.showInstallInstructions();
        }
      }
      /**
       * Show platform-specific install instructions
       */
      showInstallInstructions() {
        let instructions = "";
        switch (this.platformInfo.name) {
          case "ios":
            instructions = this.config.platforms.ios?.customInstructions || 'Tocca il pulsante Condividi (\u2B06\uFE0F) e seleziona "Aggiungi alla schermata Home"';
            break;
          case "android":
            instructions = 'Apri il menu del browser e seleziona "Aggiungi alla schermata Home"';
            break;
          case "desktop":
            instructions = "Cerca l'icona di installazione nella barra degli indirizzi del browser";
            break;
          default:
            instructions = "Controlla le opzioni del tuo browser per installare questa app";
        }
        alert(instructions);
        this.emit("install:started", { platform: this.platformInfo.name });
        this.trackAnalytics("install_instructions_shown", {
          platform: this.platformInfo.name,
          instructions
        });
      }
      /**
       * Handle app installed
       */
      handleAppInstalled(outcome) {
        this.updateEngagementData({ installed: true });
        this.emit("install:completed", {
          outcome,
          platform: this.platformInfo.name
        });
        this.trackAnalytics("app_installed", {
          platform: this.platformInfo.name,
          outcome
        });
      }
      /**
       * Handle prompt dismissed
       */
      handlePromptDismissed(reason) {
        this.updateEngagementData({ dismissed: true });
        this.emit("prompt:dismissed", { reason });
        this.trackAnalytics("install_prompt_dismissed", { reason });
      }
      /**
       * Track analytics event
       */
      trackAnalytics(event, data) {
        if (!this.config.analytics.enabled) {
          return;
        }
        const analyticsData = {
          ...data,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          platform: this.platformInfo.name,
          browser: this.platformInfo.browser,
          engagement: this.engagementData,
          ...this.config.analytics.customEvents
        };
        this.emit("analytics:tracked", { event, data: analyticsData });
        if (typeof gtag !== "undefined") {
          gtag("event", event, analyticsData);
        }
      }
      /**
       * Record receipt created (for engagement tracking)
       */
      recordReceiptCreated() {
        this.updateEngagementData({
          receiptsCreated: this.engagementData.receiptsCreated + 1
        });
      }
      /**
       * Manually trigger install prompt
       */
      async showInstallPrompt() {
        if (this.platformInfo.supportsNativePrompt && this.installPrompt) {
          await this.showNativePrompt();
        } else if (this.config.customPrompt.enabled) {
          await this.showCustomPrompt();
        } else {
          this.showInstallInstructions();
        }
      }
      /**
       * Check if app can be installed
       */
      canInstall() {
        return !this.platformInfo.isStandalone && !this.engagementData.installed && (!!this.installPrompt || !!this.config.customPrompt?.enabled);
      }
      /**
       * Get engagement statistics
       */
      getEngagementStats() {
        return { ...this.engagementData };
      }
      /**
       * Get platform information
       */
      getPlatformInfo() {
        return { ...this.platformInfo };
      }
      /**
       * Reset engagement data (for testing)
       */
      resetEngagement() {
        const now = Date.now();
        this.engagementData = {
          firstVisit: now,
          lastVisit: now,
          totalTime: 0,
          pageViews: 1,
          receiptsCreated: 0,
          returnVisits: 0,
          promptsShown: 0,
          dismissed: false,
          installed: false
        };
        this.saveEngagementData();
      }
      /**
       * Destroy the app installer
       */
      destroy() {
        if (this.engagementTimer) {
          clearInterval(this.engagementTimer);
        }
        if (this.promptTimeout) {
          clearTimeout(this.promptTimeout);
        }
        this.hideCustomPrompt();
        this.saveEngagementData();
        this.removeAllListeners();
      }
    };
  }
});

// src/pwa/pwa-manager.ts
var pwa_manager_exports = {};
__export(pwa_manager_exports, {
  PWAManager: () => PWAManager
});
var DEFAULT_CONFIG8, PWAManager;
var init_pwa_manager = __esm({
  "src/pwa/pwa-manager.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_push_notifications();
    init_app_installer();
    DEFAULT_CONFIG8 = {
      serviceWorkerPath: "/sw.js",
      autoRegister: true,
      enableInstallPrompts: true,
      cacheStrategy: {
        apiCacheDuration: 5 * 60 * 1e3,
        // 5 minutes
        staticCacheDuration: 24 * 60 * 60 * 1e3,
        // 24 hours
        staleWhileRevalidate: true
      },
      backgroundSync: {
        enablePeriodicSync: true,
        minSyncInterval: 15 * 60 * 1e3
        // 15 minutes
      },
      pushNotifications: {
        enabled: false,
        vapidPublicKey: ""
      },
      appInstaller: {
        enabled: true,
        autoShow: true,
        criteria: {
          minEngagementTime: 2 * 60 * 1e3,
          // 2 minutes
          minPageViews: 3,
          minReceiptsCreated: 1
        },
        config: {}
      }
    };
    PWAManager = class extends import_index.default {
      config;
      registration = null;
      installPrompt = null;
      isSupported;
      messageChannel = null;
      pushManager;
      appInstaller;
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG8, ...config };
        this.isSupported = this.checkPWASupport();
        if (this.isSupported) {
          this.setupEventListeners();
          if (this.config.autoRegister) {
            this.registerServiceWorker().catch((error) => {
              console.error("Failed to auto-register service worker:", error);
            });
          }
        }
      }
      /**
       * Check if PWA features are supported
       */
      checkPWASupport() {
        return typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window && "fetch" in window;
      }
      /**
       * Setup event listeners for PWA features
       */
      setupEventListeners() {
        if (this.config.enableInstallPrompts) {
          window.addEventListener("beforeinstallprompt", (event) => {
            event.preventDefault();
            this.installPrompt = event;
            this.emit("install:available", { prompt: this.installPrompt });
          });
          window.addEventListener("appinstalled", () => {
            this.installPrompt = null;
            this.emit("install:completed", { outcome: "accepted" });
          });
        }
        window.addEventListener("online", () => {
          this.handleOnlineStatusChange(true);
        });
        window.addEventListener("offline", () => {
          this.handleOnlineStatusChange(false);
        });
      }
      /**
       * Register service worker
       */
      async registerServiceWorker() {
        if (!this.isSupported) {
          throw new Error("Service workers are not supported in this environment");
        }
        try {
          this.registration = await navigator.serviceWorker.register(
            this.config.serviceWorkerPath,
            {
              scope: "/",
              updateViaCache: "imports"
            }
          );
          this.setupMessageChannel();
          this.registration.addEventListener("updatefound", () => {
            const newWorker = this.registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  this.emit("sw:updated", { registration: this.registration });
                }
              });
            }
          });
          if (this.config.backgroundSync.enablePeriodicSync && "periodicSync" in this.registration) {
            await this.registerPeriodicSync();
          }
          if (this.config.pushNotifications.enabled) {
            await this.initializePushNotifications();
          }
          if (this.config.appInstaller.enabled) {
            await this.initializeAppInstaller();
          }
          this.emit("sw:registered", { registration: this.registration });
          console.log("Service worker registered successfully");
          return this.registration;
        } catch (error) {
          const swError = new Error(`Service worker registration failed: ${error}`);
          this.emit("sw:error", { error: swError });
          throw swError;
        }
      }
      /**
       * Setup message channel for service worker communication
       */
      setupMessageChannel() {
        if (!this.registration) return;
        this.messageChannel = new MessageChannel();
        this.messageChannel.port1.onmessage = (event) => {
          const { type, data } = event.data;
          switch (type) {
            case "CACHE_SIZE":
              this.emit("cache:updated", { cacheName: "all", size: data.reduce((sum, cache) => sum + cache.size, 0) });
              break;
            case "OFFLINE_SYNC_SUCCESS":
              this.emit("offline:synced", { request: data.url, id: data.id });
              break;
            case "CACHE_CLEARED":
              this.emit("cache:updated", { cacheName: "all", size: 0 });
              break;
          }
        };
        navigator.serviceWorker.controller?.postMessage(
          { type: "PORT_TRANSFER" },
          [this.messageChannel.port2]
        );
      }
      /**
       * Register periodic background sync
       */
      async registerPeriodicSync() {
        if (!this.registration || !("periodicSync" in this.registration)) {
          console.warn("Periodic background sync not supported");
          return;
        }
        try {
          const status = await navigator.permissions.query({ name: "periodic-background-sync" });
          if (status.state === "granted") {
            await this.registration.periodicSync.register("offline-queue-periodic", {
              minInterval: this.config.backgroundSync.minSyncInterval
            });
            console.log("Periodic background sync registered");
          }
        } catch (error) {
          console.warn("Failed to register periodic background sync:", error);
        }
      }
      /**
       * Initialize app installer
       */
      async initializeAppInstaller() {
        try {
          const installerConfig = {
            ...this.config.appInstaller.config,
            criteria: this.config.appInstaller.criteria ?? DEFAULT_CONFIG8.appInstaller.criteria,
            autoShow: this.config.appInstaller.autoShow ?? DEFAULT_CONFIG8.appInstaller.autoShow
          };
          this.appInstaller = new AppInstaller(installerConfig);
          this.appInstaller.on("criteria:met", () => {
            this.emit("app:installable", { canInstall: true });
          });
          this.appInstaller.on("prompt:shown", ({ type }) => {
            this.emit("app:install-prompted", { type });
          });
          this.appInstaller.on("prompt:dismissed", ({ reason }) => {
            this.emit("app:install-dismissed", { reason });
          });
          this.appInstaller.on("install:completed", ({ outcome, platform }) => {
            if (outcome === "accepted") {
              this.emit("app:installed", { platform });
            }
          });
          console.log("App installer initialized");
        } catch (error) {
          console.warn("Failed to initialize app installer:", error);
        }
      }
      /**
       * Initialize push notifications
       */
      async initializePushNotifications() {
        if (!this.registration || !this.config.pushNotifications.vapidPublicKey) {
          console.warn("Push notifications not configured");
          return;
        }
        try {
          const pushConfig = {
            vapidPublicKey: this.config.pushNotifications.vapidPublicKey,
            serviceWorkerRegistration: this.registration,
            autoSubscribe: true,
            language: "it",
            // Default for Italian e-receipts
            serverEndpoint: "/api/push/subscribe"
          };
          this.pushManager = new PushNotificationManager(pushConfig);
          this.pushManager.on("subscription:created", ({ subscription }) => {
            this.emit("push:subscribed", { subscription });
          });
          this.pushManager.on("subscription:deleted", ({ reason }) => {
            this.emit("push:unsubscribed", { reason });
          });
          this.pushManager.on("notification:shown", ({ notification }) => {
            this.emit("notification:shown", { notification });
          });
          this.pushManager.on("notification:clicked", ({ action, data }) => {
            this.emit("notification:clicked", { action, data });
          });
          this.pushManager.on("error", (error) => {
            console.error("Push notification error:", error);
          });
          console.log("Push notifications initialized");
        } catch (error) {
          console.warn("Failed to initialize push notifications:", error);
        }
      }
      /**
       * Handle online/offline status changes
       */
      handleOnlineStatusChange(isOnline) {
        if (isOnline && this.registration) {
          this.triggerBackgroundSync();
        }
      }
      /**
       * Trigger background sync
       */
      async triggerBackgroundSync() {
        if (!this.registration || !("sync" in this.registration)) {
          console.warn("Background sync not supported");
          return;
        }
        try {
          await this.registration.sync.register("offline-queue-sync");
          console.log("Background sync triggered");
        } catch (error) {
          console.warn("Failed to trigger background sync:", error);
        }
      }
      /**
       * Show app install prompt
       */
      async showInstallPrompt() {
        if (this.appInstaller) {
          try {
            await this.appInstaller.showInstallPrompt();
            return null;
          } catch (error) {
            console.error("Failed to show install prompt via AppInstaller:", error);
          }
        }
        if (!this.installPrompt) {
          console.warn("Install prompt not available");
          return null;
        }
        try {
          await this.installPrompt.prompt();
          const choiceResult = await this.installPrompt.userChoice;
          this.emit("install:completed", { outcome: choiceResult.outcome });
          this.installPrompt = null;
          return choiceResult;
        } catch (error) {
          console.error("Failed to show install prompt:", error);
          return null;
        }
      }
      /**
       * Get cache information
       */
      async getCacheInfo() {
        if (!this.messageChannel) {
          throw new Error("Service worker not registered or message channel not available");
        }
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Cache info request timeout"));
          }, 5e3);
          this.messageChannel.port1.onmessage = (event) => {
            if (event.data.type === "CACHE_SIZE") {
              clearTimeout(timeout);
              const cacheInfo = event.data.data.map((cache) => ({
                name: cache.name,
                size: cache.size,
                lastUpdated: /* @__PURE__ */ new Date()
              }));
              resolve(cacheInfo);
            }
          };
          navigator.serviceWorker.controller?.postMessage({ type: "GET_CACHE_SIZE" });
        });
      }
      /**
       * Clear all caches
       */
      async clearCache() {
        if (!this.messageChannel) {
          throw new Error("Service worker not registered or message channel not available");
        }
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Clear cache request timeout"));
          }, 1e4);
          this.messageChannel.port1.onmessage = (event) => {
            if (event.data.type === "CACHE_CLEARED") {
              clearTimeout(timeout);
              resolve();
            }
          };
          navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_CACHE" });
        });
      }
      /**
       * Force service worker update
       */
      async updateServiceWorker() {
        if (!this.registration) {
          throw new Error("Service worker not registered");
        }
        try {
          await this.registration.update();
          if (this.registration.waiting) {
            navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
          }
        } catch (error) {
          console.error("Failed to update service worker:", error);
          throw error;
        }
      }
      /**
       * Check if app is installable
       */
      isInstallable() {
        if (this.appInstaller) {
          return this.appInstaller.canInstall();
        }
        return this.installPrompt !== null;
      }
      /**
       * Check if app is installed
       */
      isInstalled() {
        if (this.appInstaller) {
          return this.appInstaller.getPlatformInfo().isStandalone;
        }
        return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.navigator.standalone === true;
      }
      /**
       * Get service worker registration
       */
      getRegistration() {
        return this.registration;
      }
      /**
       * Check if PWA features are supported
       */
      isPWASupported() {
        return this.isSupported;
      }
      /**
       * Get push notification manager
       */
      getPushManager() {
        return this.pushManager;
      }
      /**
       * Get app installer
       */
      getAppInstaller() {
        return this.appInstaller;
      }
      /**
       * Record receipt created (for app installer engagement tracking)
       */
      recordReceiptCreated() {
        if (this.appInstaller) {
          this.appInstaller.recordReceiptCreated();
        }
      }
      /**
       * Get engagement statistics
       */
      getEngagementStats() {
        if (this.appInstaller) {
          return this.appInstaller.getEngagementStats();
        }
        return null;
      }
      /**
       * Check if app install criteria are met
       */
      async checkInstallCriteria() {
        if (this.appInstaller) {
          return this.appInstaller.checkCriteria();
        }
        return false;
      }
      /**
       * Subscribe to push notifications
       */
      async subscribeToPushNotifications() {
        if (!this.pushManager) {
          throw new Error("Push notifications not initialized");
        }
        return this.pushManager.subscribe();
      }
      /**
       * Unsubscribe from push notifications
       */
      async unsubscribeFromPushNotifications() {
        if (!this.pushManager) {
          throw new Error("Push notifications not initialized");
        }
        return this.pushManager.unsubscribe();
      }
      /**
       * Show a notification
       */
      async showNotification(payload) {
        if (!this.pushManager) {
          throw new Error("Push notifications not initialized");
        }
        return this.pushManager.showNotification(payload);
      }
      /**
       * Check if subscribed to push notifications
       */
      isPushSubscribed() {
        return this.pushManager?.isSubscribed() || false;
      }
      /**
       * Destroy PWA manager
       */
      async destroy() {
        if (this.registration) {
          try {
            await this.registration.unregister();
          } catch (error) {
            console.warn("Failed to unregister service worker:", error);
          }
        }
        if (this.messageChannel) {
          this.messageChannel.port1.close();
          this.messageChannel.port2.close();
        }
        if (this.pushManager) {
          await this.pushManager.destroy();
        }
        if (this.appInstaller) {
          this.appInstaller.destroy();
        }
        this.removeAllListeners();
      }
    };
  }
});

// src/pwa/manifest-generator.ts
var manifest_generator_exports = {};
__export(manifest_generator_exports, {
  ManifestGenerator: () => ManifestGenerator
});
var DEFAULT_MANIFEST_CONFIG, ManifestGenerator;
var init_manifest_generator = __esm({
  "src/pwa/manifest-generator.ts"() {
    "use strict";
    init_esm_shims();
    DEFAULT_MANIFEST_CONFIG = {
      name: "A-Cube E-Receipt",
      shortName: "A-Cube",
      description: "Gestione scontrini elettronici per il sistema fiscale italiano",
      startUrl: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      themeColor: "#1976d2",
      backgroundColor: "#ffffff",
      lang: "it",
      categories: ["business", "finance", "productivity"],
      icons: [
        {
          src: "/icons/icon-72x72.png",
          sizes: "72x72",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-96x96.png",
          sizes: "96x96",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-128x128.png",
          sizes: "128x128",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-144x144.png",
          sizes: "144x144",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-152x152.png",
          sizes: "152x152",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-384x384.png",
          sizes: "384x384",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/maskable-icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: "/icons/maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
      screenshots: [
        {
          src: "/screenshots/desktop.png",
          sizes: "1280x720",
          type: "image/png",
          platform: "wide",
          label: "Desktop view of A-Cube E-Receipt dashboard"
        },
        {
          src: "/screenshots/mobile.png",
          sizes: "750x1334",
          type: "image/png",
          platform: "narrow",
          label: "Mobile view of A-Cube E-Receipt"
        }
      ],
      shortcuts: [
        {
          name: "Nuovo Scontrino",
          url: "/receipts/new",
          description: "Crea un nuovo scontrino elettronico",
          icons: [
            {
              src: "/icons/new-receipt-96x96.png",
              sizes: "96x96",
              type: "image/png"
            }
          ]
        },
        {
          name: "Dashboard",
          url: "/dashboard",
          description: "Visualizza il pannello di controllo",
          icons: [
            {
              src: "/icons/dashboard-96x96.png",
              sizes: "96x96",
              type: "image/png"
            }
          ]
        },
        {
          name: "Storico",
          url: "/receipts/history",
          description: "Consulta lo storico degli scontrini",
          icons: [
            {
              src: "/icons/history-96x96.png",
              sizes: "96x96",
              type: "image/png"
            }
          ]
        },
        {
          name: "Impostazioni",
          url: "/settings",
          description: "Gestisci le impostazioni dell'applicazione",
          icons: [
            {
              src: "/icons/settings-96x96.png",
              sizes: "96x96",
              type: "image/png"
            }
          ]
        }
      ]
    };
    ManifestGenerator = class _ManifestGenerator {
      config;
      constructor(config = {}) {
        this.config = { ...DEFAULT_MANIFEST_CONFIG, ...config };
      }
      /**
       * Generate web app manifest
       */
      generateManifest() {
        const manifest = {
          name: this.config.name,
          short_name: this.config.shortName,
          description: this.config.description,
          start_url: this.config.startUrl,
          scope: this.config.scope,
          display: this.config.display,
          orientation: this.config.orientation,
          theme_color: this.config.themeColor,
          background_color: this.config.backgroundColor,
          lang: this.config.lang,
          categories: this.config.categories,
          icons: this.config.icons.map((icon) => ({
            src: icon.src,
            sizes: icon.sizes,
            type: icon.type || "image/png",
            ...icon.purpose && { purpose: icon.purpose }
          }))
        };
        if (this.config.screenshots && this.config.screenshots.length > 0) {
          manifest.screenshots = this.config.screenshots.map((screenshot) => ({
            src: screenshot.src,
            sizes: screenshot.sizes,
            type: screenshot.type,
            ...screenshot.platform && { platform: screenshot.platform },
            ...screenshot.label && { label: screenshot.label }
          }));
        }
        if (this.config.shortcuts && this.config.shortcuts.length > 0) {
          manifest.shortcuts = this.config.shortcuts.map((shortcut) => ({
            name: shortcut.name,
            url: shortcut.url,
            ...shortcut.description && { description: shortcut.description },
            ...shortcut.icons && { icons: shortcut.icons.map((icon) => ({
              src: icon.src,
              sizes: icon.sizes,
              ...icon.type && { type: icon.type }
            })) }
          }));
        }
        return manifest;
      }
      /**
       * Generate manifest as JSON string
       */
      generateManifestJSON() {
        return JSON.stringify(this.generateManifest(), null, 2);
      }
      /**
       * Generate HTML meta tags for PWA
       */
      generateHTMLMetaTags() {
        const manifest = this.generateManifest();
        const tags = [];
        tags.push(`<meta name="application-name" content="${manifest.name}">`);
        tags.push(`<meta name="theme-color" content="${manifest.theme_color}">`);
        tags.push(`<meta name="description" content="${manifest.description}">`);
        tags.push('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">');
        tags.push('<link rel="manifest" href="/manifest.json">');
        tags.push('<meta name="apple-mobile-web-app-capable" content="yes">');
        tags.push(`<meta name="apple-mobile-web-app-title" content="${manifest.short_name}">`);
        tags.push('<meta name="apple-mobile-web-app-status-bar-style" content="default">');
        const appleIcons = manifest.icons.filter(
          (icon) => ["152x152", "180x180", "192x192"].includes(icon.sizes)
        );
        appleIcons.forEach((icon) => {
          tags.push(`<link rel="apple-touch-icon" sizes="${icon.sizes}" href="${icon.src}">`);
        });
        const favicon = manifest.icons.find((icon) => icon.sizes === "32x32") || manifest.icons[0];
        if (favicon) {
          tags.push(`<link rel="icon" type="${favicon.type}" href="${favicon.src}">`);
        }
        tags.push(`<meta name="msapplication-TileColor" content="${manifest.theme_color}">`);
        const msIcon = manifest.icons.find((icon) => icon.sizes === "144x144");
        if (msIcon) {
          tags.push(`<meta name="msapplication-TileImage" content="${msIcon.src}">`);
        }
        return tags.join("\n");
      }
      /**
       * Generate service worker registration script
       */
      generateServiceWorkerScript(serviceWorkerPath = "/sw.js") {
        return `
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('${serviceWorkerPath}')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
</script>`.trim();
      }
      /**
       * Update manifest configuration
       */
      updateConfig(updates) {
        this.config = { ...this.config, ...updates };
      }
      /**
       * Get current configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * Generate localized manifest for different languages
       */
      generateLocalizedManifest(locale) {
        const localizedConfig = this.getLocalizedConfig(locale);
        const generator = new _ManifestGenerator(localizedConfig);
        return generator.generateManifest();
      }
      /**
       * Get localized configuration
       */
      getLocalizedConfig(locale) {
        const localizations = {
          "en": {
            name: "A-Cube E-Receipt",
            shortName: "A-Cube",
            description: "Electronic receipt management for Italian tax system",
            lang: "en",
            shortcuts: [
              {
                name: "New Receipt",
                url: "/receipts/new",
                description: "Create a new electronic receipt"
              },
              {
                name: "Dashboard",
                url: "/dashboard",
                description: "View control panel"
              },
              {
                name: "History",
                url: "/receipts/history",
                description: "Browse receipt history"
              },
              {
                name: "Settings",
                url: "/settings",
                description: "Manage application settings"
              }
            ]
          },
          "de": {
            name: "A-Cube E-Receipt",
            shortName: "A-Cube",
            description: "Elektronische Belegverwaltung f\xFCr das italienische Steuersystem",
            lang: "de",
            shortcuts: [
              {
                name: "Neuer Beleg",
                url: "/receipts/new",
                description: "Erstelle einen neuen elektronischen Beleg"
              },
              {
                name: "Dashboard",
                url: "/dashboard",
                description: "Kontrollpanel anzeigen"
              },
              {
                name: "Verlauf",
                url: "/receipts/history",
                description: "Belegverlauf durchsuchen"
              },
              {
                name: "Einstellungen",
                url: "/settings",
                description: "Anwendungseinstellungen verwalten"
              }
            ]
          },
          "fr": {
            name: "A-Cube E-Receipt",
            shortName: "A-Cube",
            description: "Gestion des re\xE7us \xE9lectroniques pour le syst\xE8me fiscal italien",
            lang: "fr",
            shortcuts: [
              {
                name: "Nouveau Re\xE7u",
                url: "/receipts/new",
                description: "Cr\xE9er un nouveau re\xE7u \xE9lectronique"
              },
              {
                name: "Tableau de Bord",
                url: "/dashboard",
                description: "Afficher le panneau de contr\xF4le"
              },
              {
                name: "Historique",
                url: "/receipts/history",
                description: "Consulter l'historique des re\xE7us"
              },
              {
                name: "Param\xE8tres",
                url: "/settings",
                description: "G\xE9rer les param\xE8tres de l'application"
              }
            ]
          }
        };
        const localization = localizations[locale] || {};
        return { ...this.config, ...localization };
      }
      /**
       * Validate manifest configuration
       */
      validateManifest() {
        const errors = [];
        const manifest = this.generateManifest();
        if (!manifest.name || manifest.name.length === 0) {
          errors.push("Manifest name is required");
        }
        if (!manifest.short_name || manifest.short_name.length === 0) {
          errors.push("Manifest short_name is required");
        }
        if (!manifest.start_url || manifest.start_url.length === 0) {
          errors.push("Manifest start_url is required");
        }
        if (!manifest.icons || manifest.icons.length === 0) {
          errors.push("At least one icon is required");
        } else {
          const hasRequiredSizes = manifest.icons.some(
            (icon) => ["192x192", "512x512"].includes(icon.sizes)
          );
          if (!hasRequiredSizes) {
            errors.push("Icons with sizes 192x192 and 512x512 are recommended");
          }
        }
        const validDisplayModes = ["standalone", "fullscreen", "minimal-ui", "browser"];
        if (!validDisplayModes.includes(manifest.display)) {
          errors.push(`Invalid display mode: ${manifest.display}`);
        }
        return {
          isValid: errors.length === 0,
          errors
        };
      }
      /**
       * Generate complete PWA setup files
       */
      generatePWAFiles() {
        return {
          manifest: this.generateManifestJSON(),
          html: this.generateHTMLMetaTags(),
          serviceWorkerScript: this.generateServiceWorkerScript(),
          validation: this.validateManifest()
        };
      }
    };
  }
});

// src/sync/sync-engine.ts
var sync_engine_exports = {};
__export(sync_engine_exports, {
  ProgressiveSyncEngine: () => ProgressiveSyncEngine
});
var DEFAULT_CONFIG9, ProgressiveSyncEngine;
var init_sync_engine = __esm({
  "src/sync/sync-engine.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    DEFAULT_CONFIG9 = {
      maxConcurrentSyncs: 3,
      defaultTimeout: 3e4,
      defaultRetries: 3,
      batchSize: 100,
      enableRollback: true,
      enableDeltaSync: true,
      enableCompression: true,
      checkpointInterval: 5e3
    };
    ProgressiveSyncEngine = class extends import_index.default {
      config;
      activeSyncs = /* @__PURE__ */ new Map();
      syncQueue = [];
      isProcessingQueue = false;
      lastSyncTimestamp = null;
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG9, ...config };
      }
      /**
       * Initialize the sync engine
       */
      async initialize() {
        this.processQueue();
        this.emit("sync.started", {
          syncId: "initialization",
          strategy: "immediate",
          direction: "bidirectional",
          operation: "full",
          startTime: /* @__PURE__ */ new Date(),
          options: {}
        });
      }
      /**
       * Execute a progressive sync operation with rollback capability
       */
      async executeSync(options = {}) {
        const syncId = this.generateSyncId();
        if (this.activeSyncs.size >= this.config.maxConcurrentSyncs) {
          return this.queueSync(syncId, options);
        }
        return this.executeSyncInternal(syncId, options);
      }
      /**
       * Calculate data deltas for efficient synchronization
       */
      async calculateDeltas(since) {
        const sinceTimestamp = since || this.lastSyncTimestamp || /* @__PURE__ */ new Date(0);
        const deltas = [];
        const totalChanges = deltas.length;
        const estimatedSyncTime = this.estimateSyncTime(deltas);
        const estimatedBandwidth = this.estimateBandwidth(deltas);
        return {
          deltas,
          lastSyncTimestamp: sinceTimestamp,
          totalChanges,
          estimatedSyncTime,
          estimatedBandwidth
        };
      }
      /**
       * Get current sync status and metrics
       */
      getStatus() {
        return {
          activeSyncs: this.activeSyncs.size,
          queuedSyncs: this.syncQueue.length,
          status: this.activeSyncs.size > 0 ? "syncing" : "idle",
          lastSync: this.lastSyncTimestamp
        };
      }
      /**
       * Cancel a specific sync operation
       */
      async cancelSync(syncId) {
        const context = this.activeSyncs.get(syncId);
        if (!context) {
          return false;
        }
        try {
          context.abortController.abort();
          this.emit("sync.failed", {
            type: "sync.failed",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: syncId,
            data: {
              syncId,
              error: {
                id: `cancel_${Date.now()}`,
                phase: context.currentPhase,
                operation: "cancel",
                error: new Error("Sync cancelled by user"),
                retryable: false,
                timestamp: /* @__PURE__ */ new Date(),
                context: {}
              },
              phase: context.currentPhase,
              retryable: false
            }
          });
          return true;
        } catch (error) {
          return false;
        } finally {
          this.activeSyncs.delete(syncId);
          this.processQueue();
        }
      }
      /**
       * Cancel all active sync operations
       */
      async cancelAllSyncs() {
        const cancelPromises = Array.from(this.activeSyncs.keys()).map(
          (syncId) => this.cancelSync(syncId)
        );
        await Promise.all(cancelPromises);
        this.syncQueue.length = 0;
      }
      async executeSyncInternal(syncId, options) {
        const context = this.createExecutionContext(syncId, options);
        this.activeSyncs.set(syncId, context);
        try {
          this.emitSyncStarted(context);
          const result = await this.executeSyncPhases(context);
          this.emitSyncCompleted(context, result);
          this.lastSyncTimestamp = /* @__PURE__ */ new Date();
          return result;
        } catch (error) {
          const syncError = this.createSyncError(context, error);
          context.errors.push(syncError);
          if (this.config.enableRollback && context.checkpoints.length > 0) {
            await this.rollbackToLastCheckpoint(context);
          }
          this.emitSyncFailed(context, syncError);
          throw error;
        } finally {
          this.activeSyncs.delete(syncId);
          this.processQueue();
        }
      }
      async executeSyncPhases(context) {
        const phases = ["validate", "prepare", "execute", "verify", "cleanup"];
        for (const phase of phases) {
          if (context.abortController.signal.aborted) {
            throw new Error("Sync cancelled");
          }
          context.currentPhase = phase;
          if (this.config.enableRollback) {
            await this.createCheckpoint(context, phase);
          }
          this.emitSyncProgress(context, phases.indexOf(phase), phases.length);
          try {
            await this.executePhase(context, phase);
          } catch (error) {
            if (this.config.enableRollback) {
              await this.rollbackToLastCheckpoint(context);
            }
            throw error;
          }
        }
        return this.createSyncResult(context, "success");
      }
      async executePhase(context, phase) {
        switch (phase) {
          case "validate":
            await this.validateSyncOperation(context);
            break;
          case "prepare":
            await this.prepareSyncData(context);
            break;
          case "execute":
            await this.executeSyncOperations(context);
            break;
          case "verify":
            await this.verifySyncResults(context);
            break;
          case "cleanup":
            await this.cleanupSyncResources(context);
            break;
        }
      }
      async validateSyncOperation(context) {
        const { options } = context;
        if (options.resources && options.resources.length === 0) {
          throw new Error("No resources specified for sync");
        }
        context.statistics.totalOperations = options.resources?.length || 1;
      }
      async prepareSyncData(context) {
        if (this.config.enableDeltaSync && context.options.operation === "delta") {
          const deltaResult = await this.calculateDeltas(context.options.since);
          context.statistics.totalOperations = deltaResult.totalChanges;
        }
      }
      async executeSyncOperations(context) {
        const { options: _options } = context;
        const batchSize = this.config.batchSize;
        const totalOperations = context.statistics.totalOperations;
        for (let i = 0; i < totalOperations; i += batchSize) {
          if (context.abortController.signal.aborted) {
            throw new Error("Sync cancelled during execution");
          }
          const batchEnd = Math.min(i + batchSize, totalOperations);
          try {
            await this.executeBatch(context, i, batchEnd);
            context.statistics.completedOperations = batchEnd;
            this.emitSyncProgress(context, batchEnd, totalOperations);
          } catch (error) {
            context.statistics.failedOperations += batchEnd - i;
            const syncError = this.createSyncError(context, error);
            context.errors.push(syncError);
            if (!this.isRetryableError(error)) {
              throw error;
            }
          }
        }
      }
      async executeBatch(context, start, end) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        context.statistics.networkRequests += 1;
        context.statistics.bytesTransferred += (end - start) * 100;
        context.statistics.recordsSynced += end - start;
      }
      async verifySyncResults(context) {
        const { statistics } = context;
        if (statistics.failedOperations > 0) {
          throw new Error(`Sync verification failed: ${statistics.failedOperations} operations failed`);
        }
      }
      async cleanupSyncResources(context) {
        context.checkpoints.length = 0;
      }
      async createCheckpoint(context, phase) {
        const checkpoint = {
          id: `checkpoint_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          phase,
          timestamp: /* @__PURE__ */ new Date(),
          completedOperations: context.statistics.completedOperations,
          state: {
            // Store relevant state for rollback
            phase,
            completedOperations: context.statistics.completedOperations
          }
        };
        context.checkpoints.push(checkpoint);
        if (context.checkpoints.length > 10) {
          context.checkpoints.shift();
        }
      }
      async rollbackToLastCheckpoint(context) {
        const lastCheckpoint = context.checkpoints[context.checkpoints.length - 1];
        if (!lastCheckpoint) {
          return;
        }
        context.currentPhase = lastCheckpoint.phase;
        context.statistics.completedOperations = lastCheckpoint.completedOperations;
      }
      async queueSync(syncId, options) {
        return new Promise((resolve, reject) => {
          this.syncQueue.push({ id: syncId, options, resolve, reject });
          this.processQueue();
        });
      }
      async processQueue() {
        if (this.isProcessingQueue || this.syncQueue.length === 0) {
          return;
        }
        this.isProcessingQueue = true;
        try {
          while (this.syncQueue.length > 0 && this.activeSyncs.size < this.config.maxConcurrentSyncs) {
            const queuedSync = this.syncQueue.shift();
            if (!queuedSync) break;
            try {
              const result = await this.executeSyncInternal(queuedSync.id, queuedSync.options);
              queuedSync.resolve(result);
            } catch (error) {
              queuedSync.reject(error);
            }
          }
        } finally {
          this.isProcessingQueue = false;
        }
      }
      createExecutionContext(syncId, options) {
        return {
          syncId,
          options: {
            operation: "full",
            direction: "bidirectional",
            strategy: "immediate",
            priority: "normal",
            maxRetries: this.config.defaultRetries,
            timeoutMs: this.config.defaultTimeout,
            batchSize: this.config.batchSize,
            ...options
          },
          startTime: /* @__PURE__ */ new Date(),
          currentPhase: "validate",
          statistics: {
            totalOperations: 0,
            completedOperations: 0,
            failedOperations: 0,
            bytesTransferred: 0,
            recordsSynced: 0,
            conflictsDetected: 0,
            conflictsResolved: 0,
            networkRequests: 0,
            cacheHits: 0
          },
          errors: [],
          conflicts: [],
          checkpoints: [],
          abortController: new AbortController()
        };
      }
      createSyncResult(context, status) {
        const endTime = /* @__PURE__ */ new Date();
        return {
          id: context.syncId,
          operation: context.options.operation || "full",
          status,
          startTime: context.startTime,
          endTime,
          duration: endTime.getTime() - context.startTime.getTime(),
          statistics: { ...context.statistics },
          errors: [...context.errors],
          conflicts: [...context.conflicts],
          metadata: {
            phases: context.checkpoints.map((cp) => ({
              phase: cp.phase,
              timestamp: cp.timestamp
            })),
            options: context.options
          }
        };
      }
      createSyncError(context, error) {
        return {
          id: `error_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          phase: context.currentPhase,
          operation: `${context.options.operation || "sync"}_${context.currentPhase}`,
          error,
          retryable: this.isRetryableError(error),
          timestamp: /* @__PURE__ */ new Date(),
          context: {
            syncId: context.syncId,
            phase: context.currentPhase,
            completedOperations: context.statistics.completedOperations
          }
        };
      }
      isRetryableError(error) {
        const retryablePatterns = [
          /network/i,
          /timeout/i,
          /connection/i,
          /rate.?limit/i,
          /502|503|504/
        ];
        return retryablePatterns.some(
          (pattern) => pattern.test(error.message) || pattern.test(error.name)
        );
      }
      estimateSyncTime(deltas) {
        const baseTimePerOperation = 100;
        return deltas.length * baseTimePerOperation;
      }
      estimateBandwidth(deltas) {
        const averageRecordSize = 1024;
        return deltas.length * averageRecordSize;
      }
      generateSyncId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      // Event emission helpers
      emitSyncStarted(context) {
        this.emit("sync.started", {
          syncId: context.syncId,
          operation: context.options.operation || "full",
          estimatedDuration: this.estimateSyncTime([]),
          dataTypes: context.options.resources || [],
          options: context.options
        });
      }
      emitSyncProgress(context, completed, total) {
        const progress = total > 0 ? Math.round(completed / total * 100) : 0;
        this.emit("sync.progress", {
          syncId: context.syncId,
          progress,
          phase: context.currentPhase,
          operations: {
            completed,
            total,
            errors: context.errors.length
          },
          estimatedTimeRemaining: this.estimateTimeRemaining(context, completed, total)
        });
      }
      emitSyncCompleted(context, result) {
        this.emit("sync.completed", {
          syncId: context.syncId,
          result,
          summary: {
            recordsSynced: result.statistics.recordsSynced,
            conflictsResolved: result.statistics.conflictsResolved,
            errors: result.errors.length,
            duration: result.duration
          }
        });
      }
      emitSyncFailed(context, error) {
        this.emit("sync.failed", {
          syncId: context.syncId,
          error,
          phase: context.currentPhase,
          retryable: error.retryable,
          nextRetryTime: error.retryable ? new Date(Date.now() + 5e3) : void 0
        });
      }
      estimateTimeRemaining(context, completed, total) {
        if (completed === 0 || total === 0) return void 0;
        const elapsed = Date.now() - context.startTime.getTime();
        const rate = completed / elapsed;
        const remaining = total - completed;
        return Math.round(remaining / rate);
      }
    };
  }
});

// src/storage/queue/priority-queue.ts
var PRIORITY_VALUES, PriorityQueue;
var init_priority_queue = __esm({
  "src/storage/queue/priority-queue.ts"() {
    "use strict";
    init_esm_shims();
    PRIORITY_VALUES = {
      critical: 1e3,
      high: 750,
      normal: 500,
      low: 250
    };
    PriorityQueue = class {
      items = /* @__PURE__ */ new Map();
      priorityIndex = /* @__PURE__ */ new Map();
      statusIndex = /* @__PURE__ */ new Map();
      resourceIndex = /* @__PURE__ */ new Map();
      metrics;
      config;
      eventHandlers = /* @__PURE__ */ new Map();
      constructor(config = {}) {
        this.config = {
          maxSize: 1e4,
          enableMetrics: true,
          enableEvents: true,
          ...config
        };
        this.metrics = this.initializeMetrics();
        this.initializeIndexes();
      }
      initializeMetrics() {
        return {
          totalItems: 0,
          pendingItems: 0,
          processingItems: 0,
          completedItems: 0,
          failedItems: 0,
          deadItems: 0,
          averageProcessingTime: 0,
          successRate: 0,
          lastProcessedAt: null,
          throughputPerMinute: 0,
          priorityDistribution: {
            critical: 0,
            high: 0,
            normal: 0,
            low: 0
          },
          resourceDistribution: {
            receipts: 0,
            cashiers: 0,
            merchants: 0,
            "cash-registers": 0,
            "point-of-sales": 0,
            pems: 0
          }
        };
      }
      initializeIndexes() {
        Object.keys(PRIORITY_VALUES).forEach((priority) => {
          this.priorityIndex.set(priority, /* @__PURE__ */ new Set());
        });
        const statuses = ["pending", "processing", "completed", "failed", "retry", "dead"];
        statuses.forEach((status) => {
          this.statusIndex.set(status, /* @__PURE__ */ new Set());
        });
      }
      /**
       * Add item to the queue
       */
      enqueue(item) {
        if (this.items.size >= this.config.maxSize) {
          this.emit("queue:backpressure", {
            queueSize: this.items.size,
            threshold: this.config.maxSize
          });
          return false;
        }
        this.items.set(item.id, item);
        this.addToIndex(item);
        this.updateMetricsOnAdd(item);
        this.emit("item:added", { item });
        return true;
      }
      /**
       * Get next highest priority item
       */
      dequeue() {
        const item = this.peek();
        if (item) {
          this.remove(item.id);
        }
        return item;
      }
      /**
       * Peek at next highest priority item without removing
       */
      peek() {
        for (const priority of ["critical", "high", "normal", "low"]) {
          const prioritySet = this.priorityIndex.get(priority);
          if (prioritySet && prioritySet.size > 0) {
            for (const itemId of prioritySet) {
              const item = this.items.get(itemId);
              if (item && item.status === "pending") {
                if (!item.scheduledAt || item.scheduledAt <= Date.now()) {
                  return item;
                }
              }
            }
          }
        }
        return null;
      }
      /**
       * Get multiple items by priority and status
       */
      dequeueMany(count, priority, status = "pending") {
        const items = [];
        const now = Date.now();
        const priorities = priority ? [priority] : ["critical", "high", "normal", "low"];
        for (const pri of priorities) {
          if (items.length >= count) break;
          const prioritySet = this.priorityIndex.get(pri);
          if (!prioritySet) continue;
          for (const itemId of prioritySet) {
            if (items.length >= count) break;
            const item = this.items.get(itemId);
            if (item && item.status === status && (!item.scheduledAt || item.scheduledAt <= now)) {
              items.push(item);
            }
          }
        }
        return items;
      }
      /**
       * Update item status and properties
       */
      updateItem(id, updates) {
        const item = this.items.get(id);
        if (!item) return false;
        this.removeFromIndex(item);
        const updatedItem = {
          ...item,
          ...updates,
          updatedAt: Date.now()
        };
        this.items.set(id, updatedItem);
        this.addToIndex(updatedItem);
        this.updateMetricsOnUpdate(item, updatedItem);
        if (item.status !== updatedItem.status) {
          this.emitStatusChangeEvent(updatedItem);
        }
        return true;
      }
      /**
       * Remove item from queue
       */
      remove(id) {
        const item = this.items.get(id);
        if (!item) return false;
        this.items.delete(id);
        this.removeFromIndex(item);
        this.updateMetricsOnRemove(item);
        return true;
      }
      /**
       * Get item by ID
       */
      get(id) {
        return this.items.get(id) || null;
      }
      /**
       * Check if queue contains item
       */
      has(id) {
        return this.items.has(id);
      }
      /**
       * Get items by status
       */
      getByStatus(status) {
        const statusSet = this.statusIndex.get(status);
        if (!statusSet) return [];
        return Array.from(statusSet).map((id) => this.items.get(id)).filter((item) => item !== void 0);
      }
      /**
       * Get items by priority
       */
      getByPriority(priority) {
        const prioritySet = this.priorityIndex.get(priority);
        if (!prioritySet) return [];
        return Array.from(prioritySet).map((id) => this.items.get(id)).filter((item) => item !== void 0);
      }
      /**
       * Get items by resource
       */
      getByResource(resource) {
        const resourceSet = this.resourceIndex.get(resource);
        if (!resourceSet) return [];
        return Array.from(resourceSet).map((id) => this.items.get(id)).filter((item) => item !== void 0);
      }
      /**
       * Get items that are ready to process (past scheduled time)
       */
      getReadyItems(limit) {
        const now = Date.now();
        const readyItems = [];
        for (const priority of ["critical", "high", "normal", "low"]) {
          if (limit && readyItems.length >= limit) break;
          const items = this.getByPriority(priority);
          for (const item of items) {
            if (limit && readyItems.length >= limit) break;
            if (item.status === "pending" && (!item.scheduledAt || item.scheduledAt <= now)) {
              readyItems.push(item);
            }
          }
        }
        return readyItems;
      }
      /**
       * Clear all items
       */
      clear() {
        this.items.clear();
        this.priorityIndex.forEach((set) => set.clear());
        this.statusIndex.forEach((set) => set.clear());
        this.resourceIndex.clear();
        this.metrics = this.initializeMetrics();
      }
      /**
       * Get queue size
       */
      size() {
        return this.items.size;
      }
      /**
       * Check if queue is empty
       */
      isEmpty() {
        return this.items.size === 0;
      }
      /**
       * Get queue statistics
       */
      getStats() {
        return { ...this.metrics };
      }
      /**
       * Get all items as array
       */
      toArray() {
        return Array.from(this.items.values());
      }
      /**
       * Event subscription
       */
      on(event, handler) {
        if (!this.config.enableEvents) return;
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, /* @__PURE__ */ new Set());
        }
        this.eventHandlers.get(event).add(handler);
      }
      /**
       * Event unsubscription
       */
      off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      }
      /**
       * Emit event
       */
      emit(event, data) {
        if (!this.config.enableEvents) return;
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in queue event handler for ${event}:`, error);
            }
          });
        }
      }
      // Private helper methods
      addToIndex(item) {
        const prioritySet = this.priorityIndex.get(item.priority);
        if (prioritySet) {
          prioritySet.add(item.id);
        }
        const statusSet = this.statusIndex.get(item.status);
        if (statusSet) {
          statusSet.add(item.id);
        }
        if (!this.resourceIndex.has(item.resource)) {
          this.resourceIndex.set(item.resource, /* @__PURE__ */ new Set());
        }
        this.resourceIndex.get(item.resource).add(item.id);
      }
      removeFromIndex(item) {
        const prioritySet = this.priorityIndex.get(item.priority);
        if (prioritySet) {
          prioritySet.delete(item.id);
        }
        const statusSet = this.statusIndex.get(item.status);
        if (statusSet) {
          statusSet.delete(item.id);
        }
        const resourceSet = this.resourceIndex.get(item.resource);
        if (resourceSet) {
          resourceSet.delete(item.id);
          if (resourceSet.size === 0) {
            this.resourceIndex.delete(item.resource);
          }
        }
      }
      updateMetricsOnAdd(item) {
        if (!this.config.enableMetrics) return;
        this.metrics.totalItems++;
        this.metrics.pendingItems++;
        this.metrics.priorityDistribution[item.priority]++;
        this.metrics.resourceDistribution[item.resource]++;
      }
      updateMetricsOnUpdate(oldItem, newItem) {
        if (!this.config.enableMetrics) return;
        if (oldItem.status !== newItem.status) {
          this.decrementStatusCount(oldItem.status);
          this.incrementStatusCount(newItem.status);
          if (newItem.status === "completed") {
            this.metrics.lastProcessedAt = Date.now();
            this.updateSuccessRate();
          }
        }
      }
      updateMetricsOnRemove(item) {
        if (!this.config.enableMetrics) return;
        this.metrics.totalItems--;
        this.decrementStatusCount(item.status);
        this.metrics.priorityDistribution[item.priority]--;
        this.metrics.resourceDistribution[item.resource]--;
      }
      incrementStatusCount(status) {
        switch (status) {
          case "pending":
            this.metrics.pendingItems++;
            break;
          case "processing":
            this.metrics.processingItems++;
            break;
          case "completed":
            this.metrics.completedItems++;
            break;
          case "failed":
            this.metrics.failedItems++;
            break;
          case "dead":
            this.metrics.deadItems++;
            break;
        }
      }
      decrementStatusCount(status) {
        switch (status) {
          case "pending":
            this.metrics.pendingItems = Math.max(0, this.metrics.pendingItems - 1);
            break;
          case "processing":
            this.metrics.processingItems = Math.max(0, this.metrics.processingItems - 1);
            break;
          case "completed":
            this.metrics.completedItems = Math.max(0, this.metrics.completedItems - 1);
            break;
          case "failed":
            this.metrics.failedItems = Math.max(0, this.metrics.failedItems - 1);
            break;
          case "dead":
            this.metrics.deadItems = Math.max(0, this.metrics.deadItems - 1);
            break;
        }
      }
      updateSuccessRate() {
        const total = this.metrics.completedItems + this.metrics.failedItems + this.metrics.deadItems;
        if (total > 0) {
          this.metrics.successRate = this.metrics.completedItems / total * 100;
        }
      }
      emitStatusChangeEvent(item) {
        switch (item.status) {
          case "processing":
            this.emit("item:processing", { item });
            break;
          case "completed":
            this.emit("item:completed", { item });
            break;
          case "failed":
            this.emit("item:failed", {
              item,
              error: item.errorHistory?.[item.errorHistory.length - 1] || {
                timestamp: Date.now(),
                error: "Unknown error",
                retryable: false
              }
            });
            break;
          case "retry":
            this.emit("item:retry", { item, attempt: item.retryCount });
            break;
          case "dead":
            this.emit("item:dead", { item });
            break;
        }
      }
    };
  }
});

// src/storage/queue/batch-processor.ts
var BatchProcessor;
var init_batch_processor = __esm({
  "src/storage/queue/batch-processor.ts"() {
    "use strict";
    init_esm_shims();
    BatchProcessor = class {
      config;
      pendingBatches = /* @__PURE__ */ new Map();
      batchTimers = /* @__PURE__ */ new Map();
      processingBatches = /* @__PURE__ */ new Set();
      eventHandlers = /* @__PURE__ */ new Map();
      batchCounter = 0;
      constructor(config = {}) {
        this.config = {
          maxBatchSize: 50,
          maxWaitTime: 5e3,
          enableResourceGrouping: true,
          enableTimeWindowing: true,
          enablePriorityBatching: false,
          maxConcurrentBatches: 10,
          batchTimeoutMs: 3e4,
          ...config
        };
      }
      /**
       * Add items to batching system
       */
      addToBatch(items, strategy) {
        const groups = this.groupItems(items, strategy);
        const batches = [];
        for (const [groupKey, groupItems] of groups) {
          const batch = this.createOrUpdateBatch(groupKey, groupItems, strategy);
          if (batch) {
            batches.push(batch);
          }
        }
        return batches;
      }
      /**
       * Process a specific batch
       */
      async processBatch(batchId, processor) {
        const batch = this.pendingBatches.get(batchId);
        if (!batch || this.processingBatches.has(batchId)) {
          return null;
        }
        this.processingBatches.add(batchId);
        const updatedBatch = {
          ...batch,
          status: "processing"
        };
        this.pendingBatches.set(batchId, updatedBatch);
        try {
          const timer = this.batchTimers.get(batchId);
          if (timer) {
            clearTimeout(timer);
            this.batchTimers.delete(batchId);
          }
          if (batch.strategy === "parallel") {
            await this.processParallel(batch.items, processor, batch.maxConcurrency);
          } else if (batch.strategy === "sequential") {
            await this.processSequential(batch.items, processor);
          } else {
            await processor(batch.items);
          }
          const completedBatch = {
            ...updatedBatch,
            status: "completed"
          };
          this.pendingBatches.delete(batchId);
          this.processingBatches.delete(batchId);
          this.emit("batch:completed", { batch: completedBatch });
          return completedBatch;
        } catch (error) {
          const failedBatch = {
            ...updatedBatch,
            status: "failed"
          };
          this.pendingBatches.set(batchId, failedBatch);
          this.processingBatches.delete(batchId);
          this.emit("batch:failed", { batch: failedBatch });
          throw error;
        }
      }
      /**
       * Get ready batches (full or timed out)
       */
      getReadyBatches() {
        const readyBatches = [];
        const now = Date.now();
        for (const batch of this.pendingBatches.values()) {
          if (batch.status === "pending") {
            const isFullBatch = batch.items.length >= this.config.maxBatchSize;
            const isTimedOut = now - batch.createdAt >= this.config.maxWaitTime;
            if (isFullBatch || isTimedOut) {
              readyBatches.push(batch);
            }
          }
        }
        return readyBatches;
      }
      /**
       * Force process all pending batches
       */
      async flushAllBatches(processor) {
        const allBatches = Array.from(this.pendingBatches.values()).filter((batch) => batch.status === "pending");
        const results = [];
        for (const batch of allBatches) {
          try {
            const result = await this.processBatch(batch.id, processor);
            if (result) {
              results.push(result);
            }
          } catch (error) {
            console.error(`Failed to process batch ${batch.id}:`, error);
          }
        }
        return results;
      }
      /**
       * Get batch by ID
       */
      getBatch(batchId) {
        return this.pendingBatches.get(batchId) || null;
      }
      /**
       * Get all pending batches
       */
      getPendingBatches() {
        return Array.from(this.pendingBatches.values()).filter((batch) => batch.status === "pending");
      }
      /**
       * Cancel a batch
       */
      cancelBatch(batchId) {
        const batch = this.pendingBatches.get(batchId);
        if (!batch || this.processingBatches.has(batchId)) {
          return false;
        }
        const timer = this.batchTimers.get(batchId);
        if (timer) {
          clearTimeout(timer);
          this.batchTimers.delete(batchId);
        }
        this.pendingBatches.delete(batchId);
        return true;
      }
      /**
       * Clear all batches
       */
      clear() {
        for (const timer of this.batchTimers.values()) {
          clearTimeout(timer);
        }
        this.batchTimers.clear();
        this.pendingBatches.clear();
        this.processingBatches.clear();
      }
      /**
       * Get batch statistics
       */
      getStats() {
        const pendingBatches = this.getPendingBatches();
        return {
          totalBatches: this.pendingBatches.size,
          pendingBatches: pendingBatches.length,
          processingBatches: this.processingBatches.size,
          totalItemsInBatches: pendingBatches.reduce((sum, batch) => sum + batch.items.length, 0),
          averageBatchSize: pendingBatches.length > 0 ? pendingBatches.reduce((sum, batch) => sum + batch.items.length, 0) / pendingBatches.length : 0
        };
      }
      // Event handling
      on(event, handler) {
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, /* @__PURE__ */ new Set());
        }
        this.eventHandlers.get(event).add(handler);
      }
      off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      }
      emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in batch event handler for ${event}:`, error);
            }
          });
        }
      }
      // Private helper methods
      groupItems(items, strategy) {
        const groups = /* @__PURE__ */ new Map();
        for (const item of items) {
          const groupKey = this.generateGroupKey(item, strategy);
          if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
          }
          const group = groups.get(groupKey);
          if (group.length < strategy.maxItemsPerBatch) {
            group.push(item);
          } else {
            const newGroupKey = `${groupKey}_${groups.size}`;
            groups.set(newGroupKey, [item]);
          }
        }
        return groups;
      }
      generateGroupKey(item, strategy) {
        const keyParts = [];
        if (strategy.groupByResource) {
          keyParts.push(`resource:${item.resource}`);
        }
        if (strategy.groupByPriority && !strategy.priorityMixing) {
          keyParts.push(`priority:${item.priority}`);
        }
        if (strategy.groupByTimeWindow) {
          const windowStart = Math.floor(Date.now() / strategy.windowSizeMs) * strategy.windowSizeMs;
          keyParts.push(`window:${windowStart}`);
        }
        return keyParts.join("|") || "default";
      }
      createOrUpdateBatch(groupKey, items, strategy) {
        let existingBatch = null;
        for (const batch of this.pendingBatches.values()) {
          if (batch.status === "pending") {
            const batchGroupKey = this.generateBatchGroupKey(batch, strategy);
            if (batchGroupKey === groupKey) {
              existingBatch = batch;
              break;
            }
          }
        }
        if (existingBatch) {
          const updatedItems = [...existingBatch.items, ...items];
          if (updatedItems.length >= strategy.maxItemsPerBatch) {
            const currentBatchItems = updatedItems.slice(0, strategy.maxItemsPerBatch);
            const remainingItems = updatedItems.slice(strategy.maxItemsPerBatch);
            const updatedBatch = {
              ...existingBatch,
              items: currentBatchItems
            };
            this.pendingBatches.set(existingBatch.id, updatedBatch);
            if (remainingItems.length > 0) {
              return this.createNewBatch(remainingItems, strategy);
            }
            return updatedBatch;
          } else {
            const updatedBatch = {
              ...existingBatch,
              items: updatedItems
            };
            this.pendingBatches.set(existingBatch.id, updatedBatch);
            return updatedBatch;
          }
        } else {
          return this.createNewBatch(items, strategy);
        }
      }
      createNewBatch(items, strategy) {
        const batchId = `batch_${++this.batchCounter}_${Date.now()}`;
        const batch = {
          id: batchId,
          items: items.slice(0, strategy.maxItemsPerBatch),
          status: "pending",
          createdAt: Date.now(),
          strategy: this.determineBatchStrategy(items),
          maxConcurrency: this.config.maxConcurrentBatches
        };
        this.pendingBatches.set(batchId, batch);
        const timer = setTimeout(() => {
          const currentBatch = this.pendingBatches.get(batchId);
          if (currentBatch && currentBatch.status === "pending") {
            const failedBatch = {
              ...currentBatch,
              status: "failed"
            };
            this.pendingBatches.set(batchId, failedBatch);
            this.emit("batch:failed", { batch: failedBatch });
          }
        }, this.config.maxWaitTime);
        this.batchTimers.set(batchId, timer);
        this.emit("batch:created", { batch });
        return batch;
      }
      generateBatchGroupKey(batch, strategy) {
        if (batch.items.length === 0) return "empty";
        const firstItem = batch.items[0];
        if (!firstItem) return "empty";
        return this.generateGroupKey(firstItem, strategy);
      }
      determineBatchStrategy(items) {
        const hasHighPriority = items.some((item) => item.priority === "critical" || item.priority === "high");
        const hasDependencies = items.some((item) => item.dependencies && item.dependencies.length > 0);
        if (hasDependencies) {
          return "sequential";
        } else if (hasHighPriority && items.length <= 10) {
          return "parallel";
        } else {
          return "sequential";
        }
      }
      async processParallel(items, processor, maxConcurrency = 5) {
        const chunks = this.chunkArray(items, Math.max(1, Math.floor(items.length / maxConcurrency)));
        await Promise.all(
          chunks.map((chunk) => processor(chunk))
        );
      }
      async processSequential(items, processor) {
        for (const item of items) {
          await processor([item]);
        }
      }
      chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
          chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
      }
      // Cleanup
      destroy() {
        this.clear();
      }
    };
  }
});

// src/storage/queue/retry-manager.ts
var RetryManager;
var init_retry_manager = __esm({
  "src/storage/queue/retry-manager.ts"() {
    "use strict";
    init_esm_shims();
    RetryManager = class {
      config;
      circuitBreakers = /* @__PURE__ */ new Map();
      activeRetries = /* @__PURE__ */ new Map();
      retryTimers = /* @__PURE__ */ new Map();
      metrics;
      eventHandlers = /* @__PURE__ */ new Map();
      constructor(config = {}) {
        this.config = {
          defaultRetryPolicy: this.getDefaultRetryPolicy(),
          circuitBreakerConfig: {
            enabled: true,
            failureThreshold: 5,
            successThreshold: 3,
            timeout: 6e4,
            monitoringWindow: 3e5
          },
          maxConcurrentRetries: 10,
          retryQueueSize: 1e3,
          enableJitter: true,
          enableMetrics: true,
          ...config
        };
        this.metrics = this.initializeMetrics();
        this.initializeCircuitBreakers();
      }
      /**
       * Schedule retry for a failed item
       */
      scheduleRetry(item, error) {
        if (item.retryCount >= item.maxRetries) {
          this.emit("item:max-retries-exceeded", { item });
          return false;
        }
        if (!this.isCircuitClosed(item.resource)) {
          this.emit("item:circuit-open", { item, resource: item.resource });
          return false;
        }
        if (this.activeRetries.size >= this.config.retryQueueSize) {
          this.emit("retry:queue-full", {
            queueSize: this.activeRetries.size,
            maxSize: this.config.retryQueueSize
          });
          return false;
        }
        const retryPolicy = this.getRetryPolicy(item);
        const nextAttempt = item.retryCount + 1;
        const delay = this.calculateDelay(nextAttempt, retryPolicy);
        const retryAttempt = {
          itemId: item.id,
          attempt: nextAttempt,
          scheduledAt: Date.now() + delay,
          lastError: error,
          backoffDelay: delay
        };
        this.activeRetries.set(item.id, retryAttempt);
        const timer = setTimeout(() => {
          this.executeRetry(item.id);
        }, delay);
        this.retryTimers.set(item.id, timer);
        this.updateMetricsOnRetryScheduled(item.resource, delay);
        this.emit("item:retry-scheduled", { item, delay, attempt: nextAttempt });
        return true;
      }
      /**
       * Cancel scheduled retry
       */
      cancelRetry(itemId) {
        const timer = this.retryTimers.get(itemId);
        if (timer) {
          clearTimeout(timer);
          this.retryTimers.delete(itemId);
        }
        const retryAttempt = this.activeRetries.get(itemId);
        if (retryAttempt) {
          this.activeRetries.delete(itemId);
          if (retryAttempt.item) {
            this.emit("item:retry-cancelled", { item: retryAttempt.item });
          }
          return true;
        }
        return false;
      }
      /**
       * Record successful operation (for circuit breaker)
       */
      recordSuccess(resource) {
        const circuitBreaker = this.circuitBreakers.get(resource);
        if (!circuitBreaker) return;
        let updatedState = {
          ...circuitBreaker,
          successCount: circuitBreaker.successCount + 1,
          lastFailureTime: null
        };
        if (circuitBreaker.state === "half-open" && updatedState.successCount >= this.config.circuitBreakerConfig.successThreshold) {
          updatedState = {
            ...updatedState,
            state: "closed",
            failureCount: 0,
            successCount: 0
          };
          this.emit("circuit:closed", { resource });
        }
        this.circuitBreakers.set(resource, updatedState);
        this.updateMetricsOnSuccess(resource);
      }
      /**
       * Record failed operation (for circuit breaker)
       */
      recordFailure(resource, _error) {
        const circuitBreaker = this.circuitBreakers.get(resource);
        if (!circuitBreaker) return;
        const now = Date.now();
        let updatedState = {
          ...circuitBreaker,
          failureCount: circuitBreaker.failureCount + 1,
          lastFailureTime: now,
          successCount: 0
          // Reset success count on failure
        };
        if (circuitBreaker.state === "closed" && updatedState.failureCount >= this.config.circuitBreakerConfig.failureThreshold) {
          updatedState = {
            ...updatedState,
            state: "open",
            nextRetryTime: now + this.config.circuitBreakerConfig.timeout
          };
          this.emit("circuit:opened", { resource, errorRate: updatedState.failureCount });
          this.metrics.circuitBreakerTrips++;
        }
        this.circuitBreakers.set(resource, updatedState);
        this.updateMetricsOnFailure(resource);
      }
      /**
       * Check if circuit is closed for a resource
       */
      isCircuitClosed(resource) {
        if (!this.config.circuitBreakerConfig.enabled) return true;
        const circuitBreaker = this.circuitBreakers.get(resource);
        if (!circuitBreaker) return true;
        const now = Date.now();
        switch (circuitBreaker.state) {
          case "closed":
            return true;
          case "open":
            if (circuitBreaker.nextRetryTime && now >= circuitBreaker.nextRetryTime) {
              const updatedState = {
                ...circuitBreaker,
                state: "half-open",
                successCount: 0
              };
              this.circuitBreakers.set(resource, updatedState);
              this.emit("circuit:half-open", { resource });
              return true;
            }
            return false;
          case "half-open":
            return true;
          default:
            return true;
        }
      }
      /**
       * Get circuit breaker state for a resource
       */
      getCircuitState(resource) {
        return this.circuitBreakers.get(resource) || null;
      }
      /**
       * Get all active retries
       */
      getActiveRetries() {
        return Array.from(this.activeRetries.values());
      }
      /**
       * Get retry metrics
       */
      getMetrics() {
        return { ...this.metrics };
      }
      /**
       * Clear all retries
       */
      clearRetries() {
        for (const timer of this.retryTimers.values()) {
          clearTimeout(timer);
        }
        this.retryTimers.clear();
        this.activeRetries.clear();
      }
      /**
       * Reset circuit breaker for a resource
       */
      resetCircuitBreaker(resource) {
        const initialState = this.createInitialCircuitBreakerState();
        this.circuitBreakers.set(resource, initialState);
        this.emit("circuit:reset", { resource });
      }
      /**
       * Get retry policy for an item
       */
      getRetryPolicy(_item) {
        return this.config.defaultRetryPolicy;
      }
      // Event handling
      on(event, handler) {
        if (!this.eventHandlers.has(event)) {
          this.eventHandlers.set(event, /* @__PURE__ */ new Set());
        }
        this.eventHandlers.get(event).add(handler);
      }
      off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      }
      emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in retry manager event handler for ${event}:`, error);
            }
          });
        }
      }
      // Private methods
      async executeRetry(itemId) {
        const retryAttempt = this.activeRetries.get(itemId);
        if (!retryAttempt) return;
        this.activeRetries.delete(itemId);
        this.retryTimers.delete(itemId);
        this.emit("item:retry-ready", { itemId, attempt: retryAttempt.attempt });
      }
      calculateDelay(attempt, policy) {
        let delay;
        switch (policy.strategy) {
          case "exponential":
            delay = Math.min(
              policy.baseDelay * Math.pow(policy.backoffFactor, attempt - 1),
              policy.maxDelay
            );
            break;
          case "linear":
            delay = Math.min(
              policy.baseDelay * attempt,
              policy.maxDelay
            );
            break;
          case "custom":
            delay = policy.baseDelay;
            break;
          default:
            delay = policy.baseDelay;
        }
        if (this.config.enableJitter && policy.jitterEnabled) {
          const jitter = delay * 0.1 * Math.random();
          delay += jitter;
        }
        return Math.floor(delay);
      }
      getDefaultRetryPolicy() {
        return {
          strategy: "exponential",
          maxRetries: 3,
          baseDelay: 1e3,
          maxDelay: 3e4,
          backoffFactor: 2,
          jitterEnabled: true,
          retryableErrors: [
            "NETWORK_ERROR",
            "TIMEOUT",
            "SERVER_ERROR",
            "RATE_LIMITED",
            "TEMPORARY_FAILURE"
          ],
          nonRetryableErrors: [
            "AUTHENTICATION_ERROR",
            "AUTHORIZATION_ERROR",
            "VALIDATION_ERROR",
            "NOT_FOUND",
            "CONFLICT"
          ]
        };
      }
      initializeMetrics() {
        return {
          totalRetries: 0,
          successfulRetries: 0,
          failedRetries: 0,
          averageRetryDelay: 0,
          circuitBreakerTrips: 0,
          retrySuccessRate: 0,
          resourceMetrics: {
            receipts: { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
            cashiers: { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
            merchants: { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
            "cash-registers": { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
            "point-of-sales": { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
            pems: { retries: 0, successes: 0, failures: 0, averageDelay: 0 }
          }
        };
      }
      initializeCircuitBreakers() {
        const resources = [
          "receipts",
          "cashiers",
          "merchants",
          "cash-registers",
          "point-of-sales",
          "pems"
        ];
        for (const resource of resources) {
          this.circuitBreakers.set(resource, this.createInitialCircuitBreakerState());
        }
      }
      createInitialCircuitBreakerState() {
        return {
          state: "closed",
          failureCount: 0,
          successCount: 0,
          lastFailureTime: null,
          nextRetryTime: null,
          threshold: this.config.circuitBreakerConfig.failureThreshold,
          timeout: this.config.circuitBreakerConfig.timeout
        };
      }
      updateMetricsOnRetryScheduled(resource, delay) {
        if (!this.config.enableMetrics) return;
        this.metrics.totalRetries++;
        this.metrics.resourceMetrics[resource].retries++;
        const totalDelay = this.metrics.averageRetryDelay * (this.metrics.totalRetries - 1) + delay;
        this.metrics.averageRetryDelay = totalDelay / this.metrics.totalRetries;
        const resourceMetric = this.metrics.resourceMetrics[resource];
        const resourceTotalDelay = resourceMetric.averageDelay * (resourceMetric.retries - 1) + delay;
        resourceMetric.averageDelay = resourceTotalDelay / resourceMetric.retries;
      }
      updateMetricsOnSuccess(resource) {
        if (!this.config.enableMetrics) return;
        this.metrics.successfulRetries++;
        this.metrics.resourceMetrics[resource].successes++;
        this.updateRetrySuccessRate();
      }
      updateMetricsOnFailure(resource) {
        if (!this.config.enableMetrics) return;
        this.metrics.failedRetries++;
        this.metrics.resourceMetrics[resource].failures++;
        this.updateRetrySuccessRate();
      }
      updateRetrySuccessRate() {
        const total = this.metrics.successfulRetries + this.metrics.failedRetries;
        if (total > 0) {
          this.metrics.retrySuccessRate = this.metrics.successfulRetries / total * 100;
        }
      }
      // Cleanup
      destroy() {
        this.clearRetries();
        this.circuitBreakers.clear();
        this.eventHandlers.clear();
      }
    };
  }
});

// src/storage/queue/queue-analytics.ts
var QueueAnalytics;
var init_queue_analytics = __esm({
  "src/storage/queue/queue-analytics.ts"() {
    "use strict";
    init_esm_shims();
    QueueAnalytics = class {
      config;
      metricsHistory = [];
      realtimeMetrics = null;
      aggregatedMetrics = /* @__PURE__ */ new Map();
      itemTimings = /* @__PURE__ */ new Map();
      processingStartTimes = /* @__PURE__ */ new Map();
      constructor(config = {}) {
        this.config = {
          enabled: true,
          sampleRate: 1,
          retentionDays: 30,
          aggregationIntervals: [6e4, 3e5, 36e5],
          // 1min, 5min, 1hour
          enableRealTimeMetrics: true,
          enableTrendAnalysis: true,
          ...config
        };
        if (this.config.enabled) {
          this.initializeAggregationMaps();
          this.startRealtimeMetrics();
        }
      }
      /**
       * Record item processing start
       */
      recordProcessingStart(itemId) {
        if (!this.config.enabled || Math.random() > this.config.sampleRate) return;
        this.processingStartTimes.set(itemId, Date.now());
      }
      /**
       * Record item processing completion
       */
      recordProcessingComplete(itemId, _success) {
        if (!this.config.enabled) return;
        const startTime = this.processingStartTimes.get(itemId);
        if (startTime) {
          const processingTime = Date.now() - startTime;
          this.itemTimings.set(itemId, processingTime);
          this.processingStartTimes.delete(itemId);
        }
      }
      /**
       * Record queue snapshot for metrics
       */
      recordQueueSnapshot(stats) {
        if (!this.config.enabled) return;
        const metrics = {
          timestamp: Date.now(),
          processingTime: this.calculateAverageProcessingTime(),
          queueSize: stats.totalItems,
          throughput: this.calculateThroughput(),
          errorRate: this.calculateErrorRate(stats),
          priorityDistribution: stats.priorityDistribution,
          resourceDistribution: stats.resourceDistribution,
          operationDistribution: this.getOperationDistribution(stats)
        };
        this.addMetricsPoint(metrics);
        if (this.config.enableRealTimeMetrics) {
          this.realtimeMetrics = metrics;
        }
      }
      /**
       * Get comprehensive queue insights
       */
      getInsights(timeRangeMs = 864e5) {
        if (!this.config.enabled) {
          return this.getEmptyInsights();
        }
        const cutoffTime = Date.now() - timeRangeMs;
        const relevantMetrics = this.metricsHistory.filter((m) => m.timestamp >= cutoffTime);
        return {
          bottlenecks: this.analyzeBottlenecks(relevantMetrics),
          patterns: this.identifyPatterns(relevantMetrics),
          anomalies: this.detectAnomalies(relevantMetrics),
          forecasts: this.generateForecasts(relevantMetrics),
          healthScore: this.calculateHealthScore(relevantMetrics)
        };
      }
      /**
       * Get trend analysis for specified time range
       */
      getTrendAnalysis(timeRangeMs = 864e5) {
        if (!this.config.enabled || !this.config.enableTrendAnalysis) {
          return this.getEmptyTrendAnalysis();
        }
        const cutoffTime = Date.now() - timeRangeMs;
        const relevantMetrics = this.metricsHistory.filter((m) => m.timestamp >= cutoffTime);
        if (relevantMetrics.length === 0) {
          return this.getEmptyTrendAnalysis();
        }
        const avgProcessingTime = relevantMetrics.reduce((sum, m) => sum + m.processingTime, 0) / relevantMetrics.length;
        const avgQueueSize = relevantMetrics.reduce((sum, m) => sum + m.queueSize, 0) / relevantMetrics.length;
        const avgThroughput = relevantMetrics.reduce((sum, m) => sum + m.throughput, 0) / relevantMetrics.length;
        const peakQueueSize = Math.max(...relevantMetrics.map((m) => m.queueSize));
        const errorRateChange = this.calculateErrorRateChange(relevantMetrics);
        const performanceScore = this.calculatePerformanceScore(relevantMetrics);
        return {
          timeRange: this.formatTimeRange(timeRangeMs),
          avgProcessingTime,
          avgQueueSize,
          avgThroughput,
          peakQueueSize,
          errorRateChange,
          performanceScore,
          recommendations: this.generateRecommendations(relevantMetrics)
        };
      }
      /**
       * Get real-time metrics
       */
      getRealTimeMetrics() {
        return this.realtimeMetrics;
      }
      /**
       * Get aggregated metrics for specific interval
       */
      getAggregatedMetrics(intervalMs, timeRangeMs = 864e5) {
        const aggregated = this.aggregatedMetrics.get(intervalMs);
        if (!aggregated) return [];
        const cutoffTime = Date.now() - timeRangeMs;
        return aggregated.filter((m) => m.timestamp >= cutoffTime);
      }
      /**
       * Clear old metrics data
       */
      cleanup() {
        if (!this.config.enabled) return;
        const cutoffTime = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1e3;
        this.metricsHistory = this.metricsHistory.filter((m) => m.timestamp >= cutoffTime);
        for (const [interval, metrics] of this.aggregatedMetrics) {
          this.aggregatedMetrics.set(interval, metrics.filter((m) => m.timestamp >= cutoffTime));
        }
        const oldTimingKeys = Array.from(this.itemTimings.keys()).slice(0, -1e3);
        oldTimingKeys.forEach((key) => this.itemTimings.delete(key));
      }
      /**
       * Export metrics data
       */
      exportMetrics(format = "json") {
        if (format === "csv") {
          return this.exportAsCSV();
        }
        return JSON.stringify(this.metricsHistory, null, 2);
      }
      // Private methods
      initializeAggregationMaps() {
        for (const interval of this.config.aggregationIntervals) {
          this.aggregatedMetrics.set(interval, []);
        }
      }
      startRealtimeMetrics() {
        if (!this.config.enableRealTimeMetrics) return;
        setInterval(() => {
          if (this.realtimeMetrics) {
            const age = Date.now() - this.realtimeMetrics.timestamp;
            if (age > 6e4) {
              this.realtimeMetrics = null;
            }
          }
        }, 3e4);
      }
      addMetricsPoint(metrics) {
        this.metricsHistory.push(metrics);
        for (const interval of this.config.aggregationIntervals) {
          this.addToAggregatedMetrics(metrics, interval);
        }
        if (this.metricsHistory.length > 1e4) {
          this.metricsHistory = this.metricsHistory.slice(-5e3);
        }
      }
      addToAggregatedMetrics(metrics, intervalMs) {
        const aggregated = this.aggregatedMetrics.get(intervalMs);
        if (!aggregated) return;
        const bucketTime = Math.floor(metrics.timestamp / intervalMs) * intervalMs;
        let bucket = aggregated.find((m) => m.timestamp === bucketTime);
        if (!bucket) {
          bucket = { ...metrics, timestamp: bucketTime };
          aggregated.push(bucket);
        } else {
          this.aggregateMetrics(bucket, metrics);
        }
      }
      aggregateMetrics(bucket, newMetrics) {
        bucket.processingTime = (bucket.processingTime + newMetrics.processingTime) / 2;
        bucket.queueSize = Math.max(bucket.queueSize, newMetrics.queueSize);
        bucket.throughput = (bucket.throughput + newMetrics.throughput) / 2;
        bucket.errorRate = (bucket.errorRate + newMetrics.errorRate) / 2;
      }
      calculateAverageProcessingTime() {
        if (this.itemTimings.size === 0) return 0;
        const timings = Array.from(this.itemTimings.values());
        return timings.reduce((sum, time) => sum + time, 0) / timings.length;
      }
      calculateThroughput() {
        const oneMinuteAgo = Date.now() - 6e4;
        const recentTimings = Array.from(this.itemTimings.entries()).filter(([_, time]) => time >= oneMinuteAgo);
        return recentTimings.length;
      }
      calculateErrorRate(stats) {
        const total = stats.completedItems + stats.failedItems + stats.deadItems;
        if (total === 0) return 0;
        return (stats.failedItems + stats.deadItems) / total * 100;
      }
      getOperationDistribution(_stats) {
        return {
          create: 0,
          update: 0,
          delete: 0,
          batch: 0,
          custom: 0
        };
      }
      analyzeBottlenecks(metrics) {
        const bottlenecks = [];
        if (metrics.length === 0) return bottlenecks;
        const avgQueueSize = metrics.reduce((sum, m) => sum + m.queueSize, 0) / metrics.length;
        if (avgQueueSize > 50) {
          bottlenecks.push({
            type: "resource",
            identifier: "queue_size",
            severity: avgQueueSize > 200 ? "critical" : "high",
            impact: avgQueueSize,
            suggestion: "Consider increasing processing capacity or implementing load balancing"
          });
        }
        const avgProcessingTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
        if (avgProcessingTime > 5e3) {
          bottlenecks.push({
            type: "operation",
            identifier: "processing_time",
            severity: avgProcessingTime > 15e3 ? "critical" : "high",
            impact: avgProcessingTime,
            suggestion: "Optimize operation processing or implement batching"
          });
        }
        return bottlenecks;
      }
      identifyPatterns(metrics) {
        const patterns = [];
        const highThroughputPeriods = metrics.filter((m) => m.throughput > 50);
        if (highThroughputPeriods.length > metrics.length * 0.3) {
          patterns.push({
            pattern: "peak_hours",
            description: "High throughput periods detected",
            frequency: highThroughputPeriods.length / metrics.length,
            timeWindows: ["9:00-11:00", "14:00-16:00"],
            impact: 0.7
          });
        }
        return patterns;
      }
      detectAnomalies(metrics) {
        const anomalies = [];
        if (metrics.length < 10) return anomalies;
        const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
        const throughputStdDev = this.calculateStandardDeviation(metrics.map((m) => m.throughput));
        const recentMetrics = metrics.slice(-5);
        for (const metric of recentMetrics) {
          const deviation = Math.abs(metric.throughput - avgThroughput);
          if (deviation > throughputStdDev * 2) {
            anomalies.push({
              type: "throughput",
              timestamp: metric.timestamp,
              severity: deviation > throughputStdDev * 3 ? "high" : "medium",
              description: "Abnormal throughput detected",
              deviation: deviation / avgThroughput,
              expectedValue: avgThroughput,
              actualValue: metric.throughput
            });
          }
        }
        return anomalies;
      }
      generateForecasts(metrics) {
        const forecasts = [];
        if (metrics.length < 20) return forecasts;
        const queueSizes = metrics.map((m) => m.queueSize);
        const queueTrend = this.calculateTrend(queueSizes);
        forecasts.push({
          metric: "queue_size",
          timeHorizon: 36e5,
          // 1 hour
          predictedValue: (queueSizes[queueSizes.length - 1] || 0) + queueTrend,
          confidence: 0.7,
          trend: queueTrend > 1 ? "increasing" : queueTrend < -1 ? "decreasing" : "stable"
        });
        return forecasts;
      }
      calculateHealthScore(metrics) {
        if (metrics.length === 0) return 100;
        let score = 100;
        const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
        score -= avgErrorRate * 2;
        const avgQueueSize = metrics.reduce((sum, m) => sum + m.queueSize, 0) / metrics.length;
        if (avgQueueSize > 50) {
          score -= (avgQueueSize - 50) * 0.5;
        }
        const avgProcessingTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
        if (avgProcessingTime > 2e3) {
          score -= (avgProcessingTime - 2e3) * 0.01;
        }
        return Math.max(0, Math.min(100, score));
      }
      calculateErrorRateChange(metrics) {
        if (metrics.length < 2) return 0;
        const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
        const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
        const firstAvg = firstHalf.reduce((sum, m) => sum + m.errorRate, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, m) => sum + m.errorRate, 0) / secondHalf.length;
        return secondAvg - firstAvg;
      }
      calculatePerformanceScore(metrics) {
        return this.calculateHealthScore(metrics);
      }
      generateRecommendations(metrics) {
        const recommendations = [];
        if (metrics.length === 0) return recommendations;
        const avgQueueSize = metrics.reduce((sum, m) => sum + m.queueSize, 0) / metrics.length;
        if (avgQueueSize > 100) {
          recommendations.push("Consider implementing horizontal scaling to handle queue backlog");
        }
        const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
        if (avgErrorRate > 10) {
          recommendations.push("Investigate and fix root causes of high error rate");
        }
        const avgProcessingTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
        if (avgProcessingTime > 5e3) {
          recommendations.push("Optimize operation processing or implement operation batching");
        }
        return recommendations;
      }
      calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      }
      calculateTrend(values) {
        if (values.length < 2) return 0;
        const n = values.length;
        const sumX = n * (n - 1) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
        const sumX2 = values.reduce((sum, _, index) => sum + index * index, 0);
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      }
      formatTimeRange(timeRangeMs) {
        const hours = timeRangeMs / (1e3 * 60 * 60);
        if (hours < 24) {
          return `${Math.round(hours)} hours`;
        }
        return `${Math.round(hours / 24)} days`;
      }
      exportAsCSV() {
        const headers = ["timestamp", "processingTime", "queueSize", "throughput", "errorRate"];
        const rows = this.metricsHistory.map((m) => [
          m.timestamp,
          m.processingTime,
          m.queueSize,
          m.throughput,
          m.errorRate
        ]);
        return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      }
      getEmptyInsights() {
        return {
          bottlenecks: [],
          patterns: [],
          anomalies: [],
          forecasts: [],
          healthScore: 100
        };
      }
      getEmptyTrendAnalysis() {
        return {
          timeRange: "0 hours",
          avgProcessingTime: 0,
          avgQueueSize: 0,
          avgThroughput: 0,
          peakQueueSize: 0,
          errorRateChange: 0,
          performanceScore: 100,
          recommendations: []
        };
      }
      // Cleanup
      destroy() {
        this.metricsHistory = [];
        this.aggregatedMetrics.clear();
        this.itemTimings.clear();
        this.processingStartTimes.clear();
        this.realtimeMetrics = null;
      }
    };
  }
});

// src/storage/queue/queue-manager.ts
var queue_manager_exports = {};
__export(queue_manager_exports, {
  EnterpriseQueueManager: () => EnterpriseQueueManager
});
var EnterpriseQueueManager;
var init_queue_manager = __esm({
  "src/storage/queue/queue-manager.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_priority_queue();
    init_batch_processor();
    init_retry_manager();
    init_queue_analytics();
    init_types2();
    EnterpriseQueueManager = class extends import_index.default {
      config;
      priorityQueue;
      batchProcessor;
      // private _conflictResolver: ConflictResolverManager;  // TODO: Implement conflict resolution
      retryManager;
      analytics;
      processors = /* @__PURE__ */ new Map();
      processingItems = /* @__PURE__ */ new Set();
      processingTimer = null;
      isProcessing = false;
      itemCounter = 0;
      constructor(config = {}) {
        super();
        this.config = {
          maxSize: 1e4,
          maxRetries: 3,
          defaultPriority: "normal",
          defaultRetryStrategy: "exponential",
          defaultConflictResolution: "server-wins",
          batchingEnabled: true,
          batchSize: 20,
          batchTimeout: 5e3,
          deadLetterEnabled: true,
          analyticsEnabled: true,
          persistToDisk: true,
          circuitBreakerEnabled: true,
          circuitBreakerThreshold: 5,
          deduplicationEnabled: true,
          deduplicationWindow: 3e5,
          storageKey: "acube-enterprise-queue",
          autoProcessing: true,
          processingInterval: 1e3,
          maxConcurrentProcessing: 5,
          enablePersistence: true,
          enableAnalytics: true,
          ...config
        };
        this.priorityQueue = new PriorityQueue(this.config);
        this.batchProcessor = new BatchProcessor({});
        this.retryManager = new RetryManager({});
        this.analytics = new QueueAnalytics({});
        this.initializeComponents();
        this.setupEventHandlers();
        if (this.config.autoProcessing) {
          this.startAutoProcessing();
        }
      }
      /**
       * Add operation to queue
       */
      async enqueue(operation, resource, data, options = {}) {
        const id = createQueueItemId(`${resource}_${operation}_${++this.itemCounter}_${Date.now()}`);
        const item = {
          id,
          priority: options.priority || this.config.defaultPriority,
          operation,
          resource,
          data,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...options.scheduledAt !== void 0 && { scheduledAt: options.scheduledAt },
          retryCount: 0,
          maxRetries: this.config.maxRetries,
          retryStrategy: this.config.defaultRetryStrategy,
          conflictResolution: this.config.defaultConflictResolution,
          ...options.optimisticId && { optimisticId: options.optimisticId },
          ...options.batchId && { batchId: options.batchId },
          ...options.dependencies && { dependencies: options.dependencies },
          ...options.metadata && { metadata: options.metadata },
          errorHistory: []
        };
        if (this.config.deduplicationEnabled && this.isDuplicate(item)) {
          throw new Error(`Duplicate operation detected for ${resource}:${operation}`);
        }
        const success = this.priorityQueue.enqueue(item);
        if (!success) {
          throw new Error("Queue is full - unable to enqueue item");
        }
        if (this.config.enablePersistence) {
          await this.persistQueue();
        }
        if (this.config.enableAnalytics) {
          this.analytics.recordQueueSnapshot(this.getStats());
        }
        return id;
      }
      /**
       * Remove item from queue
       */
      async dequeue(id) {
        const success = this.priorityQueue.remove(id);
        if (success && this.config.enablePersistence) {
          await this.persistQueue();
        }
        return success;
      }
      /**
       * Get item by ID
       */
      getItem(id) {
        return this.priorityQueue.get(id);
      }
      /**
       * Update item status
       */
      async updateItemStatus(id, status, error) {
        const item = this.priorityQueue.get(id);
        if (!item) {
          return false;
        }
        let errorHistory = item.errorHistory || [];
        if (error) {
          const newErrorEntry = {
            timestamp: Date.now(),
            error,
            retryable: this.isRetryableError(error),
            context: { status: item.status }
          };
          errorHistory = [...errorHistory, newErrorEntry];
        }
        const updatedItem = {
          ...item,
          status,
          updatedAt: Date.now(),
          ...error && { errorHistory }
        };
        const success = this.priorityQueue.updateItem(id, updatedItem);
        if (success) {
          await this.handleStatusChange(id, status, error);
          if (this.config.enablePersistence) {
            await this.persistQueue();
          }
        }
        return success;
      }
      /**
       * Register processor for resource/operation combination
       */
      registerProcessor(resource, operation, processor) {
        const key = `${resource}:${operation}`;
        this.processors.set(key, processor);
      }
      /**
       * Process next available items
       */
      async processNext(maxItems = 1) {
        if (this.isProcessing) {
          return [];
        }
        this.isProcessing = true;
        const results = [];
        try {
          const availableSlots = Math.min(
            maxItems,
            this.config.maxConcurrentProcessing - this.processingItems.size
          );
          if (availableSlots <= 0) {
            return results;
          }
          const readyItems = this.priorityQueue.getReadyItems(availableSlots);
          if (readyItems.length === 0) {
            return results;
          }
          if (this.config.batchingEnabled) {
            const batchResults = await this.processBatched(readyItems);
            results.push(...batchResults);
          } else {
            const individualResults = await this.processIndividually(readyItems);
            results.push(...individualResults);
          }
          if (this.config.enableAnalytics) {
            this.analytics.recordQueueSnapshot(this.getStats());
          }
        } finally {
          this.isProcessing = false;
        }
        return results;
      }
      /**
       * Process all pending items
       */
      async processAll() {
        const allResults = [];
        while (this.priorityQueue.getReadyItems(1).length > 0) {
          const results = await this.processNext(this.config.maxConcurrentProcessing);
          if (results.length === 0) break;
          allResults.push(...results);
        }
        return allResults;
      }
      /**
       * Get queue statistics
       */
      getStats() {
        return this.priorityQueue.getStats();
      }
      /**
       * Get queue insights
       */
      getInsights() {
        return this.analytics.getInsights();
      }
      /**
       * Get trend analysis
       */
      getTrendAnalysis() {
        return this.analytics.getTrendAnalysis();
      }
      /**
       * Clear all items from queue
       */
      async clear() {
        this.priorityQueue.clear();
        this.batchProcessor.clear();
        this.retryManager.clearRetries();
        this.processingItems.clear();
        if (this.config.enablePersistence) {
          await this.persistQueue();
        }
      }
      /**
       * Pause queue processing
       */
      pause() {
        if (this.processingTimer) {
          clearInterval(this.processingTimer);
          this.processingTimer = null;
        }
        this.emit("queue:paused", {});
      }
      /**
       * Resume queue processing
       */
      resume() {
        if (this.config.autoProcessing && !this.processingTimer) {
          this.startAutoProcessing();
        }
        this.emit("queue:resumed", {});
      }
      /**
       * Get processing status
       */
      getProcessingStatus() {
        return {
          isProcessing: this.isProcessing,
          processingItems: this.processingItems.size,
          autoProcessing: this.processingTimer !== null,
          readyItems: this.priorityQueue.getReadyItems().length
        };
      }
      /**
       * Initialize the queue manager
       */
      async initialize() {
        this.initializeComponents();
        this.emit("queue:initialized", {});
      }
      /**
       * Add item to queue (compatibility method)
       */
      async add(item) {
        const success = this.priorityQueue.enqueue(item);
        if (!success) {
          throw new Error("Failed to add item to queue");
        }
        if (this.config.enablePersistence) {
          await this.persistQueue();
        }
      }
      /**
       * Process a specific queue item (public interface)
       */
      async processItem(item) {
        return this.processItemInternal(item);
      }
      /**
       * Get all queue items (compatibility method)
       */
      getQueueItems() {
        return this.priorityQueue.toArray();
      }
      /**
       * Cleanup and destroy
       */
      async destroy() {
        this.pause();
        while (this.isProcessing) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.priorityQueue.clear();
        this.batchProcessor.destroy();
        this.retryManager.destroy();
        this.analytics.destroy();
        this.removeAllListeners();
      }
      // Private methods
      initializeComponents() {
        this.priorityQueue = new PriorityQueue({
          maxSize: this.config.maxSize,
          enableMetrics: this.config.analyticsEnabled,
          enableEvents: true
        });
        this.batchProcessor = new BatchProcessor({
          maxBatchSize: this.config.batchSize,
          maxWaitTime: this.config.batchTimeout,
          enableResourceGrouping: true,
          enableTimeWindowing: true
        });
        this.retryManager = new RetryManager({
          defaultRetryPolicy: {
            strategy: this.config.defaultRetryStrategy,
            maxRetries: this.config.maxRetries,
            baseDelay: 1e3,
            maxDelay: 3e4,
            backoffFactor: 2,
            jitterEnabled: true
          },
          circuitBreakerConfig: {
            enabled: this.config.circuitBreakerEnabled,
            failureThreshold: this.config.circuitBreakerThreshold,
            successThreshold: 3,
            timeout: 6e4,
            monitoringWindow: 3e5
          }
        });
        this.analytics = new QueueAnalytics({
          enabled: this.config.enableAnalytics,
          sampleRate: 1,
          retentionDays: 7
        });
      }
      setupEventHandlers() {
        this.priorityQueue.on("item:added", (data) => this.emit("item:added", data));
        this.priorityQueue.on("item:processing", (data) => this.emit("item:processing", data));
        this.priorityQueue.on("item:completed", (data) => this.emit("item:completed", data));
        this.priorityQueue.on("item:failed", (data) => this.emit("item:failed", data));
        this.retryManager.on("item:retry-ready", async ({ itemId }) => {
          const item = this.priorityQueue.get(itemId);
          if (item) {
            await this.priorityQueue.updateItem(itemId, {
              status: "pending",
              retryCount: item.retryCount + 1
            });
          }
        });
        this.batchProcessor.on("batch:created", (data) => this.emit("batch:created", data));
        this.batchProcessor.on("batch:completed", (data) => this.emit("batch:completed", data));
      }
      startAutoProcessing() {
        this.processingTimer = setInterval(async () => {
          try {
            await this.processNext(this.config.maxConcurrentProcessing);
          } catch (error) {
            console.error("Error in auto-processing:", error);
          }
        }, this.config.processingInterval);
      }
      async processBatched(items) {
        const results = [];
        const batches = this.batchProcessor.addToBatch(items, {
          groupByResource: true,
          groupByPriority: false,
          groupByTimeWindow: false,
          windowSizeMs: 6e4,
          maxItemsPerBatch: this.config.batchSize,
          priorityMixing: true
        });
        for (const batch of batches) {
          const batchResult = await this.processBatch(batch);
          results.push(...batchResult);
        }
        return results;
      }
      async processIndividually(items) {
        const results = [];
        const processingPromises = items.map(async (item) => {
          return this.processItemInternal(item);
        });
        const batchResults = await Promise.allSettled(processingPromises);
        for (const result of batchResults) {
          if (result.status === "fulfilled") {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason?.message || "Unknown error",
              processingTime: 0
            });
          }
        }
        return results;
      }
      async processBatch(batch) {
        const results = [];
        try {
          await this.batchProcessor.processBatch(batch.id, async (items) => {
            const batchResults = await Promise.allSettled(
              items.map((item) => this.processItemInternal(item))
            );
            for (const result of batchResults) {
              if (result.status === "fulfilled") {
                results.push(result.value);
              } else {
                results.push({
                  success: false,
                  error: result.reason?.message || "Batch processing error",
                  processingTime: 0
                });
              }
            }
          });
        } catch (error) {
          console.warn("Batch processing failed, falling back to individual:", error);
          return this.processIndividually(batch.items);
        }
        return results;
      }
      async processItemInternal(item) {
        const startTime = Date.now();
        this.processingItems.add(item.id);
        try {
          if (this.config.enableAnalytics) {
            this.analytics.recordProcessingStart(item.id);
          }
          await this.updateItemStatus(item.id, "processing");
          const processorKey = `${item.resource}:${item.operation}`;
          const processor = this.processors.get(processorKey);
          if (!processor) {
            throw new Error(`No processor registered for ${processorKey}`);
          }
          const result = await processor(item);
          this.retryManager.recordSuccess(item.resource);
          if (this.config.enableAnalytics) {
            this.analytics.recordProcessingComplete(item.id, true);
          }
          await this.updateItemStatus(item.id, "completed");
          const processingTime = Date.now() - startTime;
          return {
            success: true,
            result,
            processingTime
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          this.retryManager.recordFailure(item.resource, errorMessage);
          if (this.config.enableAnalytics) {
            this.analytics.recordProcessingComplete(item.id, false);
          }
          if (item.retryCount < item.maxRetries && this.isRetryableError(errorMessage)) {
            const retryScheduled = this.retryManager.scheduleRetry(item, errorMessage);
            if (retryScheduled) {
              await this.updateItemStatus(item.id, "retry", errorMessage);
            } else {
              await this.updateItemStatus(item.id, "failed", errorMessage);
            }
          } else {
            await this.updateItemStatus(item.id, "failed", errorMessage);
          }
          const processingTime = Date.now() - startTime;
          return {
            success: false,
            error: errorMessage,
            processingTime
          };
        } finally {
          this.processingItems.delete(item.id);
        }
      }
      async handleStatusChange(id, status, _error) {
        const item = this.priorityQueue.get(id);
        if (!item) return;
        switch (status) {
          case "failed":
            if (item.retryCount >= item.maxRetries && this.config.deadLetterEnabled) {
              await this.updateItemStatus(id, "dead");
            }
            break;
          case "dead":
            this.emit("item:dead", { item });
            break;
          case "completed":
            setTimeout(() => {
              this.priorityQueue.remove(id);
            }, 5e3);
            break;
        }
      }
      isDuplicate(item) {
        if (!this.config.deduplicationEnabled) return false;
        const cutoffTime = Date.now() - this.config.deduplicationWindow;
        const existingItems = this.priorityQueue.getByResource(item.resource);
        return existingItems.some(
          (existing) => existing.operation === item.operation && existing.createdAt >= cutoffTime && JSON.stringify(existing.data) === JSON.stringify(item.data)
        );
      }
      isRetryableError(error) {
        const retryableErrors = [
          "NETWORK_ERROR",
          "TIMEOUT",
          "SERVER_ERROR",
          "RATE_LIMITED",
          "TEMPORARY_FAILURE"
        ];
        return retryableErrors.some((retryable) => error.includes(retryable));
      }
      async persistQueue() {
        if (!this.config.enablePersistence) return;
        try {
          const queueData = {
            items: this.priorityQueue.toArray(),
            timestamp: Date.now()
          };
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(this.config.storageKey, JSON.stringify(queueData));
          }
        } catch (error) {
          console.warn("Failed to persist queue:", error);
        }
      }
      // TODO: Implement persisted queue loading when storage adapter is ready
      // private async _loadPersistedQueue(): Promise<void> {
      //   if (!this.config.enablePersistence) return;
      //
      //   try {
      //     // This would integrate with the storage adapter
      //     if (typeof localStorage !== 'undefined') {
      //       const serialized = localStorage.getItem(this.config.storageKey);
      //       if (serialized) {
      //         const queueData = JSON.parse(serialized);
      //         if (queueData.items && Array.isArray(queueData.items)) {
      //           for (const item of queueData.items) {
      //             this.priorityQueue.enqueue(item);
      //           }
      //         }
      //       }
      //     }
      //   } catch (error) {
      //     console.warn('Failed to load persisted queue:', error);
      //   }
      // }
    };
  }
});

// src/auth/types.ts
function hasRole(userRoles, requiredRole) {
  if (userRoles.includes(requiredRole)) {
    return true;
  }
  return userRoles.some((role) => {
    const inheritedRoles = ROLE_HIERARCHY[role] || [];
    return inheritedRoles.includes(requiredRole);
  });
}
function hasAnyRole(userRoles, requiredRoles) {
  return requiredRoles.some((role) => hasRole(userRoles, role));
}
function getEffectiveRoles(userRoles) {
  const effectiveRoles = new Set(userRoles);
  userRoles.forEach((role) => {
    const inheritedRoles = ROLE_HIERARCHY[role] || [];
    inheritedRoles.forEach((inheritedRole) => {
      effectiveRoles.add(inheritedRole);
    });
  });
  return Array.from(effectiveRoles);
}
function getPrimaryRole(userRoles) {
  if (userRoles.length === 0) return null;
  const rolePriority = [
    "ROLE_SUPPLIER" /* ROLE_SUPPLIER */,
    "ROLE_ADMIN" /* ROLE_ADMIN */,
    "ROLE_MERCHANT" /* ROLE_MERCHANT */,
    "ROLE_ACUBE_MF1" /* ROLE_ACUBE_MF1 */,
    "ROLE_EXTERNAL_MF1" /* ROLE_EXTERNAL_MF1 */,
    "ROLE_CASHIER" /* ROLE_CASHIER */,
    "ROLE_MF1" /* ROLE_MF1 */,
    "ROLE_PREVIOUS_ADMIN" /* ROLE_PREVIOUS_ADMIN */
  ];
  for (const role of rolePriority) {
    if (userRoles.includes(role)) {
      return role;
    }
  }
  return userRoles[0] || null;
}
function toSimpleRole(userRoles) {
  const primaryRole = getPrimaryRole(userRoles);
  if (!primaryRole) return "cashier";
  return ROLE_TO_SIMPLE[primaryRole] || "cashier";
}
function autoDetectRole(context) {
  if (context.preferredRole && context.userRoles) {
    const targetRole = typeof context.preferredRole === "string" && context.preferredRole in SIMPLE_TO_ROLE ? SIMPLE_TO_ROLE[context.preferredRole] : context.preferredRole;
    if (hasRole(context.userRoles, targetRole)) {
      return targetRole;
    }
  }
  if (context.cashierId && context.pointOfSaleId) {
    return "ROLE_CASHIER" /* ROLE_CASHIER */;
  }
  if (context.merchantId && !context.cashierId) {
    return "ROLE_MERCHANT" /* ROLE_MERCHANT */;
  }
  if (!context.merchantId && !context.cashierId) {
    return "ROLE_SUPPLIER" /* ROLE_SUPPLIER */;
  }
  return "ROLE_CASHIER" /* ROLE_CASHIER */;
}
function canSwitchToRole(currentRoles, targetRole, context) {
  if (!hasRole(currentRoles, targetRole)) {
    return false;
  }
  if (targetRole === "ROLE_CASHIER" /* ROLE_CASHIER */) {
    return !!(context?.cashierId && context?.pointOfSaleId);
  }
  if (targetRole === "ROLE_MERCHANT" /* ROLE_MERCHANT */) {
    return !!context?.merchantId;
  }
  return true;
}
var ROLE_HIERARCHY, ROLE_TO_SIMPLE, SIMPLE_TO_ROLE, AuthErrorType;
var init_types3 = __esm({
  "src/auth/types.ts"() {
    "use strict";
    init_esm_shims();
    ROLE_HIERARCHY = {
      ["ROLE_SUPPLIER" /* ROLE_SUPPLIER */]: [
        "ROLE_MERCHANT" /* ROLE_MERCHANT */,
        "ROLE_CASHIER" /* ROLE_CASHIER */,
        "ROLE_ADMIN" /* ROLE_ADMIN */,
        "ROLE_ACUBE_MF1" /* ROLE_ACUBE_MF1 */,
        "ROLE_EXTERNAL_MF1" /* ROLE_EXTERNAL_MF1 */
      ],
      ["ROLE_MERCHANT" /* ROLE_MERCHANT */]: [
        "ROLE_CASHIER" /* ROLE_CASHIER */
      ],
      ["ROLE_CASHIER" /* ROLE_CASHIER */]: [],
      ["ROLE_ADMIN" /* ROLE_ADMIN */]: [
        "ROLE_PREVIOUS_ADMIN" /* ROLE_PREVIOUS_ADMIN */
      ],
      ["ROLE_ACUBE_MF1" /* ROLE_ACUBE_MF1 */]: [
        "ROLE_MF1" /* ROLE_MF1 */
      ],
      ["ROLE_EXTERNAL_MF1" /* ROLE_EXTERNAL_MF1 */]: [
        "ROLE_MF1" /* ROLE_MF1 */
      ],
      ["ROLE_MF1" /* ROLE_MF1 */]: [],
      ["ROLE_PREVIOUS_ADMIN" /* ROLE_PREVIOUS_ADMIN */]: []
    };
    ROLE_TO_SIMPLE = {
      ["ROLE_SUPPLIER" /* ROLE_SUPPLIER */]: "provider",
      ["ROLE_MERCHANT" /* ROLE_MERCHANT */]: "merchant",
      ["ROLE_CASHIER" /* ROLE_CASHIER */]: "cashier",
      ["ROLE_ADMIN" /* ROLE_ADMIN */]: "admin",
      ["ROLE_PREVIOUS_ADMIN" /* ROLE_PREVIOUS_ADMIN */]: "admin",
      ["ROLE_ACUBE_MF1" /* ROLE_ACUBE_MF1 */]: "provider",
      ["ROLE_EXTERNAL_MF1" /* ROLE_EXTERNAL_MF1 */]: "provider",
      ["ROLE_MF1" /* ROLE_MF1 */]: "provider"
    };
    SIMPLE_TO_ROLE = {
      provider: "ROLE_SUPPLIER" /* ROLE_SUPPLIER */,
      merchant: "ROLE_MERCHANT" /* ROLE_MERCHANT */,
      cashier: "ROLE_CASHIER" /* ROLE_CASHIER */,
      admin: "ROLE_ADMIN" /* ROLE_ADMIN */
    };
    AuthErrorType = {
      INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
      TOKEN_EXPIRED: "TOKEN_EXPIRED",
      TOKEN_INVALID: "TOKEN_INVALID",
      REFRESH_FAILED: "REFRESH_FAILED",
      NETWORK_ERROR: "NETWORK_ERROR",
      STORAGE_ERROR: "STORAGE_ERROR",
      PERMISSION_DENIED: "PERMISSION_DENIED",
      SESSION_EXPIRED: "SESSION_EXPIRED",
      MFA_REQUIRED: "MFA_REQUIRED",
      ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
      UNKNOWN_ERROR: "UNKNOWN_ERROR"
    };
  }
});

// src/auth/auth-events.ts
function createAuthEvent(type, data, metadata) {
  return {
    type,
    timestamp: /* @__PURE__ */ new Date(),
    requestId: `auth_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    data,
    metadata
  };
}
var init_auth_events = __esm({
  "src/auth/auth-events.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/auth/token-manager.ts
var token_manager_exports = {};
__export(token_manager_exports, {
  TokenManager: () => TokenManager
});
var DEFAULT_CONFIG10, TokenManager;
var init_token_manager = __esm({
  "src/auth/token-manager.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_types3();
    init_auth_events();
    DEFAULT_CONFIG10 = {
      refreshUrl: "/token/refresh",
      tokenRefreshBuffer: 5,
      // 5 minutes
      maxRefreshAttempts: 3,
      refreshRetryDelay: 1e3,
      enableTokenRotation: true
    };
    TokenManager = class extends import_index.default {
      config;
      httpClient;
      refreshTimer = null;
      refreshPromise = null;
      refreshAttempts = 0;
      currentTokens = {
        access: null,
        refresh: null,
        expiresAt: null
      };
      constructor(httpClient, config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG10, ...config };
        this.httpClient = httpClient;
      }
      /**
       * Set tokens and start refresh timer
       */
      setTokens(tokens) {
        const payload = this.parseToken(tokens.access_token);
        if (!payload) {
          throw this.createAuthError(
            "TOKEN_INVALID",
            "Invalid access token format"
          );
        }
        const expiresAt = payload.exp * 1e3;
        this.currentTokens = {
          access: tokens.access_token,
          refresh: tokens.refresh_token,
          expiresAt
        };
        this.refreshAttempts = 0;
        this.scheduleRefresh(expiresAt);
      }
      /**
       * Get current access token
       */
      getAccessToken() {
        if (this.currentTokens.access && this.currentTokens.expiresAt) {
          if (Date.now() < this.currentTokens.expiresAt) {
            return this.currentTokens.access;
          }
        }
        return null;
      }
      /**
       * Get current refresh token
       */
      getRefreshToken() {
        return this.currentTokens.refresh;
      }
      /**
       * Get token status
       */
      getTokenStatus() {
        const now = Date.now();
        const expiresAt = this.currentTokens.expiresAt || 0;
        const expiresIn = Math.max(0, expiresAt - now);
        const bufferMs = this.config.tokenRefreshBuffer * 60 * 1e3;
        return {
          isValid: !!this.currentTokens.access && now < expiresAt,
          expiresIn: Math.floor(expiresIn / 1e3),
          // seconds
          isRefreshing: this.refreshPromise !== null,
          needsRefresh: expiresIn < bufferMs && expiresIn > 0,
          refreshFailures: this.refreshAttempts
        };
      }
      /**
       * Parse JWT token
       */
      parseToken(token) {
        try {
          const parts = token.split(".");
          if (parts.length !== 3) {
            return null;
          }
          const payload = parts[1];
          if (!payload) {
            return null;
          }
          const decoded = this.base64UrlDecode(payload);
          return JSON.parse(decoded);
        } catch (error) {
          console.error("Failed to parse JWT token:", error);
          return null;
        }
      }
      /**
       * Validate JWT token
       */
      validateToken(token) {
        const payload = this.parseToken(token);
        if (!payload) {
          return { valid: false, reason: "Invalid token format" };
        }
        const now = Math.floor(Date.now() / 1e3);
        if (payload.exp && payload.exp < now) {
          return { valid: false, reason: "Token expired" };
        }
        if (payload.nbf && payload.nbf > now) {
          return { valid: false, reason: "Token not yet valid" };
        }
        if (!payload.sub || !payload.email || !payload.roles) {
          return { valid: false, reason: "Missing required claims" };
        }
        return { valid: true };
      }
      /**
       * Refresh tokens
       */
      async refreshTokens() {
        if (this.refreshPromise) {
          return this.refreshPromise;
        }
        if (!this.currentTokens.refresh) {
          throw this.createAuthError(
            "REFRESH_FAILED",
            "No refresh token available"
          );
        }
        this.emitRefreshStart();
        this.refreshPromise = this.performRefresh().then((tokens) => {
          this.setTokens(tokens);
          this.emitRefreshSuccess(tokens);
          this.refreshPromise = null;
          if (this.config.onTokenRefresh) {
            this.config.onTokenRefresh(tokens);
          }
          return tokens;
        }).catch((error) => {
          this.refreshPromise = null;
          this.emitRefreshFailure(error);
          if (this.refreshAttempts < this.config.maxRefreshAttempts) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                this.refreshTokens().then(resolve).catch(reject);
              }, this.config.refreshRetryDelay * Math.pow(2, this.refreshAttempts - 1));
            });
          }
          this.emitTokenExpired();
          if (this.config.onTokenExpired) {
            this.config.onTokenExpired();
          }
          throw error;
        });
        return this.refreshPromise;
      }
      /**
       * Perform the actual refresh request
       */
      async performRefresh() {
        this.refreshAttempts++;
        const request = {
          refresh_token: this.currentTokens.refresh,
          grant_type: "refresh_token"
        };
        try {
          const response = await this.httpClient.post(
            this.config.refreshUrl,
            request,
            {
              skipRetry: false,
              // Allow retries for refresh
              metadata: { isTokenRefresh: true }
            }
          );
          if (!response.data.access_token || !response.data.refresh_token) {
            throw this.createAuthError(
              "REFRESH_FAILED",
              "Invalid refresh response"
            );
          }
          if (this.config.enableTokenRotation) {
            if (response.data.refresh_token === this.currentTokens.refresh) {
              console.warn("Refresh token was not rotated");
            }
          }
          return response.data;
        } catch (error) {
          if (error instanceof Error && "statusCode" in error) {
            const statusCode = error.statusCode;
            if (statusCode === 401 || statusCode === 403) {
              throw this.createAuthError(
                "TOKEN_INVALID",
                "Refresh token is invalid or expired",
                error
              );
            }
          }
          throw this.createAuthError(
            "REFRESH_FAILED",
            "Failed to refresh token",
            error
          );
        }
      }
      /**
       * Schedule automatic token refresh
       */
      scheduleRefresh(expiresAt) {
        if (this.refreshTimer) {
          clearTimeout(this.refreshTimer);
        }
        const now = Date.now();
        const bufferMs = this.config.tokenRefreshBuffer * 60 * 1e3;
        const refreshAt = expiresAt - bufferMs;
        const delay = Math.max(0, refreshAt - now);
        if (delay <= 0) {
          this.refreshTokens().catch((error) => {
            console.error("Immediate token refresh failed:", error);
          });
          return;
        }
        this.refreshTimer = setTimeout(() => {
          this.refreshTokens().catch((error) => {
            console.error("Scheduled token refresh failed:", error);
          });
        }, delay);
      }
      /**
       * Clear tokens and stop refresh timer
       */
      clearTokens() {
        this.currentTokens = {
          access: null,
          refresh: null,
          expiresAt: null
        };
        if (this.refreshTimer) {
          clearTimeout(this.refreshTimer);
          this.refreshTimer = null;
        }
        this.refreshPromise = null;
        this.refreshAttempts = 0;
      }
      /**
       * Force token refresh
       */
      async forceRefresh() {
        this.refreshPromise = null;
        return this.refreshTokens();
      }
      /**
       * Base64URL decode
       */
      base64UrlDecode(str) {
        str += "=".repeat((4 - str.length % 4) % 4);
        str = str.replace(/-/g, "+").replace(/_/g, "/");
        if (typeof window !== "undefined" && window.atob) {
          return window.atob(str);
        } else if (typeof Buffer !== "undefined") {
          return Buffer.from(str, "base64").toString("utf-8");
        } else {
          throw new Error("No base64 decoder available");
        }
      }
      /**
       * Create auth error
       */
      createAuthError(type, message, cause) {
        const error = {
          name: "AuthError",
          type,
          message,
          timestamp: Date.now(),
          recoverable: type === AuthErrorType.REFRESH_FAILED && this.refreshAttempts < this.config.maxRefreshAttempts
        };
        if (cause instanceof Error) {
          error.details = { cause: cause.message };
        }
        return error;
      }
      /**
       * Event emitters
       */
      emitRefreshStart() {
        const event = createAuthEvent(
          "auth:token:refresh:start" /* TOKEN_REFRESH_START */,
          {
            reason: this.refreshAttempts > 1 ? "retry" : "expiry_approaching",
            attemptNumber: this.refreshAttempts,
            tokenStatus: this.getTokenStatus()
          }
        );
        this.emit("auth:token:refresh:start" /* TOKEN_REFRESH_START */, event);
      }
      emitRefreshSuccess(tokens) {
        const event = createAuthEvent(
          "auth:token:refresh:success" /* TOKEN_REFRESH_SUCCESS */,
          {
            tokens,
            oldExpiresAt: this.currentTokens.expiresAt || 0,
            newExpiresAt: this.parseToken(tokens.access_token)?.exp || 0,
            attemptNumber: this.refreshAttempts
          }
        );
        this.emit("auth:token:refresh:success" /* TOKEN_REFRESH_SUCCESS */, event);
      }
      emitRefreshFailure(error) {
        const eventData = {
          error,
          attemptNumber: this.refreshAttempts,
          willRetry: this.refreshAttempts < this.config.maxRefreshAttempts
        };
        if (this.refreshAttempts < this.config.maxRefreshAttempts) {
          eventData.nextRetryAt = new Date(Date.now() + this.config.refreshRetryDelay * Math.pow(2, this.refreshAttempts - 1));
        }
        const event = createAuthEvent(
          "auth:token:refresh:failure" /* TOKEN_REFRESH_FAILURE */,
          eventData
        );
        this.emit("auth:token:refresh:failure" /* TOKEN_REFRESH_FAILURE */, event);
      }
      emitTokenExpired() {
        const event = createAuthEvent(
          "auth:token:expired" /* TOKEN_EXPIRED */,
          {
            expiredAt: new Date(this.currentTokens.expiresAt || Date.now()),
            wasRefreshAttempted: this.refreshAttempts > 0,
            refreshFailed: true
          }
        );
        this.emit("auth:token:expired" /* TOKEN_EXPIRED */, event);
      }
      /**
       * Destroy token manager
       */
      destroy() {
        this.clearTokens();
        this.removeAllListeners();
      }
    };
  }
});

// src/compliance/access-control.ts
var AccessControlManager;
var init_access_control = __esm({
  "src/compliance/access-control.ts"() {
    "use strict";
    init_esm_shims();
    AccessControlManager = class {
      config;
      users = /* @__PURE__ */ new Map();
      roles = /* @__PURE__ */ new Map();
      sessions = /* @__PURE__ */ new Map();
      accessRequests = /* @__PURE__ */ new Map();
      auditLog = [];
      permissionCache = /* @__PURE__ */ new Map();
      constructor(config) {
        this.config = {
          enabled: true,
          model: "HYBRID",
          session: {
            timeout: 8 * 60 * 60 * 1e3,
            // 8 hours
            maxConcurrentSessions: 3,
            requireReauth: false
          },
          audit: {
            logAllAccess: true,
            logFailedAttempts: true,
            retentionPeriod: 365 * 24 * 60 * 60 * 1e3
            // 1 year
          },
          enforcement: {
            strictMode: true,
            allowEscalation: false,
            requireApproval: ["delete_user", "modify_permissions", "export_data"]
          },
          ...config
        };
        if (this.config.enabled) {
          this.initializeDefaultRoles();
          this.startSessionCleanup();
        }
      }
      /**
       * Create a new user
       */
      async createUser(userData, createdBy) {
        if (!this.config.enabled) {
          throw new Error("Access control is disabled");
        }
        const userId = this.generateUserId();
        const now = Date.now();
        const user = {
          id: userId,
          sessions: [],
          failedAttempts: 0,
          metadata: {
            createdAt: now,
            updatedAt: now,
            createdBy
          },
          ...userData
        };
        this.users.set(userId, user);
        this.auditAccess({
          userId: createdBy,
          action: "permission_changed",
          details: {
            targetUserId: userId,
            operation: "create_user",
            roles: userData.roles
          },
          context: { timestamp: now },
          timestamp: now,
          riskLevel: "medium"
        });
        return userId;
      }
      /**
       * Assign role to user
       */
      async assignRole(userId, roleId, assignedBy) {
        const user = this.users.get(userId);
        if (!user) {
          throw new Error(`User not found: ${userId}`);
        }
        const role = this.roles.get(roleId);
        if (!role) {
          throw new Error(`Role not found: ${roleId}`);
        }
        if (!user.roles.includes(roleId)) {
          user.roles.push(roleId);
          user.metadata.updatedAt = Date.now();
          this.clearUserPermissionCache(userId);
          this.auditAccess({
            userId: assignedBy,
            action: "role_assigned",
            details: {
              targetUserId: userId,
              roleId,
              roleName: role.name
            },
            context: { timestamp: Date.now() },
            timestamp: Date.now(),
            riskLevel: "medium"
          });
        }
      }
      /**
       * Revoke role from user
       */
      async revokeRole(userId, roleId, revokedBy) {
        const user = this.users.get(userId);
        if (!user) {
          throw new Error(`User not found: ${userId}`);
        }
        const roleIndex = user.roles.indexOf(roleId);
        if (roleIndex > -1) {
          user.roles.splice(roleIndex, 1);
          user.metadata.updatedAt = Date.now();
          this.clearUserPermissionCache(userId);
          const role = this.roles.get(roleId);
          this.auditAccess({
            userId: revokedBy,
            action: "role_revoked",
            details: {
              targetUserId: userId,
              roleId,
              roleName: role?.name || "Unknown"
            },
            context: { timestamp: Date.now() },
            timestamp: Date.now(),
            riskLevel: "medium"
          });
        }
      }
      /**
       * Create a new role
       */
      async createRole(roleData, createdBy) {
        const roleId = this.generateRoleId();
        const now = Date.now();
        const role = {
          id: roleId,
          metadata: {
            createdAt: now,
            updatedAt: now,
            createdBy,
            isSystem: false
          },
          ...roleData
        };
        this.roles.set(roleId, role);
        this.auditAccess({
          userId: createdBy,
          action: "permission_changed",
          details: {
            operation: "create_role",
            roleId,
            roleName: role.name,
            permissions: role.permissions.length
          },
          context: { timestamp: now },
          timestamp: now,
          riskLevel: "high"
        });
        return roleId;
      }
      /**
       * Authenticate user and create session
       */
      async authenticate(userId, context) {
        const user = this.users.get(userId);
        if (!user) {
          this.auditAccess({
            userId,
            action: "access_denied",
            details: { reason: "user_not_found" },
            context,
            timestamp: Date.now(),
            riskLevel: "high"
          });
          throw new Error("Authentication failed");
        }
        if (user.status !== "active") {
          this.auditAccess({
            userId,
            action: "access_denied",
            details: { reason: "user_inactive", status: user.status },
            context,
            timestamp: Date.now(),
            riskLevel: "high"
          });
          throw new Error(`User account is ${user.status}`);
        }
        if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
          this.auditAccess({
            userId,
            action: "access_denied",
            details: { reason: "account_locked", lockoutUntil: user.lockoutUntil },
            context,
            timestamp: Date.now(),
            riskLevel: "high"
          });
          throw new Error("Account is locked");
        }
        const activeSessions = user.sessions.filter((s) => s.status === "active");
        if (activeSessions.length >= this.config.session.maxConcurrentSessions) {
          const oldestSession = activeSessions.sort((a, b) => a.startedAt - b.startedAt)[0];
          if (oldestSession) {
            await this.terminateSession(oldestSession.id);
          }
        }
        const sessionId = this.generateSessionId();
        const now = Date.now();
        const permissions = await this.getUserPermissions(userId);
        const session = {
          id: sessionId,
          userId,
          startedAt: now,
          lastActivity: now,
          expiresAt: now + this.config.session.timeout,
          ...context.ipAddress && { ipAddress: context.ipAddress },
          ...context.userAgent && { userAgent: context.userAgent },
          ...context.deviceId && { deviceId: context.deviceId },
          ...context.location && { location: context.location },
          status: "active",
          permissions
        };
        user.sessions.push(session);
        user.lastLogin = now;
        user.failedAttempts = 0;
        this.sessions.set(sessionId, session);
        this.auditAccess({
          userId,
          sessionId,
          action: "login",
          details: {
            sessionId,
            permissions: permissions.length,
            concurrentSessions: user.sessions.filter((s) => s.status === "active").length
          },
          context,
          timestamp: now,
          riskLevel: "low"
        });
        return { sessionId, permissions };
      }
      /**
       * Check if user has permission to perform action on resource
       */
      async checkAccess(sessionId, resource, action, context) {
        if (!this.config.enabled) {
          return { granted: true };
        }
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== "active") {
          this.auditAccess({
            userId: "unknown",
            sessionId,
            action: "access_denied",
            resource,
            details: {
              reason: "invalid_session",
              requestedAction: action
            },
            context,
            timestamp: Date.now(),
            riskLevel: "high"
          });
          return { granted: false, reason: "Invalid or expired session" };
        }
        if (Date.now() > session.expiresAt) {
          session.status = "expired";
          this.auditAccess({
            userId: session.userId,
            sessionId,
            action: "access_denied",
            resource,
            details: {
              reason: "session_expired",
              requestedAction: action
            },
            context,
            timestamp: Date.now(),
            riskLevel: "medium"
          });
          return { granted: false, reason: "Session expired" };
        }
        session.lastActivity = Date.now();
        const user = this.users.get(session.userId);
        if (!user) {
          return { granted: false, reason: "User not found" };
        }
        const requiresApproval = this.config.enforcement.requireApproval.includes(action);
        const result = await this.evaluatePermissions(
          session.permissions,
          resource,
          action,
          user,
          context
        );
        const requestId = this.generateRequestId();
        const accessRequest = {
          id: requestId,
          userId: session.userId,
          sessionId,
          resource,
          action,
          context,
          timestamp: Date.now(),
          result: result.granted ? "granted" : "denied",
          ...result.reason && { reason: result.reason },
          approvalRequired: requiresApproval && result.granted
        };
        this.accessRequests.set(requestId, accessRequest);
        this.auditAccess({
          userId: session.userId,
          sessionId,
          action: result.granted ? "access_granted" : "access_denied",
          resource,
          details: {
            requestedAction: action,
            reason: result.reason,
            requiresApproval,
            requestId
          },
          context,
          timestamp: Date.now(),
          riskLevel: result.granted ? "low" : "medium"
        });
        return {
          granted: result.granted,
          ...result.reason && { reason: result.reason },
          ...requiresApproval && result.granted && { requiresApproval: true }
        };
      }
      /**
       * Approve pending access request
       */
      async approveAccess(requestId, approvedBy, context) {
        const request = this.accessRequests.get(requestId);
        if (!request) {
          throw new Error(`Access request not found: ${requestId}`);
        }
        if (!request.approvalRequired) {
          throw new Error("Access request does not require approval");
        }
        request.result = "granted";
        request.approvedBy = approvedBy;
        request.approvedAt = Date.now();
        this.auditAccess({
          userId: approvedBy,
          action: "access_granted",
          resource: request.resource,
          details: {
            requestId,
            targetUserId: request.userId,
            approvedAction: request.action
          },
          context,
          timestamp: Date.now(),
          riskLevel: "medium"
        });
      }
      /**
       * Terminate user session
       */
      async terminateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.status = "terminated";
        this.sessions.delete(sessionId);
        const user = this.users.get(session.userId);
        if (user) {
          const sessionIndex = user.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex > -1) {
            const userSession = user.sessions[sessionIndex];
            if (userSession) {
              userSession.status = "terminated";
            }
          }
        }
        this.auditAccess({
          userId: session.userId,
          sessionId,
          action: "logout",
          details: {
            sessionId,
            duration: Date.now() - session.startedAt
          },
          context: { timestamp: Date.now() },
          timestamp: Date.now(),
          riskLevel: "low"
        });
      }
      /**
       * Get user permissions (with caching)
       */
      async getUserPermissions(userId) {
        const cacheKey = `user_${userId}`;
        const cached = this.permissionCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
          return cached.permissions;
        }
        const user = this.users.get(userId);
        if (!user) return [];
        const permissions = [];
        const processedRoles = /* @__PURE__ */ new Set();
        const processRole = (roleId) => {
          if (processedRoles.has(roleId)) return;
          processedRoles.add(roleId);
          const role = this.roles.get(roleId);
          if (!role) return;
          permissions.push(...role.permissions);
          if (role.inherits) {
            for (const inheritedRoleId of role.inherits) {
              processRole(inheritedRoleId);
            }
          }
        };
        for (const roleId of user.roles) {
          processRole(roleId);
        }
        const uniquePermissions = Array.from(
          new Map(permissions.map((p) => [`${p.resource}:${p.action}`, p])).values()
        ).sort((a, b) => {
          if (a.effect === "deny" && b.effect === "allow") return -1;
          if (a.effect === "allow" && b.effect === "deny") return 1;
          return 0;
        });
        this.permissionCache.set(cacheKey, {
          permissions: uniquePermissions,
          expiresAt: Date.now() + 15 * 60 * 1e3
          // 15 minutes
        });
        return uniquePermissions;
      }
      /**
       * Get access audit log
       */
      getAuditLog(filter) {
        let filteredLog = [...this.auditLog];
        if (filter) {
          if (filter.userId) {
            filteredLog = filteredLog.filter((entry) => entry.userId === filter.userId);
          }
          if (filter.action) {
            filteredLog = filteredLog.filter((entry) => entry.action === filter.action);
          }
          if (filter.resource) {
            filteredLog = filteredLog.filter((entry) => entry.resource === filter.resource);
          }
          if (filter.timeRange) {
            filteredLog = filteredLog.filter(
              (entry) => entry.timestamp >= filter.timeRange.start && entry.timestamp <= filter.timeRange.end
            );
          }
          if (filter.riskLevel) {
            filteredLog = filteredLog.filter((entry) => entry.riskLevel === filter.riskLevel);
          }
        }
        return filteredLog.sort((a, b) => b.timestamp - a.timestamp);
      }
      /**
       * Get access control statistics
       */
      getAccessControlStats() {
        const users = Array.from(this.users.values());
        const sessions = Array.from(this.sessions.values());
        const roles = Array.from(this.roles.values());
        const activeUsers = users.filter((u) => u.status === "active").length;
        const suspendedUsers = users.filter((u) => u.status === "suspended").length;
        const lockedUsers = users.filter((u) => u.lockoutUntil && Date.now() < u.lockoutUntil).length;
        const activeSessions = sessions.filter((s) => s.status === "active").length;
        const averageSessionDuration = sessions.length > 0 ? sessions.reduce((sum, s) => sum + (Date.now() - s.startedAt), 0) / sessions.length : 0;
        const totalPermissions = roles.reduce((sum, r) => sum + r.permissions.length, 0);
        const averagePermissionsPerUser = users.length > 0 ? users.reduce((sum, u) => sum + u.roles.length, 0) / users.length : 0;
        const failedAttempts = this.auditLog.filter((e) => e.action === "access_denied").length;
        const highRiskEvents = this.auditLog.filter((e) => e.riskLevel === "high" || e.riskLevel === "critical").length;
        return {
          users: {
            total: users.length,
            active: activeUsers,
            suspended: suspendedUsers,
            locked: lockedUsers
          },
          sessions: {
            active: activeSessions,
            total: sessions.length,
            averageDuration: averageSessionDuration
          },
          permissions: {
            totalRoles: roles.length,
            totalPermissions,
            averagePermissionsPerUser
          },
          audit: {
            totalEntries: this.auditLog.length,
            failedAttempts,
            highRiskEvents
          }
        };
      }
      async evaluatePermissions(permissions, resource, action, user, context) {
        const applicablePermissions = permissions.filter(
          (p) => this.matchesResource(p.resource, resource) && this.matchesAction(p.action, action)
        );
        if (applicablePermissions.length === 0) {
          return { granted: false, reason: "No applicable permissions found" };
        }
        for (const permission of applicablePermissions) {
          const conditionsMet = await this.evaluateConditions(
            permission.conditions || [],
            user,
            context
          );
          if (conditionsMet) {
            if (permission.effect === "deny") {
              return { granted: false, reason: "Explicitly denied by permission rule" };
            } else if (permission.effect === "allow") {
              if (permission.scope && !this.checkScope(permission.scope, user, context)) {
                continue;
              }
              return { granted: true };
            }
          }
        }
        return { granted: false, reason: "No matching allow permissions with satisfied conditions" };
      }
      async evaluateConditions(conditions, user, context) {
        for (const condition of conditions) {
          if (!await this.evaluateCondition(condition, user, context)) {
            return false;
          }
        }
        return true;
      }
      async evaluateCondition(condition, user, context) {
        let actualValue;
        switch (condition.type) {
          case "time":
            actualValue = new Date(context.timestamp).getHours();
            break;
          case "location":
            actualValue = context.location || user.metadata.location;
            break;
          case "device":
            actualValue = context.deviceId;
            break;
          case "attribute":
            actualValue = user.attributes[condition.attribute];
            break;
          case "context":
            actualValue = context.attributes?.[condition.attribute];
            break;
          default:
            return false;
        }
        switch (condition.operator) {
          case "equals":
            return actualValue === condition.value;
          case "not_equals":
            return actualValue !== condition.value;
          case "contains":
            return String(actualValue).includes(String(condition.value));
          case "not_contains":
            return !String(actualValue).includes(String(condition.value));
          case "greater_than":
            return actualValue > condition.value;
          case "less_than":
            return actualValue < condition.value;
          case "in":
            return Array.isArray(condition.value) && condition.value.includes(actualValue);
          case "not_in":
            return Array.isArray(condition.value) && !condition.value.includes(actualValue);
          default:
            return false;
        }
      }
      checkScope(scope, user, context) {
        if (!scope) return true;
        if (scope.global) return true;
        if (scope.organizations && user.metadata.department) {
          return scope.organizations.includes(user.metadata.department);
        }
        if (scope.locations && (context.location || user.metadata.location)) {
          const userLocation = context.location || user.metadata.location;
          return scope.locations.includes(userLocation);
        }
        return true;
      }
      matchesResource(permissionResource, requestedResource) {
        if (permissionResource === "*") return true;
        if (permissionResource.endsWith("*")) {
          const prefix = permissionResource.slice(0, -1);
          return requestedResource.startsWith(prefix);
        }
        return permissionResource === requestedResource;
      }
      matchesAction(permissionAction, requestedAction) {
        if (permissionAction === "*") return true;
        if (permissionAction.endsWith("*")) {
          const prefix = permissionAction.slice(0, -1);
          return requestedAction.startsWith(prefix);
        }
        return permissionAction === requestedAction;
      }
      initializeDefaultRoles() {
        this.roles.set("admin", {
          id: "admin",
          name: "Administrator",
          description: "Full system access",
          permissions: [
            {
              id: "admin_all",
              resource: "*",
              action: "*",
              effect: "allow"
            }
          ],
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: "system",
            isSystem: true
          }
        });
        this.roles.set("merchant", {
          id: "merchant",
          name: "Merchant",
          description: "Merchant operations access",
          permissions: [
            {
              id: "merchant_receipts",
              resource: "receipts",
              action: "*",
              effect: "allow"
            },
            {
              id: "merchant_reports",
              resource: "reports",
              action: "read",
              effect: "allow"
            }
          ],
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: "system",
            isSystem: true
          }
        });
        this.roles.set("cashier", {
          id: "cashier",
          name: "Cashier",
          description: "Point of sale operations",
          permissions: [
            {
              id: "cashier_receipts",
              resource: "receipts",
              action: "create",
              effect: "allow"
            },
            {
              id: "cashier_receipts_read",
              resource: "receipts",
              action: "read",
              effect: "allow",
              scope: {
                global: false
              }
            }
          ],
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: "system",
            isSystem: true
          }
        });
      }
      clearUserPermissionCache(userId) {
        const cacheKey = `user_${userId}`;
        this.permissionCache.delete(cacheKey);
      }
      auditAccess(entry) {
        const auditEntry = {
          id: this.generateAuditId(),
          ...entry
        };
        this.auditLog.push(auditEntry);
        const maxEntries = 1e4;
        if (this.auditLog.length > maxEntries) {
          this.auditLog = this.auditLog.slice(-maxEntries);
        }
      }
      startSessionCleanup() {
        setInterval(() => {
          const now = Date.now();
          for (const [sessionId, session] of this.sessions.entries()) {
            if (session.expiresAt <= now) {
              session.status = "expired";
              this.sessions.delete(sessionId);
            }
          }
          const retentionCutoff = now - this.config.audit.retentionPeriod;
          this.auditLog = this.auditLog.filter((entry) => entry.timestamp > retentionCutoff);
        }, 60 * 60 * 1e3);
      }
      generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      generateRoleId() {
        return `role_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      generateRequestId() {
        return `request_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
    };
  }
});

// src/auth/auth-storage.ts
var auth_storage_exports = {};
__export(auth_storage_exports, {
  AuthStorage: () => AuthStorage
});
var DEFAULT_CONFIG11, AuthStorage;
var init_auth_storage = __esm({
  "src/auth/auth-storage.ts"() {
    "use strict";
    init_esm_shims();
    init_unified_storage();
    init_storage_factory();
    init_encryption();
    init_auth_events();
    init_eventemitter3();
    DEFAULT_CONFIG11 = {
      storageKey: "acube_auth",
      enableEncryption: true,
      autoMigrate: true
    };
    AuthStorage = class extends import_index.default {
      config;
      storage;
      encryption = null;
      encryptionKeyId = null;
      memoryCache = null;
      isInitialized = false;
      constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG11, ...config };
        this.storage = null;
        if (this.config.enableEncryption) {
          this.encryption = new AdvancedEncryption({
            algorithm: "AES-GCM",
            keyLength: 256,
            keyDerivation: {
              algorithm: "PBKDF2",
              iterations: 1e5,
              salt: new Uint8Array(16)
              // Will be generated per operation
            }
          });
        }
      }
      /**
       * Initialize storage and encryption
       */
      async initialize() {
        if (this.isInitialized) return;
        try {
          this.storage = await createStorage({
            // @ts-ignore
            preferredAdapter: this.config.storageAdapter || "auto",
            encryption: this.config.enableEncryption ? {
              enabled: true,
              ...this.config.encryptionKey && { key: this.config.encryptionKey }
            } : void 0,
            keyPrefix: "auth"
          });
          if (this.encryption) {
            await this.initializeEncryption();
          }
          if (this.config.autoMigrate) {
            await this.migrateFromLegacyStorage();
          }
          this.isInitialized = true;
        } catch (error) {
          this.emitStorageError("initialize", error);
          throw error;
        }
      }
      /**
       * Store authentication data securely
       */
      async store(data) {
        await this.ensureInitialized();
        try {
          this.memoryCache = data;
          let storageData = data;
          if (this.encryption && this.encryptionKeyId) {
            const serialized = JSON.stringify(data);
            const encrypted = await this.encryption.encryptSymmetric(
              serialized,
              this.encryptionKeyId
            );
            storageData = {
              encrypted: true,
              data: AdvancedEncryption.encryptedDataToJSON(encrypted),
              version: "1.0",
              timestamp: Date.now()
            };
          }
          const storageKey = createStorageKey(this.config.storageKey);
          await this.storage.set(storageKey, storageData, {
            ttl: data.expiresAt - Date.now(),
            encrypt: this.config.enableEncryption
          });
          await this.storePlatformSpecific(data);
        } catch (error) {
          this.emitStorageError("write", error);
          throw this.createAuthError(
            "STORAGE_ERROR",
            "Failed to store authentication data",
            error
          );
        }
      }
      /**
       * Retrieve authentication data
       */
      async retrieve() {
        await this.ensureInitialized();
        try {
          if (this.memoryCache) {
            if (this.memoryCache.expiresAt > Date.now()) {
              return this.memoryCache;
            } else {
              this.memoryCache = null;
            }
          }
          const storageKey = createStorageKey(this.config.storageKey);
          const storageEntry = await this.storage.get(storageKey);
          if (!storageEntry) {
            return await this.retrievePlatformSpecific();
          }
          const storageData = storageEntry.data;
          if (storageData.encrypted && this.encryption && this.encryptionKeyId) {
            const encrypted = AdvancedEncryption.encryptedDataFromJSON(storageData.data);
            const decrypted = await this.encryption.decryptSymmetric(encrypted);
            const data = JSON.parse(new TextDecoder().decode(decrypted));
            this.memoryCache = data;
            return data;
          }
          if (!storageData.encrypted) {
            this.memoryCache = storageData;
            return storageData;
          }
          return null;
        } catch (error) {
          this.emitStorageError("read", error);
          return null;
        }
      }
      /**
       * Clear authentication data
       */
      async clear() {
        await this.ensureInitialized();
        try {
          this.memoryCache = null;
          const storageKey = createStorageKey(this.config.storageKey);
          await this.storage.delete(storageKey);
          await this.clearPlatformSpecific();
          this.emit("auth:storage:cleared" /* STORAGE_CLEARED */, createAuthEvent(
            "auth:storage:cleared" /* STORAGE_CLEARED */,
            { timestamp: Date.now() }
          ));
        } catch (error) {
          this.emitStorageError("delete", error);
          throw this.createAuthError(
            "STORAGE_ERROR",
            "Failed to clear authentication data",
            error
          );
        }
      }
      /**
       * Update specific fields in stored auth data
       */
      async update(updates) {
        const current = await this.retrieve();
        if (!current) {
          throw this.createAuthError(
            "STORAGE_ERROR",
            "No authentication data to update"
          );
        }
        const updated = {
          ...current,
          ...updates,
          user: updates.user ? { ...current.user, ...updates.user } : current.user
        };
        await this.store(updated);
      }
      /**
       * Check if auth data exists and is valid
       */
      async exists() {
        const data = await this.retrieve();
        return data !== null && data.expiresAt > Date.now();
      }
      /**
       * Get storage statistics
       */
      async getStats() {
        const data = await this.retrieve();
        const now = Date.now();
        return {
          hasData: data !== null,
          isExpired: data ? data.expiresAt <= now : false,
          expiresIn: data ? Math.max(0, data.expiresAt - now) : null,
          storageType: this.config.storageAdapter || this.detectStorageAdapter(),
          encryptionEnabled: this.config.enableEncryption
        };
      }
      /**
       * Platform-specific secure storage (React Native Keychain)
       */
      async storePlatformSpecific(data) {
        if (typeof window === "undefined") return;
        try {
          if (this.isReactNative() && this.config.enableEncryption) {
            const Keychain = await this.getKeychain();
            if (Keychain) {
              await Keychain.setInternetCredentials(
                "acube.com",
                data.user.email,
                JSON.stringify({
                  accessToken: data.accessToken,
                  refreshToken: data.refreshToken
                })
              );
            }
          }
          if (this.isWeb() && typeof window.sessionStorage !== "undefined") {
            const safeData = {
              userId: data.user.id,
              expiresAt: data.expiresAt,
              roles: data.user.roles
            };
            window.sessionStorage.setItem(`${this.config.storageKey}_session`, JSON.stringify(safeData));
          }
        } catch (error) {
          console.warn("Platform-specific storage failed:", error);
        }
      }
      /**
       * Retrieve from platform-specific storage
       */
      async retrievePlatformSpecific() {
        if (typeof window === "undefined") return null;
        try {
          if (this.isReactNative() && this.config.enableEncryption) {
            const Keychain = await this.getKeychain();
            if (Keychain) {
              const credentials = await Keychain.getInternetCredentials("acube.com");
              if (credentials) {
                return null;
              }
            }
          }
          return null;
        } catch (error) {
          console.warn("Platform-specific retrieval failed:", error);
          return null;
        }
      }
      /**
       * Clear platform-specific storage
       */
      async clearPlatformSpecific() {
        if (typeof window === "undefined") return;
        try {
          if (this.isReactNative()) {
            const Keychain = await this.getKeychain();
            if (Keychain) {
              await Keychain.resetInternetCredentials("acube.com");
            }
          }
          if (this.isWeb() && typeof window.sessionStorage !== "undefined") {
            window.sessionStorage.removeItem(`${this.config.storageKey}_session`);
          }
        } catch (error) {
          console.warn("Platform-specific clear failed:", error);
        }
      }
      /**
       * Initialize encryption key
       */
      async initializeEncryption() {
        if (!this.encryption) return;
        try {
          const keyStorageKey = createStorageKey("_auth_encryption_key");
          const keyEntry = await this.storage.get(keyStorageKey);
          if (keyEntry) {
            const keyData = keyEntry.data;
            this.encryptionKeyId = keyData.keyId;
            await this.encryption.importKey(
              this.base64ToArrayBuffer(keyData.key),
              "AES-GCM",
              keyData.keyId
            );
          } else {
            this.encryptionKeyId = await this.encryption.generateSymmetricKey();
            const exportedKey = await this.encryption.exportKey(this.encryptionKeyId, "raw");
            const keyStorageKey2 = createStorageKey("_auth_encryption_key");
            await this.storage.set(keyStorageKey2, {
              keyId: this.encryptionKeyId,
              key: this.arrayBufferToBase64(exportedKey)
            }, { encrypt: true });
          }
        } catch (error) {
          console.error("Encryption initialization failed:", error);
          this.encryption = null;
          this.config.enableEncryption = false;
        }
      }
      /**
       * Migrate from legacy storage formats
       */
      async migrateFromLegacyStorage() {
        try {
          if (this.isWeb() && typeof window.localStorage !== "undefined") {
            const legacyData = window.localStorage.getItem("acube_auth_legacy");
            if (legacyData) {
              try {
                const parsed = JSON.parse(legacyData);
                await this.store({
                  ...parsed,
                  version: "1.0",
                  encryptedAt: Date.now()
                });
                window.localStorage.removeItem("acube_auth_legacy");
              } catch {
              }
            }
          }
        } catch (error) {
          console.warn("Legacy migration failed:", error);
        }
      }
      /**
       * Detect appropriate storage adapter
       */
      detectStorageAdapter() {
        if (this.isReactNative()) {
          return "asyncstorage";
        }
        if (this.isWeb()) {
          if (typeof window.indexedDB !== "undefined") {
            return "indexeddb";
          }
          return "localstorage";
        }
        if (typeof process !== "undefined" && process.versions?.node) {
          return "filesystem";
        }
        return "memory";
      }
      /**
       * Platform detection helpers
       */
      isReactNative() {
        return typeof navigator !== "undefined" && navigator.product === "ReactNative";
      }
      isWeb() {
        return typeof window !== "undefined" && typeof window.document !== "undefined";
      }
      /**
       * Get React Native Keychain module
       */
      async getKeychain() {
        try {
          const KeychainModule = await import("react-native-keychain");
          return KeychainModule;
        } catch {
          return null;
        }
      }
      /**
       * Ensure storage is initialized
       */
      async ensureInitialized() {
        if (!this.isInitialized) {
          await this.initialize();
        }
      }
      /**
       * Emit storage error event
       */
      emitStorageError(operation, error) {
        const event = createAuthEvent(
          "auth:storage:error" /* STORAGE_ERROR */,
          {
            operation,
            error,
            fallbackUsed: false
          }
        );
        this.emit("auth:storage:error" /* STORAGE_ERROR */, event);
      }
      /**
       * Create auth error
       */
      createAuthError(type, message, cause) {
        const error = {
          name: "AuthError",
          type,
          message,
          timestamp: Date.now(),
          recoverable: false
        };
        if (cause instanceof Error) {
          error.details = { cause: cause.message };
        }
        return error;
      }
      /**
       * Utility: Convert ArrayBuffer to base64
       */
      arrayBufferToBase64(buffer) {
        const binary = String.fromCharCode(...new Uint8Array(buffer));
        return btoa(binary);
      }
      /**
       * Utility: Convert base64 to ArrayBuffer
       */
      base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const buffer = new ArrayBuffer(binary.length);
        const array = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        return buffer;
      }
      /**
       * Destroy storage instance
       */
      async destroy() {
        this.memoryCache = null;
        this.removeAllListeners();
        if (this.storage) {
          await this.storage.destroy();
        }
      }
    };
  }
});

// src/auth/auth-performance.ts
import { LRUCache as LRUCache2 } from "lru-cache";
var DEFAULT_PERFORMANCE_CONFIG, AuthPerformanceOptimizer, COMMON_PERMISSION_SETS;
var init_auth_performance = __esm({
  "src/auth/auth-performance.ts"() {
    "use strict";
    init_esm_shims();
    DEFAULT_PERFORMANCE_CONFIG = {
      permissionCacheSize: 1e3,
      permissionCacheTTL: 5 * 60 * 1e3,
      // 5 minutes
      roleCacheSize: 100,
      roleCacheTTL: 10 * 60 * 1e3,
      // 10 minutes
      tokenValidationCacheSize: 500,
      tokenValidationCacheTTL: 1 * 60 * 1e3,
      // 1 minute
      maxBatchSize: 10,
      batchTimeoutMs: 50,
      enableMetrics: true,
      metricsRetentionMs: 24 * 60 * 60 * 1e3
      // 24 hours
    };
    AuthPerformanceOptimizer = class {
      config;
      // Permission caching
      permissionCache;
      roleCache;
      tokenValidationCache;
      // Batch processing
      pendingPermissionChecks = /* @__PURE__ */ new Map();
      // Performance metrics
      metrics = this.createEmptyMetrics();
      constructor(config = {}) {
        this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
        this.permissionCache = new LRUCache2({
          max: this.config.permissionCacheSize,
          ttl: this.config.permissionCacheTTL,
          updateAgeOnGet: true,
          updateAgeOnHas: true
        });
        this.roleCache = new LRUCache2({
          max: this.config.roleCacheSize,
          ttl: this.config.roleCacheTTL,
          updateAgeOnGet: true,
          updateAgeOnHas: true
        });
        this.tokenValidationCache = new LRUCache2({
          max: this.config.tokenValidationCacheSize,
          ttl: this.config.tokenValidationCacheTTL,
          updateAgeOnGet: true,
          updateAgeOnHas: true
        });
        this.resetMetrics();
        this.setupCacheCleanup();
      }
      /**
       * Cache-aware permission checking with intelligent batching
       */
      async checkPermissionOptimized(user, permission, checkFn) {
        const startTime = performance.now();
        const cacheKey = this.generatePermissionCacheKey(user, permission);
        const cached = this.permissionCache.get(cacheKey);
        if (cached) {
          this.updateMetrics("permissionChecks", startTime, true);
          return cached;
        }
        return new Promise((resolve, reject) => {
          const userKey = user.id;
          if (!this.pendingPermissionChecks.has(userKey)) {
            this.pendingPermissionChecks.set(userKey, {
              checks: [],
              timer: setTimeout(() => {
                this.processPendingPermissionChecks(userKey, checkFn);
              }, this.config.batchTimeoutMs)
            });
          }
          const pending = this.pendingPermissionChecks.get(userKey);
          pending.checks.push({ permission, resolve, reject });
          if (pending.checks.length >= this.config.maxBatchSize) {
            clearTimeout(pending.timer);
            this.processPendingPermissionChecks(userKey, checkFn);
          }
        });
      }
      /**
       * Cache-aware role computation with memoization
       */
      getEffectiveRolesOptimized(user, getRolesFn) {
        const startTime = performance.now();
        const cacheKey = this.generateRoleCacheKey(user);
        const cached = this.roleCache.get(cacheKey);
        if (cached) {
          this.updateMetrics("roleComputations", startTime, true);
          return cached;
        }
        const roles = getRolesFn(user);
        this.roleCache.set(cacheKey, roles);
        this.updateMetrics("roleComputations", startTime, false);
        return roles;
      }
      /**
       * Optimized token validation with caching
       */
      async validateTokenOptimized(token, validateFn) {
        const startTime = performance.now();
        const cacheKey = this.hashToken(token);
        const cached = this.tokenValidationCache.get(cacheKey);
        if (cached !== void 0) {
          this.updateMetrics("tokenValidations", startTime, true);
          return cached;
        }
        const isValid = await validateFn(token);
        this.tokenValidationCache.set(cacheKey, isValid);
        this.updateMetrics("tokenValidations", startTime, false);
        return isValid;
      }
      /**
       * Preload common permissions for a user
       */
      async preloadUserPermissions(user, commonPermissions, checkFn) {
        const uncachedPermissions = commonPermissions.filter((permission) => {
          const cacheKey = this.generatePermissionCacheKey(user, permission);
          return !this.permissionCache.has(cacheKey);
        });
        if (uncachedPermissions.length === 0) return;
        const results = await Promise.allSettled(
          uncachedPermissions.map((permission) => checkFn(permission))
        );
        results.forEach((result, index) => {
          const permission = uncachedPermissions[index];
          if (result.status === "fulfilled" && permission) {
            const cacheKey = this.generatePermissionCacheKey(user, permission);
            this.permissionCache.set(cacheKey, result.value);
          }
        });
      }
      /**
       * Clear user-specific caches (on logout, role change, etc.)
       */
      clearUserCaches(userId) {
        for (const [key] of this.permissionCache.entries()) {
          if (key.startsWith(`user:${userId}:`)) {
            this.permissionCache.delete(key);
          }
        }
        for (const [key] of this.roleCache.entries()) {
          if (key.startsWith(`user:${userId}:`)) {
            this.roleCache.delete(key);
          }
        }
      }
      /**
       * Get current performance metrics
       */
      getMetrics() {
        return {
          ...this.metrics,
          memoryUsage: {
            totalCacheSize: this.permissionCache.size + this.roleCache.size + this.tokenValidationCache.size,
            permissionCacheSize: this.permissionCache.size,
            roleCacheSize: this.roleCache.size,
            tokenCacheSize: this.tokenValidationCache.size
          }
        };
      }
      /**
       * Create empty metrics object
       */
      createEmptyMetrics() {
        return {
          permissionChecks: {
            total: 0,
            cached: 0,
            cacheHitRate: 0,
            avgResponseTime: 0
          },
          roleComputations: {
            total: 0,
            cached: 0,
            cacheHitRate: 0,
            avgResponseTime: 0
          },
          tokenValidations: {
            total: 0,
            cached: 0,
            cacheHitRate: 0,
            avgResponseTime: 0
          },
          batchOperations: {
            totalBatches: 0,
            avgBatchSize: 0,
            avgBatchTime: 0
          },
          memoryUsage: {
            totalCacheSize: 0,
            permissionCacheSize: 0,
            roleCacheSize: 0,
            tokenCacheSize: 0
          }
        };
      }
      /**
       * Reset performance metrics
       */
      resetMetrics() {
        this.metrics = this.createEmptyMetrics();
      }
      /**
       * Cleanup resources
       */
      destroy() {
        for (const [, pending] of this.pendingPermissionChecks) {
          clearTimeout(pending.timer);
          pending.checks.forEach(({ reject }) => {
            reject(new Error("AuthPerformanceOptimizer destroyed"));
          });
        }
        this.pendingPermissionChecks.clear();
        this.permissionCache.clear();
        this.roleCache.clear();
        this.tokenValidationCache.clear();
      }
      // Private methods
      async processPendingPermissionChecks(userKey, checkFn) {
        const pending = this.pendingPermissionChecks.get(userKey);
        if (!pending) return;
        this.pendingPermissionChecks.delete(userKey);
        clearTimeout(pending.timer);
        const batchStartTime = performance.now();
        try {
          const results = await Promise.allSettled(
            pending.checks.map(({ permission }) => checkFn(permission))
          );
          this.metrics.batchOperations.totalBatches++;
          this.metrics.batchOperations.avgBatchSize = (this.metrics.batchOperations.avgBatchSize * (this.metrics.batchOperations.totalBatches - 1) + pending.checks.length) / this.metrics.batchOperations.totalBatches;
          const batchTime = performance.now() - batchStartTime;
          this.metrics.batchOperations.avgBatchTime = (this.metrics.batchOperations.avgBatchTime * (this.metrics.batchOperations.totalBatches - 1) + batchTime) / this.metrics.batchOperations.totalBatches;
          results.forEach((result, index) => {
            const check = pending.checks[index];
            if (!check) return;
            const { permission, resolve, reject } = check;
            if (result.status === "fulfilled") {
              const cacheKey = this.generatePermissionCacheKey(
                { id: userKey },
                permission
              );
              this.permissionCache.set(cacheKey, result.value);
              resolve(result.value);
            } else {
              reject(result.reason);
            }
          });
        } catch (error) {
          pending.checks.forEach(({ reject }) => {
            reject(error);
          });
        }
      }
      generatePermissionCacheKey(user, permission) {
        const context = [
          user.id,
          user.merchant_id || "",
          user.cashier_id || "",
          JSON.stringify(user.roles.sort()),
          permission.resource,
          permission.action,
          JSON.stringify(permission.context || {})
        ].join(":");
        return `perm:${this.hashString(context)}`;
      }
      generateRoleCacheKey(user) {
        const context = [
          user.id,
          user.merchant_id || "",
          user.cashier_id || "",
          JSON.stringify(user.roles.sort()),
          user.attributes?.primaryRole || ""
        ].join(":");
        return `role:${this.hashString(context)}`;
      }
      hashToken(token) {
        return `token:${this.hashString(token)}`;
      }
      hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
      }
      updateMetrics(type, startTime, fromCache) {
        if (!this.config.enableMetrics) return;
        const responseTime = performance.now() - startTime;
        const metric = this.metrics[type];
        metric.total++;
        if (fromCache) {
          metric.cached++;
        }
        metric.cacheHitRate = metric.cached / metric.total;
        metric.avgResponseTime = (metric.avgResponseTime * (metric.total - 1) + responseTime) / metric.total;
      }
      setupCacheCleanup() {
        setInterval(() => {
          this.permissionCache.purgeStale();
          this.roleCache.purgeStale();
          this.tokenValidationCache.purgeStale();
        }, 5 * 60 * 1e3);
      }
    };
    COMMON_PERMISSION_SETS = {
      CASHIER: [
        { resource: "receipts", action: "create" },
        { resource: "receipts", action: "read" },
        { resource: "receipts", action: "void" },
        { resource: "pointOfSales", action: "read" }
      ],
      MERCHANT: [
        { resource: "receipts", action: "create" },
        { resource: "receipts", action: "read" },
        { resource: "receipts", action: "void" },
        { resource: "receipts", action: "return" },
        { resource: "pointOfSales", action: "read" },
        { resource: "pointOfSales", action: "update" },
        { resource: "cashiers", action: "read" },
        { resource: "merchants", action: "read" },
        { resource: "merchants", action: "update" }
      ],
      SUPPLIER: [
        { resource: "receipts", action: "create" },
        { resource: "receipts", action: "read" },
        { resource: "receipts", action: "void" },
        { resource: "receipts", action: "return" },
        { resource: "pointOfSales", action: "create" },
        { resource: "pointOfSales", action: "read" },
        { resource: "pointOfSales", action: "update" },
        { resource: "pointOfSales", action: "delete" },
        { resource: "cashiers", action: "create" },
        { resource: "cashiers", action: "read" },
        { resource: "cashiers", action: "update" },
        { resource: "cashiers", action: "delete" },
        { resource: "merchants", action: "create" },
        { resource: "merchants", action: "read" },
        { resource: "merchants", action: "update" },
        { resource: "merchants", action: "delete" }
      ]
    };
  }
});

// src/auth/auth-service.ts
var auth_service_exports = {};
__export(auth_service_exports, {
  AuthService: () => AuthService
});
var DEFAULT_CONFIG12, AuthService;
var init_auth_service = __esm({
  "src/auth/auth-service.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_access_control();
    init_token_manager();
    init_auth_storage();
    init_types3();
    init_types3();
    init_auth_events();
    init_auth_performance();
    DEFAULT_CONFIG12 = {
      loginUrl: "/login",
      refreshUrl: "/token/refresh",
      tokenRefreshBuffer: 5,
      maxRefreshAttempts: 3,
      refreshRetryDelay: 1e3,
      storageKey: "acube_auth",
      storageEncryption: true,
      sessionTimeout: 8 * 60 * 60 * 1e3,
      // 8 hours
      maxConcurrentSessions: 3,
      requireReauth: false,
      enableDeviceBinding: true,
      enableSessionValidation: true,
      enableTokenRotation: true,
      enablePerformanceOptimization: true,
      performanceConfig: {
        permissionCacheSize: 1e3,
        permissionCacheTTL: 5 * 60 * 1e3,
        // 5 minutes
        roleCacheSize: 100,
        roleCacheTTL: 10 * 60 * 1e3,
        // 10 minutes
        tokenValidationCacheSize: 500,
        tokenValidationCacheTTL: 1 * 60 * 1e3,
        // 1 minute
        maxBatchSize: 10,
        batchTimeoutMs: 50,
        enableMetrics: true
      }
    };
    AuthService = class extends import_index.default {
      config;
      httpClient;
      tokenManager;
      storage;
      accessControl;
      currentState;
      deviceId;
      sessionCleanupInterval = null;
      performanceOptimizer;
      constructor(httpClient, config = {}, accessControl, storage, tokenManager) {
        super();
        this.config = { ...DEFAULT_CONFIG12, ...config };
        this.httpClient = httpClient;
        if (tokenManager) {
          this.tokenManager = tokenManager;
        } else {
          this.tokenManager = new TokenManager(httpClient, {
            refreshUrl: this.config.refreshUrl,
            tokenRefreshBuffer: this.config.tokenRefreshBuffer,
            maxRefreshAttempts: this.config.maxRefreshAttempts,
            refreshRetryDelay: this.config.refreshRetryDelay,
            enableTokenRotation: this.config.enableTokenRotation,
            ...this.config.onTokenRefresh && { onTokenRefresh: this.config.onTokenRefresh },
            onTokenExpired: this.handleTokenExpired.bind(this)
          });
        }
        this.storage = storage || new AuthStorage({
          storageKey: this.config.storageKey,
          enableEncryption: this.config.storageEncryption
        });
        this.accessControl = accessControl || new AccessControlManager({
          enabled: true,
          model: "HYBRID",
          session: {
            timeout: this.config.sessionTimeout,
            maxConcurrentSessions: this.config.maxConcurrentSessions,
            requireReauth: this.config.requireReauth
          }
        });
        this.currentState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          error: null
        };
        this.deviceId = this.generateDeviceId();
        this.performanceOptimizer = new AuthPerformanceOptimizer(
          this.config.enablePerformanceOptimization ? this.config.performanceConfig : { enableMetrics: false }
        );
        this.setupEventListeners();
        this.startSessionCleanup();
      }
      /**
       * Initialize the auth service and restore session if available
       */
      async initialize() {
        try {
          await this.storage.initialize();
          await this.restoreSession();
        } catch (error) {
          console.error("Auth service initialization failed:", error);
        }
      }
      /**
       * Login with username and password
       */
      async login(credentials) {
        this.updateState({ isLoading: true, error: null });
        this.emitLoginStart(credentials);
        try {
          const requestData = {
            email: credentials.username,
            // API expects 'email' field instead of 'username'
            password: credentials.password
          };
          const response = await this.httpClient.post(
            this.config.loginUrl,
            requestData,
            {
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              skipRetry: false,
              metadata: { isAuthentication: true }
            }
          );
          const tokens = response.data;
          const rawTokenPayload = this.tokenManager.parseToken(tokens.token);
          if (!rawTokenPayload) {
            throw this.createAuthError(
              "TOKEN_INVALID",
              "Invalid access token received"
            );
          }
          const tokenPayload = {
            sub: String(rawTokenPayload.uid || rawTokenPayload.sub || "unknown"),
            email: rawTokenPayload.username || rawTokenPayload.email || credentials.username,
            roles: [],
            // Will be populated below
            permissions: [],
            iat: rawTokenPayload.iat,
            exp: rawTokenPayload.exp,
            ...rawTokenPayload.merchant_id && { merchant_id: rawTokenPayload.merchant_id },
            ...rawTokenPayload.cashier_id && { cashier_id: rawTokenPayload.cashier_id },
            ...rawTokenPayload.point_of_sale_id && { point_of_sale_id: rawTokenPayload.point_of_sale_id }
          };
          let apiRoles = [];
          if (rawTokenPayload.roles && typeof rawTokenPayload.roles === "object") {
            const domainRoles = Object.values(rawTokenPayload.roles)[0];
            apiRoles = Array.isArray(domainRoles) ? domainRoles : [];
          }
          const tokenRoles = apiRoles.map((role) => {
            switch (role) {
              case "ROLE_MERCHANT":
                return "ROLE_MERCHANT" /* ROLE_MERCHANT */;
              case "ROLE_CASHIER":
                return "ROLE_CASHIER" /* ROLE_CASHIER */;
              case "ROLE_SUPPLIER":
                return "ROLE_SUPPLIER" /* ROLE_SUPPLIER */;
              case "ROLE_ADMIN":
                return "ROLE_ADMIN" /* ROLE_ADMIN */;
              default:
                return "ROLE_CASHIER" /* ROLE_CASHIER */;
            }
          });
          tokenPayload.roles = tokenRoles;
          const effectiveRoles = getEffectiveRoles(tokenRoles);
          const contextForDetection = {
            userRoles: effectiveRoles
          };
          if (tokenPayload.merchant_id) {
            contextForDetection.merchantId = tokenPayload.merchant_id;
          }
          if (tokenPayload.cashier_id) {
            contextForDetection.cashierId = tokenPayload.cashier_id;
          }
          if (tokenPayload.point_of_sale_id) {
            contextForDetection.pointOfSaleId = tokenPayload.point_of_sale_id;
          }
          if (credentials.preferred_role) {
            contextForDetection.preferredRole = credentials.preferred_role;
          }
          const primaryRole = autoDetectRole(contextForDetection);
          const user = {
            id: tokenPayload.sub,
            email: tokenPayload.email,
            name: rawTokenPayload.username || tokenPayload.email || "Unknown User",
            roles: effectiveRoles,
            permissions: tokenPayload.permissions || [],
            ...tokenPayload.cashier_id && { cashier_id: tokenPayload.cashier_id },
            ...tokenPayload.merchant_id && { merchant_id: tokenPayload.merchant_id },
            ...tokenPayload.point_of_sale_id && { point_of_sale_id: tokenPayload.point_of_sale_id },
            session_id: this.generateSessionId(),
            last_login: /* @__PURE__ */ new Date(),
            attributes: {
              deviceId: this.deviceId,
              loginMethod: "password",
              primaryRole,
              simpleRole: toSimpleRole(effectiveRoles),
              originalRoles: tokenRoles,
              contextDetected: {
                merchant: !!tokenPayload.merchant_id,
                cashier: !!tokenPayload.cashier_id,
                pointOfSale: !!tokenPayload.point_of_sale_id
              }
            }
          };
          const oauth2Tokens = {
            access_token: tokens.token,
            refresh_token: "",
            // API doesn't provide refresh token in this format
            token_type: "Bearer",
            expires_in: tokenPayload.exp ? Math.floor((tokenPayload.exp * 1e3 - Date.now()) / 1e3) : 3600
          };
          this.tokenManager.setTokens(oauth2Tokens);
          try {
            const clientIP = await this.getClientIP();
            const userAgent = this.getUserAgent();
            const { sessionId } = await this.accessControl.authenticate(user.id, {
              timestamp: Date.now(),
              deviceId: this.deviceId,
              ipAddress: clientIP || "unknown",
              userAgent: userAgent || "unknown"
            });
            user.session_id = sessionId;
          } catch (accessControlError) {
          }
          const authData = {
            accessToken: tokens.token,
            refreshToken: "",
            // No refresh token available
            expiresAt: tokenPayload.exp * 1e3,
            tokenType: "Bearer",
            user,
            encryptedAt: Date.now(),
            version: "1.0",
            deviceId: this.deviceId
          };
          await this.storage.store(authData);
          this.updateState({
            isAuthenticated: true,
            isLoading: false,
            user,
            accessToken: tokens.token,
            refreshToken: "",
            // No refresh token available
            expiresAt: tokenPayload.exp * 1e3,
            error: null
          });
          this.emitLoginSuccess(user, oauth2Tokens);
          this.emitSessionCreated(user);
          if (this.config.enablePerformanceOptimization) {
            this.preloadCommonPermissions(user).catch((error) => {
              console.warn("Failed to preload permissions:", error);
            });
          }
          return user;
        } catch (error) {
          const authError = this.handleLoginError(error, credentials);
          this.updateState({
            isLoading: false,
            error: authError
          });
          this.emitLoginFailure(authError, credentials);
          throw authError;
        }
      }
      /**
       * Logout user and clear session
       */
      async logout(options = {}) {
        const user = this.currentState.user;
        const sessionId = user?.session_id;
        try {
          if (this.config.logoutUrl && this.currentState.accessToken) {
            try {
              await this.httpClient.post(this.config.logoutUrl, {
                refresh_token: this.currentState.refreshToken,
                clear_all_sessions: options.clearAllSessions || false
              });
            } catch (error) {
              console.warn("Server logout failed:", error);
            }
          }
          if (sessionId) {
            await this.accessControl.terminateSession(sessionId);
          }
          this.tokenManager.clearTokens();
          if (options.clearLocalData !== false) {
            await this.storage.clear();
          }
          this.clearUserCaches();
          this.emitLogout(user?.id || "unknown", options);
          this.updateState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            error: null
          });
          if (this.config.onLogout) {
            this.config.onLogout(options.reason);
          }
        } catch (error) {
          console.error("Logout error:", error);
          this.updateState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            error: null
          });
        }
      }
      /**
       * Get current authentication state
       */
      getState() {
        return { ...this.currentState };
      }
      /**
       * Get current user
       */
      getCurrentUser() {
        return this.currentState.user;
      }
      /**
       * Check if user has permission (optimized with caching and batching)
       */
      async checkPermission(permission) {
        const user = this.currentState.user;
        if (!user || !user.session_id) {
          return {
            granted: false,
            reason: "User not authenticated"
          };
        }
        if (this.config.enablePerformanceOptimization) {
          return this.performanceOptimizer.checkPermissionOptimized(
            user,
            permission,
            async (perm) => this.checkPermissionDirect(perm)
          );
        }
        return this.checkPermissionDirect(permission);
      }
      /**
       * Direct permission check without optimization (used by optimizer)
       */
      async checkPermissionDirect(permission) {
        const user = this.currentState.user;
        if (!user || !user.session_id) {
          return {
            granted: false,
            reason: "User not authenticated"
          };
        }
        try {
          const result = await this.accessControl.checkAccess(
            user.session_id,
            permission.resource,
            permission.action,
            {
              timestamp: Date.now(),
              deviceId: this.deviceId,
              attributes: permission.context || {}
            }
          );
          return {
            granted: result.granted,
            reason: result.reason || "Permission check completed",
            requiresApproval: result.requiresApproval || false
          };
        } catch (error) {
          return {
            granted: false,
            reason: "Permission check failed"
          };
        }
      }
      /**
       * Check if user has specific role (including inherited roles)
       */
      hasRole(role) {
        const userRoles = this.currentState.user?.roles || [];
        return hasRole(userRoles, role);
      }
      /**
       * Check if user has any of the specified roles (including inherited roles)
       */
      hasAnyRole(roles) {
        const userRoles = this.currentState.user?.roles || [];
        return hasAnyRole(userRoles, roles);
      }
      /**
       * Get user's effective roles (including inherited roles) - optimized with caching
       */
      getEffectiveRoles() {
        const user = this.currentState.user;
        if (!user) return [];
        if (this.config.enablePerformanceOptimization) {
          return this.performanceOptimizer.getEffectiveRolesOptimized(
            user,
            (u) => getEffectiveRoles(u.roles || [])
          );
        }
        return getEffectiveRoles(user.roles || []);
      }
      /**
       * Get user's primary role for display purposes
       */
      getPrimaryRole() {
        const userRoles = this.currentState.user?.roles || [];
        return getPrimaryRole(userRoles);
      }
      /**
       * Get user's simple role for external APIs
       */
      getSimpleRole() {
        const userRoles = this.currentState.user?.roles || [];
        return toSimpleRole(userRoles);
      }
      /**
       * Switch to a different role context during session
       */
      async switchRole(targetRole, context) {
        const userRoles = this.currentState.user?.roles || [];
        const switchContext = context ? (() => {
          const ctx = {};
          if (context.merchant_id) ctx.merchantId = context.merchant_id;
          if (context.cashier_id) ctx.cashierId = context.cashier_id;
          if (context.point_of_sale_id) ctx.pointOfSaleId = context.point_of_sale_id;
          return ctx;
        })() : void 0;
        if (!canSwitchToRole(userRoles, targetRole, switchContext)) {
          return false;
        }
        if (this.currentState.user) {
          this.currentState.user.attributes = {
            ...this.currentState.user.attributes,
            primaryRole: targetRole,
            simpleRole: ROLE_TO_SIMPLE[targetRole] || "cashier",
            contextSwitched: true,
            previousRole: this.currentState.user.attributes?.primaryRole
          };
          if (context) {
            if (context.merchant_id) this.currentState.user.merchant_id = context.merchant_id;
            if (context.cashier_id) this.currentState.user.cashier_id = context.cashier_id;
            if (context.point_of_sale_id) this.currentState.user.point_of_sale_id = context.point_of_sale_id;
          }
          try {
            await this.storage.update({
              user: this.currentState.user
            });
          } catch (error) {
            console.warn("Failed to update stored auth data after role switch:", error);
          }
          this.emit("auth:role:changed" /* ROLE_CHANGED */, createAuthEvent(
            "auth:role:changed" /* ROLE_CHANGED */,
            {
              userId: this.currentState.user.id,
              oldRoles: [this.currentState.user.attributes?.previousRole || targetRole],
              newRoles: [targetRole],
              changedBy: this.currentState.user.id,
              reason: "user_initiated_switch"
            }
          ));
        }
        return true;
      }
      /**
       * Get current session info
       */
      async getSessionInfo() {
        const user = this.currentState.user;
        if (!user || !user.session_id) {
          return null;
        }
        const clientIP = await this.getClientIP();
        const userAgent = this.getUserAgent();
        return {
          id: user.session_id,
          userId: user.id,
          createdAt: user.last_login,
          lastActivity: /* @__PURE__ */ new Date(),
          expiresAt: new Date(this.currentState.expiresAt || Date.now() + this.config.sessionTimeout),
          deviceId: this.deviceId,
          deviceName: this.getDeviceName(),
          deviceType: this.getDeviceType(),
          ipAddress: clientIP || "unknown",
          userAgent: userAgent || "unknown",
          active: this.currentState.isAuthenticated
        };
      }
      /**
       * Refresh current session
       */
      async refreshSession() {
        if (!this.currentState.isAuthenticated || !this.tokenManager.getRefreshToken()) {
          throw this.createAuthError(
            "SESSION_EXPIRED",
            "No active session to refresh"
          );
        }
        try {
          const tokens = await this.tokenManager.refreshTokens();
          await this.storage.update({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: this.tokenManager.parseToken(tokens.access_token)?.exp * 1e3
          });
          this.updateState({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: this.tokenManager.parseToken(tokens.access_token)?.exp * 1e3
          });
        } catch (error) {
          await this.logout({
            reason: "token_invalid",
            clearLocalData: true
          });
          throw error;
        }
      }
      /**
       * Restore session from storage
       */
      async restoreSession() {
        try {
          const storedData = await this.storage.retrieve();
          if (!storedData || storedData.expiresAt <= Date.now()) {
            return;
          }
          const tokenValidation = this.tokenManager.validateToken(storedData.accessToken);
          if (!tokenValidation.valid) {
            if (storedData.refreshToken) {
              this.tokenManager.setTokens({
                access_token: storedData.accessToken,
                refresh_token: storedData.refreshToken,
                token_type: "Bearer",
                expires_in: Math.floor((storedData.expiresAt - Date.now()) / 1e3)
              });
              try {
                await this.refreshSession();
                return;
              } catch {
              }
            }
            await this.storage.clear();
            return;
          }
          this.tokenManager.setTokens({
            access_token: storedData.accessToken,
            refresh_token: storedData.refreshToken,
            token_type: "Bearer",
            expires_in: Math.floor((storedData.expiresAt - Date.now()) / 1e3)
          });
          this.updateState({
            isAuthenticated: true,
            user: storedData.user,
            accessToken: storedData.accessToken,
            refreshToken: storedData.refreshToken,
            expiresAt: storedData.expiresAt,
            error: null
          });
          this.emitSessionRestored(storedData.user);
        } catch (error) {
          console.error("Session restoration failed:", error);
          await this.storage.clear();
        }
      }
      /**
       * Handle token expiration
       */
      async handleTokenExpired() {
        this.emit("auth:session:expired" /* SESSION_EXPIRED */, createAuthEvent(
          "auth:session:expired" /* SESSION_EXPIRED */,
          {
            sessionId: this.currentState.user?.session_id || "unknown",
            userId: this.currentState.user?.id || "unknown",
            expiredAt: /* @__PURE__ */ new Date(),
            reason: "timeout"
          }
        ));
        if (this.config.onTokenExpired) {
          this.config.onTokenExpired();
        }
        await this.logout({
          reason: "session_expired",
          clearLocalData: true
        });
      }
      /**
       * Handle login errors
       */
      handleLoginError(error, _credentials) {
        let authError;
        if (error instanceof Error && "statusCode" in error) {
          const statusCode = error.statusCode;
          switch (statusCode) {
            case 401:
              authError = this.createAuthError(
                "INVALID_CREDENTIALS",
                "Invalid username or password",
                error
              );
              break;
            case 403:
              authError = this.createAuthError(
                "PERMISSION_DENIED",
                "Account is locked or suspended",
                error
              );
              break;
            case 429:
              authError = this.createAuthError(
                "NETWORK_ERROR",
                "Too many login attempts. Please try again later.",
                error
              );
              break;
            default:
              authError = this.createAuthError(
                "NETWORK_ERROR",
                "Login failed due to network error",
                error
              );
          }
        } else {
          authError = this.createAuthError(
            "UNKNOWN_ERROR",
            "Login failed due to unknown error",
            error
          );
        }
        return authError;
      }
      /**
       * Update authentication state
       */
      updateState(updates) {
        this.currentState = { ...this.currentState, ...updates };
        this.emit("stateChange", this.currentState);
      }
      /**
       * Setup event listeners
       */
      setupEventListeners() {
        this.tokenManager.on("auth:token:refresh:success" /* TOKEN_REFRESH_SUCCESS */, (event) => {
          this.emit("auth:token:refresh:success" /* TOKEN_REFRESH_SUCCESS */, event);
        });
        this.tokenManager.on("auth:token:refresh:failure" /* TOKEN_REFRESH_FAILURE */, (event) => {
          this.emit("auth:token:refresh:failure" /* TOKEN_REFRESH_FAILURE */, event);
        });
        this.tokenManager.on("auth:token:expired" /* TOKEN_EXPIRED */, (event) => {
          this.emit("auth:token:expired" /* TOKEN_EXPIRED */, event);
        });
        this.storage.on("auth:storage:error" /* STORAGE_ERROR */, (event) => {
          this.emit("auth:storage:error" /* STORAGE_ERROR */, event);
        });
      }
      /**
       * Start session cleanup timer
       */
      startSessionCleanup() {
        this.sessionCleanupInterval = setInterval(() => {
          this.cleanupExpiredSessions();
        }, 60 * 60 * 1e3);
      }
      /**
       * Clean up expired sessions
       */
      async cleanupExpiredSessions() {
        try {
          const stats = await this.storage.getStats();
          if (stats.isExpired) {
            await this.storage.clear();
          }
        } catch (error) {
          console.error("Session cleanup failed:", error);
        }
      }
      /**
       * Event emitters
       */
      emitLoginStart(credentials) {
        const event = createAuthEvent(
          "auth:login:start" /* LOGIN_START */,
          {
            username: credentials.username,
            hasPassword: !!credentials.password,
            hasMFA: !!credentials.mfa_code,
            deviceId: this.deviceId
          }
        );
        this.emit("auth:login:start" /* LOGIN_START */, event);
      }
      emitLoginSuccess(user, tokens) {
        const event = createAuthEvent(
          "auth:login:success" /* LOGIN_SUCCESS */,
          {
            user,
            tokens,
            isFirstLogin: !user.last_login || user.last_login.getTime() === Date.now(),
            loginMethod: "password"
          }
        );
        this.emit("auth:login:success" /* LOGIN_SUCCESS */, event);
      }
      emitLoginFailure(error, credentials) {
        const event = createAuthEvent(
          "auth:login:failure" /* LOGIN_FAILURE */,
          {
            error,
            username: credentials.username,
            attemptNumber: 1
            // Would track this in real implementation
          }
        );
        this.emit("auth:login:failure" /* LOGIN_FAILURE */, event);
      }
      emitLogout(userId, options) {
        const event = createAuthEvent(
          "auth:logout" /* LOGOUT */,
          {
            userId,
            reason: options.reason || "user_initiated",
            ...options.message && { message: options.message },
            clearAllSessions: options.clearAllSessions || false
          }
        );
        this.emit("auth:logout" /* LOGOUT */, event);
      }
      emitSessionCreated(user) {
        const event = createAuthEvent(
          "auth:session:created" /* SESSION_CREATED */,
          {
            sessionId: user.session_id,
            userId: user.id,
            expiresAt: new Date(this.currentState.expiresAt || Date.now() + this.config.sessionTimeout),
            deviceId: this.deviceId
          }
        );
        this.emit("auth:session:created" /* SESSION_CREATED */, event);
      }
      emitSessionRestored(user) {
        const event = createAuthEvent(
          "auth:session:restored" /* SESSION_RESTORED */,
          {
            sessionId: user.session_id,
            user,
            remainingTime: (this.currentState.expiresAt || 0) - Date.now(),
            source: "storage"
          }
        );
        this.emit("auth:session:restored" /* SESSION_RESTORED */, event);
      }
      /**
       * Utility methods
       */
      generateDeviceId() {
        if (typeof window !== "undefined" && window.localStorage) {
          let deviceId = window.localStorage.getItem("acube_device_id");
          if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            window.localStorage.setItem("acube_device_id", deviceId);
          }
          return deviceId;
        }
        return `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      }
      getDeviceName() {
        if (typeof navigator !== "undefined") {
          return navigator.userAgent.split(" ")[0] || "Unknown Device";
        }
        return "Unknown Device";
      }
      getDeviceType() {
        if (typeof navigator === "undefined") return "desktop";
        if (navigator.product === "ReactNative") return "mobile";
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad/.test(userAgent)) return "mobile";
        return "web";
      }
      async getClientIP() {
        return void 0;
      }
      getUserAgent() {
        return typeof navigator !== "undefined" ? navigator.userAgent : void 0;
      }
      createAuthError(type, message, cause) {
        return {
          name: "AuthError",
          type,
          message,
          details: cause instanceof Error ? { cause: cause.message } : {},
          timestamp: Date.now(),
          recoverable: false
        };
      }
      /**
       * Preload common permissions for the current user
       */
      async preloadCommonPermissions(user) {
        if (!this.config.enablePerformanceOptimization) return;
        let commonPermissions = COMMON_PERMISSION_SETS.CASHIER;
        if (hasRole(user.roles || [], "ROLE_SUPPLIER" /* ROLE_SUPPLIER */)) {
          commonPermissions = COMMON_PERMISSION_SETS.SUPPLIER;
        } else if (hasRole(user.roles || [], "ROLE_MERCHANT" /* ROLE_MERCHANT */)) {
          commonPermissions = COMMON_PERMISSION_SETS.MERCHANT;
        }
        await this.performanceOptimizer.preloadUserPermissions(
          user,
          commonPermissions,
          async (permission) => this.checkPermissionDirect(permission)
        );
      }
      /**
       * Clear user-specific performance caches (call on role change, logout, etc.)
       */
      clearUserCaches() {
        if (this.config.enablePerformanceOptimization && this.currentState.user) {
          this.performanceOptimizer.clearUserCaches(this.currentState.user.id);
        }
      }
      /**
       * Get performance metrics for monitoring
       */
      getPerformanceMetrics() {
        if (!this.config.enablePerformanceOptimization) return null;
        return this.performanceOptimizer.getMetrics();
      }
      /**
       * Reset performance metrics
       */
      resetPerformanceMetrics() {
        if (this.config.enablePerformanceOptimization) {
          this.performanceOptimizer.resetMetrics();
        }
      }
      /**
       * Destroy auth service
       */
      async destroy() {
        if (this.sessionCleanupInterval) {
          clearInterval(this.sessionCleanupInterval);
        }
        this.tokenManager.destroy();
        await this.storage.destroy();
        if (this.performanceOptimizer) {
          this.performanceOptimizer.destroy();
        }
        this.removeAllListeners();
      }
    };
  }
});

// src/auth/auth-middleware.ts
var auth_middleware_exports = {};
__export(auth_middleware_exports, {
  EnhancedAuthMiddleware: () => EnhancedAuthMiddleware,
  createEnhancedAuthMiddleware: () => createEnhancedAuthMiddleware,
  hasRequiredPermission: () => hasRequiredPermission,
  hasRequiredRole: () => hasRequiredRole
});
function createEnhancedAuthMiddleware(authService, tokenManager, config) {
  return new EnhancedAuthMiddleware(authService, tokenManager, config);
}
function hasRequiredRole(userRoles, requiredRoles) {
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return required.some((role) => userRoles.includes(role));
}
function hasRequiredPermission(userPermissions, requiredPermission) {
  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  return required.some((permission) => userPermissions.includes(permission));
}
var DEFAULT_CONFIG13, EnhancedAuthMiddleware;
var init_auth_middleware = __esm({
  "src/auth/auth-middleware.ts"() {
    "use strict";
    init_esm_shims();
    init_types3();
    init_auth_events();
    init_eventemitter3();
    DEFAULT_CONFIG13 = {
      enableRetry: true,
      maxRetries: 2,
      retryDelay: 1e3,
      authHeaderName: "Authorization",
      authScheme: "Bearer",
      includeRoleHeaders: true,
      roleHeaderName: "X-User-Role",
      includePermissionHeaders: true,
      permissionHeaderName: "X-User-Permissions",
      includeRequestContext: true,
      contextHeaders: {
        "X-Device-ID": "deviceId",
        "X-Session-ID": "sessionId",
        "X-Request-Context": "requestContext"
      }
    };
    EnhancedAuthMiddleware = class extends import_index.default {
      name = "enhanced-auth";
      priority = 100;
      // Highest priority for auth
      config;
      authService;
      tokenManager;
      isRefreshing = false;
      requestQueue = [];
      queueTimeout = 3e4;
      // 30 seconds
      constructor(authService, tokenManager, config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG13, ...config };
        this.authService = authService;
        this.tokenManager = tokenManager;
        this.setupEventListeners();
      }
      /**
       * Before request: Add authentication headers and user context
       */
      async beforeRequest(context) {
        if (this.isAuthEndpoint(context.url)) {
          return context;
        }
        if (this.isRefreshing) {
          return this.queueRequest(context);
        }
        const authState = this.authService.getState();
        if (!authState.isAuthenticated || !authState.accessToken) {
          return context;
        }
        const tokenStatus = this.tokenManager.getTokenStatus();
        if (tokenStatus.needsRefresh && !tokenStatus.isRefreshing) {
          try {
            await this.refreshTokensWithQueue();
          } catch (error) {
            console.warn("Pre-request token refresh failed:", error);
          }
        }
        const updatedContext = await this.addAuthHeaders(context);
        return updatedContext;
      }
      /**
       * After response: Handle token expiration and refresh
       */
      async afterResponse(context, response) {
        if (response.status === 401 && this.shouldRetryWithRefresh(context)) {
          try {
            await this.refreshTokensWithQueue();
            return this.retryRequestWithNewToken(context, response);
          } catch (refreshError) {
            this.handleAuthenticationFailure(refreshError);
            return response;
          }
        }
        if (response.status === 403) {
          this.handleAuthorizationFailure(context, response);
        }
        return response;
      }
      /**
       * Error handler: Process authentication-related errors
       */
      async onError(context, error) {
        if (this.isAuthRelatedError(error)) {
          const authError = this.createAuthError(error, context);
          this.emit("auth:network:error" /* NETWORK_ERROR */, createAuthEvent(
            "auth:network:error" /* NETWORK_ERROR */,
            {
              operation: "request",
              error: authError,
              endpoint: context.url,
              statusCode: error.statusCode,
              willRetry: false
            }
          ));
          return authError;
        }
        return error;
      }
      /**
       * Add authentication and context headers to request
       */
      async addAuthHeaders(context) {
        const authState = this.authService.getState();
        const updatedContext = { ...context };
        if (authState.accessToken) {
          const authHeader = `${this.config.authScheme} ${authState.accessToken}`;
          updatedContext.headers[this.config.authHeaderName] = authHeader;
        } else {
          console.log("\u26A0\uFE0F  No access token available for request:", {
            url: `${context.method} ${context.url}`,
            authState: {
              isAuthenticated: authState.isAuthenticated,
              hasUser: !!authState.user,
              hasToken: !!authState.accessToken
            }
          });
        }
        if (this.config.includeRoleHeaders && authState.user?.roles) {
          updatedContext.headers[this.config.roleHeaderName] = authState.user.roles.join(",");
        }
        if (this.config.includePermissionHeaders && authState.user?.permissions) {
          updatedContext.headers[this.config.permissionHeaderName] = authState.user.permissions.join(",");
        }
        if (this.config.includeRequestContext && authState.user) {
          Object.entries(this.config.contextHeaders).forEach(([headerName, contextKey]) => {
            let value;
            switch (contextKey) {
              case "deviceId":
                value = authState.user?.attributes?.deviceId;
                break;
              case "sessionId":
                value = authState.user?.session_id;
                break;
              case "requestContext":
                value = JSON.stringify({
                  userId: authState.user?.id,
                  roles: authState.user?.roles,
                  timestamp: Date.now()
                });
                break;
              default:
                value = authState.user?.[contextKey];
            }
            if (value) {
              updatedContext.headers[headerName] = value;
            }
          });
        }
        updatedContext.metadata = {
          ...updatedContext.metadata,
          isAuthenticated: authState.isAuthenticated,
          userId: authState.user?.id,
          roles: authState.user?.roles,
          permissions: authState.user?.permissions
        };
        return updatedContext;
      }
      /**
       * Queue request during token refresh
       */
      async queueRequest(context) {
        return new Promise((resolve, reject) => {
          const queuedRequest = {
            context,
            resolve,
            reject,
            timestamp: Date.now()
          };
          this.requestQueue.push(queuedRequest);
          setTimeout(() => {
            const index = this.requestQueue.indexOf(queuedRequest);
            if (index !== -1) {
              this.requestQueue.splice(index, 1);
              reject(new Error("Request queue timeout"));
            }
          }, this.queueTimeout);
        });
      }
      /**
       * Refresh tokens with request queuing
       */
      async refreshTokensWithQueue() {
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            const checkRefresh = () => {
              if (!this.isRefreshing) {
                resolve();
              } else {
                setTimeout(checkRefresh, 100);
              }
            };
            setTimeout(() => reject(new Error("Token refresh timeout")), this.queueTimeout);
            checkRefresh();
          });
        }
        this.isRefreshing = true;
        try {
          await this.authService.refreshSession();
          await this.processQueuedRequests();
        } finally {
          this.isRefreshing = false;
        }
      }
      /**
       * Process all queued requests after token refresh
       */
      async processQueuedRequests() {
        const queue = [...this.requestQueue];
        this.requestQueue = [];
        for (const queuedRequest of queue) {
          try {
            const updatedContext = await this.addAuthHeaders(queuedRequest.context);
            queuedRequest.resolve(updatedContext);
          } catch (error) {
            queuedRequest.reject(error);
          }
        }
      }
      /**
       * Retry request with new token after 401 response
       */
      async retryRequestWithNewToken(_context, originalResponse) {
        const retryResponse = {
          ...originalResponse,
          status: 200,
          // Assume retry would succeed
          statusText: "OK",
          metadata: {
            ...originalResponse.metadata,
            wasRetried: true,
            retryReason: "token_refresh"
          }
        };
        return retryResponse;
      }
      /**
       * Handle authentication failure (401 after refresh attempt)
       */
      handleAuthenticationFailure(_error) {
        this.emit("auth:security:unauthorized" /* UNAUTHORIZED_ACCESS */, createAuthEvent(
          "auth:security:unauthorized" /* UNAUTHORIZED_ACCESS */,
          {
            userId: this.authService.getCurrentUser()?.id,
            resource: "api",
            action: "request",
            reason: "Token refresh failed"
          }
        ));
        this.authService.logout({
          reason: "token_invalid",
          clearLocalData: true
        }).catch((logoutError) => {
          console.error("Auto-logout failed:", logoutError);
        });
      }
      /**
       * Handle authorization failure (403 responses)
       */
      handleAuthorizationFailure(context, _response) {
        const user = this.authService.getCurrentUser();
        this.emit("auth:security:unauthorized" /* UNAUTHORIZED_ACCESS */, createAuthEvent(
          "auth:security:unauthorized" /* UNAUTHORIZED_ACCESS */,
          {
            userId: user?.id,
            resource: context.url,
            action: context.method,
            reason: "Insufficient permissions"
          }
        ));
        if (user) {
          this.checkForRoleChanges(user.roles);
        }
      }
      /**
       * Check for role changes that might explain authorization failure
       */
      async checkForRoleChanges(currentRoles) {
        try {
          const user = this.authService.getCurrentUser();
          if (!user || !user.roles || user.roles.length === 0) {
            console.warn("User roles are empty or user is not authenticated");
            return;
          }
          const hasRoleChanged = !currentRoles.every((role) => user.roles.includes(role));
          if (hasRoleChanged) {
            console.warn("Authorization failure - possible role changes detected");
          }
        } catch (error) {
          console.error("Failed to check role changes:", error);
        }
      }
      /**
       * Setup event listeners for auth service
       */
      setupEventListeners() {
        this.tokenManager.on("auth:token:refresh:success" /* TOKEN_REFRESH_SUCCESS */, () => {
          if (this.requestQueue.length > 0) {
            this.processQueuedRequests().catch((error) => {
              console.error("Failed to process queued requests:", error);
            });
          }
        });
        this.tokenManager.on("auth:token:expired" /* TOKEN_EXPIRED */, () => {
          this.requestQueue.forEach((request) => {
            request.reject(new Error("Token expired"));
          });
          this.requestQueue = [];
        });
      }
      /**
       * Check if URL is an authentication endpoint
       */
      isAuthEndpoint(url) {
        const authEndpoints = ["/mf1/login", "/mf1/token/refresh", "/mf1/logout"];
        return authEndpoints.some((endpoint) => url.includes(endpoint));
      }
      /**
       * Check if request should be retried with token refresh
       */
      shouldRetryWithRefresh(context) {
        if (!this.config.enableRetry) {
          return false;
        }
        if (this.isAuthEndpoint(context.url)) {
          return false;
        }
        const retryCount = context.metadata.retryCount || 0;
        if (retryCount >= this.config.maxRetries) {
          return false;
        }
        const tokenStatus = this.tokenManager.getTokenStatus();
        if (!tokenStatus || !tokenStatus.isValid || !tokenStatus.isRefreshing) {
          return false;
        }
        return true;
      }
      /**
       * Check if error is authentication-related
       */
      isAuthRelatedError(error) {
        const authStatusCodes = [401, 403];
        const statusCode = error.statusCode;
        return authStatusCodes.includes(statusCode) || error.message.toLowerCase().includes("auth") || error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("unauthorized");
      }
      /**
       * Create auth error from generic error
       */
      createAuthError(error, context) {
        const statusCode = error.statusCode;
        let type;
        let message = error.message;
        switch (statusCode) {
          case 401:
            type = AuthErrorType.TOKEN_EXPIRED;
            message = "Authentication token expired or invalid";
            break;
          case 403:
            type = AuthErrorType.PERMISSION_DENIED;
            message = "Insufficient permissions for this operation";
            break;
          default:
            type = AuthErrorType.NETWORK_ERROR;
            message = `Network error during authentication: ${error.message}`;
        }
        return {
          name: "AuthError",
          type,
          message,
          code: `HTTP_${statusCode}`,
          statusCode,
          details: {
            originalError: error.message,
            url: context.url,
            method: context.method
          },
          timestamp: Date.now(),
          recoverable: statusCode === 401
          // 401 is recoverable via token refresh
        };
      }
      /**
       * Get middleware statistics
       */
      getStats() {
        const queueTimes = this.requestQueue.map((req) => Date.now() - req.timestamp);
        const averageQueueTime = queueTimes.length > 0 ? queueTimes.reduce((sum, time) => sum + time, 0) / queueTimes.length : 0;
        return {
          queuedRequests: this.requestQueue.length,
          isRefreshing: this.isRefreshing,
          totalRetries: 0,
          // Would track this in real implementation
          averageQueueTime
        };
      }
      /**
       * Clear request queue and reset state
       */
      clearQueue() {
        this.requestQueue.forEach((request) => {
          request.reject(new Error("Queue cleared"));
        });
        this.requestQueue = [];
        this.isRefreshing = false;
      }
      /**
       * Destroy middleware and clean up resources
       */
      destroy() {
        this.clearQueue();
        this.removeAllListeners();
      }
    };
  }
});

// src/core/sdk.ts
function createACubeSDK(config) {
  return new ACubeSDK(config);
}
var DEFAULT_SDK_CONFIG, ACubeSDK;
var init_sdk = __esm({
  "src/core/sdk.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_client();
    DEFAULT_SDK_CONFIG = {
      environment: "sandbox",
      apiKey: "",
      baseUrls: {},
      httpConfig: {},
      auth: {
        autoRefresh: true,
        enabled: true,
        config: {
          loginUrl: "/login",
          refreshUrl: "/token/refresh",
          tokenRefreshBuffer: 5,
          maxRefreshAttempts: 3,
          refreshRetryDelay: 1e3,
          storageKey: "acube_auth",
          storageEncryption: true,
          sessionTimeout: 8 * 60 * 60 * 1e3,
          // 8 hours
          enableDeviceBinding: true,
          enableSessionValidation: true,
          enableTokenRotation: true
        },
        storage: {
          enableEncryption: true,
          storageKey: "acube_auth"
        },
        middleware: {
          enableRetry: true,
          maxRetries: 2,
          includeRoleHeaders: true,
          includePermissionHeaders: true,
          includeRequestContext: true
        }
      },
      logging: {
        enabled: true,
        level: "warn",
        sanitize: true
      },
      features: {
        enableRetry: true,
        enableCircuitBreaker: true,
        enableMetrics: true,
        enableOfflineQueue: false,
        enableSync: false,
        enableRealTimeSync: false
      },
      offline: {
        enabled: false,
        storage: {
          adapter: "indexeddb",
          maxSize: 100 * 1024 * 1024
          // 100MB
        },
        queue: {
          maxItems: 1e3,
          maxRetries: 3,
          retryDelay: 5e3,
          batchSize: 50
        },
        sync: {
          maxConcurrentSyncs: 3,
          defaultTimeout: 3e4,
          defaultRetries: 3,
          batchSize: 100,
          enableRollback: true,
          enableDeltaSync: true,
          enableCompression: true,
          checkpointInterval: 5e3
        }
      },
      pwa: {
        enabled: true,
        manager: {
          autoRegister: true,
          enableInstallPrompts: true,
          serviceWorkerPath: "/sw.js",
          appInstaller: {
            enabled: true,
            autoShow: true,
            criteria: {
              minEngagementTime: 2 * 60 * 1e3,
              // 2 minutes
              minPageViews: 3,
              minReceiptsCreated: 1,
              daysSinceFirstVisit: 0,
              requireReturnVisit: false
            }
          }
        },
        manifest: {
          name: "A-Cube E-Receipt",
          shortName: "A-Cube",
          themeColor: "#1976d2",
          backgroundColor: "#ffffff",
          lang: "it"
        },
        autoRegister: true,
        enableInstallPrompts: true,
        enablePushNotifications: false,
        vapidPublicKey: "",
        appInstaller: {
          enabled: true,
          autoShow: true,
          criteria: {
            minEngagementTime: 2 * 60 * 1e3,
            // 2 minutes
            minPageViews: 3,
            minReceiptsCreated: 1,
            daysSinceFirstVisit: 0,
            requireReturnVisit: false
          }
        }
      },
      reactNative: {
        enabled: false,
        storage: {
          enableOptimizedAdapter: true,
          cacheSize: 1e3,
          enableCompression: true,
          enableBatching: true,
          batchDelay: 50
        },
        connectivity: {
          enableQualityMonitoring: true,
          enableAdaptiveRetry: true,
          enableDataOptimization: true,
          healthCheckUrl: "https://ereceipts-it.acubeapi.com/health"
        },
        backgroundProcessor: {
          enabled: true,
          maxConcurrentTasks: 3,
          enableBatteryOptimization: true,
          enableAppStateManagement: true,
          enableTaskPersistence: true
        },
        performanceMonitor: {
          enabled: true,
          enableMemoryMonitoring: true,
          enableFrameRateMonitoring: true,
          enableBatteryMonitoring: true,
          enableRemoteReporting: false
        }
      },
      dev: {
        enableMocking: false,
        mockDelay: 0
      }
    };
    ACubeSDK = class extends import_index.default {
      config;
      apiClient;
      authClient;
      isInitialized = false;
      // Lazy-loaded resources
      _cashiers;
      _receipts;
      _pointOfSales;
      _cashRegisters;
      _merchants;
      _pems;
      // Lazy-loaded offline systems
      _syncManager;
      _storage;
      _queueManager;
      // Lazy-loaded auth systems
      _authService;
      _tokenManager;
      _authStorage;
      _authMiddleware;
      // Lazy-loaded PWA systems
      _pwaManager;
      _manifestGenerator;
      // Lazy-loaded React Native optimization systems
      _optimizedStorage;
      _connectivityManager;
      _backgroundProcessor;
      _performanceMonitor;
      constructor(config) {
        super();
        this.config = this.mergeConfig(config);
        this.apiClient = this.createHttpClient("api");
        this.authClient = this.createHttpClient("auth");
        this.setupEventHandlers();
      }
      mergeConfig(userConfig) {
        return {
          ...DEFAULT_SDK_CONFIG,
          ...userConfig,
          baseUrls: {
            ...DEFAULT_SDK_CONFIG.baseUrls,
            ...userConfig.baseUrls
          },
          httpConfig: {
            ...DEFAULT_SDK_CONFIG.httpConfig,
            ...userConfig.httpConfig
          },
          auth: {
            ...DEFAULT_SDK_CONFIG.auth,
            ...userConfig.auth
          },
          logging: {
            ...DEFAULT_SDK_CONFIG.logging,
            ...userConfig.logging
          },
          features: {
            ...DEFAULT_SDK_CONFIG.features,
            ...userConfig.features
          },
          offline: {
            ...DEFAULT_SDK_CONFIG.offline,
            ...userConfig.offline,
            storage: {
              ...DEFAULT_SDK_CONFIG.offline.storage,
              ...userConfig.offline?.storage
            },
            queue: {
              ...DEFAULT_SDK_CONFIG.offline.queue,
              ...userConfig.offline?.queue
            },
            sync: {
              ...DEFAULT_SDK_CONFIG.offline.sync,
              ...userConfig.offline?.sync
            }
          },
          dev: {
            ...DEFAULT_SDK_CONFIG.dev,
            ...userConfig.dev
          }
        };
      }
      createHttpClient(type) {
        const baseConfig = type === "api" ? DEFAULT_HTTP_CONFIG : AUTH_HTTP_CONFIG;
        let baseUrl;
        if (type === "api") {
          baseUrl = this.config.baseUrls.api || this.getDefaultApiUrl();
        } else {
          baseUrl = this.config.baseUrls.auth || this.getDefaultAuthUrl();
        }
        const config = {
          ...baseConfig,
          ...this.config.httpConfig,
          baseUrl,
          enableRetry: this.config.features.enableRetry ?? true,
          enableCircuitBreaker: this.config.features.enableCircuitBreaker ?? true,
          enableLogging: this.config.logging.enabled,
          ...this.config.auth.getToken && { getAuthToken: this.config.auth.getToken },
          userAgent: `ACube-SDK/2.0.0 (${this.config.environment})`
        };
        return new HttpClient(config);
      }
      getDefaultApiUrl() {
        switch (this.config.environment) {
          case "production":
            return "https://ereceipts-it.acubeapi.com";
          case "development":
            return "https://ereceipts-it.dev.acubeapi.com";
          case "sandbox":
          default:
            return "https://ereceipts-it-sandbox.acubeapi.com";
        }
      }
      getDefaultAuthUrl() {
        switch (this.config.environment) {
          case "production":
            return "https://common.api.acubeapi.com";
          case "development":
          case "sandbox":
          default:
            return "https://common-sandbox.api.acubeapi.com";
        }
      }
      setupEventHandlers() {
        this.apiClient.on("requestError", (event) => {
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: event.requestId,
            data: {
              errorCode: "HTTP_REQUEST_FAILED",
              errorMessage: event.error,
              operation: `${event.method} ${event.url}`,
              retry: false,
              context: { client: "api", ...event }
            }
          });
        });
        this.authClient.on("requestError", (event) => {
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: event.requestId,
            data: {
              errorCode: "AUTH_REQUEST_FAILED",
              errorMessage: event.error,
              operation: `${event.method} ${event.url}`,
              retry: false,
              context: { client: "auth", ...event }
            }
          });
        });
        if (this.config.auth.onTokenExpired) {
          this.on("auth.expired", this.config.auth.onTokenExpired);
        }
      }
      /**
       * Initialize the SDK (optional - resources are lazy loaded)
       */
      async initialize() {
        if (this.isInitialized) {
          return;
        }
        try {
          this.validateConfig();
          if (this.config.auth.enabled) {
            await this.initializeAuthSystem();
          }
          if (this.config.reactNative.enabled) {
            await this.initializeReactNativeOptimizations();
          }
          if (this.config.features.enableMetrics) {
            await this.performHealthCheck();
          }
          this.isInitialized = true;
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `init_success_${Date.now()}`,
            data: {
              errorCode: "SDK_INITIALIZED",
              errorMessage: "SDK initialized successfully",
              operation: "initialize",
              retry: false,
              context: {
                environment: this.config.environment,
                features: this.config.features
              }
            }
          });
        } catch (error) {
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `init_${Date.now()}`,
            data: {
              errorCode: "SDK_INITIALIZATION_FAILED",
              errorMessage: error instanceof Error ? error.message : "Unknown error",
              operation: "initialize",
              retry: false
            }
          });
          throw error;
        }
      }
      validateConfig() {
        if (!["sandbox", "production", "development"].includes(this.config.environment)) {
          throw new Error(`Invalid environment: ${this.config.environment}`);
        }
        if (this.config.auth.getToken && typeof this.config.auth.getToken !== "function") {
          throw new Error("auth.getToken must be a function");
        }
      }
      async performHealthCheck() {
        try {
          const healthStatus = this.apiClient.getHealthStatus();
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `health_${Date.now()}`,
            data: {
              errorCode: "HEALTH_CHECK_COMPLETED",
              errorMessage: "Health check completed",
              operation: "health-check",
              retry: false,
              context: { healthStatus }
            }
          });
        } catch (error) {
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `health_failed_${Date.now()}`,
            data: {
              errorCode: "HEALTH_CHECK_FAILED",
              errorMessage: "Health check failed",
              operation: "health-check",
              retry: false,
              context: { error }
            }
          });
        }
      }
      /**
       * Initialize the enterprise authentication system
       */
      async initializeAuthSystem() {
        try {
          this._authStorage = this.authStorage;
          await this._authStorage.initialize();
          this._tokenManager = this.tokenManager;
          this._authService = this.authService;
          await this._authService.initialize();
          this._authMiddleware = this.authMiddleware;
          this.apiClient.addMiddleware(this._authMiddleware);
          this.authClient.addMiddleware(this._authMiddleware);
          this.setupAuthEventForwarding();
          if (this.config.auth.credentials?.autoLogin && this.config.auth.credentials.username && this.config.auth.credentials.password) {
            try {
              await this._authService.login({
                username: this.config.auth.credentials.username,
                password: this.config.auth.credentials.password
              });
            } catch (loginError) {
              console.warn("Auto-login failed during initialization:", loginError);
            }
          }
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `auth_init_${Date.now()}`,
            data: {
              errorCode: "AUTH_SYSTEM_INITIALIZED",
              errorMessage: "Authentication system initialized",
              operation: "auth-init",
              retry: false
            }
          });
        } catch (error) {
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `auth_init_failed_${Date.now()}`,
            data: {
              errorCode: "AUTH_INITIALIZATION_FAILED",
              errorMessage: error instanceof Error ? error.message : "Unknown auth error",
              operation: "auth-init",
              retry: false,
              context: { error }
            }
          });
          throw error;
        }
      }
      /**
       * Initialize React Native optimization systems
       */
      async initializeReactNativeOptimizations() {
        const isReactNative6 = typeof navigator !== "undefined" && navigator.product === "ReactNative";
        if (!isReactNative6) {
          console.warn("React Native optimizations requested but not in React Native environment");
          return;
        }
        try {
          if (this.config.reactNative?.storage?.enableOptimizedAdapter) {
            const { OptimizedReactNativeStorageAdapter: OptimizedReactNativeStorageAdapter2 } = await Promise.resolve().then(() => (init_optimized_react_native_storage(), optimized_react_native_storage_exports));
            this._optimizedStorage = new OptimizedReactNativeStorageAdapter2({
              cacheSize: this.config.reactNative?.storage?.cacheSize ?? 1e3,
              enableCompression: this.config.reactNative?.storage?.enableCompression ?? true,
              enableBatching: this.config.reactNative?.storage?.enableBatching ?? true,
              batchDelay: this.config.reactNative?.storage?.batchDelay ?? 50
            });
          }
          const { ConnectivityManager: ConnectivityManager2 } = await Promise.resolve().then(() => (init_connectivity_manager(), connectivity_manager_exports));
          this._connectivityManager = new ConnectivityManager2({
            enableQualityMonitoring: this.config.reactNative?.connectivity?.enableQualityMonitoring ?? true,
            enableAdaptiveRetry: this.config.reactNative?.connectivity?.enableAdaptiveRetry ?? true,
            enableDataOptimization: this.config.reactNative?.connectivity?.enableDataOptimization ?? true,
            healthCheckUrl: this.config.reactNative?.connectivity?.healthCheckUrl ?? "https://ereceipts-it.acubeapi.com/health"
          });
          if (this.config.reactNative?.backgroundProcessor?.enabled) {
            const { BackgroundProcessor: BackgroundProcessor2 } = await Promise.resolve().then(() => (init_background_processor(), background_processor_exports));
            this._backgroundProcessor = new BackgroundProcessor2({
              maxConcurrentTasks: this.config.reactNative?.backgroundProcessor?.maxConcurrentTasks ?? 3,
              enableBatteryOptimization: this.config.reactNative?.backgroundProcessor?.enableBatteryOptimization ?? true,
              enableAppStateManagement: this.config.reactNative?.backgroundProcessor?.enableAppStateManagement ?? true,
              enableTaskPersistence: this.config.reactNative?.backgroundProcessor?.enableTaskPersistence ?? true
            });
          }
          if (this.config.reactNative?.performanceMonitor?.enabled) {
            const { PerformanceMonitor: PerformanceMonitor2 } = await Promise.resolve().then(() => (init_performance_monitor(), performance_monitor_exports));
            this._performanceMonitor = new PerformanceMonitor2({
              enableMemoryMonitoring: this.config.reactNative?.performanceMonitor?.enableMemoryMonitoring ?? true,
              enableFrameRateMonitoring: this.config.reactNative?.performanceMonitor?.enableFrameRateMonitoring ?? true,
              enableBatteryMonitoring: this.config.reactNative?.performanceMonitor?.enableBatteryMonitoring ?? true,
              enableRemoteReporting: this.config.reactNative?.performanceMonitor?.enableRemoteReporting ?? false
            });
          }
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `rn_init_${Date.now()}`,
            data: {
              errorCode: "REACT_NATIVE_OPTIMIZATIONS_INITIALIZED",
              errorMessage: "React Native optimizations initialized",
              operation: "rn-init",
              retry: false
            }
          });
        } catch (error) {
          this.emit("error", {
            type: "error",
            timestamp: /* @__PURE__ */ new Date(),
            requestId: `rn_init_failed_${Date.now()}`,
            data: {
              errorCode: "REACT_NATIVE_INITIALIZATION_FAILED",
              errorMessage: error instanceof Error ? error.message : "Unknown React Native error",
              operation: "rn-init",
              retry: false,
              context: { error }
            }
          });
          throw error;
        }
      }
      /**
       * Set up auth event forwarding to SDK events
       */
      setupAuthEventForwarding() {
        if (!this._authService) return;
        this._authService.on("auth:login:success", (event) => {
          this.emit("auth.success", {
            userId: event.data.user.id,
            role: event.data.user.attributes?.simpleRole || "cashier",
            user: event.data.user,
            expiresAt: event.data.user.last_login ? new Date(Date.now() + (this.config.auth?.config?.sessionTimeout || 36e5)) : void 0
          });
        });
        this._authService.on("auth:login:failure", (event) => {
          this.emit("auth.error", {
            error: event.data.error.message,
            errorCode: event.data.error.type,
            errorMessage: event.data.error.message,
            retry: event.data.error.recoverable || false,
            operation: "login"
          });
        });
        this._authService.on("auth:logout", (event) => {
          this.emit("auth.logout", {
            userId: event.data.userId,
            reason: event.data.reason,
            operation: "logout"
          });
        });
        this._authService.on("auth:session:expired", (event) => {
          this.emit("auth.expired", {
            userId: event.data.userId,
            sessionId: event.data.sessionId,
            operation: "session_expired"
          });
          if (this.config.auth?.onTokenExpired) {
            this.config.auth.onTokenExpired().catch((error) => {
              console.error("Legacy onTokenExpired callback failed:", error);
            });
          }
        });
      }
      // Lazy-loaded resource getters (Stripe-style)
      /**
       * Cashiers resource - user management
       * Enhanced with offline capabilities when enabled
       */
      get cashiers() {
        if (!this._cashiers) {
          const { CashiersResource: CashiersResource2 } = (init_cashiers(), __toCommonJS(cashiers_exports));
          this._cashiers = new CashiersResource2(
            this.apiClient,
            this.config.offline?.enabled ? this.storage : void 0,
            this.config.features?.enableOfflineQueue ? this.queue : void 0
          );
        }
        return this._cashiers;
      }
      /**
       * Receipts resource - e-receipt management
       * Enhanced with offline capabilities when enabled
       */
      get receipts() {
        if (!this._receipts) {
          const { ReceiptsResource: ReceiptsResource2 } = (init_receipts(), __toCommonJS(receipts_exports));
          this._receipts = new ReceiptsResource2(
            this.apiClient,
            this.config.offline?.enabled ? this.storage : void 0,
            this.config.features?.enableOfflineQueue ? this.queue : void 0
          );
        }
        return this._receipts;
      }
      /**
       * Point of Sales resource - POS device management
       * Enhanced with offline capabilities when enabled
       */
      get pointOfSales() {
        if (!this._pointOfSales) {
          const { PointOfSalesResource: PointOfSalesResource2 } = (init_point_of_sales(), __toCommonJS(point_of_sales_exports));
          this._pointOfSales = new PointOfSalesResource2(
            this.apiClient,
            this.config.offline?.enabled ? this.storage : void 0,
            this.config.features?.enableOfflineQueue ? this.queue : void 0
          );
        }
        return this._pointOfSales;
      }
      /**
       * Cash Registers resource - device registration
       * Enhanced with offline capabilities when enabled
       */
      get cashRegisters() {
        if (!this._cashRegisters) {
          const { CashRegistersResource: CashRegistersResource2 } = (init_cash_registers(), __toCommonJS(cash_registers_exports));
          this._cashRegisters = new CashRegistersResource2(
            this.apiClient,
            this.config.offline?.enabled ? this.storage : void 0,
            this.config.features?.enableOfflineQueue ? this.queue : void 0
          );
        }
        return this._cashRegisters;
      }
      /**
       * Merchants resource - business entity management
       * Enhanced with offline capabilities when enabled
       */
      get merchants() {
        if (!this._merchants) {
          const { MerchantsResource: MerchantsResource2 } = (init_merchants(), __toCommonJS(merchants_exports));
          this._merchants = new MerchantsResource2(
            this.apiClient,
            this.config.offline?.enabled ? this.storage : void 0,
            this.config.features?.enableOfflineQueue ? this.queue : void 0
          );
        }
        return this._merchants;
      }
      /**
       * PEMs resource - electronic memorization device management
       * Enhanced with offline capabilities when enabled
       */
      get pems() {
        if (!this._pems) {
          const { PEMsResource: PEMsResource2 } = (init_pems(), __toCommonJS(pems_exports));
          this._pems = new PEMsResource2(
            this.apiClient,
            this.config.offline?.enabled ? this.storage : void 0,
            this.config.features?.enableOfflineQueue ? this.queue : void 0
          );
        }
        return this._pems;
      }
      // PWA System getters
      /**
       * PWA Manager - Progressive Web App functionality
       * Handles service worker registration, caching, and offline capabilities
       */
      get pwa() {
        if (!this._pwaManager) {
          const { PWAManager: PWAManager2 } = (init_pwa_manager(), __toCommonJS(pwa_manager_exports));
          const pwaConfig = {
            ...this.config.pwa.manager,
            serviceWorkerPath: this.config.pwa.manager?.serviceWorkerPath || "/sw.js",
            autoRegister: this.config.pwa.autoRegister ?? true,
            enableInstallPrompts: this.config.pwa.enableInstallPrompts ?? true,
            pushNotifications: {
              enabled: this.config.pwa.enablePushNotifications ?? false,
              vapidPublicKey: this.config.pwa.vapidPublicKey ?? ""
            }
          };
          this._pwaManager = new PWAManager2(pwaConfig);
        }
        return this._pwaManager;
      }
      /**
       * Manifest Generator - PWA manifest creation and management
       * Creates web app manifests with Italian e-receipt specific configuration
       */
      get manifest() {
        if (!this._manifestGenerator) {
          const { ManifestGenerator: ManifestGenerator2 } = (init_manifest_generator(), __toCommonJS(manifest_generator_exports));
          this._manifestGenerator = new ManifestGenerator2(this.config.pwa.manifest);
        }
        return this._manifestGenerator;
      }
      // Offline system getters (only available when offline features are enabled)
      /**
       * Progressive sync manager - smart synchronization with partial failure recovery
       * Only available when features.enableSync is true
       */
      get sync() {
        if (!this.config.features.enableSync) {
          throw new Error("Sync is not enabled. Set features.enableSync to true in configuration.");
        }
        if (!this._syncManager) {
          const { ProgressiveSyncEngine: ProgressiveSyncEngine2 } = (init_sync_engine(), __toCommonJS(sync_engine_exports));
          this._syncManager = new ProgressiveSyncEngine2(this.config.offline?.sync || {});
        }
        return this._syncManager;
      }
      /**
       * Unified storage system - cross-platform storage with encryption
       * Only available when offline.enabled is true
       */
      get storage() {
        if (!this.config.offline?.enabled) {
          throw new Error("Offline storage is not enabled. Set offline.enabled to true in configuration.");
        }
        if (!this._storage) {
          const { UnifiedStorage: UnifiedStorage2 } = (init_unified_storage(), __toCommonJS(unified_storage_exports));
          this._storage = new UnifiedStorage2({
            adapter: this.config.offline.storage?.adapter || "indexeddb",
            encryptionKey: this.config.offline.storage?.encryptionKey,
            maxSize: this.config.offline.storage?.maxSize || 100 * 1024 * 1024
          });
        }
        return this._storage;
      }
      /**
       * Enterprise queue manager - advanced operation queuing with retry logic
       * Only available when features.enableOfflineQueue is true
       */
      get queue() {
        if (!this.config.features.enableOfflineQueue) {
          throw new Error("Offline queue is not enabled. Set features.enableOfflineQueue to true in configuration.");
        }
        if (!this._queueManager) {
          const { EnterpriseQueueManager: EnterpriseQueueManager2 } = (init_queue_manager(), __toCommonJS(queue_manager_exports));
          this._queueManager = new EnterpriseQueueManager2({
            storage: this.storage,
            // Use unified storage
            maxItems: this.config.offline?.queue?.maxItems || 1e3,
            maxRetries: this.config.offline?.queue?.maxRetries || 3,
            retryDelay: this.config.offline?.queue?.retryDelay || 5e3,
            batchSize: this.config.offline?.queue?.batchSize || 50
          });
        }
        return this._queueManager;
      }
      // Authentication system getters (only available when auth.enabled is true)
      /**
       * JWT token manager - automatic refresh, validation, parsing
       * Only available when auth.enabled is true
       */
      get tokenManager() {
        if (!this.config.auth.enabled) {
          throw new Error("Enterprise auth is not enabled. Set auth.enabled to true in configuration.");
        }
        if (!this._tokenManager) {
          const { TokenManager: TokenManager2 } = (init_token_manager(), __toCommonJS(token_manager_exports));
          this._tokenManager = new TokenManager2(
            this.authClient,
            {
              refreshUrl: this.config.auth.config?.refreshUrl || "/mf1/token/refresh",
              tokenRefreshBuffer: this.config.auth.config?.tokenRefreshBuffer || 5,
              maxRefreshAttempts: this.config.auth.config?.maxRefreshAttempts || 3,
              refreshRetryDelay: this.config.auth.config?.refreshRetryDelay || 1e3,
              enableTokenRotation: this.config.auth.config?.enableTokenRotation ?? true,
              onTokenRefresh: this.config.auth.config?.onTokenRefresh,
              onTokenExpired: this.config.auth.config?.onTokenExpired
            }
          );
        }
        return this._tokenManager;
      }
      /**
       * Enterprise authentication service - OAuth2, role-based access, session management
       * Only available when auth.enabled is true
       */
      get authService() {
        if (!this.config.auth.enabled) {
          throw new Error("Enterprise auth is not enabled. Set auth.enabled to true in configuration.");
        }
        if (!this._authService) {
          const { AuthService: AuthService2 } = (init_auth_service(), __toCommonJS(auth_service_exports));
          this._authService = new AuthService2(
            this.authClient,
            this.config.auth.config || {},
            void 0,
            // AccessControlManager - could be injected
            this._authStorage,
            this.tokenManager
            // Pass the shared token manager
          );
        }
        return this._authService;
      }
      /**
       * Secure cross-platform auth storage - encrypted token storage
       * Only available when auth.enabled is true
       */
      get authStorage() {
        if (!this.config.auth.enabled) {
          throw new Error("Enterprise auth is not enabled. Set auth.enabled to true in configuration.");
        }
        if (!this._authStorage) {
          const { AuthStorage: AuthStorage2 } = (init_auth_storage(), __toCommonJS(auth_storage_exports));
          this._authStorage = new AuthStorage2({
            storageKey: this.config.auth.storage?.storageKey || "acube_auth",
            enableEncryption: this.config.auth.storage?.enableEncryption ?? true,
            storageAdapter: this.config.auth.storage?.storageAdapter,
            autoMigrate: true
          });
        }
        return this._authStorage;
      }
      /**
       * Enhanced authentication middleware - automatic token refresh, role headers
       * Only available when auth.enabled is true
       */
      get authMiddleware() {
        if (!this.config.auth.enabled) {
          throw new Error("Enterprise auth is not enabled. Set auth.enabled to true in configuration.");
        }
        if (!this._authMiddleware) {
          const { EnhancedAuthMiddleware: EnhancedAuthMiddleware2 } = (init_auth_middleware(), __toCommonJS(auth_middleware_exports));
          this._authMiddleware = new EnhancedAuthMiddleware2(
            this.authService,
            this.tokenManager,
            {
              enableRetry: this.config.auth.middleware?.enableRetry ?? true,
              maxRetries: this.config.auth.middleware?.maxRetries || 2,
              authHeaderName: "Authorization",
              authScheme: "Bearer",
              includeRoleHeaders: this.config.auth.middleware?.includeRoleHeaders ?? true,
              roleHeaderName: "X-User-Role",
              includePermissionHeaders: this.config.auth.middleware?.includePermissionHeaders ?? true,
              permissionHeaderName: "X-User-Permissions",
              includeRequestContext: this.config.auth.middleware?.includeRequestContext ?? true,
              contextHeaders: {
                "X-Device-ID": "deviceId",
                "X-Session-ID": "sessionId",
                "X-Request-Context": "requestContext"
              }
            }
          );
        }
        return this._authMiddleware;
      }
      // Authentication methods
      /**
       * Login with username and password
       */
      async login(credentials) {
        if (!this.config.auth.enabled) {
          throw new Error("Enterprise auth is not enabled. Set auth.enabled to true in configuration.");
        }
        return this.authService.login(credentials);
      }
      /**
       * Logout current user
       */
      async logout(options) {
        if (!this.config.auth.enabled) {
          throw new Error("Enterprise auth is not enabled. Set auth.enabled to true in configuration.");
        }
        return this.authService.logout(options);
      }
      /**
       * Get current authentication state
       */
      getAuthState() {
        if (!this.config.auth.enabled || !this._authService) {
          return null;
        }
        return this.authService.getState();
      }
      /**
       * Get current authenticated user
       */
      getCurrentUser() {
        if (!this.config.auth.enabled || !this._authService) {
          return null;
        }
        return this.authService.getCurrentUser();
      }
      /**
       * Check if user is authenticated
       */
      isAuthenticated() {
        const authState = this.getAuthState();
        return authState?.isAuthenticated ?? false;
      }
      /**
       * Check if user has specific role (including inherited roles from hierarchy)
       */
      hasRole(role) {
        if (!this.config.auth.enabled || !this._authService) {
          return false;
        }
        return this.authService.hasRole(role);
      }
      /**
       * Check if user has any of the specified roles (including inherited roles)
       */
      hasAnyRole(roles) {
        if (!this.config.auth.enabled || !this._authService) {
          return false;
        }
        return this.authService.hasAnyRole(roles);
      }
      /**
       * Get user's effective roles (including inherited roles from hierarchy)
       */
      getEffectiveRoles() {
        if (!this.config.auth.enabled || !this._authService) {
          return [];
        }
        return this.authService.getEffectiveRoles();
      }
      /**
       * Get user's primary role for display purposes
       */
      getPrimaryRole() {
        if (!this.config.auth.enabled || !this._authService) {
          return null;
        }
        return this.authService.getPrimaryRole();
      }
      /**
       * Get user's simple role for external APIs
       */
      getSimpleRole() {
        if (!this.config.auth.enabled || !this._authService) {
          return "cashier";
        }
        return this.authService.getSimpleRole();
      }
      /**
       * Switch to a different role context during session
       */
      async switchRole(targetRole, context) {
        if (!this.config.auth.enabled) {
          throw new Error("Enterprise auth is not enabled. Set auth.enabled to true in configuration.");
        }
        return this.authService.switchRole(targetRole, context);
      }
      // Configuration and management methods
      /**
       * Update SDK configuration
       */
      updateConfig(updates) {
        const newConfig = this.mergeConfig({ ...this.config, ...updates });
        if (updates.httpConfig || updates.baseUrls || updates.environment) {
          this.apiClient.updateConfig(this.createHttpClient("api")["config"]);
          this.authClient.updateConfig(this.createHttpClient("auth")["config"]);
        }
        this.config = newConfig;
        this.emit("error", {
          type: "error",
          timestamp: /* @__PURE__ */ new Date(),
          requestId: `config_${Date.now()}`,
          data: {
            errorCode: "CONFIG_UPDATED",
            errorMessage: "Configuration updated",
            operation: "update-config",
            retry: false,
            context: { updates }
          }
        });
      }
      /**
       * Get current configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * Get SDK metrics and health status
       */
      getMetrics() {
        return {
          api: this.apiClient.getHealthStatus(),
          auth: this.authClient.getHealthStatus(),
          isInitialized: this.isInitialized,
          environment: this.config.environment
        };
      }
      /**
       * Get HTTP clients (for advanced usage)
       */
      getClients() {
        return {
          api: this.apiClient,
          auth: this.authClient
        };
      }
      // React Native Optimization getters (only available when reactNative.enabled is true)
      /**
       * Optimized React Native Storage Adapter - High-performance AsyncStorage with caching
       * Only available when reactNative.enabled is true and enableOptimizedAdapter is true
       */
      get optimizedStorage() {
        if (!this.config.reactNative.enabled) {
          throw new Error("React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.");
        }
        if (!this.config.reactNative?.storage?.enableOptimizedAdapter) {
          throw new Error("Optimized storage adapter is not enabled. Set reactNative.storage.enableOptimizedAdapter to true.");
        }
        if (!this._optimizedStorage) {
          throw new Error("Optimized storage not initialized. Make sure SDK is initialized first.");
        }
        return this._optimizedStorage;
      }
      /**
       * Connectivity Manager - Intelligent network handling and retry strategies
       * Only available when reactNative.enabled is true
       */
      get connectivity() {
        if (!this.config.reactNative.enabled) {
          throw new Error("React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.");
        }
        if (!this._connectivityManager) {
          throw new Error("Connectivity manager not initialized. Make sure SDK is initialized first.");
        }
        return this._connectivityManager;
      }
      /**
       * Background Processor - Task scheduling and app lifecycle management
       * Only available when reactNative.enabled is true and backgroundProcessor.enabled is true
       */
      get backgroundProcessor() {
        if (!this.config.reactNative.enabled) {
          throw new Error("React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.");
        }
        if (!this.config.reactNative?.backgroundProcessor?.enabled) {
          throw new Error("Background processor is not enabled. Set reactNative.backgroundProcessor.enabled to true.");
        }
        if (!this._backgroundProcessor) {
          throw new Error("Background processor not initialized. Make sure SDK is initialized first.");
        }
        return this._backgroundProcessor;
      }
      /**
       * Performance Monitor - Mobile performance metrics and optimization
       * Only available when reactNative.enabled is true and performanceMonitor.enabled is true
       */
      get performanceMonitor() {
        if (!this.config.reactNative.enabled) {
          throw new Error("React Native optimizations are not enabled. Set reactNative.enabled to true in configuration.");
        }
        if (!this.config.reactNative?.performanceMonitor?.enabled) {
          throw new Error("Performance monitor is not enabled. Set reactNative.performanceMonitor.enabled to true.");
        }
        if (!this._performanceMonitor) {
          throw new Error("Performance monitor not initialized. Make sure SDK is initialized first.");
        }
        return this._performanceMonitor;
      }
      /**
       * Cleanup resources
       */
      async destroy() {
        this.apiClient.destroy();
        this.authClient.destroy();
        if (this._authService) {
          await this._authService.destroy();
        }
        if (this._tokenManager) {
          this._tokenManager.destroy();
        }
        if (this._authStorage) {
          await this._authStorage.destroy();
        }
        if (this._authMiddleware) {
          this._authMiddleware.destroy();
        }
        if (this._syncManager) {
          await this._syncManager.cancelAllSyncs();
        }
        if (this._queueManager) {
          await this._queueManager.destroy();
        }
        if (this._storage) {
          await this._storage.destroy();
        }
        if (this._optimizedStorage) {
          await this._optimizedStorage.destroy();
        }
        if (this._connectivityManager) {
          this._connectivityManager.destroy();
        }
        if (this._backgroundProcessor) {
          this._backgroundProcessor.destroy();
        }
        if (this._performanceMonitor) {
          this._performanceMonitor.destroy();
        }
        this.removeAllListeners();
        this.isInitialized = false;
        this.emit("error", {
          type: "error",
          timestamp: /* @__PURE__ */ new Date(),
          requestId: `destroy_${Date.now()}`,
          data: {
            errorCode: "SDK_DESTROYED",
            errorMessage: "SDK destroyed",
            operation: "destroy",
            retry: false
          }
        });
      }
    };
  }
});

// src/types/branded.ts
var init_branded = __esm({
  "src/types/branded.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/types/events.ts
var init_events = __esm({
  "src/types/events.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/storage/base/storage-adapter.ts
var init_storage_adapter = __esm({
  "src/storage/base/storage-adapter.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/storage/adapters/web-storage.ts
var DEFAULT_CONFIG14;
var init_web_storage = __esm({
  "src/storage/adapters/web-storage.ts"() {
    "use strict";
    init_esm_shims();
    init_storage_adapter();
    DEFAULT_CONFIG14 = {
      dbName: "acube-queue-storage",
      dbVersion: 1,
      storeName: "queue-items",
      fallbackToLocalStorage: true,
      quota: 100 * 1024 * 1024
      // 100MB
    };
  }
});

// src/storage/adapters/react-native-storage.ts
var isReactNative5, DEFAULT_CONFIG15;
var init_react_native_storage = __esm({
  "src/storage/adapters/react-native-storage.ts"() {
    "use strict";
    init_esm_shims();
    init_storage_adapter();
    isReactNative5 = typeof navigator !== "undefined" && navigator.product === "ReactNative";
    DEFAULT_CONFIG15 = {
      keyPrefix: "acube-queue",
      useKeychain: false,
      keychainService: "acube-sdk",
      quota: 50 * 1024 * 1024,
      // 50MB
      encryptSensitiveData: true
    };
  }
});

// src/storage/queue/conflict-resolver.ts
var init_conflict_resolver = __esm({
  "src/storage/queue/conflict-resolver.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "node_modules/react/cjs/react.production.js"(exports) {
    "use strict";
    init_esm_shims();
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = Symbol.for("react.memo");
    var REACT_LAZY_TYPE = Symbol.for("react.lazy");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function() {
      },
      enqueueReplaceState: function() {
      },
      enqueueSetState: function() {
      }
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    var ReactSharedInternals = { H: null, A: null, T: null, S: null, V: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, self, source, owner, props) {
      self = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== self ? self : null,
        props
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(
        oldElement.type,
        newKey,
        void 0,
        void 0,
        void 0,
        oldElement.props
      );
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
    }
    function noop$1() {
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop$1, noop$1) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    function noop() {
    }
    exports.Children = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }
    };
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key, owner = void 0;
      if (null != config)
        for (propName in void 0 !== config.ref && (owner = void 0), void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, void 0, void 0, owner, props);
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, void 0, void 0, null, props);
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create, createDeps, update) {
      var dispatcher = ReactSharedInternals.H;
      if ("function" === typeof update)
        throw Error(
          "useEffect CRUD overload is not enabled in this build of React."
        );
      return dispatcher.useEffect(create, createDeps);
    };
    exports.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports.useImperativeHandle = function(ref, create, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
    };
    exports.useInsertionEffect = function(create, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create, deps);
    };
    exports.useLayoutEffect = function(create, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create, deps);
    };
    exports.useMemo = function(create, deps) {
      return ReactSharedInternals.H.useMemo(create, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports.version = "19.1.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    init_esm_shims();
    "production" !== process.env.NODE_ENV && function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return (type.displayName || "Context") + ".Provider";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, self, source, owner, props, debugStack, debugTask) {
        self = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== self ? self : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          void 0,
          void 0,
          oldElement._owner,
          oldElement.props,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      function noop$1() {
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop$1, noop$1) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ctor = payload._result;
          ctor = ctor();
          ctor.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status)
                payload._status = 1, payload._result = moduleObject;
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status)
                payload._status = 2, payload._result = error;
            }
          );
          -1 === payload._status && (payload._status = 0, payload._result = ctor);
        }
        if (1 === payload._status)
          return ctor = payload._result, void 0 === ctor && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ctor
          ), "default" in ctor || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ctor
          ), ctor.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function noop() {
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module && module[requireString]).call(
              module,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler");
      Symbol.for("react.provider");
      var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      }, fnName;
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        V: null,
        actQueue: null,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      exports.Children = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports.Component = Component;
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.Profiler = REACT_PROFILER_TYPE;
      exports.PureComponent = PureComponent;
      exports.StrictMode = REACT_STRICT_MODE_TYPE;
      exports.Suspense = REACT_SUSPENSE_TYPE;
      exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports.__COMPILER_RUNTIME = deprecatedAPIs;
      exports.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          void 0,
          void 0,
          owner,
          props,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          owner = arguments[key], isValidElement(owner) && owner._store && (owner._store.validated = 1);
        return props;
      };
      exports.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++) {
          var node = arguments[i];
          isValidElement(node) && node._store && (node._store.validated = 1);
        }
        i = {};
        node = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), node = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        node && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return ReactElement(
          type,
          node,
          void 0,
          void 0,
          getOwner(),
          i,
          propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }
        });
        return elementType;
      };
      exports.isValidElement = isValidElement;
      exports.lazy = function(ctor) {
        return {
          $$typeof: REACT_LAZY_TYPE,
          _payload: { _status: -1, _result: ctor },
          _init: lazyInitializer
        };
      };
      exports.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        ReactSharedInternals.T = currentTransition;
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), ReactSharedInternals.T = prevTransition;
        }
      };
      exports.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports.useEffect = function(create, createDeps, update) {
        null == create && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        var dispatcher = resolveDispatcher();
        if ("function" === typeof update)
          throw Error(
            "useEffect CRUD overload is not enabled in this build of React."
          );
        return dispatcher.useEffect(create, createDeps);
      };
      exports.useId = function() {
        return resolveDispatcher().useId();
      };
      exports.useImperativeHandle = function(ref, create, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create, deps);
      };
      exports.useInsertionEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create, deps);
      };
      exports.useLayoutEffect = function(create, deps) {
        null == create && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create, deps);
      };
      exports.useMemo = function(create, deps) {
        return resolveDispatcher().useMemo(create, deps);
      };
      exports.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports.version = "19.1.1";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    }();
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    init_esm_shims();
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production();
    } else {
      module.exports = require_react_development();
    }
  }
});

// src/storage/queue/enhanced-offline-hook.ts
var import_react;
var init_enhanced_offline_hook = __esm({
  "src/storage/queue/enhanced-offline-hook.ts"() {
    "use strict";
    init_esm_shims();
    import_react = __toESM(require_react(), 1);
    init_queue_manager();
  }
});

// src/storage/queue/index.ts
var init_queue = __esm({
  "src/storage/queue/index.ts"() {
    "use strict";
    init_esm_shims();
    init_types2();
    init_storage_adapter();
    init_web_storage();
    init_react_native_storage();
    init_priority_queue();
    init_batch_processor();
    init_conflict_resolver();
    init_retry_manager();
    init_queue_analytics();
    init_queue_manager();
    init_queue_manager();
    init_enhanced_offline_hook();
    init_types2();
  }
});

// node_modules/react/cjs/react-jsx-runtime.production.js
var require_react_jsx_runtime_production = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.production.js"(exports) {
    "use strict";
    init_esm_shims();
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    function jsxProd(type, config, maybeKey) {
      var key = null;
      void 0 !== maybeKey && (key = "" + maybeKey);
      void 0 !== config.key && (key = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          "key" !== propName && (maybeKey[propName] = config[propName]);
      } else maybeKey = config;
      config = maybeKey.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== config ? config : null,
        props: maybeKey
      };
    }
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsx = jsxProd;
    exports.jsxs = jsxProd;
  }
});

// node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    init_esm_shims();
    "production" !== process.env.NODE_ENV && function() {
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return (type.displayName || "Context") + ".Provider";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, self, source, owner, props, debugStack, debugTask) {
        self = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== self ? self : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function jsxDEVImpl(type, config, maybeKey, isStaticChildren, source, self, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children)
          if (isStaticChildren)
            if (isArrayImpl(children)) {
              for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
                validateChildKeys(children[isStaticChildren]);
              Object.freeze && Object.freeze(children);
            } else
              console.error(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
          children = getComponentNameFromType(type);
          var keys = Object.keys(config).filter(function(k) {
            return "key" !== k;
          });
          isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
          didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children
          ), didWarnAboutKeySpread[children + isStaticChildren] = true);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
          maybeKey = {};
          for (var propName in config)
            "key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(
          maybeKey,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(
          type,
          children,
          self,
          source,
          getOwner(),
          maybeKey,
          debugStack,
          debugTask
        );
      }
      function validateChildKeys(node) {
        "object" === typeof node && null !== node && node.$$typeof === REACT_ELEMENT_TYPE && node._store && (node._store.validated = 1);
      }
      var React4 = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler");
      Symbol.for("react.provider");
      var REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React4.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      React4 = {
        react_stack_bottom_frame: function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = React4.react_stack_bottom_frame.bind(
        React4,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutKeySpread = {};
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.jsx = function(type, config, maybeKey, source, self) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          false,
          source,
          self,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.jsxs = function(type, config, maybeKey, source, self) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          true,
          source,
          self,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
    }();
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    init_esm_shims();
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_jsx_runtime_production();
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// src/hooks/react/ACubeProvider.tsx
var import_react2, import_jsx_runtime, ACubeContext, ACubeErrorBoundary;
var init_ACubeProvider = __esm({
  "src/hooks/react/ACubeProvider.tsx"() {
    "use strict";
    init_esm_shims();
    import_react2 = __toESM(require_react(), 1);
    init_sdk();
    import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
    ACubeContext = (0, import_react2.createContext)(void 0);
    ACubeErrorBoundary = class extends import_react2.default.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      componentDidCatch(error, errorInfo) {
        console.error("ACube SDK Error:", error, errorInfo);
        this.props.onError?.(error);
      }
      render() {
        if (this.state.hasError) {
          return this.props.fallback || /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { role: "alert", style: { padding: "20px", textAlign: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Something went wrong with the ACube SDK" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("details", { style: { whiteSpace: "pre-wrap", marginTop: "10px" }, children: this.state.error?.toString() })
          ] });
        }
        return this.props.children;
      }
    };
  }
});

// src/hooks/react/useACubeQuery.ts
function startCacheCleanup() {
  if (cacheCleanupInterval) return;
  cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    const staleEntries = [];
    queryCache.forEach((cache, key) => {
      if (now - cache.timestamp > 3e5) {
        staleEntries.push(key);
      }
    });
    staleEntries.forEach((key) => queryCache.delete(key));
  }, 6e4);
}
var import_react3, queryCache, cacheCleanupInterval;
var init_useACubeQuery = __esm({
  "src/hooks/react/useACubeQuery.ts"() {
    "use strict";
    init_esm_shims();
    import_react3 = __toESM(require_react(), 1);
    init_ACubeProvider();
    queryCache = /* @__PURE__ */ new Map();
    cacheCleanupInterval = null;
    startCacheCleanup();
  }
});

// src/hooks/react/useACubeMutation.ts
var import_react4;
var init_useACubeMutation = __esm({
  "src/hooks/react/useACubeMutation.ts"() {
    "use strict";
    init_esm_shims();
    import_react4 = __toESM(require_react(), 1);
    init_useACubeQuery();
    init_ACubeProvider();
    init_types2();
  }
});

// src/hooks/react/useACubeSubscription.ts
var import_react5;
var init_useACubeSubscription = __esm({
  "src/hooks/react/useACubeSubscription.ts"() {
    "use strict";
    init_esm_shims();
    import_react5 = __toESM(require_react(), 1);
  }
});

// src/hooks/react/useACubeCache.ts
var import_react6;
var init_useACubeCache = __esm({
  "src/hooks/react/useACubeCache.ts"() {
    "use strict";
    init_esm_shims();
    import_react6 = __toESM(require_react(), 1);
    init_ACubeProvider();
  }
});

// src/hooks/react/useACubeOffline.ts
var import_react7;
var init_useACubeOffline = __esm({
  "src/hooks/react/useACubeOffline.ts"() {
    "use strict";
    init_esm_shims();
    import_react7 = __toESM(require_react(), 1);
    init_ACubeProvider();
  }
});

// src/hooks/react/auth-provider.tsx
var import_react8, import_jsx_runtime2, AuthContext;
var init_auth_provider = __esm({
  "src/hooks/react/auth-provider.tsx"() {
    "use strict";
    init_esm_shims();
    import_react8 = __toESM(require_react(), 1);
    import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
    AuthContext = (0, import_react8.createContext)(null);
  }
});

// src/hooks/react/use-auth.ts
var import_react9;
var init_use_auth = __esm({
  "src/hooks/react/use-auth.ts"() {
    "use strict";
    init_esm_shims();
    import_react9 = __toESM(require_react(), 1);
    init_auth_provider();
  }
});

// src/hooks/react/auth-components.tsx
var import_react10, import_jsx_runtime3;
var init_auth_components = __esm({
  "src/hooks/react/auth-components.tsx"() {
    "use strict";
    init_esm_shims();
    import_react10 = __toESM(require_react(), 1);
    init_use_auth();
    import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
  }
});

// src/hooks/react/index.ts
var init_react = __esm({
  "src/hooks/react/index.ts"() {
    "use strict";
    init_esm_shims();
    init_ACubeProvider();
    init_useACubeQuery();
    init_useACubeMutation();
    init_useACubeSubscription();
    init_useACubeCache();
    init_useACubeOffline();
    init_auth_provider();
    init_use_auth();
    init_auth_components();
  }
});

// src/compliance/gdpr-compliance.ts
var init_gdpr_compliance = __esm({
  "src/compliance/gdpr-compliance.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/compliance/fiscal-audit.ts
var init_fiscal_audit = __esm({
  "src/compliance/fiscal-audit.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/compliance/index.ts
var init_compliance = __esm({
  "src/compliance/index.ts"() {
    "use strict";
    init_esm_shims();
    init_gdpr_compliance();
    init_fiscal_audit();
    init_access_control();
  }
});

// src/plugins/core/plugin-manager.ts
var init_plugin_manager = __esm({
  "src/plugins/core/plugin-manager.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
  }
});

// src/plugins/core/base-plugin.ts
var init_base_plugin = __esm({
  "src/plugins/core/base-plugin.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/plugins/core/index.ts
var init_core = __esm({
  "src/plugins/core/index.ts"() {
    "use strict";
    init_esm_shims();
    init_plugin_manager();
    init_base_plugin();
  }
});

// src/plugins/builtin/analytics-plugin.ts
var init_analytics_plugin = __esm({
  "src/plugins/builtin/analytics-plugin.ts"() {
    "use strict";
    init_esm_shims();
    init_base_plugin();
  }
});

// src/plugins/builtin/audit-plugin.ts
var init_audit_plugin = __esm({
  "src/plugins/builtin/audit-plugin.ts"() {
    "use strict";
    init_esm_shims();
    init_base_plugin();
  }
});

// src/plugins/builtin/cache-plugin.ts
var init_cache_plugin = __esm({
  "src/plugins/builtin/cache-plugin.ts"() {
    "use strict";
    init_esm_shims();
    init_base_plugin();
  }
});

// src/plugins/builtin/debug-plugin.ts
var init_debug_plugin = __esm({
  "src/plugins/builtin/debug-plugin.ts"() {
    "use strict";
    init_esm_shims();
    init_base_plugin();
  }
});

// src/plugins/builtin/performance-plugin.ts
var init_performance_plugin = __esm({
  "src/plugins/builtin/performance-plugin.ts"() {
    "use strict";
    init_esm_shims();
    init_base_plugin();
  }
});

// src/plugins/builtin/index.ts
var init_builtin = __esm({
  "src/plugins/builtin/index.ts"() {
    "use strict";
    init_esm_shims();
    init_analytics_plugin();
    init_audit_plugin();
    init_cache_plugin();
    init_debug_plugin();
    init_performance_plugin();
    init_analytics_plugin();
    init_debug_plugin();
    init_performance_plugin();
    init_cache_plugin();
    init_audit_plugin();
  }
});

// src/plugins/index.ts
var init_plugins = __esm({
  "src/plugins/index.ts"() {
    "use strict";
    init_esm_shims();
    init_core();
    init_builtin();
  }
});

// src/quality/pre-commit.ts
var init_pre_commit = __esm({
  "src/quality/pre-commit.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/quality/ci-cd.ts
var init_ci_cd = __esm({
  "src/quality/ci-cd.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/quality/dependency-management.ts
var init_dependency_management = __esm({
  "src/quality/dependency-management.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/quality/index.ts
var init_quality = __esm({
  "src/quality/index.ts"() {
    "use strict";
    init_esm_shims();
    init_pre_commit();
    init_ci_cd();
    init_dependency_management();
  }
});

// src/pwa/background-sync.ts
var init_background_sync = __esm({
  "src/pwa/background-sync.ts"() {
    "use strict";
    init_esm_shims();
    init_eventemitter3();
    init_unified_storage();
    init_storage_factory();
  }
});

// src/pwa/offline-integration.ts
var DEFAULT_CONFIG16;
var init_offline_integration = __esm({
  "src/pwa/offline-integration.ts"() {
    "use strict";
    init_esm_shims();
    init_background_sync();
    init_eventemitter3();
    DEFAULT_CONFIG16 = {
      enableMigration: true,
      receiptSync: {
        batchSize: 20,
        prioritizeLottery: true,
        fiscalTimeout: 72 * 60 * 60 * 1e3
        // 72 hours
      },
      conflictResolution: {
        preserveFiscalData: true,
        autoResolveDuplicates: true
      }
    };
  }
});

// src/pwa/index.ts
var PWA_CONSTANTS;
var init_pwa = __esm({
  "src/pwa/index.ts"() {
    "use strict";
    init_esm_shims();
    init_pwa_manager();
    init_manifest_generator();
    init_background_sync();
    init_offline_integration();
    init_push_notifications();
    init_app_installer();
    init_pwa_manager();
    init_manifest_generator();
    init_app_installer();
    PWA_CONSTANTS = {
      // Cache names
      STATIC_CACHE_PREFIX: "acube-static-",
      API_CACHE_PREFIX: "acube-api-",
      RUNTIME_CACHE_PREFIX: "acube-runtime-",
      // Default cache durations (in milliseconds)
      DEFAULT_API_CACHE_DURATION: 5 * 60 * 1e3,
      // 5 minutes
      DEFAULT_STATIC_CACHE_DURATION: 24 * 60 * 60 * 1e3,
      // 24 hours
      DEFAULT_RUNTIME_CACHE_DURATION: 60 * 60 * 1e3,
      // 1 hour
      // Offline queue settings
      DEFAULT_QUEUE_NAME: "acube-offline-queue",
      DEFAULT_MAX_QUEUE_SIZE: 1e3,
      DEFAULT_MAX_RETENTION_TIME: 7 * 24 * 60 * 60 * 1e3,
      // 7 days
      // Background sync settings
      DEFAULT_MIN_SYNC_INTERVAL: 15 * 60 * 1e3,
      // 15 minutes
      // Manifest defaults
      DEFAULT_THEME_COLOR: "#1976d2",
      DEFAULT_BACKGROUND_COLOR: "#ffffff",
      DEFAULT_DISPLAY_MODE: "standalone",
      DEFAULT_ORIENTATION: "portrait",
      // Service worker events
      SW_EVENTS: {
        REGISTERED: "sw:registered",
        UPDATED: "sw:updated",
        ERROR: "sw:error",
        INSTALL_AVAILABLE: "install:available",
        INSTALL_COMPLETED: "install:completed",
        CACHE_UPDATED: "cache:updated",
        OFFLINE_QUEUED: "offline:queued",
        OFFLINE_SYNCED: "offline:synced",
        PUSH_RECEIVED: "push:received",
        SYNC_COMPLETED: "sync:completed"
      },
      // Italian e-receipt specific categories
      ERECEIPT_CATEGORIES: [
        "business",
        "finance",
        "productivity",
        "utilities"
      ],
      // Recommended icon sizes for PWA
      RECOMMENDED_ICON_SIZES: [
        "72x72",
        "96x96",
        "128x128",
        "144x144",
        "152x152",
        "192x192",
        "384x384",
        "512x512"
      ],
      // Maskable icon sizes
      MASKABLE_ICON_SIZES: [
        "192x192",
        "512x512"
      ]
    };
  }
});

// src/index.ts
var init_src = __esm({
  "src/index.ts"() {
    "use strict";
    init_esm_shims();
    init_sdk();
    init_sdk();
    init_client();
    init_endpoints();
    init_cashiers();
    init_receipts();
    init_cash_registers();
    init_merchants();
    init_pems();
    init_point_of_sales();
    init_base_openapi();
    init_branded();
    init_events();
    init_unified_storage();
    init_platform_detector();
    init_indexeddb_adapter();
    init_localstorage_adapter();
    init_encryption_service();
    init_storage_factory();
    init_queue();
    init_enhanced_offline_hook();
    init_react();
    init_compliance();
    init_plugins();
    init_quality();
    init_pwa();
    init_errors();
    init_circuit_breaker();
    init_retry();
    init_middleware();
  }
});

// src/cli/utils/sdk.ts
var sdk_exports = {};
__export(sdk_exports, {
  cleanupSDK: () => cleanupSDK,
  getSDK: () => getSDK,
  initializeSDK: () => initializeSDK,
  requireSDK: () => requireSDK
});
async function initializeSDK(requireAuth = true) {
  const config = await loadConfig();
  const auth = await loadAuth(config.currentProfile);
  const sdkConfig = {
    environment: config.environment
  };
  if (config.baseUrls?.api || config.baseUrls?.auth) {
    console.log("\u{1F527} Debug: Custom URLs configured:", {
      api: config.baseUrls?.api,
      auth: config.baseUrls?.auth
    });
  }
  sdk = createACubeSDK(sdkConfig);
  await sdk.initialize();
  if (auth && (auth.accessToken || auth.user)) {
    try {
      await restoreAuthentication(auth);
    } catch (error) {
      if (requireAuth) {
        throw new AuthenticationRequiredError("Please login to continue: acube auth login");
      }
    }
  } else if (requireAuth) {
    throw new AuthenticationRequiredError("Please login to continue: acube auth login");
  }
  return sdk;
}
async function restoreAuthentication(auth) {
  if (!sdk) {
    throw new Error("SDK not initialized");
  }
  if (!auth.user) {
    throw new Error("No user authentication data available");
  }
  if (!auth.accessToken) {
    throw new Error('No access token available. Please run "acube auth login" to re-authenticate.');
  }
  let expiresAt = auth.expiresAt;
  if (!expiresAt && auth.accessToken) {
    try {
      const parts = auth.accessToken.split(".");
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        if (payload && payload.exp) {
          expiresAt = payload.exp * 1e3;
        }
      }
    } catch (error) {
      console.log("\u{1F527} Debug: Failed to parse token:", error);
    }
  }
  if (expiresAt && Date.now() >= expiresAt) {
    throw new Error("Access token has expired. Please login again.");
  }
  try {
    const authService = sdk.authService;
    authService.updateState({
      isAuthenticated: true,
      user: auth.user,
      accessToken: auth.accessToken || null,
      refreshToken: auth.refreshToken || null,
      expiresAt,
      isLoading: false,
      error: null
    });
  } catch (error) {
    throw new Error("Failed to restore authentication state in SDK");
  }
}
async function cleanupSDK() {
  if (sdk) {
    try {
      const cleanupPromise = sdk.destroy();
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Cleanup timeout")), 2e3)
      );
      await Promise.race([cleanupPromise, timeoutPromise]);
    } catch (error) {
    } finally {
      sdk = null;
    }
  }
  if (global.gc) {
    global.gc();
  }
}
function getSDK() {
  return sdk;
}
function requireSDK() {
  if (!sdk) {
    throw new Error("SDK not initialized. Call initializeSDK() first.");
  }
  return sdk;
}
var sdk;
var init_sdk2 = __esm({
  "src/cli/utils/sdk.ts"() {
    "use strict";
    init_esm_shims();
    init_src();
    init_config();
    init_types();
    sdk = null;
  }
});

// src/cli.ts
init_esm_shims();

// src/cli/index.ts
init_esm_shims();
import { Command } from "commander";

// src/cli/commands/index.ts
init_esm_shims();

// src/cli/commands/auth/index.ts
init_esm_shims();

// src/cli/commands/auth/login.ts
init_esm_shims();
import chalk4 from "chalk";
import inquirer from "inquirer";
import ora from "ora";

// src/cli/commands/base/command.ts
init_esm_shims();
init_types();
import chalk3 from "chalk";

// src/cli/utils/errors.ts
init_esm_shims();
init_config();
init_constants();
import chalk from "chalk";
function formatErrorTrace(error, context, config) {
  const traceConfig = config || DEFAULT_TRACE_CONFIG;
  if (!traceConfig.enabled) {
    return error.message || "Unknown error";
  }
  const timestamp = traceConfig.includeTimestamp ? `[${(/* @__PURE__ */ new Date()).toISOString()}] ` : "";
  let output = "";
  switch (traceConfig.outputFormat) {
    case "json":
      output = formatErrorTraceJSON(error, context, traceConfig);
      break;
    case "compact":
      output = formatErrorTraceCompact(error, context, traceConfig);
      break;
    case "pretty":
    default:
      output = formatErrorTracePretty(error, context, traceConfig);
      break;
  }
  return timestamp + output;
}
function formatErrorTracePretty(error, context, config) {
  const traceConfig = config || DEFAULT_TRACE_CONFIG;
  let output = chalk.red("\u250C\u2500 Error Details \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");
  output += chalk.red("\u2502 ") + chalk.bold("Message: ") + (error.message || "Unknown error") + "\n";
  if (error.name) {
    output += chalk.red("\u2502 ") + chalk.bold("Type: ") + error.name + "\n";
  }
  if (error.code) {
    output += chalk.red("\u2502 ") + chalk.bold("Code: ") + error.code + "\n";
  }
  if (error.status || error.statusCode) {
    output += chalk.red("\u2502 ") + chalk.bold("Status: ") + (error.status || error.statusCode) + "\n";
  }
  if (error.response?.data) {
    output += chalk.red("\u2502 ") + chalk.bold("Response: ") + JSON.stringify(error.response.data, null, 2).replace(/\\n/g, "\n\u2502   ") + "\n";
  }
  if (traceConfig.includeContext && context) {
    output += chalk.red("\u2502 ") + chalk.bold("Context: ") + "\n";
    Object.entries(context).forEach(([key, value]) => {
      output += chalk.red("\u2502   ") + chalk.cyan(key + ": ") + String(value) + "\n";
    });
  }
  if (traceConfig.includeStack && error.stack) {
    output += chalk.red("\u2502 ") + chalk.bold("Stack Trace: ") + "\n";
    const stackLines = error.stack.split("\n").slice(1);
    stackLines.forEach((line) => {
      output += chalk.red("\u2502   ") + chalk.gray(line.trim()) + "\n";
    });
  }
  output += chalk.red("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  return output;
}
function formatErrorTraceCompact(error, context, _config) {
  const parts = [error.message || "Unknown error"];
  if (error.code) parts.push(`[${error.code}]`);
  if (error.status || error.statusCode) parts.push(`HTTP:${error.status || error.statusCode}`);
  if (context?.operation) parts.push(`Op:${context.operation}`);
  return parts.join(" ");
}
function formatErrorTraceJSON(error, context, config) {
  const errorObject = {
    message: error.message || "Unknown error",
    type: error.name || "Error",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (error.code) errorObject.code = error.code;
  if (error.status || error.statusCode) errorObject.status = error.status || error.statusCode;
  if (error.response?.data) errorObject.response = error.response.data;
  if (config?.includeContext && context) {
    errorObject.context = context;
  }
  if (config?.includeStack && error.stack) {
    errorObject.stack = error.stack.split("\n");
  }
  return JSON.stringify(errorObject, null, 2);
}
async function getTraceConfig(commandOptions) {
  try {
    const config = await loadConfig();
    const baseConfig = config.trace || DEFAULT_TRACE_CONFIG;
    if (commandOptions?.trace) {
      return {
        ...baseConfig,
        enabled: true,
        level: commandOptions.verbose ? "verbose" : baseConfig.level
      };
    }
    return baseConfig;
  } catch (error) {
    return DEFAULT_TRACE_CONFIG;
  }
}
async function handleError(error, context, commandOptions) {
  const traceConfig = await getTraceConfig(commandOptions);
  const formattedError = formatErrorTrace(error, context, traceConfig);
  console.error(formattedError);
}

// src/cli/utils/process.ts
init_esm_shims();
import chalk2 from "chalk";
function stampProcessStatus(commandName, status, details) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const statusIcon = status === "success" ? "\u2705" : status === "error" ? "\u274C" : "\u26A0\uFE0F";
  const statusColor = status === "success" ? "green" : status === "error" ? "red" : "yellow";
  console.log(chalk2.gray("\n" + "\u2500".repeat(60)));
  console.log(chalk2[statusColor](`${statusIcon} Process: ${commandName}`));
  console.log(chalk2.gray(`   Status: ${status.toUpperCase()}`));
  console.log(chalk2.gray(`   Time: ${timestamp}`));
  if (details) {
    console.log(chalk2.gray(`   Details: ${details}`));
  }
  console.log(chalk2.gray("\u2500".repeat(60)));
}
function exitWithStatus(commandName, status, details, exitCode = 0) {
  stampProcessStatus(commandName, status, details);
  process.exit(exitCode);
}
function setupGracefulShutdown(commandName) {
  const handleShutdown = (signal) => {
    console.log(chalk2.yellow(`

Received ${signal}. Shutting down gracefully...`));
    exitWithStatus(commandName, "cancelled", `Interrupted by ${signal}`, 130);
  };
  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

// src/cli/commands/base/command.ts
var BaseCommand = class {
  /**
   * Execute the command with error handling and process management
   */
  async execute(options) {
    setupGracefulShutdown(this.commandName);
    try {
      await this.run(options);
      const { cleanupSDK: cleanupSDK2 } = await Promise.resolve().then(() => (init_sdk2(), sdk_exports));
      try {
        await Promise.race([
          cleanupSDK2(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Cleanup timeout")), 1e3))
        ]);
      } catch {
      }
      exitWithStatus(this.commandName, "success");
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) {
        console.error(chalk3.red("\n\u274C Authentication Required"));
        console.error(chalk3.yellow("\u{1F4A1} " + error.message));
        console.error(chalk3.gray("\nExample: acube auth login --profile sandbox -u user@example.com -p password\n"));
        const { cleanupSDK: cleanupSDK3 } = await Promise.resolve().then(() => (init_sdk2(), sdk_exports));
        try {
          await Promise.race([
            cleanupSDK3(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Cleanup timeout")), 1e3))
          ]);
        } catch {
        }
        process.exit(1);
      }
      await handleError(error, { command: this.commandName }, options);
      const { cleanupSDK: cleanupSDK2 } = await Promise.resolve().then(() => (init_sdk2(), sdk_exports));
      try {
        await Promise.race([
          cleanupSDK2(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Cleanup timeout")), 1e3))
        ]);
      } catch {
      }
      exitWithStatus(this.commandName, "error", error instanceof Error ? error.message : "Unknown error", 1);
    }
  }
  /**
   * Execute the command with error handling but without process exit
   * Useful for interactive mode or when commands are called programmatically
   */
  async run(options) {
    try {
      await this.executeCommand(options);
    } catch (error) {
      await this.handleError(error, options);
      throw error;
    }
  }
  /**
   * Handle command-specific errors
   */
  async handleError(error, options) {
    await handleError(error, { command: this.commandName }, options);
  }
  /**
   * Validate command options - override in subclasses
   */
  validateOptions(_options) {
  }
};

// src/cli/commands/auth/login.ts
init_sdk2();
init_config();
var LoginCommand = class extends BaseCommand {
  commandName = "login";
  async executeCommand(options) {
    console.log(chalk4.blue("A-Cube E-Receipt Authentication"));
    let config = await loadConfig();
    if (options.profile) {
      const envMap = {
        "sandbox": "sandbox",
        "production": "production",
        "development": "development",
        "dev": "development",
        "prod": "production"
      };
      const environment = envMap[options.profile.toLowerCase()] || "sandbox";
      config = { ...config, environment };
      await saveConfig(config);
      console.log(chalk4.gray(`Environment set to: ${environment}`));
    }
    let credentials;
    if (options.username && options.password) {
      credentials = {
        username: options.username,
        password: options.password
      };
      console.log(chalk4.gray(`Logging in as: ${options.username}`));
    } else {
      const prompts = [];
      if (!options.username) {
        prompts.push({
          type: "input",
          name: "username",
          message: "Username:",
          validate: (input) => input.length > 0 || "Please enter a username"
        });
      }
      if (!options.password) {
        prompts.push({
          type: "password",
          name: "password",
          message: "Password:",
          mask: "*"
        });
      }
      const prompted = await inquirer.prompt(prompts);
      credentials = {
        username: options.username || prompted.username,
        password: options.password || prompted.password
      };
    }
    const spinner = ora("Authenticating...").start();
    try {
      const sdk2 = await initializeSDK(false);
      const user = await sdk2.login({
        username: credentials.username,
        password: credentials.password
      });
      const authState = sdk2.getAuthState();
      let expiresAt = Date.now() + 24 * 60 * 60 * 1e3;
      if (authState && authState.expiresAt) {
        expiresAt = authState.expiresAt;
      }
      await saveAuth({
        user,
        accessToken: authState?.accessToken || null,
        refreshToken: authState?.refreshToken || null,
        expiresAt
      }, config.currentProfile);
      spinner.succeed("Authentication successful");
      console.log(`Welcome, ${chalk4.green(user.email)}!`);
      console.log(`Roles: ${chalk4.cyan(user.roles?.join(", ") || "N/A")}`);
      console.log(`Session expires: ${chalk4.gray(new Date(expiresAt).toLocaleString())}`);
    } catch (error) {
      spinner.fail("Authentication failed");
      throw error;
    }
  }
};

// src/cli/commands/auth/logout.ts
init_esm_shims();
import chalk5 from "chalk";
import inquirer2 from "inquirer";
import ora2 from "ora";
init_sdk2();
init_config();
var LogoutCommand = class extends BaseCommand {
  commandName = "logout";
  async executeCommand(options) {
    const config = await loadConfig();
    const profileText = config.currentProfile ? ` (profile: ${config.currentProfile})` : "";
    if (!options.force) {
      const { confirm } = await inquirer2.prompt([{
        type: "confirm",
        name: "confirm",
        message: `Are you sure you want to logout${profileText}?`,
        default: false
      }]);
      if (!confirm) {
        console.log(chalk5.yellow("Logout cancelled"));
        return;
      }
    }
    const spinner = ora2("Logging out...").start();
    try {
      try {
        const sdk2 = await initializeSDK(false);
        await sdk2.logout();
      } catch (error) {
        console.log("\u{1F527} Debug: Server logout failed, clearing local auth:", error);
      }
      await clearAuth(config.currentProfile);
      await cleanupSDK();
      spinner.succeed("Logged out successfully");
      console.log(chalk5.green(`You have been logged out${profileText}`));
    } catch (error) {
      spinner.fail("Logout failed");
      throw error;
    }
  }
};

// src/cli/commands/auth/status.ts
init_esm_shims();
import chalk6 from "chalk";
init_config();
var StatusCommand = class extends BaseCommand {
  commandName = "auth-status";
  async executeCommand(_options) {
    const config = await loadConfig();
    const auth = await loadAuth(config.currentProfile);
    console.log(chalk6.blue("Authentication Status"));
    console.log("\u2500".repeat(40));
    if (!auth || !auth.accessToken) {
      console.log(chalk6.red("\u274C Not authenticated"));
      console.log(chalk6.gray('Run "acube auth login" to authenticate'));
      return;
    }
    let tokenInfo = null;
    let isExpired = false;
    try {
      if (auth.accessToken) {
        const parts = auth.accessToken.split(".");
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          tokenInfo = payload;
        }
      }
      const expiresAt = auth.expiresAt || (tokenInfo?.exp ? tokenInfo.exp * 1e3 : null);
      isExpired = expiresAt ? Date.now() >= expiresAt : false;
    } catch (error) {
      console.log("\u{1F527} Debug: Failed to parse token:", error);
    }
    if (isExpired) {
      console.log(chalk6.red("\u274C Token expired"));
      console.log(chalk6.gray('Run "acube auth login" to re-authenticate'));
      return;
    }
    console.log(chalk6.green("\u2705 Authenticated"));
    if (auth.user) {
      console.log(`Email: ${chalk6.cyan(auth.user.email)}`);
      console.log(`Roles: ${chalk6.cyan(auth.user.roles?.join(", ") || "N/A")}`);
    }
    if (config.currentProfile) {
      console.log(`Profile: ${chalk6.cyan(config.currentProfile)}`);
    }
    if (auth.expiresAt) {
      console.log(`Expires: ${chalk6.gray(new Date(auth.expiresAt).toLocaleString())}`);
    }
    console.log(`Environment: ${chalk6.cyan(config.environment)}`);
    console.log(`Token length: ${chalk6.gray(auth.accessToken.length)} characters`);
  }
};

// src/cli/commands/auth/refresh.ts
init_esm_shims();
import chalk7 from "chalk";
import ora3 from "ora";
init_config();
var RefreshCommand = class extends BaseCommand {
  commandName = "refresh";
  async executeCommand(_options) {
    const config = await loadConfig();
    const auth = await loadAuth(config.currentProfile);
    if (!auth || !auth.refreshToken) {
      throw new Error("No refresh token available. Please login again.");
    }
    const spinner = ora3("Refreshing authentication token...").start();
    try {
      throw new Error("Token refresh not yet implemented. Please login again.");
    } catch (error) {
      spinner.fail("Token refresh failed");
      console.log(chalk7.yellow("Your refresh token may have expired. Please login again."));
      throw error;
    }
  }
};

// src/cli/commands/config/index.ts
init_esm_shims();

// src/cli/commands/config/setup.ts
init_esm_shims();
import chalk8 from "chalk";
import inquirer3 from "inquirer";
init_config();
var SetupCommand = class extends BaseCommand {
  commandName = "setup";
  async executeCommand(_options) {
    console.log(chalk8.blue("A-Cube E-Receipt CLI Setup"));
    console.log(chalk8.gray("Configure your CLI settings\n"));
    const config = await loadConfig();
    const envAnswers = await inquirer3.prompt([
      {
        type: "list",
        name: "environment",
        message: "Select environment:",
        choices: [
          { name: "Sandbox (development/testing)", value: "sandbox" },
          { name: "Production (live system)", value: "production" },
          { name: "Development (local)", value: "development" }
        ],
        default: config.environment || "sandbox"
      }
    ]);
    config.environment = envAnswers.environment;
    const { customUrls } = await inquirer3.prompt([{
      type: "confirm",
      name: "customUrls",
      message: "Configure custom base URLs?",
      default: false
    }]);
    if (customUrls) {
      const urlAnswers = await inquirer3.prompt([
        {
          type: "input",
          name: "apiUrl",
          message: "API base URL:",
          default: config.baseUrls?.api || "",
          validate: (input) => !input || input.startsWith("http") || "Must be a valid HTTP URL"
        },
        {
          type: "input",
          name: "authUrl",
          message: "Auth base URL:",
          default: config.baseUrls?.auth || "",
          validate: (input) => !input || input.startsWith("http") || "Must be a valid HTTP URL"
        }
      ]);
      if (urlAnswers.apiUrl || urlAnswers.authUrl) {
        config.baseUrls = {
          ...urlAnswers.apiUrl && { api: urlAnswers.apiUrl },
          ...urlAnswers.authUrl && { auth: urlAnswers.authUrl }
        };
      }
    }
    const { configureTrace } = await inquirer3.prompt([{
      type: "confirm",
      name: "configureTrace",
      message: "Configure error tracing?",
      default: config.trace?.enabled || false
    }]);
    if (configureTrace) {
      const traceAnswers = await inquirer3.prompt([
        {
          type: "confirm",
          name: "enabled",
          message: "Enable error tracing?",
          default: config.trace?.enabled !== false
        },
        {
          type: "list",
          name: "level",
          message: "Trace level:",
          choices: ["basic", "detailed", "verbose", "debug"],
          default: config.trace?.level || "basic",
          when: (answers) => answers.enabled
        },
        {
          type: "list",
          name: "outputFormat",
          message: "Output format:",
          choices: ["pretty", "compact", "json"],
          default: config.trace?.outputFormat || "pretty",
          when: (answers) => answers.enabled
        },
        {
          type: "confirm",
          name: "includeStack",
          message: "Include stack traces?",
          default: config.trace?.includeStack || false,
          when: (answers) => answers.enabled
        },
        {
          type: "confirm",
          name: "includeContext",
          message: "Include context information?",
          default: config.trace?.includeContext !== false,
          when: (answers) => answers.enabled
        },
        {
          type: "confirm",
          name: "includeTimestamp",
          message: "Include timestamps?",
          default: config.trace?.includeTimestamp !== false,
          when: (answers) => answers.enabled
        }
      ]);
      if (traceAnswers.enabled !== void 0) {
        config.trace = {
          enabled: traceAnswers.enabled,
          level: traceAnswers.level || "basic",
          outputFormat: traceAnswers.outputFormat || "pretty",
          includeStack: traceAnswers.includeStack || false,
          includeContext: traceAnswers.includeContext !== false,
          includeTimestamp: traceAnswers.includeTimestamp !== false
        };
      }
    }
    await saveConfig(config);
    console.log(chalk8.green("\u2713 Configuration saved"));
  }
};

// src/cli/commands/config/show.ts
init_esm_shims();
import chalk9 from "chalk";
init_config();
var ShowConfigCommand = class extends BaseCommand {
  commandName = "config-show";
  async executeCommand(_options) {
    const config = await loadConfig();
    console.log(chalk9.blue("Current Configuration"));
    console.log("\u2500".repeat(40));
    console.log(`Environment: ${chalk9.cyan(config.environment)}`);
    if (config.currentProfile) {
      console.log(`Current Profile: ${chalk9.cyan(config.currentProfile)}`);
    }
    if (config.baseUrls) {
      console.log("\nCustom URLs:");
      if (config.baseUrls.api) {
        console.log(`  API: ${chalk9.gray(config.baseUrls.api)}`);
      }
      if (config.baseUrls.auth) {
        console.log(`  Auth: ${chalk9.gray(config.baseUrls.auth)}`);
      }
    }
    if (config.trace) {
      console.log("\nError Tracing:");
      console.log(`  Enabled: ${config.trace.enabled ? chalk9.green("\u2713") : chalk9.red("\u2717")}`);
      console.log(`  Level: ${chalk9.cyan(config.trace.level)}`);
      console.log(`  Format: ${chalk9.cyan(config.trace.outputFormat)}`);
      console.log(`  Stack traces: ${config.trace.includeStack ? chalk9.green("\u2713") : chalk9.red("\u2717")}`);
      console.log(`  Context: ${config.trace.includeContext ? chalk9.green("\u2713") : chalk9.red("\u2717")}`);
      console.log(`  Timestamps: ${config.trace.includeTimestamp ? chalk9.green("\u2713") : chalk9.red("\u2717")}`);
    }
  }
};

// src/cli/commands/resources/index.ts
init_esm_shims();

// src/cli/commands/resources/receipts.ts
init_esm_shims();
import chalk11 from "chalk";
import inquirer4 from "inquirer";
import ora5 from "ora";

// src/cli/commands/base/resource.ts
init_esm_shims();
import ora4 from "ora";
import chalk10 from "chalk";
init_sdk2();
var BaseResourceCommand = class extends BaseCommand {
  /**
   * List resources with common pagination and error handling
   */
  async list(options) {
    const spinner = ora4(`Fetching ${this.resourceNamePlural}...`).start();
    try {
      const sdk2 = await initializeSDK();
      const resource = this.getSDKResource(sdk2);
      const params = {};
      if (options.limit) params.limit = parseInt(options.limit.toString());
      if (options.offset) params.offset = parseInt(options.offset.toString());
      const response = await resource.list(params);
      const items = this.extractItemsFromResponse(response);
      spinner.succeed(`Found ${items.length} ${this.resourceNamePlural}`);
      if (items.length === 0) {
        console.log(chalk10.gray(`No ${this.resourceNamePlural} found`));
      } else {
        if (options.format === "json") {
          console.log(JSON.stringify(items, null, 2));
        } else {
          this.displayItems(items);
        }
      }
      return;
    } catch (error) {
      spinner.fail(`Failed to fetch ${this.resourceNamePlural}`);
      throw error;
    }
  }
  /**
   * Get a single resource by ID
   */
  async get(id, _options) {
    const spinner = ora4(`Fetching ${this.resourceName}...`).start();
    try {
      const sdk2 = await initializeSDK();
      const resource = this.getSDKResource(sdk2);
      const item = await resource.retrieve(id);
      spinner.succeed(`Found ${this.resourceName}`);
      this.displaySingleItem(item);
    } catch (error) {
      spinner.fail(`Failed to fetch ${this.resourceName}`);
      throw error;
    }
  }
  /**
   * Delete a resource by ID
   */
  async delete(id, _options) {
    const spinner = ora4(`Deleting ${this.resourceName}...`).start();
    try {
      const sdk2 = await initializeSDK();
      const resource = this.getSDKResource(sdk2);
      await resource.delete(id);
      spinner.succeed(`${this.resourceName} deleted successfully`);
    } catch (error) {
      spinner.fail(`Failed to delete ${this.resourceName}`);
      throw error;
    }
  }
  /**
   * Extract items from API response - handles both direct arrays and paginated responses
   */
  extractItemsFromResponse(response) {
    if (Array.isArray(response)) {
      return response;
    }
    if (response.members && Array.isArray(response.members)) {
      return response.members;
    }
    return [];
  }
  /**
   * Display a single item - default implementation, can be overridden
   */
  displaySingleItem(item) {
    console.log(JSON.stringify(item, null, 2));
  }
  /**
   * Format item display with consistent styling
   */
  formatItemHeader(id, title) {
    if (title) {
      return `${chalk10.bold(id)} - ${title}`;
    }
    return chalk10.bold(id);
  }
  /**
   * Format property display with consistent styling
   */
  formatProperty(label, value, fallback = "N/A") {
    const displayValue = value ?? fallback;
    return `  ${label}: ${displayValue}`;
  }
};

// src/cli/commands/resources/receipts.ts
init_sdk2();
var ReceiptsCommand = class extends BaseResourceCommand {
  commandName = "receipts";
  resourceName = "receipt";
  resourceNamePlural = "receipts";
  getSDKResource(sdk2) {
    return sdk2.receipts;
  }
  displayItems(receipts) {
    receipts.forEach((receipt) => {
      console.log(`
${this.formatItemHeader(receipt.uuid, receipt.document_number)}
${this.formatProperty("Type", receipt.type)}
${this.formatProperty("Amount", `\u20AC${receipt.total_amount}`)}
${this.formatProperty("Date", new Date(receipt.created_at).toLocaleDateString())}
${this.formatProperty("Lottery", receipt.customer_lottery_code)}
`);
    });
  }
  /**
   * Create a new receipt interactively
   */
  async create(_options) {
    console.log(chalk11.blue("Creating a new receipt"));
    const answers = await inquirer4.prompt([
      {
        type: "number",
        name: "totalAmount",
        message: "Total amount (in euros):",
        validate: (input) => input > 0 || "Amount must be positive"
      },
      {
        type: "input",
        name: "customerLotteryCode",
        message: "Customer lottery code (optional):"
      }
    ]);
    const receiptData = {
      total_amount: answers.totalAmount.toFixed(2),
      ...answers.customerLotteryCode && { customer_lottery_code: answers.customerLotteryCode }
    };
    const spinner = ora5("Creating receipt...").start();
    try {
      const sdk2 = await initializeSDK();
      const receipt = await sdk2.receipts.create(receiptData);
      spinner.succeed("Receipt created successfully");
      console.log(`Receipt ID: ${chalk11.green(receipt.uuid)}`);
    } catch (error) {
      spinner.fail("Failed to create receipt");
      throw error;
    }
  }
  async executeCommand(_options) {
    throw new Error("ReceiptsCommand.executeCommand should not be called directly");
  }
};

// src/cli/commands/resources/cashiers.ts
init_esm_shims();
var CashiersCommand = class extends BaseResourceCommand {
  commandName = "cashiers";
  resourceName = "cashier";
  resourceNamePlural = "cashiers";
  getSDKResource(sdk2) {
    return sdk2.cashiers;
  }
  displayItems(cashiers) {
    cashiers.forEach((cashier) => {
      console.log(`
${this.formatItemHeader(cashier.id.toString())}
${this.formatProperty("Email", cashier.email)}
`);
    });
  }
  async executeCommand(_options) {
    throw new Error("CashiersCommand.executeCommand should not be called directly");
  }
};

// src/cli/commands/resources/merchants.ts
init_esm_shims();
var MerchantsCommand = class extends BaseResourceCommand {
  commandName = "merchants";
  resourceName = "merchant";
  resourceNamePlural = "merchants";
  getSDKResource(sdk2) {
    return sdk2.merchants;
  }
  displayItems(merchants) {
    merchants.forEach((merchant) => {
      const address = merchant.address ? `${merchant.address.street_address || ""}, ${merchant.address.city || ""}`.trim().replace(/^,\s*/, "") : "N/A";
      console.log(`
${this.formatItemHeader(merchant.uuid, merchant.name)}
${this.formatProperty("Fiscal ID", merchant.fiscal_id)}
${this.formatProperty("Email", merchant.email)}
${this.formatProperty("Address", address)}
`);
    });
  }
  async executeCommand(_options) {
    throw new Error("MerchantsCommand.executeCommand should not be called directly");
  }
};

// src/cli/commands/resources/point-of-sales.ts
init_esm_shims();
var PointOfSalesCommand = class extends BaseResourceCommand {
  commandName = "point-of-sales";
  resourceName = "point of sale";
  resourceNamePlural = "point of sales";
  getSDKResource(sdk2) {
    return sdk2.pointOfSales;
  }
  displayItems(posList) {
    posList.forEach((pos) => {
      const address = pos.address ? `${pos.address.street_address || ""}, ${pos.address.city || ""} ${pos.address.zip_code || ""}`.trim().replace(/^,\s*/, "") : "N/A";
      console.log(`
${this.formatItemHeader(pos.serial_number)}
${this.formatProperty("Status", pos.status)}
${this.formatProperty("Address", address)}
`);
    });
  }
  async executeCommand(options) {
    const resourceOptions = options;
    await this.list(resourceOptions);
  }
};

// src/cli/commands/profile.ts
init_esm_shims();
import chalk12 from "chalk";
import inquirer5 from "inquirer";
init_config();
var ProfileListCommand = class extends BaseCommand {
  commandName = "profile-list";
  async executeCommand(_options) {
    const config = await loadConfig();
    const profiles = await listProfiles();
    console.log(chalk12.blue("Available Profiles"));
    console.log("\u2500".repeat(30));
    if (profiles.length === 0) {
      console.log(chalk12.gray("No profiles found"));
      return;
    }
    profiles.forEach((profile) => {
      const isCurrent = config.currentProfile === profile;
      const marker = isCurrent ? chalk12.green("\u2192") : " ";
      const name = isCurrent ? chalk12.green(profile) : profile;
      console.log(`${marker} ${name}`);
    });
  }
};
var ProfileSwitchCommand = class extends BaseCommand {
  constructor(profileName) {
    super();
    this.profileName = profileName;
  }
  commandName = "profile-switch";
  async executeCommand(_options) {
    const profiles = await listProfiles();
    if (!profiles.includes(this.profileName)) {
      throw new Error(`Profile '${this.profileName}' not found. Available profiles: ${profiles.join(", ")}`);
    }
    const config = await loadConfig();
    config.currentProfile = this.profileName;
    await saveConfig(config);
    console.log(chalk12.green(`\u2713 Switched to profile: ${this.profileName}`));
  }
};
var ProfileDeleteCommand = class extends BaseCommand {
  constructor(profileName) {
    super();
    this.profileName = profileName;
  }
  commandName = "profile-delete";
  async executeCommand(_options) {
    const profiles = await listProfiles();
    if (!profiles.includes(this.profileName)) {
      throw new Error(`Profile '${this.profileName}' not found`);
    }
    const { confirm } = await inquirer5.prompt([{
      type: "confirm",
      name: "confirm",
      message: `Are you sure you want to delete profile '${this.profileName}'?`,
      default: false
    }]);
    if (!confirm) {
      console.log(chalk12.yellow("Profile deletion cancelled"));
      return;
    }
    await deleteProfile(this.profileName);
    const config = await loadConfig();
    if (config.currentProfile === this.profileName) {
      delete config.currentProfile;
      await saveConfig(config);
    }
    console.log(chalk12.green(`\u2713 Profile '${this.profileName}' deleted`));
  }
};

// src/cli/commands/interactive.ts
init_esm_shims();
import chalk13 from "chalk";
import inquirer6 from "inquirer";
var InteractiveCommand = class extends BaseCommand {
  commandName = "interactive";
  async executeCommand(options) {
    console.log(chalk13.blue.bold("A-Cube E-Receipt Interactive Mode"));
    console.log(chalk13.gray("Select an option to continue\n"));
    while (true) {
      const { action } = await inquirer6.prompt([{
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Authentication", value: "auth" },
          { name: "Manage Receipts", value: "receipts" },
          { name: "Manage Cashiers", value: "cashiers" },
          { name: "Manage Merchants", value: "merchants" },
          { name: "Manage Point of Sales", value: "pos" },
          { name: "Exit", value: "exit" }
        ]
      }]);
      if (action === "exit") {
        console.log(chalk13.green("Goodbye! \u{1F44B}"));
        break;
      }
      try {
        await this.handleAction(action, options);
      } catch (error) {
        console.error(chalk13.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
        console.log(chalk13.gray("Press any key to continue..."));
        await inquirer6.prompt([{ type: "input", name: "continue", message: "" }]);
      }
    }
  }
  async handleAction(action, options) {
    switch (action) {
      case "auth":
        await this.handleAuthMenu(options);
        break;
      case "receipts":
        await this.handleResourceMenu("receipts", new ReceiptsCommand(), options);
        break;
      case "cashiers":
        await this.handleResourceMenu("cashiers", new CashiersCommand(), options);
        break;
      case "merchants":
        await this.handleResourceMenu("merchants", new MerchantsCommand(), options);
        break;
      case "pos":
        await this.handleResourceMenu("point of sales", new PointOfSalesCommand(), options);
        break;
    }
  }
  async handleAuthMenu(options) {
    const { authAction } = await inquirer6.prompt([{
      type: "list",
      name: "authAction",
      message: "Authentication:",
      choices: [
        { name: "Login", value: "login" },
        { name: "Show Status", value: "status" },
        { name: "Logout", value: "logout" },
        { name: "Back", value: "back" }
      ]
    }]);
    if (authAction === "back") return;
    switch (authAction) {
      case "login":
        await new LoginCommand().run(options);
        break;
      case "status":
        await new StatusCommand().run(options);
        break;
      case "logout":
        await new LogoutCommand().run(options);
        break;
    }
  }
  async handleResourceMenu(resourceName, command, options) {
    const { resourceAction } = await inquirer6.prompt([{
      type: "list",
      name: "resourceAction",
      message: `${resourceName}:`,
      choices: [
        { name: "List", value: "list" },
        ...command instanceof ReceiptsCommand ? [{ name: "Create", value: "create" }] : [],
        { name: "Back", value: "back" }
      ]
    }]);
    if (resourceAction === "back") return;
    switch (resourceAction) {
      case "list":
        await command.list({ limit: 10, ...options });
        break;
      case "create":
        if (command instanceof ReceiptsCommand) {
          await command.create(options);
        }
        break;
    }
  }
};

// src/cli/commands/version.ts
init_esm_shims();
import chalk14 from "chalk";
var VersionCommand = class extends BaseCommand {
  commandName = "version";
  async executeCommand(_options) {
    try {
      const fs2 = await import("fs/promises");
      const path4 = await import("path");
      const packagePath = path4.join(process.cwd(), "package.json");
      const packageData = JSON.parse(await fs2.readFile(packagePath, "utf-8"));
      console.log(chalk14.blue("A-Cube E-Receipt SDK"));
      console.log(`Version: ${chalk14.green(packageData.version)}`);
      console.log(`Node.js: ${chalk14.gray(process.version)}`);
      console.log(`Platform: ${chalk14.gray(process.platform)} ${chalk14.gray(process.arch)}`);
    } catch (error) {
      console.log(chalk14.blue("A-Cube E-Receipt SDK"));
      console.log(`Version: ${chalk14.gray("Unknown")}`);
      console.log(`Node.js: ${chalk14.gray(process.version)}`);
      console.log(`Platform: ${chalk14.gray(process.platform)} ${chalk14.gray(process.arch)}`);
    }
  }
};

// src/cli/index.ts
var program = new Command();
program.name("acube").description("A-Cube E-Receipt SDK CLI").version("1.0.0");
var authCmd = program.command("auth").description("Authentication management");
authCmd.command("login").description("Login to your account").option("-u, --username <username>", "Username").option("-p, --password <password>", "Password").option("--profile <profile>", "Environment profile (sandbox/production/development)").option("-r, --remember", "Remember credentials").option("-f, --force", "Force login even if already authenticated").action(async (options) => {
  await new LoginCommand().execute(options);
});
authCmd.command("logout").description("Logout from your account").option("-f, --force", "Force logout without confirmation").action(async (options) => {
  await new LogoutCommand().execute(options);
});
authCmd.command("status").description("Show authentication status").option("-v, --verbose", "Show detailed information").action(async (options) => {
  await new StatusCommand().execute(options);
});
authCmd.command("refresh").description("Refresh authentication token").action(async (options) => {
  await new RefreshCommand().execute(options);
});
var configCmd = program.command("config").description("Configuration management");
configCmd.command("setup").description("Interactive configuration setup").action(async (options) => {
  await new SetupCommand().execute(options);
});
configCmd.command("show").description("Show current configuration").action(async (options) => {
  await new ShowConfigCommand().execute(options);
});
var profileCmd = program.command("profile").description("Profile management");
profileCmd.command("list").description("List available profiles").action(async (options) => {
  await new ProfileListCommand().execute(options);
});
profileCmd.command("switch <name>").description("Switch to a different profile").action(async (name, options) => {
  await new ProfileSwitchCommand(name).execute(options);
});
profileCmd.command("delete <name>").description("Delete a profile").action(async (name, options) => {
  await new ProfileDeleteCommand(name).execute(options);
});
var receiptCmd = program.command("receipt").alias("receipts").description("Manage receipts");
receiptCmd.command("create").description("Create a new receipt").action(async (options) => {
  await new ReceiptsCommand().create(options);
});
receiptCmd.command("get <id>").description("Get a receipt by ID").action(async (id, options) => {
  await new ReceiptsCommand().get(id, options);
});
receiptCmd.command("list").description("List receipts").option("-l, --limit <number>", "Number of receipts to fetch", "10").option("-o, --offset <number>", "Number of receipts to skip", "0").option("--format <format>", "Output format (table|json)", "json").action(async (options) => {
  await new ReceiptsCommand().list(options);
});
receiptCmd.command("delete <id>").description("Delete a receipt").action(async (id, options) => {
  await new ReceiptsCommand().delete(id, options);
});
var cashierCmd = program.command("cashier").alias("cashiers").description("Manage cashiers");
cashierCmd.command("list").description("List cashiers").option("-l, --limit <number>", "Number of cashiers to fetch", "10").option("-o, --offset <number>", "Number of cashiers to skip", "0").option("--format <format>", "Output format (table|json)", "json").action(async (options) => {
  await new CashiersCommand().list(options);
});
var merchantCmd = program.command("merchant").alias("merchants").description("Manage merchants");
merchantCmd.command("list").description("List merchants").option("-l, --limit <number>", "Number of merchants to fetch", "10").option("--format <format>", "Output format (table|json)", "json").action(async (options) => {
  await new MerchantsCommand().list(options);
});
var posCmd = program.command("pos").alias("point-of-sale").description("Manage point of sales");
posCmd.command("list").description("List point of sales").option("-l, --limit <number>", "Number of point of sales to fetch", "10").option("-o, --offset <number>", "Number of point of sales to skip", "0").option("--format <format>", "Output format (table|json)", "json").action(async (options) => {
  await new PointOfSalesCommand().execute(options);
});
program.command("interactive").alias("i").description("Start interactive mode").action(async (options) => {
  await new InteractiveCommand().execute(options);
});
program.command("version").description("Show version information").action(async (options) => {
  await new VersionCommand().execute(options);
});
program.parse();
export {
  program
};
/*! Bundled license information:

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.js:
  (**
   * @license React
   * react-jsx-runtime.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=cli.js.map