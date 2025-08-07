'use strict';

var React = require('react');
var axios = require('axios');

/**
 * Core SDK types
 */
/**
 * SDK Exception class
 */
class ACubeSDKError extends Error {
    constructor(type, message, originalError, statusCode) {
        super(message);
        this.type = type;
        this.originalError = originalError;
        this.statusCode = statusCode;
        this.name = 'ACubeSDKError';
    }
}

/**
 * Default SDK configuration
 */
const DEFAULT_CONFIG$1 = {
    environment: 'sandbox',
    apiUrl: '',
    authUrl: '',
    timeout: 30000,
    retryAttempts: 3,
    debug: false,
    customHeaders: {},
};
/**
 * SDK Configuration manager
 */
class ConfigManager {
    constructor(userConfig) {
        this.config = this.mergeConfig(userConfig);
    }
    mergeConfig(userConfig) {
        const baseConfig = {
            ...DEFAULT_CONFIG$1,
            ...userConfig,
            apiUrl: userConfig.apiUrl || this.getDefaultApiUrl(userConfig.environment),
            authUrl: userConfig.authUrl || this.getDefaultAuthUrl(userConfig.environment),
        };
        return baseConfig;
    }
    getDefaultApiUrl(environment) {
        switch (environment) {
            case 'production':
                return 'https://ereceipts-it.acubeapi.com';
            case 'development':
                return 'https://ereceipts-it.dev.acubeapi.com';
            case 'sandbox':
            default:
                return 'https://ereceipts-it-sandbox.acubeapi.com';
        }
    }
    getDefaultAuthUrl(environment) {
        switch (environment) {
            case 'production':
                return 'https://common.api.acubeapi.com';
            case 'development':
            case 'sandbox':
            default:
                return 'https://common-sandbox.api.acubeapi.com';
        }
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get API URL
     */
    getApiUrl() {
        return this.config.apiUrl;
    }
    /**
     * Get Auth URL
     */
    getAuthUrl() {
        return this.config.authUrl;
    }
    /**
     * Get environment
     */
    getEnvironment() {
        return this.config.environment;
    }
    /**
     * Check if debug mode is enabled
     */
    isDebugEnabled() {
        return this.config.debug;
    }
    /**
     * Get timeout in milliseconds
     */
    getTimeout() {
        return this.config.timeout;
    }
    /**
     * Get retry attempts
     */
    getRetryAttempts() {
        return this.config.retryAttempts;
    }
    /**
     * Get custom headers
     */
    getCustomHeaders() {
        return { ...this.config.customHeaders };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = this.mergeConfig({ ...this.config, ...updates });
    }
}

/**
 * Role and Permission Management System
 *
 * This module provides type-safe role management with hierarchical permissions
 * and context-based authorization for the ACube E-Receipt system.
 */
/**
 * Role hierarchy definition based on your system
 * Each role inherits permissions from roles listed in its array
 */
const ROLE_HIERARCHY = {
    ROLE_SUPPLIER: [],
    ROLE_CACHIER: [],
    ROLE_MERCHANT: ['ROLE_CACHIER'],
};
/**
 * Default context for e-receipt operations
 */
const DEFAULT_CONTEXT = 'ereceipts-it.acubeapi.com';
/**
 * Role permission levels (ascending order)
 */
var RoleLevel;
(function (RoleLevel) {
    RoleLevel[RoleLevel["SUPPLIER"] = 1] = "SUPPLIER";
    RoleLevel[RoleLevel["CACHIER"] = 2] = "CACHIER";
    RoleLevel[RoleLevel["MERCHANT"] = 3] = "MERCHANT";
})(RoleLevel || (RoleLevel = {}));
/**
 * Map roles to their permission levels
 */
({
    ROLE_SUPPLIER: RoleLevel.SUPPLIER,
    ROLE_CACHIER: RoleLevel.CACHIER,
    ROLE_MERCHANT: RoleLevel.MERCHANT,
});
/**
 * Parse roles from the legacy format to the new structured format
 * @param legacyRoles - Roles in Record<string, string[]> format
 * @returns Roles in UserRoles format
 */
function parseLegacyRoles(legacyRoles) {
    const userRoles = {};
    // Only process the default context
    if (DEFAULT_CONTEXT in legacyRoles) {
        userRoles[DEFAULT_CONTEXT] = legacyRoles[DEFAULT_CONTEXT].filter((role) => Object.keys(ROLE_HIERARCHY).includes(role));
    }
    return userRoles;
}

/**
 * JWT Authentication Manager
 */
class AuthManager {
    constructor(config, secureStorage, events = {}) {
        this.config = config;
        this.secureStorage = secureStorage;
        this.events = events;
        this.currentUser = null;
        this.httpClient = this.createHttpClient();
        this.setupInterceptors();
    }
    createHttpClient() {
        return axios.create({
            baseURL: this.config.getAuthUrl(),
            timeout: this.config.getTimeout(),
            headers: {
                'Content-Type': 'application/json',
                ...this.config.getCustomHeaders(),
            },
        });
    }
    setupInterceptors() {
        // Request interceptor to add auth header
        this.httpClient.interceptors.request.use(async (config) => {
            const tokenData = await this.getStoredTokens();
            if (tokenData?.accessToken) {
                config.headers.Authorization = `Bearer ${tokenData.accessToken}`;
            }
            return config;
        }, (error) => Promise.reject(error));
        // Response interceptor for 401 errors
        this.httpClient.interceptors.response.use((response) => response, async (error) => {
            if (error.response?.status === 401) {
                // Token expired, clear tokens and notify
                await this.clearTokens();
                const authError = new ACubeSDKError('AUTH_ERROR', 'Session expired');
                this.events.onAuthError?.(authError);
            }
            throw this.transformError(error);
        });
    }
    /**
     * Login with email and password
     */
    async login(credentials) {
        try {
            const response = await this.httpClient.post('/login', {
                email: credentials.email,
                password: credentials.password,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            // Parse JWT token to extract expiration
            const jwtPayload = this.parseJWTToken(response.data.token);
            const tokenData = {
                accessToken: response.data.token,
                expiresAt: jwtPayload.exp * 1000, // Convert to milliseconds
            };
            await this.storeTokens(tokenData);
            // Create user from JWT payload
            const user = {
                id: jwtPayload.uid.toString(),
                email: jwtPayload.username,
                username: jwtPayload.username,
                roles: parseLegacyRoles(jwtPayload.roles),
                fid: jwtPayload.fid,
                pid: jwtPayload.pid,
            };
            this.currentUser = user;
            // Store user for future use
            await this.secureStorage.set(AuthManager.USER_KEY, JSON.stringify(user));
            this.events.onUserChanged?.(user);
            return user;
        }
        catch (error) {
            throw this.transformError(error);
        }
    }
    /**
     * Parse JWT token to extract payload
     */
    parseJWTToken(token) {
        try {
            // JWT tokens have three parts separated by dots: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }
            // Decode the payload (second part)
            const payload = parts[1];
            if (!payload) {
                throw new Error('JWT token missing payload');
            }
            // Add padding if needed for base64 decoding
            const paddedPayload = payload + '==='.slice(0, (4 - (payload.length % 4)) % 4);
            // Decode from base64
            const decodedPayload = atob(paddedPayload);
            // Parse JSON
            return JSON.parse(decodedPayload);
        }
        catch (error) {
            throw new ACubeSDKError('AUTH_ERROR', 'Failed to parse JWT token', error);
        }
    }
    /**
     * Logout and clear tokens
     */
    async logout() {
        await this.clearTokens();
        this.currentUser = null;
        this.events.onUserChanged?.(null);
    }
    /**
     * Get current user information
     */
    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        // Try to get from storage first
        try {
            const userJson = await this.secureStorage.get(AuthManager.USER_KEY);
            if (userJson) {
                this.currentUser = JSON.parse(userJson);
                return this.currentUser;
            }
        }
        catch {
            // Ignore storage errors
        }
        // If no user in storage and no current user, check if we have a valid token
        const tokenData = await this.getStoredTokens();
        if (tokenData && !this.isTokenExpired(tokenData)) {
            // Parse user info from JWT token
            const jwtPayload = this.parseJWTToken(tokenData.accessToken);
            const user = {
                id: jwtPayload.uid.toString(),
                email: jwtPayload.username,
                username: jwtPayload.username,
                roles: parseLegacyRoles(jwtPayload.roles),
                fid: jwtPayload.fid,
                pid: jwtPayload.pid,
            };
            this.currentUser = user;
            // Store for future use
            await this.secureStorage.set(AuthManager.USER_KEY, JSON.stringify(user));
            return user;
        }
        throw new ACubeSDKError('AUTH_ERROR', 'No valid authentication found');
    }
    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        const tokenData = await this.getStoredTokens();
        return tokenData !== null && !this.isTokenExpired(tokenData);
    }
    /**
     * Get access token for API calls
     */
    async getAccessToken() {
        const tokenData = await this.getStoredTokens();
        if (!tokenData) {
            return null;
        }
        if (this.isTokenExpired(tokenData)) {
            // Token expired, clear it
            await this.clearTokens();
            return null;
        }
        return tokenData.accessToken;
    }
    /**
     * Store tokens securely
     */
    async storeTokens(tokenData) {
        await this.secureStorage.set(AuthManager.TOKEN_KEY, JSON.stringify(tokenData));
    }
    /**
     * Get stored tokens
     */
    async getStoredTokens() {
        try {
            const tokenJson = await this.secureStorage.get(AuthManager.TOKEN_KEY);
            return tokenJson ? JSON.parse(tokenJson) : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Clear stored tokens
     */
    async clearTokens() {
        await Promise.all([
            this.secureStorage.remove(AuthManager.TOKEN_KEY),
            this.secureStorage.remove(AuthManager.USER_KEY),
        ]);
    }
    /**
     * Check if token is expired
     */
    isTokenExpired(tokenData) {
        // Add 5 minute buffer
        return Date.now() >= (tokenData.expiresAt - 300000);
    }
    /**
     * Transform API errors to SDK errors
     */
    transformError(error) {
        if (error instanceof ACubeSDKError) {
            return error;
        }
        if (axios.isAxiosError(error)) {
            const response = error.response;
            if (!response) {
                return new ACubeSDKError('NETWORK_ERROR', 'Network error occurred', error);
            }
            switch (response.status) {
                case 401:
                    return new ACubeSDKError('AUTH_ERROR', 'Authentication failed', error, 401);
                case 403:
                    return new ACubeSDKError('FORBIDDEN_ERROR', 'Access forbidden', error, 403);
                case 404:
                    return new ACubeSDKError('NOT_FOUND_ERROR', 'Resource not found', error, 404);
                case 422:
                    return new ACubeSDKError('VALIDATION_ERROR', 'Validation error', error, 422);
                default:
                    return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error, response.status);
            }
        }
        return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error);
    }
}
AuthManager.TOKEN_KEY = 'acube_tokens';
AuthManager.USER_KEY = 'acube_user';

/**
 * Platform detection utilities
 */
/**
 * Detect the current platform
 */
function detectPlatform() {
    // Check for React Native
    if (typeof global !== 'undefined' &&
        global.__DEV__ !== undefined &&
        typeof global.navigator !== 'undefined' &&
        global.navigator.product === 'ReactNative') {
        return {
            platform: 'react-native',
            isReactNative: true,
            isWeb: false,
            isNode: false,
            isExpo: checkExpo(),
        };
    }
    // Check for Web/Browser
    if (typeof window !== 'undefined' &&
        typeof window.document !== 'undefined' &&
        typeof window.navigator !== 'undefined') {
        return {
            platform: 'web',
            isReactNative: false,
            isWeb: true,
            isNode: false,
            isExpo: false,
        };
    }
    // Check for Node.js
    if (typeof process !== 'undefined' &&
        process.versions &&
        process.versions.node) {
        return {
            platform: 'node',
            isReactNative: false,
            isWeb: false,
            isNode: true,
            isExpo: false,
        };
    }
    // Unknown platform
    return {
        platform: 'unknown',
        isReactNative: false,
        isWeb: false,
        isNode: false,
        isExpo: false,
    };
}
/**
 * Check if running in Expo
 */
function checkExpo() {
    try {
        return typeof global !== 'undefined' &&
            (typeof global.Expo !== 'undefined' || typeof global.expo !== 'undefined');
    }
    catch {
        return false;
    }
}

/**
 * Dynamically load platform-specific adapters
 */
async function loadPlatformAdapters() {
    const { platform } = detectPlatform();
    console.log({ platform });
    switch (platform) {
        case 'web':
            return loadWebAdapters();
        case 'react-native':
            return loadReactNativeAdapters();
        case 'node':
            return loadNodeAdapters();
        default:
            // Fallback to memory adapters
            return loadMemoryAdapters();
    }
}
async function loadWebAdapters() {
    const [storage, network] = await Promise.all([
        Promise.resolve().then(function () { return storage$2; }),
        Promise.resolve().then(function () { return network$2; }),
    ]);
    return {
        storage: new storage.WebStorageAdapter(),
        secureStorage: new storage.WebSecureStorageAdapter(),
        networkMonitor: new network.WebNetworkMonitor(),
    };
}
async function loadReactNativeAdapters() {
    const [storage, network] = await Promise.all([
        Promise.resolve().then(function () { return storage$1; }),
        Promise.resolve().then(function () { return network$1; }),
    ]);
    return {
        storage: new storage.ReactNativeStorageAdapter(),
        secureStorage: new storage.ReactNativeSecureStorageAdapter(),
        networkMonitor: new network.ReactNativeNetworkMonitor(),
    };
}
async function loadNodeAdapters() {
    const [storage$1, network$1] = await Promise.all([
        Promise.resolve().then(function () { return storage; }),
        Promise.resolve().then(function () { return network; }),
    ]);
    return {
        storage: new storage$1.NodeStorageAdapter(),
        secureStorage: new storage$1.NodeSecureStorageAdapter(),
        networkMonitor: new network$1.NodeNetworkMonitor(),
    };
}
async function loadMemoryAdapters() {
    const storage$1 = await Promise.resolve().then(function () { return storage; });
    const network$1 = await Promise.resolve().then(function () { return network; });
    // Use memory adapters as fallback
    return {
        storage: new storage$1.NodeStorageAdapter(),
        secureStorage: new storage$1.NodeSecureStorageAdapter(),
        networkMonitor: new network$1.NodeNetworkMonitor(),
    };
}

/**
 * HTTP client for API requests
 */
class HttpClient {
    constructor(config) {
        this.config = config;
        this.client = this.createClient();
    }
    createClient() {
        const client = axios.create({
            baseURL: this.config.getApiUrl(),
            timeout: this.config.getTimeout(),
            headers: {
                'Content-Type': 'application/json',
                ...this.config.getCustomHeaders(),
            },
        });
        // Add request interceptor for debugging
        if (this.config.isDebugEnabled()) {
            client.interceptors.request.use((config) => {
                console.log('API Request:', {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    baseURL: config.baseURL,
                    headers: config.headers,
                    data: config.data,
                });
                return config;
            }, (error) => {
                console.error('API Request Error:', error);
                return Promise.reject(error);
            });
            client.interceptors.response.use((response) => {
                console.log('API Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                });
                return response;
            }, (error) => {
                console.error('API Response Error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message,
                });
                return Promise.reject(error);
            });
        }
        return client;
    }
    /**
     * Set authorization header
     */
    setAuthorizationHeader(token) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    /**
     * Remove authorization header
     */
    removeAuthorizationHeader() {
        delete this.client.defaults.headers.common['Authorization'];
    }
    /**
     * GET request
     */
    async get(url, config) {
        try {
            const response = await this.client.get(url, config);
            return response.data;
        }
        catch (error) {
            throw this.transformError(error);
        }
    }
    /**
     * POST request
     */
    async post(url, data, config) {
        try {
            const response = await this.client.post(url, data, config);
            return response.data;
        }
        catch (error) {
            throw this.transformError(error);
        }
    }
    /**
     * PUT request
     */
    async put(url, data, config) {
        try {
            const response = await this.client.put(url, data, config);
            return response.data;
        }
        catch (error) {
            throw this.transformError(error);
        }
    }
    /**
     * DELETE request
     */
    async delete(url, config) {
        try {
            const response = await this.client.delete(url, config);
            return response.data;
        }
        catch (error) {
            throw this.transformError(error);
        }
    }
    /**
     * PATCH request
     */
    async patch(url, data, config) {
        try {
            const response = await this.client.patch(url, data, config);
            return response.data;
        }
        catch (error) {
            throw this.transformError(error);
        }
    }
    /**
     * Download file (binary response)
     */
    async download(url, config) {
        try {
            const response = await this.client.get(url, {
                ...config,
                responseType: 'blob',
            });
            return response.data;
        }
        catch (error) {
            throw this.transformError(error);
        }
    }
    /**
     * Transform axios errors to SDK errors
     */
    transformError(error) {
        if (axios.isAxiosError(error)) {
            const response = error.response;
            if (!response) {
                return new ACubeSDKError('NETWORK_ERROR', 'Network error occurred', error);
            }
            const status = response.status;
            const data = response.data;
            // Try to extract error message from response
            let message = 'Unknown error occurred';
            if (data?.detail) {
                message = data.detail;
            }
            else if (data?.title) {
                message = data.title;
            }
            else if (error.message) {
                message = error.message;
            }
            switch (status) {
                case 400:
                    return new ACubeSDKError('VALIDATION_ERROR', message, error, status);
                case 401:
                    return new ACubeSDKError('AUTH_ERROR', message, error, status);
                case 403:
                    return new ACubeSDKError('FORBIDDEN_ERROR', message, error, status);
                case 404:
                    return new ACubeSDKError('NOT_FOUND_ERROR', message, error, status);
                case 422:
                    return new ACubeSDKError('VALIDATION_ERROR', message, error, status);
                default:
                    return new ACubeSDKError('UNKNOWN_ERROR', message, error, status);
            }
        }
        return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error);
    }
    /**
     * Get the underlying axios instance for advanced use cases
     */
    getAxiosInstance() {
        return this.client;
    }
}

/**
 * Receipts API manager
 */
class ReceiptsAPI {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Create a new electronic receipt
     */
    async create(receiptData) {
        return this.httpClient.post('/mf1/receipts', receiptData);
    }
    /**
     * Get a list of electronic receipts
     */
    async list(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.page) {
            searchParams.append('page', params.page.toString());
        }
        if (params.size) {
            searchParams.append('size', params.size.toString());
        }
        const query = searchParams.toString();
        const url = query ? `/mf1/receipts?${query}` : '/mf1/receipts';
        return this.httpClient.get(url);
    }
    /**
     * Get an electronic receipt by UUID
     */
    async get(receiptUuid) {
        return this.httpClient.get(`/mf1/receipts/${receiptUuid}`);
    }
    /**
     * Get receipt details (JSON or PDF)
     */
    async getDetails(receiptUuid, format = 'json') {
        const headers = {};
        if (format === 'pdf') {
            headers['Accept'] = 'application/pdf';
            return this.httpClient.download(`/mf1/receipts/${receiptUuid}/details`, { headers });
        }
        else {
            headers['Accept'] = 'application/json';
            return this.httpClient.get(`/mf1/receipts/${receiptUuid}/details`, { headers });
        }
    }
    /**
     * Void an electronic receipt
     */
    async void(voidData) {
        await this.httpClient.delete('/mf1/receipts', {
            data: voidData,
        });
    }
    /**
     * Void an electronic receipt identified by proof of purchase
     */
    async voidWithProof(voidData) {
        await this.httpClient.delete('/mf1/receipts/void-with-proof', {
            data: voidData,
        });
    }
    /**
     * Return items from an electronic receipt
     */
    async return(returnData) {
        return this.httpClient.post('/mf1/receipts/return', returnData);
    }
    /**
     * Return items from an electronic receipt identified by proof of purchase
     */
    async returnWithProof(returnData) {
        return this.httpClient.post('/mf1/receipts/return-with-proof', returnData);
    }
}

/**
 * Cashiers API manager
 */
class CashiersAPI {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Read cashiers with pagination
     */
    async list(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.page) {
            searchParams.append('page', params.page.toString());
        }
        if (params.size) {
            searchParams.append('size', params.size.toString());
        }
        const query = searchParams.toString();
        const url = query ? `/mf1/cashiers?${query}` : '/mf1/cashiers';
        return this.httpClient.get(url);
    }
    /**
     * Create a new cashier
     */
    async create(cashierData) {
        return this.httpClient.post('/mf1/cashiers', cashierData);
    }
    /**
     * Read currently authenticated cashier's information
     */
    async me() {
        return this.httpClient.get('/mf1/cashiers/me');
    }
    /**
     * Get a specific cashier by ID
     */
    async get(cashierId) {
        return this.httpClient.get(`/mf1/cashiers/${cashierId}`);
    }
    /**
     * Delete a cashier
     */
    async delete(cashierId) {
        await this.httpClient.delete(`/mf1/cashiers/${cashierId}`);
    }
}

/**
 * Point of Sales API manager
 */
class PointOfSalesAPI {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Retrieve Point of Sales (PEMs)
     */
    async list(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.status) {
            searchParams.append('status', params.status);
        }
        if (params.page) {
            searchParams.append('page', params.page.toString());
        }
        if (params.size) {
            searchParams.append('size', params.size.toString());
        }
        const query = searchParams.toString();
        const url = query ? `/mf1/point-of-sales?${query}` : '/mf1/point-of-sales';
        return this.httpClient.get(url);
    }
    /**
     * Get a specific Point of Sale by serial number
     */
    async get(serialNumber) {
        return this.httpClient.get(`/mf1/point-of-sales/${serialNumber}`);
    }
    /**
     * Close journal
     */
    async closeJournal() {
        return this.httpClient.post('/mf1/point-of-sales/close');
    }
    /**
     * Trigger the activation process of a Point of Sale
     */
    async activate(serialNumber, activationData) {
        return this.httpClient.post(`/mf1/point-of-sales/${serialNumber}/activation`, activationData);
    }
    /**
     * Create a new inactivity period
     */
    async createInactivityPeriod(serialNumber) {
        return this.httpClient.post(`/mf1/point-of-sales/${serialNumber}/inactivity`);
    }
    /**
     * Change the state of the Point of Sale to 'offline'
     */
    async setOffline(serialNumber, offlineData) {
        return this.httpClient.post(`/mf1/point-of-sales/${serialNumber}/status/offline`, offlineData);
    }
}

/**
 * Cash Registers API manager
 */
class CashRegistersAPI {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Create a new cash register (point of sale)
     */
    async create(cashRegisterData) {
        return this.httpClient.post('/mf1/cash-register', cashRegisterData);
    }
    /**
     * Get all cash registers for the current merchant
     */
    async list(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.page) {
            searchParams.append('page', params.page.toString());
        }
        if (params.size) {
            searchParams.append('size', params.size.toString());
        }
        const query = searchParams.toString();
        const url = query ? `/mf1/cash-register?${query}` : '/mf1/cash-register';
        return this.httpClient.get(url);
    }
    /**
     * Get a cash register by ID
     */
    async get(id) {
        return this.httpClient.get(`/mf1/cash-register/${id}`);
    }
}

/**
 * Merchants API manager (MF2)
 */
class MerchantsAPI {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Retrieve the collection of Merchant resources
     */
    async list(params) {
        const searchParams = new URLSearchParams();
        if (params.page) {
            searchParams.append('page', params.page.toString());
        }
        const query = searchParams.toString();
        const url = query ? `/mf2/merchants?${query}` : '/mf2/merchants';
        return this.httpClient.get(url);
    }
    /**
     * Create a Merchant resource
     */
    async create(merchantData) {
        return this.httpClient.post('/mf2/merchants', merchantData);
    }
    /**
     * Retrieve a Merchant resource by UUID
     */
    async get(uuid) {
        return this.httpClient.get(`/mf2/merchants/${uuid}`);
    }
    /**
     * Replace the Merchant resource
     */
    async update(uuid, merchantData) {
        return this.httpClient.put(`/mf2/merchants/${uuid}`, merchantData);
    }
}

/**
 * PEMs API manager (MF2)
 */
class PemsAPI {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Create a new PEM
     */
    async create(pemData) {
        return this.httpClient.post('/mf2/point-of-sales', pemData);
    }
    /**
     * Get mTLS and signing certificates for a PEM
     */
    async getCertificates(id) {
        return this.httpClient.get(`/mf2/point-of-sales/${id}/certificates`);
    }
}

/**
 * Main API client that combines all resource managers
 */
class APIClient {
    constructor(config) {
        this.httpClient = new HttpClient(config);
        // Initialize resource managers
        this.receipts = new ReceiptsAPI(this.httpClient);
        this.cashiers = new CashiersAPI(this.httpClient);
        this.pointOfSales = new PointOfSalesAPI(this.httpClient);
        this.cashRegisters = new CashRegistersAPI(this.httpClient);
        this.merchants = new MerchantsAPI(this.httpClient);
        this.pems = new PemsAPI(this.httpClient);
    }
    /**
     * Set authorization header for all requests
     */
    setAuthorizationHeader(token) {
        this.httpClient.setAuthorizationHeader(token);
    }
    /**
     * Remove authorization header
     */
    removeAuthorizationHeader() {
        this.httpClient.removeAuthorizationHeader();
    }
    /**
     * Get the underlying HTTP client for advanced use cases
     */
    getHttpClient() {
        return this.httpClient;
    }
}

/**
 * Default queue configuration
 */
const DEFAULT_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    maxRetryDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    maxQueueSize: 1000,
    batchSize: 10,
    syncInterval: 0, // Disabled by default
};
/**
 * Operation queue manager for offline functionality
 */
class OperationQueue {
    constructor(storage, config = DEFAULT_CONFIG, events = {}) {
        this.storage = storage;
        this.config = config;
        this.events = events;
        this.queue = [];
        this.isProcessing = false;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.loadQueue();
        if (this.config.syncInterval > 0) {
            this.startAutoSync();
        }
    }
    /**
     * Add an operation to the queue
     */
    async addOperation(type, resource, endpoint, method, data, priority = 1) {
        // Check queue size limit
        if (this.queue.length >= this.config.maxQueueSize) {
            // Remove oldest low-priority operation
            const lowPriorityIndex = this.queue.findIndex(op => op.priority === 1);
            if (lowPriorityIndex !== -1) {
                this.queue.splice(lowPriorityIndex, 1);
            }
            else {
                throw new Error('Queue is full and cannot add new operations');
            }
        }
        const operation = {
            id: this.generateId(),
            type,
            resource,
            endpoint,
            method,
            data,
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            retryCount: 0,
            maxRetries: this.config.maxRetries,
            priority,
        };
        // Insert operation based on priority (higher priority first)
        const insertIndex = this.queue.findIndex(op => op.priority < priority);
        if (insertIndex === -1) {
            this.queue.push(operation);
        }
        else {
            this.queue.splice(insertIndex, 0, operation);
        }
        await this.saveQueue();
        this.events.onOperationAdded?.(operation);
        return operation.id;
    }
    /**
     * Get all pending operations
     */
    getPendingOperations() {
        return this.queue.filter(op => op.status === 'pending' || op.status === 'failed');
    }
    /**
     * Get operation by ID
     */
    getOperation(id) {
        return this.queue.find(op => op.id === id);
    }
    /**
     * Remove operation from queue
     */
    async removeOperation(id) {
        const index = this.queue.findIndex(op => op.id === id);
        if (index === -1) {
            return false;
        }
        this.queue.splice(index, 1);
        await this.saveQueue();
        return true;
    }
    /**
     * Update operation status
     */
    async updateOperation(id, updates) {
        const operation = this.queue.find(op => op.id === id);
        if (!operation) {
            return false;
        }
        Object.assign(operation, {
            ...updates,
            updatedAt: Date.now(),
        });
        await this.saveQueue();
        return true;
    }
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            total: this.queue.length,
            pending: this.queue.filter(op => op.status === 'pending').length,
            processing: this.queue.filter(op => op.status === 'processing').length,
            completed: this.queue.filter(op => op.status === 'completed').length,
            failed: this.queue.filter(op => op.status === 'failed').length,
        };
    }
    /**
     * Clear all operations from queue
     */
    async clearQueue() {
        this.queue = [];
        await this.saveQueue();
    }
    /**
     * Clear completed operations
     */
    async clearCompleted() {
        this.queue = this.queue.filter(op => op.status !== 'completed');
        await this.saveQueue();
    }
    /**
     * Clear failed operations
     */
    async clearFailed() {
        this.queue = this.queue.filter(op => op.status !== 'failed');
        await this.saveQueue();
    }
    /**
     * Retry failed operations
     */
    async retryFailed() {
        const failedOperations = this.queue.filter(op => op.status === 'failed');
        for (const operation of failedOperations) {
            if (operation.retryCount < operation.maxRetries) {
                operation.status = 'pending';
                operation.retryCount++;
                operation.updatedAt = Date.now();
                delete operation.error;
            }
        }
        await this.saveQueue();
    }
    /**
     * Get operations for batch processing
     */
    getNextBatch() {
        return this.queue
            .filter(op => op.status === 'pending')
            .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)
            .slice(0, this.config.batchSize);
    }
    /**
     * Check if queue is empty (no pending operations)
     */
    isEmpty() {
        return this.getPendingOperations().length === 0;
    }
    /**
     * Start auto-sync timer
     */
    startAutoSync() {
        if (this.syncIntervalId) {
            return;
        }
        this.syncIntervalId = setInterval(() => {
            if (!this.isEmpty() && !this.isProcessing) {
                // Trigger sync through event
                this.events.onQueueEmpty?.();
            }
        }, this.config.syncInterval);
    }
    /**
     * Stop auto-sync timer
     */
    stopAutoSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = undefined;
        }
    }
    /**
     * Set processing state
     */
    setProcessing(processing) {
        this.isProcessing = processing;
    }
    /**
     * Check if currently processing
     */
    isCurrentlyProcessing() {
        return this.isProcessing;
    }
    /**
     * Load queue from storage
     */
    async loadQueue() {
        try {
            const queueData = await this.storage.get(OperationQueue.QUEUE_KEY);
            if (queueData) {
                this.queue = JSON.parse(queueData);
                // Reset processing status on load (in case app crashed while processing)
                this.queue.forEach(op => {
                    if (op.status === 'processing') {
                        op.status = 'pending';
                    }
                });
            }
        }
        catch (error) {
            console.error('Failed to load queue from storage:', error);
            this.queue = [];
        }
    }
    /**
     * Save queue to storage
     */
    async saveQueue() {
        try {
            await this.storage.set(OperationQueue.QUEUE_KEY, JSON.stringify(this.queue));
        }
        catch (error) {
            console.error('Failed to save queue to storage:', error);
            this.events.onError?.(new Error(`Failed to save queue: ${error}`));
        }
    }
    /**
     * Generate unique ID for operations
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoSync();
    }
}
OperationQueue.QUEUE_KEY = 'acube_operation_queue';

/**
 * Sync manager for handling offline operations
 */
class SyncManager {
    constructor(queue, httpClient, networkMonitor, config, events = {}) {
        this.queue = queue;
        this.httpClient = httpClient;
        this.networkMonitor = networkMonitor;
        this.config = config;
        this.events = events;
        this.isOnline = true;
        this.isOnline = networkMonitor.isOnline();
        this.setupNetworkMonitoring();
    }
    /**
     * Setup network monitoring and auto-sync
     */
    setupNetworkMonitoring() {
        this.networkUnsubscribe = this.networkMonitor.onStatusChange((online) => {
            const wasOffline = !this.isOnline;
            this.isOnline = online;
            if (online && wasOffline) {
                // Back online - sync pending operations
                this.syncPendingOperations();
            }
        });
    }
    /**
     * Sync all pending operations
     */
    async syncPendingOperations() {
        if (!this.isOnline) {
            throw new Error('Cannot sync while offline');
        }
        if (this.queue.isCurrentlyProcessing()) {
            throw new Error('Sync already in progress');
        }
        this.queue.setProcessing(true);
        try {
            const results = [];
            let successCount = 0;
            let failureCount = 0;
            while (!this.queue.isEmpty()) {
                const batch = this.queue.getNextBatch();
                if (batch.length === 0)
                    break;
                // Process batch in parallel
                const batchPromises = batch.map(operation => this.processOperation(operation));
                const batchResults = await Promise.allSettled(batchPromises);
                batchResults.forEach((result, index) => {
                    const operation = batch[index];
                    if (!operation)
                        return;
                    if (result.status === 'fulfilled') {
                        const syncResult = result.value;
                        results.push(syncResult);
                        if (syncResult.success) {
                            successCount++;
                            this.events.onOperationCompleted?.(syncResult);
                        }
                        else {
                            failureCount++;
                            this.events.onOperationFailed?.(syncResult);
                        }
                    }
                    else {
                        // Promise rejected
                        const syncResult = {
                            operation,
                            success: false,
                            error: result.reason?.message || 'Unknown error',
                        };
                        results.push(syncResult);
                        failureCount++;
                        this.events.onOperationFailed?.(syncResult);
                        // Update operation status
                        this.queue.updateOperation(operation.id, {
                            status: 'failed',
                            error: syncResult.error,
                        });
                    }
                });
                // Add delay between batches to avoid overwhelming the server
                if (!this.queue.isEmpty()) {
                    await this.delay(500);
                }
            }
            const batchResult = {
                totalOperations: results.length,
                successCount,
                failureCount,
                results,
            };
            this.events.onBatchSyncCompleted?.(batchResult);
            if (this.queue.isEmpty()) {
                this.events.onQueueEmpty?.();
            }
            return batchResult;
        }
        finally {
            this.queue.setProcessing(false);
        }
    }
    /**
     * Process a single operation
     */
    async processOperation(operation) {
        // Update operation status to processing
        await this.queue.updateOperation(operation.id, {
            status: 'processing',
        });
        try {
            const response = await this.executeOperation(operation);
            // Operation successful
            await this.queue.updateOperation(operation.id, {
                status: 'completed',
            });
            return {
                operation,
                success: true,
                response,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Check if we should retry
            if (operation.retryCount < operation.maxRetries && this.isRetryableError(error)) {
                // Schedule retry with exponential backoff
                const delay = this.calculateRetryDelay(operation.retryCount);
                await this.queue.updateOperation(operation.id, {
                    status: 'pending',
                    retryCount: operation.retryCount + 1,
                    error: errorMessage,
                });
                // Schedule retry
                setTimeout(() => {
                    if (this.isOnline && !this.queue.isCurrentlyProcessing()) {
                        this.syncPendingOperations();
                    }
                }, delay);
                return {
                    operation,
                    success: false,
                    error: `Retrying: ${errorMessage}`,
                };
            }
            else {
                // Max retries exceeded or non-retryable error
                await this.queue.updateOperation(operation.id, {
                    status: 'failed',
                    error: errorMessage,
                });
                return {
                    operation,
                    success: false,
                    error: errorMessage,
                };
            }
        }
    }
    /**
     * Execute the actual HTTP operation
     */
    async executeOperation(operation) {
        const { method, endpoint, data, headers } = operation;
        const config = headers ? { headers } : undefined;
        switch (method) {
            case 'GET':
                return await this.httpClient.get(endpoint, config);
            case 'POST':
                return await this.httpClient.post(endpoint, data, config);
            case 'PUT':
                return await this.httpClient.put(endpoint, data, config);
            case 'PATCH':
                return await this.httpClient.patch(endpoint, data, config);
            case 'DELETE':
                return await this.httpClient.delete(endpoint, config);
            default:
                throw new Error(`Unsupported HTTP method: ${method}`);
        }
    }
    /**
     * Check if an error is retryable
     */
    isRetryableError(error) {
        // Network errors are retryable
        if (error.code === 'NETWORK_ERROR') {
            return true;
        }
        // Server errors (5xx) are retryable
        if (error.statusCode && error.statusCode >= 500) {
            return true;
        }
        // Rate limiting is retryable
        if (error.statusCode === 429) {
            return true;
        }
        // Timeout errors are retryable
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return true;
        }
        return false;
    }
    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(retryCount) {
        const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, retryCount);
        return Math.min(delay, this.config.maxRetryDelay);
    }
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Check if currently online
     */
    isCurrentlyOnline() {
        return this.isOnline;
    }
    /**
     * Manually trigger sync (if online)
     */
    async triggerSync() {
        if (!this.isOnline) {
            return null;
        }
        if (this.queue.isEmpty()) {
            return {
                totalOperations: 0,
                successCount: 0,
                failureCount: 0,
                results: [],
            };
        }
        return await this.syncPendingOperations();
    }
    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            isProcessing: this.queue.isCurrentlyProcessing(),
            queueStats: this.queue.getStats(),
        };
    }
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.networkUnsubscribe) {
            this.networkUnsubscribe();
        }
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
    }
}

/**
 * Offline manager that combines queue and sync functionality
 */
class OfflineManager {
    constructor(storage, httpClient, networkMonitor, config = {}, events = {}) {
        // Create default config
        const defaultConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            maxRetryDelay: 30000,
            backoffMultiplier: 2,
            maxQueueSize: 1000,
            batchSize: 10,
            syncInterval: 30000, // 30 seconds
        };
        const finalConfig = { ...defaultConfig, ...config };
        // Initialize queue and sync manager
        this.queue = new OperationQueue(storage, finalConfig, events);
        this.syncManager = new SyncManager(this.queue, httpClient, networkMonitor, finalConfig, events);
    }
    /**
     * Queue an operation for offline execution
     */
    async queueOperation(type, resource, endpoint, method, data, priority = 1) {
        return await this.queue.addOperation(type, resource, endpoint, method, data, priority);
    }
    /**
     * Queue a receipt creation
     */
    async queueReceiptCreation(receiptData, priority = 2) {
        return await this.queueOperation('CREATE', 'receipt', '/mf1/receipts', 'POST', receiptData, priority);
    }
    /**
     * Queue a receipt void operation
     */
    async queueReceiptVoid(voidData, priority = 3) {
        return await this.queueOperation('DELETE', 'receipt', '/mf1/receipts', 'DELETE', voidData, priority);
    }
    /**
     * Queue a receipt return operation
     */
    async queueReceiptReturn(returnData, priority = 3) {
        return await this.queueOperation('CREATE', 'receipt', '/mf1/receipts/return', 'POST', returnData, priority);
    }
    /**
     * Queue a cashier creation
     */
    async queueCashierCreation(cashierData, priority = 1) {
        return await this.queueOperation('CREATE', 'cashier', '/mf1/cashiers', 'POST', cashierData, priority);
    }
    /**
     * Check if currently online
     */
    isOnline() {
        return this.syncManager.isCurrentlyOnline();
    }
    /**
     * Get sync status and queue statistics
     */
    getStatus() {
        return this.syncManager.getSyncStatus();
    }
    /**
     * Get pending operations count
     */
    getPendingCount() {
        return this.queue.getPendingOperations().length;
    }
    /**
     * Check if queue is empty
     */
    isEmpty() {
        return this.queue.isEmpty();
    }
    /**
     * Manually trigger sync (if online)
     */
    async sync() {
        return await this.syncManager.triggerSync();
    }
    /**
     * Retry failed operations
     */
    async retryFailed() {
        await this.queue.retryFailed();
        // Trigger sync if online
        if (this.isOnline()) {
            await this.sync();
        }
    }
    /**
     * Clear completed operations
     */
    async clearCompleted() {
        await this.queue.clearCompleted();
    }
    /**
     * Clear failed operations
     */
    async clearFailed() {
        await this.queue.clearFailed();
    }
    /**
     * Clear all operations
     */
    async clearAll() {
        await this.queue.clearQueue();
    }
    /**
     * Get operation by ID
     */
    getOperation(id) {
        return this.queue.getOperation(id);
    }
    /**
     * Remove specific operation
     */
    async removeOperation(id) {
        return await this.queue.removeOperation(id);
    }
    /**
     * Get queue statistics
     */
    getQueueStats() {
        return this.queue.getStats();
    }
    /**
     * Start auto-sync (if not already started)
     */
    startAutoSync() {
        this.queue.startAutoSync();
    }
    /**
     * Stop auto-sync
     */
    stopAutoSync() {
        this.queue.stopAutoSync();
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.queue.destroy();
        this.syncManager.destroy();
    }
}

/**
 * Main ACube SDK class
 */
class ACubeSDK {
    constructor(config, customAdapters, events = {}) {
        this.events = events;
        this.isInitialized = false;
        this.config = new ConfigManager(config);
        if (customAdapters) {
            this.adapters = customAdapters;
        }
    }
    /**
     * Initialize the SDK
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Load platform adapters if not provided
            if (!this.adapters) {
                this.adapters = await loadPlatformAdapters();
            }
            // Initialize API client
            this.api = new APIClient(this.config);
            // Initialize auth manager
            this.authManager = new AuthManager(this.config, this.adapters.secureStorage, {
                onUserChanged: this.events.onUserChanged,
                onAuthError: this.events.onAuthError,
            });
            // Initialize offline manager
            const queueEvents = {
                onOperationAdded: (operation) => {
                    this.events.onOfflineOperationAdded?.(operation.id);
                },
                onOperationCompleted: (result) => {
                    this.events.onOfflineOperationCompleted?.(result.operation.id, result.success);
                },
                onOperationFailed: (result) => {
                    this.events.onOfflineOperationCompleted?.(result.operation.id, false);
                },
            };
            this.offlineManager = new OfflineManager(this.adapters.storage, this.api.getHttpClient(), this.adapters.networkMonitor, {
                syncInterval: 30000, // 30 seconds
            }, queueEvents);
            // Set up network monitoring
            this.adapters.networkMonitor.onStatusChange((online) => {
                this.events.onNetworkStatusChanged?.(online);
                if (online && this.offlineManager) {
                    // Auto-sync when back online
                    this.offlineManager.sync().catch(console.error);
                }
            });
            // Check if user is already authenticated
            if (await this.authManager.isAuthenticated()) {
                const token = await this.authManager.getAccessToken();
                if (token) {
                    this.api.setAuthorizationHeader(token);
                }
            }
            this.isInitialized = true;
        }
        catch (error) {
            throw new ACubeSDKError('UNKNOWN_ERROR', `Failed to initialize SDK: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        }
    }
    /**
     * Login with email and password
     */
    async login(credentials) {
        this.ensureInitialized();
        const user = await this.authManager.login(credentials);
        // Set auth header for API calls
        const token = await this.authManager.getAccessToken();
        if (token) {
            this.api.setAuthorizationHeader(token);
        }
        return user;
    }
    /**
     * Logout current user
     */
    async logout() {
        this.ensureInitialized();
        await this.authManager.logout();
        this.api.removeAuthorizationHeader();
    }
    /**
     * Get current user
     */
    async getCurrentUser() {
        this.ensureInitialized();
        try {
            return await this.authManager.getCurrentUser();
        }
        catch {
            return null;
        }
    }
    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        this.ensureInitialized();
        return await this.authManager.isAuthenticated();
    }
    /**
     * Get offline manager for manual queue operations
     */
    getOfflineManager() {
        this.ensureInitialized();
        return this.offlineManager;
    }
    /**
     * Check if currently online
     */
    isOnline() {
        this.ensureInitialized();
        return this.adapters.networkMonitor.isOnline();
    }
    /**
     * Get SDK configuration
     */
    getConfig() {
        return this.config.getConfig();
    }
    /**
     * Update SDK configuration
     */
    updateConfig(updates) {
        this.config.updateConfig(updates);
    }
    /**
     * Get platform adapters (for advanced use cases)
     */
    getAdapters() {
        return this.adapters;
    }
    /**
     * Destroy SDK and cleanup resources
     */
    destroy() {
        this.offlineManager?.destroy();
        this.isInitialized = false;
    }
    /**
     * Ensure SDK is initialized
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized. Call initialize() first.');
        }
    }
}

var util;
(function (util) {
    util.assertEqual = (_) => { };
    function assertIs(_arg) { }
    util.assertIs = assertIs;
    function assertNever(_x) {
        throw new Error();
    }
    util.assertNever = assertNever;
    util.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
            obj[item] = item;
        }
        return obj;
    };
    util.getValidEnumValues = (obj) => {
        const validKeys = util.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
            filtered[k] = obj[k];
        }
        return util.objectValues(filtered);
    };
    util.objectValues = (obj) => {
        return util.objectKeys(obj).map(function (e) {
            return obj[e];
        });
    };
    util.objectKeys = typeof Object.keys === "function" // eslint-disable-line ban/ban
        ? (obj) => Object.keys(obj) // eslint-disable-line ban/ban
        : (object) => {
            const keys = [];
            for (const key in object) {
                if (Object.prototype.hasOwnProperty.call(object, key)) {
                    keys.push(key);
                }
            }
            return keys;
        };
    util.find = (arr, checker) => {
        for (const item of arr) {
            if (checker(item))
                return item;
        }
        return undefined;
    };
    util.isInteger = typeof Number.isInteger === "function"
        ? (val) => Number.isInteger(val) // eslint-disable-line ban/ban
        : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
        return array.map((val) => (typeof val === "string" ? `'${val}'` : val)).join(separator);
    }
    util.joinValues = joinValues;
    util.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
            return value.toString();
        }
        return value;
    };
})(util || (util = {}));
var objectUtil;
(function (objectUtil) {
    objectUtil.mergeShapes = (first, second) => {
        return {
            ...first,
            ...second, // second overwrites first
        };
    };
})(objectUtil || (objectUtil = {}));
const ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set",
]);
const getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
        case "undefined":
            return ZodParsedType.undefined;
        case "string":
            return ZodParsedType.string;
        case "number":
            return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
        case "boolean":
            return ZodParsedType.boolean;
        case "function":
            return ZodParsedType.function;
        case "bigint":
            return ZodParsedType.bigint;
        case "symbol":
            return ZodParsedType.symbol;
        case "object":
            if (Array.isArray(data)) {
                return ZodParsedType.array;
            }
            if (data === null) {
                return ZodParsedType.null;
            }
            if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
                return ZodParsedType.promise;
            }
            if (typeof Map !== "undefined" && data instanceof Map) {
                return ZodParsedType.map;
            }
            if (typeof Set !== "undefined" && data instanceof Set) {
                return ZodParsedType.set;
            }
            if (typeof Date !== "undefined" && data instanceof Date) {
                return ZodParsedType.date;
            }
            return ZodParsedType.object;
        default:
            return ZodParsedType.unknown;
    }
};

const ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite",
]);
class ZodError extends Error {
    get errors() {
        return this.issues;
    }
    constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
            this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
            this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            // eslint-disable-next-line ban/ban
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
    }
    format(_mapper) {
        const mapper = _mapper ||
            function (issue) {
                return issue.message;
            };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
            for (const issue of error.issues) {
                if (issue.code === "invalid_union") {
                    issue.unionErrors.map(processError);
                }
                else if (issue.code === "invalid_return_type") {
                    processError(issue.returnTypeError);
                }
                else if (issue.code === "invalid_arguments") {
                    processError(issue.argumentsError);
                }
                else if (issue.path.length === 0) {
                    fieldErrors._errors.push(mapper(issue));
                }
                else {
                    let curr = fieldErrors;
                    let i = 0;
                    while (i < issue.path.length) {
                        const el = issue.path[i];
                        const terminal = i === issue.path.length - 1;
                        if (!terminal) {
                            curr[el] = curr[el] || { _errors: [] };
                            // if (typeof el === "string") {
                            //   curr[el] = curr[el] || { _errors: [] };
                            // } else if (typeof el === "number") {
                            //   const errorArray: any = [];
                            //   errorArray._errors = [];
                            //   curr[el] = curr[el] || errorArray;
                            // }
                        }
                        else {
                            curr[el] = curr[el] || { _errors: [] };
                            curr[el]._errors.push(mapper(issue));
                        }
                        curr = curr[el];
                        i++;
                    }
                }
            }
        };
        processError(this);
        return fieldErrors;
    }
    static assert(value) {
        if (!(value instanceof ZodError)) {
            throw new Error(`Not a ZodError: ${value}`);
        }
    }
    toString() {
        return this.message;
    }
    get message() {
        return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
        return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
            if (sub.path.length > 0) {
                const firstEl = sub.path[0];
                fieldErrors[firstEl] = fieldErrors[firstEl] || [];
                fieldErrors[firstEl].push(mapper(sub));
            }
            else {
                formErrors.push(mapper(sub));
            }
        }
        return { formErrors, fieldErrors };
    }
    get formErrors() {
        return this.flatten();
    }
}
ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
};

const errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
        case ZodIssueCode.invalid_type:
            if (issue.received === ZodParsedType.undefined) {
                message = "Required";
            }
            else {
                message = `Expected ${issue.expected}, received ${issue.received}`;
            }
            break;
        case ZodIssueCode.invalid_literal:
            message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
            break;
        case ZodIssueCode.unrecognized_keys:
            message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
            break;
        case ZodIssueCode.invalid_union:
            message = `Invalid input`;
            break;
        case ZodIssueCode.invalid_union_discriminator:
            message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
            break;
        case ZodIssueCode.invalid_enum_value:
            message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
            break;
        case ZodIssueCode.invalid_arguments:
            message = `Invalid function arguments`;
            break;
        case ZodIssueCode.invalid_return_type:
            message = `Invalid function return type`;
            break;
        case ZodIssueCode.invalid_date:
            message = `Invalid date`;
            break;
        case ZodIssueCode.invalid_string:
            if (typeof issue.validation === "object") {
                if ("includes" in issue.validation) {
                    message = `Invalid input: must include "${issue.validation.includes}"`;
                    if (typeof issue.validation.position === "number") {
                        message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
                    }
                }
                else if ("startsWith" in issue.validation) {
                    message = `Invalid input: must start with "${issue.validation.startsWith}"`;
                }
                else if ("endsWith" in issue.validation) {
                    message = `Invalid input: must end with "${issue.validation.endsWith}"`;
                }
                else {
                    util.assertNever(issue.validation);
                }
            }
            else if (issue.validation !== "regex") {
                message = `Invalid ${issue.validation}`;
            }
            else {
                message = "Invalid";
            }
            break;
        case ZodIssueCode.too_small:
            if (issue.type === "array")
                message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
            else if (issue.type === "string")
                message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
            else if (issue.type === "number")
                message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
            else if (issue.type === "bigint")
                message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
            else if (issue.type === "date")
                message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
            else
                message = "Invalid input";
            break;
        case ZodIssueCode.too_big:
            if (issue.type === "array")
                message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
            else if (issue.type === "string")
                message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
            else if (issue.type === "number")
                message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
            else if (issue.type === "bigint")
                message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
            else if (issue.type === "date")
                message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
            else
                message = "Invalid input";
            break;
        case ZodIssueCode.custom:
            message = `Invalid input`;
            break;
        case ZodIssueCode.invalid_intersection_types:
            message = `Intersection results could not be merged`;
            break;
        case ZodIssueCode.not_multiple_of:
            message = `Number must be a multiple of ${issue.multipleOf}`;
            break;
        case ZodIssueCode.not_finite:
            message = "Number must be finite";
            break;
        default:
            message = _ctx.defaultError;
            util.assertNever(issue);
    }
    return { message };
};

let overrideErrorMap = errorMap;
function getErrorMap() {
    return overrideErrorMap;
}

const makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...(issueData.path || [])];
    const fullIssue = {
        ...issueData,
        path: fullPath,
    };
    if (issueData.message !== undefined) {
        return {
            ...issueData,
            path: fullPath,
            message: issueData.message,
        };
    }
    let errorMessage = "";
    const maps = errorMaps
        .filter((m) => !!m)
        .slice()
        .reverse();
    for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
        ...issueData,
        path: fullPath,
        message: errorMessage,
    };
};
function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
        issueData: issueData,
        data: ctx.data,
        path: ctx.path,
        errorMaps: [
            ctx.common.contextualErrorMap, // contextual error map is first priority
            ctx.schemaErrorMap, // then schema-bound map if available
            overrideMap, // then global override map
            overrideMap === errorMap ? undefined : errorMap, // then global default map
        ].filter((x) => !!x),
    });
    ctx.common.issues.push(issue);
}
class ParseStatus {
    constructor() {
        this.value = "valid";
    }
    dirty() {
        if (this.value === "valid")
            this.value = "dirty";
    }
    abort() {
        if (this.value !== "aborted")
            this.value = "aborted";
    }
    static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
            if (s.status === "aborted")
                return INVALID;
            if (s.status === "dirty")
                status.dirty();
            arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
                key,
                value,
            });
        }
        return ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
            const { key, value } = pair;
            if (key.status === "aborted")
                return INVALID;
            if (value.status === "aborted")
                return INVALID;
            if (key.status === "dirty")
                status.dirty();
            if (value.status === "dirty")
                status.dirty();
            if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
                finalObject[key.value] = value.value;
            }
        }
        return { status: status.value, value: finalObject };
    }
}
const INVALID = Object.freeze({
    status: "aborted",
});
const DIRTY = (value) => ({ status: "dirty", value });
const OK = (value) => ({ status: "valid", value });
const isAborted = (x) => x.status === "aborted";
const isDirty = (x) => x.status === "dirty";
const isValid = (x) => x.status === "valid";
const isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

var errorUtil;
(function (errorUtil) {
    errorUtil.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    // biome-ignore lint:
    errorUtil.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

class ParseInputLazyPath {
    constructor(parent, value, path, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path;
        this._key = key;
    }
    get path() {
        if (!this._cachedPath.length) {
            if (Array.isArray(this._key)) {
                this._cachedPath.push(...this._path, ...this._key);
            }
            else {
                this._cachedPath.push(...this._path, this._key);
            }
        }
        return this._cachedPath;
    }
}
const handleResult = (ctx, result) => {
    if (isValid(result)) {
        return { success: true, data: result.value };
    }
    else {
        if (!ctx.common.issues.length) {
            throw new Error("Validation failed but no issues detected.");
        }
        return {
            success: false,
            get error() {
                if (this._error)
                    return this._error;
                const error = new ZodError(ctx.common.issues);
                this._error = error;
                return this._error;
            },
        };
    }
};
function processCreateParams(params) {
    if (!params)
        return {};
    const { errorMap, invalid_type_error, required_error, description } = params;
    if (errorMap && (invalid_type_error || required_error)) {
        throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap)
        return { errorMap: errorMap, description };
    const customMap = (iss, ctx) => {
        const { message } = params;
        if (iss.code === "invalid_enum_value") {
            return { message: message ?? ctx.defaultError };
        }
        if (typeof ctx.data === "undefined") {
            return { message: message ?? required_error ?? ctx.defaultError };
        }
        if (iss.code !== "invalid_type")
            return { message: ctx.defaultError };
        return { message: message ?? invalid_type_error ?? ctx.defaultError };
    };
    return { errorMap: customMap, description };
}
class ZodType {
    get description() {
        return this._def.description;
    }
    _getType(input) {
        return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
        return (ctx || {
            common: input.parent.common,
            data: input.data,
            parsedType: getParsedType(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent,
        });
    }
    _processInputParams(input) {
        return {
            status: new ParseStatus(),
            ctx: {
                common: input.parent.common,
                data: input.data,
                parsedType: getParsedType(input.data),
                schemaErrorMap: this._def.errorMap,
                path: input.path,
                parent: input.parent,
            },
        };
    }
    _parseSync(input) {
        const result = this._parse(input);
        if (isAsync(result)) {
            throw new Error("Synchronous parse encountered promise.");
        }
        return result;
    }
    _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
    }
    parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
            return result.data;
        throw result.error;
    }
    safeParse(data, params) {
        const ctx = {
            common: {
                issues: [],
                async: params?.async ?? false,
                contextualErrorMap: params?.errorMap,
            },
            path: params?.path || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
    }
    "~validate"(data) {
        const ctx = {
            common: {
                issues: [],
                async: !!this["~standard"].async,
            },
            path: [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        if (!this["~standard"].async) {
            try {
                const result = this._parseSync({ data, path: [], parent: ctx });
                return isValid(result)
                    ? {
                        value: result.value,
                    }
                    : {
                        issues: ctx.common.issues,
                    };
            }
            catch (err) {
                if (err?.message?.toLowerCase()?.includes("encountered")) {
                    this["~standard"].async = true;
                }
                ctx.common = {
                    issues: [],
                    async: true,
                };
            }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result)
            ? {
                value: result.value,
            }
            : {
                issues: ctx.common.issues,
            });
    }
    async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
            return result.data;
        throw result.error;
    }
    async safeParseAsync(data, params) {
        const ctx = {
            common: {
                issues: [],
                contextualErrorMap: params?.errorMap,
                async: true,
            },
            path: params?.path || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data,
            parsedType: getParsedType(data),
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
    }
    refine(check, message) {
        const getIssueProperties = (val) => {
            if (typeof message === "string" || typeof message === "undefined") {
                return { message };
            }
            else if (typeof message === "function") {
                return message(val);
            }
            else {
                return message;
            }
        };
        return this._refinement((val, ctx) => {
            const result = check(val);
            const setError = () => ctx.addIssue({
                code: ZodIssueCode.custom,
                ...getIssueProperties(val),
            });
            if (typeof Promise !== "undefined" && result instanceof Promise) {
                return result.then((data) => {
                    if (!data) {
                        setError();
                        return false;
                    }
                    else {
                        return true;
                    }
                });
            }
            if (!result) {
                setError();
                return false;
            }
            else {
                return true;
            }
        });
    }
    refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
            if (!check(val)) {
                ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
                return false;
            }
            else {
                return true;
            }
        });
    }
    _refinement(refinement) {
        return new ZodEffects({
            schema: this,
            typeName: ZodFirstPartyTypeKind.ZodEffects,
            effect: { type: "refinement", refinement },
        });
    }
    superRefine(refinement) {
        return this._refinement(refinement);
    }
    constructor(def) {
        /** Alias of safeParseAsync */
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
            version: 1,
            vendor: "zod",
            validate: (data) => this["~validate"](data),
        };
    }
    optional() {
        return ZodOptional.create(this, this._def);
    }
    nullable() {
        return ZodNullable.create(this, this._def);
    }
    nullish() {
        return this.nullable().optional();
    }
    array() {
        return ZodArray.create(this);
    }
    promise() {
        return ZodPromise.create(this, this._def);
    }
    or(option) {
        return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
        return new ZodEffects({
            ...processCreateParams(this._def),
            schema: this,
            typeName: ZodFirstPartyTypeKind.ZodEffects,
            effect: { type: "transform", transform },
        });
    }
    default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
            ...processCreateParams(this._def),
            innerType: this,
            defaultValue: defaultValueFunc,
            typeName: ZodFirstPartyTypeKind.ZodDefault,
        });
    }
    brand() {
        return new ZodBranded({
            typeName: ZodFirstPartyTypeKind.ZodBranded,
            type: this,
            ...processCreateParams(this._def),
        });
    }
    catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
            ...processCreateParams(this._def),
            innerType: this,
            catchValue: catchValueFunc,
            typeName: ZodFirstPartyTypeKind.ZodCatch,
        });
    }
    describe(description) {
        const This = this.constructor;
        return new This({
            ...this._def,
            description,
        });
    }
    pipe(target) {
        return ZodPipeline.create(this, target);
    }
    readonly() {
        return ZodReadonly.create(this);
    }
    isOptional() {
        return this.safeParse(undefined).success;
    }
    isNullable() {
        return this.safeParse(null).success;
    }
}
const cuidRegex = /^c[^\s-]{8,}$/i;
const cuid2Regex = /^[0-9a-z]+$/;
const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
// const uuidRegex =
//   /^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}|00000000-0000-0000-0000-000000000000)$/i;
const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
const nanoidRegex = /^[a-z0-9_-]{21}$/i;
const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
const durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
// from https://stackoverflow.com/a/46181/1550155
// old version: too slow, didn't support unicode
// const emailRegex = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;
//old email regex
// const emailRegex = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@((?!-)([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{1,})[^-<>()[\].,;:\s@"]$/i;
// eslint-disable-next-line
// const emailRegex =
//   /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\])|(\[IPv6:(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))\])|([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])*(\.[A-Za-z]{2,})+))$/;
// const emailRegex =
//   /^[a-zA-Z0-9\.\!\#\$\%\&\'\*\+\/\=\?\^\_\`\{\|\}\~\-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// const emailRegex =
//   /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
// const emailRegex =
//   /^[a-z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9\-]+)*$/i;
// from https://thekevinscott.com/emojis-in-javascript/#writing-a-regular-expression
const _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
let emojiRegex;
// faster, simpler, safer
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
// const ipv6Regex =
// /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
const ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
// https://stackoverflow.com/questions/7860392/determine-if-string-is-in-base64-using-javascript
const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
// https://base64.guru/standards/base64url
const base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
// simple
// const dateRegexSource = `\\d{4}-\\d{2}-\\d{2}`;
// no leap year validation
// const dateRegexSource = `\\d{4}-((0[13578]|10|12)-31|(0[13-9]|1[0-2])-30|(0[1-9]|1[0-2])-(0[1-9]|1\\d|2\\d))`;
// with leap year validation
const dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
const dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`;
    if (args.precision) {
        secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
    }
    else if (args.precision == null) {
        secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
    }
    const secondsQuantifier = args.precision ? "+" : "?"; // require seconds if precision is nonzero
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
}
// Adapted from https://stackoverflow.com/a/3143231
function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
        opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
        return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
        return true;
    }
    return false;
}
function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
        return false;
    try {
        const [header] = jwt.split(".");
        if (!header)
            return false;
        // Convert base64url to base64
        const base64 = header
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(header.length + ((4 - (header.length % 4)) % 4), "=");
        const decoded = JSON.parse(atob(base64));
        if (typeof decoded !== "object" || decoded === null)
            return false;
        if ("typ" in decoded && decoded?.typ !== "JWT")
            return false;
        if (!decoded.alg)
            return false;
        if (alg && decoded.alg !== alg)
            return false;
        return true;
    }
    catch {
        return false;
    }
}
function isValidCidr(ip, version) {
    if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
        return true;
    }
    if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
        return true;
    }
    return false;
}
class ZodString extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.string) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.string,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const status = new ParseStatus();
        let ctx = undefined;
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                if (input.data.length < check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        minimum: check.value,
                        type: "string",
                        inclusive: true,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                if (input.data.length > check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        maximum: check.value,
                        type: "string",
                        inclusive: true,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "length") {
                const tooBig = input.data.length > check.value;
                const tooSmall = input.data.length < check.value;
                if (tooBig || tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    if (tooBig) {
                        addIssueToContext(ctx, {
                            code: ZodIssueCode.too_big,
                            maximum: check.value,
                            type: "string",
                            inclusive: true,
                            exact: true,
                            message: check.message,
                        });
                    }
                    else if (tooSmall) {
                        addIssueToContext(ctx, {
                            code: ZodIssueCode.too_small,
                            minimum: check.value,
                            type: "string",
                            inclusive: true,
                            exact: true,
                            message: check.message,
                        });
                    }
                    status.dirty();
                }
            }
            else if (check.kind === "email") {
                if (!emailRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "email",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "emoji") {
                if (!emojiRegex) {
                    emojiRegex = new RegExp(_emojiRegex, "u");
                }
                if (!emojiRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "emoji",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "uuid") {
                if (!uuidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "uuid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "nanoid") {
                if (!nanoidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "nanoid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cuid") {
                if (!cuidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cuid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cuid2") {
                if (!cuid2Regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cuid2",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "ulid") {
                if (!ulidRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "ulid",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "url") {
                try {
                    new URL(input.data);
                }
                catch {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "url",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "regex") {
                check.regex.lastIndex = 0;
                const testResult = check.regex.test(input.data);
                if (!testResult) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "regex",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "trim") {
                input.data = input.data.trim();
            }
            else if (check.kind === "includes") {
                if (!input.data.includes(check.value, check.position)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { includes: check.value, position: check.position },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "toLowerCase") {
                input.data = input.data.toLowerCase();
            }
            else if (check.kind === "toUpperCase") {
                input.data = input.data.toUpperCase();
            }
            else if (check.kind === "startsWith") {
                if (!input.data.startsWith(check.value)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { startsWith: check.value },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "endsWith") {
                if (!input.data.endsWith(check.value)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: { endsWith: check.value },
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "datetime") {
                const regex = datetimeRegex(check);
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "datetime",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "date") {
                const regex = dateRegex;
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "date",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "time") {
                const regex = timeRegex(check);
                if (!regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_string,
                        validation: "time",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "duration") {
                if (!durationRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "duration",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "ip") {
                if (!isValidIP(input.data, check.version)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "ip",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "jwt") {
                if (!isValidJWT(input.data, check.alg)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "jwt",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "cidr") {
                if (!isValidCidr(input.data, check.version)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "cidr",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "base64") {
                if (!base64Regex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "base64",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "base64url") {
                if (!base64urlRegex.test(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        validation: "base64url",
                        code: ZodIssueCode.invalid_string,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
            validation,
            code: ZodIssueCode.invalid_string,
            ...errorUtil.errToObj(message),
        });
    }
    _addCheck(check) {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    email(message) {
        return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
        return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
        // base64url encoding is a modification of base64 that can safely be used in URLs and filenames
        return this._addCheck({
            kind: "base64url",
            ...errorUtil.errToObj(message),
        });
    }
    jwt(options) {
        return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
        return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
        if (typeof options === "string") {
            return this._addCheck({
                kind: "datetime",
                precision: null,
                offset: false,
                local: false,
                message: options,
            });
        }
        return this._addCheck({
            kind: "datetime",
            precision: typeof options?.precision === "undefined" ? null : options?.precision,
            offset: options?.offset ?? false,
            local: options?.local ?? false,
            ...errorUtil.errToObj(options?.message),
        });
    }
    date(message) {
        return this._addCheck({ kind: "date", message });
    }
    time(options) {
        if (typeof options === "string") {
            return this._addCheck({
                kind: "time",
                precision: null,
                message: options,
            });
        }
        return this._addCheck({
            kind: "time",
            precision: typeof options?.precision === "undefined" ? null : options?.precision,
            ...errorUtil.errToObj(options?.message),
        });
    }
    duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
        return this._addCheck({
            kind: "regex",
            regex: regex,
            ...errorUtil.errToObj(message),
        });
    }
    includes(value, options) {
        return this._addCheck({
            kind: "includes",
            value: value,
            position: options?.position,
            ...errorUtil.errToObj(options?.message),
        });
    }
    startsWith(value, message) {
        return this._addCheck({
            kind: "startsWith",
            value: value,
            ...errorUtil.errToObj(message),
        });
    }
    endsWith(value, message) {
        return this._addCheck({
            kind: "endsWith",
            value: value,
            ...errorUtil.errToObj(message),
        });
    }
    min(minLength, message) {
        return this._addCheck({
            kind: "min",
            value: minLength,
            ...errorUtil.errToObj(message),
        });
    }
    max(maxLength, message) {
        return this._addCheck({
            kind: "max",
            value: maxLength,
            ...errorUtil.errToObj(message),
        });
    }
    length(len, message) {
        return this._addCheck({
            kind: "length",
            value: len,
            ...errorUtil.errToObj(message),
        });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
        return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "trim" }],
        });
    }
    toLowerCase() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "toLowerCase" }],
        });
    }
    toUpperCase() {
        return new ZodString({
            ...this._def,
            checks: [...this._def.checks, { kind: "toUpperCase" }],
        });
    }
    get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
        // base64url encoding is a modification of base64 that can safely be used in URLs and filenames
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
}
ZodString.create = (params) => {
    return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params),
    });
};
// https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript/31711034#31711034
function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return (valInt % stepInt) / 10 ** decCount;
}
class ZodNumber extends ZodType {
    constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
    }
    _parse(input) {
        if (this._def.coerce) {
            input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.number) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.number,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        let ctx = undefined;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
            if (check.kind === "int") {
                if (!util.isInteger(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.invalid_type,
                        expected: "integer",
                        received: "float",
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "min") {
                const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
                if (tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        minimum: check.value,
                        type: "number",
                        inclusive: check.inclusive,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
                if (tooBig) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        maximum: check.value,
                        type: "number",
                        inclusive: check.inclusive,
                        exact: false,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "multipleOf") {
                if (floatSafeRemainder(input.data, check.value) !== 0) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_multiple_of,
                        multipleOf: check.value,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "finite") {
                if (!Number.isFinite(input.data)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_finite,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
        return new ZodNumber({
            ...this._def,
            checks: [
                ...this._def.checks,
                {
                    kind,
                    value,
                    inclusive,
                    message: errorUtil.toString(message),
                },
            ],
        });
    }
    _addCheck(check) {
        return new ZodNumber({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    int(message) {
        return this._addCheck({
            kind: "int",
            message: errorUtil.toString(message),
        });
    }
    positive(message) {
        return this._addCheck({
            kind: "min",
            value: 0,
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    negative(message) {
        return this._addCheck({
            kind: "max",
            value: 0,
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    nonpositive(message) {
        return this._addCheck({
            kind: "max",
            value: 0,
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    nonnegative(message) {
        return this._addCheck({
            kind: "min",
            value: 0,
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    multipleOf(value, message) {
        return this._addCheck({
            kind: "multipleOf",
            value: value,
            message: errorUtil.toString(message),
        });
    }
    finite(message) {
        return this._addCheck({
            kind: "finite",
            message: errorUtil.toString(message),
        });
    }
    safe(message) {
        return this._addCheck({
            kind: "min",
            inclusive: true,
            value: Number.MIN_SAFE_INTEGER,
            message: errorUtil.toString(message),
        })._addCheck({
            kind: "max",
            inclusive: true,
            value: Number.MAX_SAFE_INTEGER,
            message: errorUtil.toString(message),
        });
    }
    get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
    get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" || (ch.kind === "multipleOf" && util.isInteger(ch.value)));
    }
    get isFinite() {
        let max = null;
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
                return true;
            }
            else if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
            else if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return Number.isFinite(min) && Number.isFinite(max);
    }
}
ZodNumber.create = (params) => {
    return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: params?.coerce || false,
        ...processCreateParams(params),
    });
};
class ZodBigInt extends ZodType {
    constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
    }
    _parse(input) {
        if (this._def.coerce) {
            try {
                input.data = BigInt(input.data);
            }
            catch {
                return this._getInvalidInput(input);
            }
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.bigint) {
            return this._getInvalidInput(input);
        }
        let ctx = undefined;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
                if (tooSmall) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        type: "bigint",
                        minimum: check.value,
                        inclusive: check.inclusive,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
                if (tooBig) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        type: "bigint",
                        maximum: check.value,
                        inclusive: check.inclusive,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "multipleOf") {
                if (input.data % check.value !== BigInt(0)) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.not_multiple_of,
                        multipleOf: check.value,
                        message: check.message,
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.bigint,
            received: ctx.parsedType,
        });
        return INVALID;
    }
    gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
        return new ZodBigInt({
            ...this._def,
            checks: [
                ...this._def.checks,
                {
                    kind,
                    value,
                    inclusive,
                    message: errorUtil.toString(message),
                },
            ],
        });
    }
    _addCheck(check) {
        return new ZodBigInt({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    positive(message) {
        return this._addCheck({
            kind: "min",
            value: BigInt(0),
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    negative(message) {
        return this._addCheck({
            kind: "max",
            value: BigInt(0),
            inclusive: false,
            message: errorUtil.toString(message),
        });
    }
    nonpositive(message) {
        return this._addCheck({
            kind: "max",
            value: BigInt(0),
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    nonnegative(message) {
        return this._addCheck({
            kind: "min",
            value: BigInt(0),
            inclusive: true,
            message: errorUtil.toString(message),
        });
    }
    multipleOf(value, message) {
        return this._addCheck({
            kind: "multipleOf",
            value,
            message: errorUtil.toString(message),
        });
    }
    get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min;
    }
    get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max;
    }
}
ZodBigInt.create = (params) => {
    return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params),
    });
};
class ZodBoolean extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.boolean) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.boolean,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodBoolean.create = (params) => {
    return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: params?.coerce || false,
        ...processCreateParams(params),
    });
};
class ZodDate extends ZodType {
    _parse(input) {
        if (this._def.coerce) {
            input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.date) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.date,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (Number.isNaN(input.data.getTime())) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_date,
            });
            return INVALID;
        }
        const status = new ParseStatus();
        let ctx = undefined;
        for (const check of this._def.checks) {
            if (check.kind === "min") {
                if (input.data.getTime() < check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_small,
                        message: check.message,
                        inclusive: true,
                        exact: false,
                        minimum: check.value,
                        type: "date",
                    });
                    status.dirty();
                }
            }
            else if (check.kind === "max") {
                if (input.data.getTime() > check.value) {
                    ctx = this._getOrReturnCtx(input, ctx);
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.too_big,
                        message: check.message,
                        inclusive: true,
                        exact: false,
                        maximum: check.value,
                        type: "date",
                    });
                    status.dirty();
                }
            }
            else {
                util.assertNever(check);
            }
        }
        return {
            status: status.value,
            value: new Date(input.data.getTime()),
        };
    }
    _addCheck(check) {
        return new ZodDate({
            ...this._def,
            checks: [...this._def.checks, check],
        });
    }
    min(minDate, message) {
        return this._addCheck({
            kind: "min",
            value: minDate.getTime(),
            message: errorUtil.toString(message),
        });
    }
    max(maxDate, message) {
        return this._addCheck({
            kind: "max",
            value: maxDate.getTime(),
            message: errorUtil.toString(message),
        });
    }
    get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "min") {
                if (min === null || ch.value > min)
                    min = ch.value;
            }
        }
        return min != null ? new Date(min) : null;
    }
    get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
            if (ch.kind === "max") {
                if (max === null || ch.value < max)
                    max = ch.value;
            }
        }
        return max != null ? new Date(max) : null;
    }
}
ZodDate.create = (params) => {
    return new ZodDate({
        checks: [],
        coerce: params?.coerce || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params),
    });
};
class ZodSymbol extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.symbol) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.symbol,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodSymbol.create = (params) => {
    return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params),
    });
};
class ZodUndefined extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.undefined,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodUndefined.create = (params) => {
    return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params),
    });
};
class ZodNull extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.null) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.null,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodNull.create = (params) => {
    return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params),
    });
};
class ZodAny extends ZodType {
    constructor() {
        super(...arguments);
        // to prevent instances of other classes from extending ZodAny. this causes issues with catchall in ZodObject.
        this._any = true;
    }
    _parse(input) {
        return OK(input.data);
    }
}
ZodAny.create = (params) => {
    return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params),
    });
};
class ZodUnknown extends ZodType {
    constructor() {
        super(...arguments);
        // required
        this._unknown = true;
    }
    _parse(input) {
        return OK(input.data);
    }
}
ZodUnknown.create = (params) => {
    return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params),
    });
};
class ZodNever extends ZodType {
    _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.never,
            received: ctx.parsedType,
        });
        return INVALID;
    }
}
ZodNever.create = (params) => {
    return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params),
    });
};
class ZodVoid extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.void,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return OK(input.data);
    }
}
ZodVoid.create = (params) => {
    return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params),
    });
};
class ZodArray extends ZodType {
    _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== ZodParsedType.array) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.array,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (def.exactLength !== null) {
            const tooBig = ctx.data.length > def.exactLength.value;
            const tooSmall = ctx.data.length < def.exactLength.value;
            if (tooBig || tooSmall) {
                addIssueToContext(ctx, {
                    code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
                    minimum: (tooSmall ? def.exactLength.value : undefined),
                    maximum: (tooBig ? def.exactLength.value : undefined),
                    type: "array",
                    inclusive: true,
                    exact: true,
                    message: def.exactLength.message,
                });
                status.dirty();
            }
        }
        if (def.minLength !== null) {
            if (ctx.data.length < def.minLength.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_small,
                    minimum: def.minLength.value,
                    type: "array",
                    inclusive: true,
                    exact: false,
                    message: def.minLength.message,
                });
                status.dirty();
            }
        }
        if (def.maxLength !== null) {
            if (ctx.data.length > def.maxLength.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_big,
                    maximum: def.maxLength.value,
                    type: "array",
                    inclusive: true,
                    exact: false,
                    message: def.maxLength.message,
                });
                status.dirty();
            }
        }
        if (ctx.common.async) {
            return Promise.all([...ctx.data].map((item, i) => {
                return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
            })).then((result) => {
                return ParseStatus.mergeArray(status, result);
            });
        }
        const result = [...ctx.data].map((item, i) => {
            return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        });
        return ParseStatus.mergeArray(status, result);
    }
    get element() {
        return this._def.type;
    }
    min(minLength, message) {
        return new ZodArray({
            ...this._def,
            minLength: { value: minLength, message: errorUtil.toString(message) },
        });
    }
    max(maxLength, message) {
        return new ZodArray({
            ...this._def,
            maxLength: { value: maxLength, message: errorUtil.toString(message) },
        });
    }
    length(len, message) {
        return new ZodArray({
            ...this._def,
            exactLength: { value: len, message: errorUtil.toString(message) },
        });
    }
    nonempty(message) {
        return this.min(1, message);
    }
}
ZodArray.create = (schema, params) => {
    return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params),
    });
};
function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
        const newShape = {};
        for (const key in schema.shape) {
            const fieldSchema = schema.shape[key];
            newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
        }
        return new ZodObject({
            ...schema._def,
            shape: () => newShape,
        });
    }
    else if (schema instanceof ZodArray) {
        return new ZodArray({
            ...schema._def,
            type: deepPartialify(schema.element),
        });
    }
    else if (schema instanceof ZodOptional) {
        return ZodOptional.create(deepPartialify(schema.unwrap()));
    }
    else if (schema instanceof ZodNullable) {
        return ZodNullable.create(deepPartialify(schema.unwrap()));
    }
    else if (schema instanceof ZodTuple) {
        return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    }
    else {
        return schema;
    }
}
class ZodObject extends ZodType {
    constructor() {
        super(...arguments);
        this._cached = null;
        /**
         * @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
         * If you want to pass through unknown properties, use `.passthrough()` instead.
         */
        this.nonstrict = this.passthrough;
        // extend<
        //   Augmentation extends ZodRawShape,
        //   NewOutput extends util.flatten<{
        //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
        //       ? Augmentation[k]["_output"]
        //       : k extends keyof Output
        //       ? Output[k]
        //       : never;
        //   }>,
        //   NewInput extends util.flatten<{
        //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
        //       ? Augmentation[k]["_input"]
        //       : k extends keyof Input
        //       ? Input[k]
        //       : never;
        //   }>
        // >(
        //   augmentation: Augmentation
        // ): ZodObject<
        //   extendShape<T, Augmentation>,
        //   UnknownKeys,
        //   Catchall,
        //   NewOutput,
        //   NewInput
        // > {
        //   return new ZodObject({
        //     ...this._def,
        //     shape: () => ({
        //       ...this._def.shape(),
        //       ...augmentation,
        //     }),
        //   }) as any;
        // }
        /**
         * @deprecated Use `.extend` instead
         *  */
        this.augment = this.extend;
    }
    _getCached() {
        if (this._cached !== null)
            return this._cached;
        const shape = this._def.shape();
        const keys = util.objectKeys(shape);
        this._cached = { shape, keys };
        return this._cached;
    }
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.object) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.object,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
            for (const key in ctx.data) {
                if (!shapeKeys.includes(key)) {
                    extraKeys.push(key);
                }
            }
        }
        const pairs = [];
        for (const key of shapeKeys) {
            const keyValidator = shape[key];
            const value = ctx.data[key];
            pairs.push({
                key: { status: "valid", value: key },
                value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
                alwaysSet: key in ctx.data,
            });
        }
        if (this._def.catchall instanceof ZodNever) {
            const unknownKeys = this._def.unknownKeys;
            if (unknownKeys === "passthrough") {
                for (const key of extraKeys) {
                    pairs.push({
                        key: { status: "valid", value: key },
                        value: { status: "valid", value: ctx.data[key] },
                    });
                }
            }
            else if (unknownKeys === "strict") {
                if (extraKeys.length > 0) {
                    addIssueToContext(ctx, {
                        code: ZodIssueCode.unrecognized_keys,
                        keys: extraKeys,
                    });
                    status.dirty();
                }
            }
            else if (unknownKeys === "strip") ;
            else {
                throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
            }
        }
        else {
            // run catchall validation
            const catchall = this._def.catchall;
            for (const key of extraKeys) {
                const value = ctx.data[key];
                pairs.push({
                    key: { status: "valid", value: key },
                    value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key) //, ctx.child(key), value, getParsedType(value)
                    ),
                    alwaysSet: key in ctx.data,
                });
            }
        }
        if (ctx.common.async) {
            return Promise.resolve()
                .then(async () => {
                const syncPairs = [];
                for (const pair of pairs) {
                    const key = await pair.key;
                    const value = await pair.value;
                    syncPairs.push({
                        key,
                        value,
                        alwaysSet: pair.alwaysSet,
                    });
                }
                return syncPairs;
            })
                .then((syncPairs) => {
                return ParseStatus.mergeObjectSync(status, syncPairs);
            });
        }
        else {
            return ParseStatus.mergeObjectSync(status, pairs);
        }
    }
    get shape() {
        return this._def.shape();
    }
    strict(message) {
        errorUtil.errToObj;
        return new ZodObject({
            ...this._def,
            unknownKeys: "strict",
            ...(message !== undefined
                ? {
                    errorMap: (issue, ctx) => {
                        const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
                        if (issue.code === "unrecognized_keys")
                            return {
                                message: errorUtil.errToObj(message).message ?? defaultError,
                            };
                        return {
                            message: defaultError,
                        };
                    },
                }
                : {}),
        });
    }
    strip() {
        return new ZodObject({
            ...this._def,
            unknownKeys: "strip",
        });
    }
    passthrough() {
        return new ZodObject({
            ...this._def,
            unknownKeys: "passthrough",
        });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
        return new ZodObject({
            ...this._def,
            shape: () => ({
                ...this._def.shape(),
                ...augmentation,
            }),
        });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
        const merged = new ZodObject({
            unknownKeys: merging._def.unknownKeys,
            catchall: merging._def.catchall,
            shape: () => ({
                ...this._def.shape(),
                ...merging._def.shape(),
            }),
            typeName: ZodFirstPartyTypeKind.ZodObject,
        });
        return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
        return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
        return new ZodObject({
            ...this._def,
            catchall: index,
        });
    }
    pick(mask) {
        const shape = {};
        for (const key of util.objectKeys(mask)) {
            if (mask[key] && this.shape[key]) {
                shape[key] = this.shape[key];
            }
        }
        return new ZodObject({
            ...this._def,
            shape: () => shape,
        });
    }
    omit(mask) {
        const shape = {};
        for (const key of util.objectKeys(this.shape)) {
            if (!mask[key]) {
                shape[key] = this.shape[key];
            }
        }
        return new ZodObject({
            ...this._def,
            shape: () => shape,
        });
    }
    /**
     * @deprecated
     */
    deepPartial() {
        return deepPartialify(this);
    }
    partial(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
            const fieldSchema = this.shape[key];
            if (mask && !mask[key]) {
                newShape[key] = fieldSchema;
            }
            else {
                newShape[key] = fieldSchema.optional();
            }
        }
        return new ZodObject({
            ...this._def,
            shape: () => newShape,
        });
    }
    required(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
            if (mask && !mask[key]) {
                newShape[key] = this.shape[key];
            }
            else {
                const fieldSchema = this.shape[key];
                let newField = fieldSchema;
                while (newField instanceof ZodOptional) {
                    newField = newField._def.innerType;
                }
                newShape[key] = newField;
            }
        }
        return new ZodObject({
            ...this._def,
            shape: () => newShape,
        });
    }
    keyof() {
        return createZodEnum(util.objectKeys(this.shape));
    }
}
ZodObject.create = (shape, params) => {
    return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params),
    });
};
class ZodUnion extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
            // return first issue-free validation if it exists
            for (const result of results) {
                if (result.result.status === "valid") {
                    return result.result;
                }
            }
            for (const result of results) {
                if (result.result.status === "dirty") {
                    // add issues from dirty option
                    ctx.common.issues.push(...result.ctx.common.issues);
                    return result.result;
                }
            }
            // return invalid
            const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union,
                unionErrors,
            });
            return INVALID;
        }
        if (ctx.common.async) {
            return Promise.all(options.map(async (option) => {
                const childCtx = {
                    ...ctx,
                    common: {
                        ...ctx.common,
                        issues: [],
                    },
                    parent: null,
                };
                return {
                    result: await option._parseAsync({
                        data: ctx.data,
                        path: ctx.path,
                        parent: childCtx,
                    }),
                    ctx: childCtx,
                };
            })).then(handleResults);
        }
        else {
            let dirty = undefined;
            const issues = [];
            for (const option of options) {
                const childCtx = {
                    ...ctx,
                    common: {
                        ...ctx.common,
                        issues: [],
                    },
                    parent: null,
                };
                const result = option._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: childCtx,
                });
                if (result.status === "valid") {
                    return result;
                }
                else if (result.status === "dirty" && !dirty) {
                    dirty = { result, ctx: childCtx };
                }
                if (childCtx.common.issues.length) {
                    issues.push(childCtx.common.issues);
                }
            }
            if (dirty) {
                ctx.common.issues.push(...dirty.ctx.common.issues);
                return dirty.result;
            }
            const unionErrors = issues.map((issues) => new ZodError(issues));
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_union,
                unionErrors,
            });
            return INVALID;
        }
    }
    get options() {
        return this._def.options;
    }
}
ZodUnion.create = (types, params) => {
    return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params),
    });
};
function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
        return { valid: true, data: a };
    }
    else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
        const bKeys = util.objectKeys(b);
        const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
            const sharedValue = mergeValues(a[key], b[key]);
            if (!sharedValue.valid) {
                return { valid: false };
            }
            newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
    }
    else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
        if (a.length !== b.length) {
            return { valid: false };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
            const itemA = a[index];
            const itemB = b[index];
            const sharedValue = mergeValues(itemA, itemB);
            if (!sharedValue.valid) {
                return { valid: false };
            }
            newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
    }
    else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
        return { valid: true, data: a };
    }
    else {
        return { valid: false };
    }
}
class ZodIntersection extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
            if (isAborted(parsedLeft) || isAborted(parsedRight)) {
                return INVALID;
            }
            const merged = mergeValues(parsedLeft.value, parsedRight.value);
            if (!merged.valid) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.invalid_intersection_types,
                });
                return INVALID;
            }
            if (isDirty(parsedLeft) || isDirty(parsedRight)) {
                status.dirty();
            }
            return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
            return Promise.all([
                this._def.left._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                }),
                this._def.right._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                }),
            ]).then(([left, right]) => handleParsed(left, right));
        }
        else {
            return handleParsed(this._def.left._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            }), this._def.right._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            }));
        }
    }
}
ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
        left: left,
        right: right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params),
    });
};
// type ZodTupleItems = [ZodTypeAny, ...ZodTypeAny[]];
class ZodTuple extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.array) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.array,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: this._def.items.length,
                inclusive: true,
                exact: false,
                type: "array",
            });
            return INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: this._def.items.length,
                inclusive: true,
                exact: false,
                type: "array",
            });
            status.dirty();
        }
        const items = [...ctx.data]
            .map((item, itemIndex) => {
            const schema = this._def.items[itemIndex] || this._def.rest;
            if (!schema)
                return null;
            return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        })
            .filter((x) => !!x); // filter nulls
        if (ctx.common.async) {
            return Promise.all(items).then((results) => {
                return ParseStatus.mergeArray(status, results);
            });
        }
        else {
            return ParseStatus.mergeArray(status, items);
        }
    }
    get items() {
        return this._def.items;
    }
    rest(rest) {
        return new ZodTuple({
            ...this._def,
            rest,
        });
    }
}
ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params),
    });
};
class ZodMap extends ZodType {
    get keySchema() {
        return this._def.keyType;
    }
    get valueSchema() {
        return this._def.valueType;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.map) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.map,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
            return {
                key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
                value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"])),
            };
        });
        if (ctx.common.async) {
            const finalMap = new Map();
            return Promise.resolve().then(async () => {
                for (const pair of pairs) {
                    const key = await pair.key;
                    const value = await pair.value;
                    if (key.status === "aborted" || value.status === "aborted") {
                        return INVALID;
                    }
                    if (key.status === "dirty" || value.status === "dirty") {
                        status.dirty();
                    }
                    finalMap.set(key.value, value.value);
                }
                return { status: status.value, value: finalMap };
            });
        }
        else {
            const finalMap = new Map();
            for (const pair of pairs) {
                const key = pair.key;
                const value = pair.value;
                if (key.status === "aborted" || value.status === "aborted") {
                    return INVALID;
                }
                if (key.status === "dirty" || value.status === "dirty") {
                    status.dirty();
                }
                finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
        }
    }
}
ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params),
    });
};
class ZodSet extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.set) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.set,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
            if (ctx.data.size < def.minSize.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_small,
                    minimum: def.minSize.value,
                    type: "set",
                    inclusive: true,
                    exact: false,
                    message: def.minSize.message,
                });
                status.dirty();
            }
        }
        if (def.maxSize !== null) {
            if (ctx.data.size > def.maxSize.value) {
                addIssueToContext(ctx, {
                    code: ZodIssueCode.too_big,
                    maximum: def.maxSize.value,
                    type: "set",
                    inclusive: true,
                    exact: false,
                    message: def.maxSize.message,
                });
                status.dirty();
            }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements) {
            const parsedSet = new Set();
            for (const element of elements) {
                if (element.status === "aborted")
                    return INVALID;
                if (element.status === "dirty")
                    status.dirty();
                parsedSet.add(element.value);
            }
            return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
            return Promise.all(elements).then((elements) => finalizeSet(elements));
        }
        else {
            return finalizeSet(elements);
        }
    }
    min(minSize, message) {
        return new ZodSet({
            ...this._def,
            minSize: { value: minSize, message: errorUtil.toString(message) },
        });
    }
    max(maxSize, message) {
        return new ZodSet({
            ...this._def,
            maxSize: { value: maxSize, message: errorUtil.toString(message) },
        });
    }
    size(size, message) {
        return this.min(size, message).max(size, message);
    }
    nonempty(message) {
        return this.min(1, message);
    }
}
ZodSet.create = (valueType, params) => {
    return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params),
    });
};
class ZodLazy extends ZodType {
    get schema() {
        return this._def.getter();
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
}
ZodLazy.create = (getter, params) => {
    return new ZodLazy({
        getter: getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params),
    });
};
class ZodLiteral extends ZodType {
    _parse(input) {
        if (input.data !== this._def.value) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_literal,
                expected: this._def.value,
            });
            return INVALID;
        }
        return { status: "valid", value: input.data };
    }
    get value() {
        return this._def.value;
    }
}
ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
        value: value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params),
    });
};
function createZodEnum(values, params) {
    return new ZodEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodEnum,
        ...processCreateParams(params),
    });
}
class ZodEnum extends ZodType {
    _parse(input) {
        if (typeof input.data !== "string") {
            const ctx = this._getOrReturnCtx(input);
            const expectedValues = this._def.values;
            addIssueToContext(ctx, {
                expected: util.joinValues(expectedValues),
                received: ctx.parsedType,
                code: ZodIssueCode.invalid_type,
            });
            return INVALID;
        }
        if (!this._cache) {
            this._cache = new Set(this._def.values);
        }
        if (!this._cache.has(input.data)) {
            const ctx = this._getOrReturnCtx(input);
            const expectedValues = this._def.values;
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_enum_value,
                options: expectedValues,
            });
            return INVALID;
        }
        return OK(input.data);
    }
    get options() {
        return this._def.values;
    }
    get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
            enumValues[val] = val;
        }
        return enumValues;
    }
    extract(values, newDef = this._def) {
        return ZodEnum.create(values, {
            ...this._def,
            ...newDef,
        });
    }
    exclude(values, newDef = this._def) {
        return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
            ...this._def,
            ...newDef,
        });
    }
}
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
    _parse(input) {
        const nativeEnumValues = util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
            const expectedValues = util.objectValues(nativeEnumValues);
            addIssueToContext(ctx, {
                expected: util.joinValues(expectedValues),
                received: ctx.parsedType,
                code: ZodIssueCode.invalid_type,
            });
            return INVALID;
        }
        if (!this._cache) {
            this._cache = new Set(util.getValidEnumValues(this._def.values));
        }
        if (!this._cache.has(input.data)) {
            const expectedValues = util.objectValues(nativeEnumValues);
            addIssueToContext(ctx, {
                received: ctx.data,
                code: ZodIssueCode.invalid_enum_value,
                options: expectedValues,
            });
            return INVALID;
        }
        return OK(input.data);
    }
    get enum() {
        return this._def.values;
    }
}
ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
        values: values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params),
    });
};
class ZodPromise extends ZodType {
    unwrap() {
        return this._def.type;
    }
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.promise,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
        return OK(promisified.then((data) => {
            return this._def.type.parseAsync(data, {
                path: ctx.path,
                errorMap: ctx.common.contextualErrorMap,
            });
        }));
    }
}
ZodPromise.create = (schema, params) => {
    return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params),
    });
};
class ZodEffects extends ZodType {
    innerType() {
        return this._def.schema;
    }
    sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects
            ? this._def.schema.sourceType()
            : this._def.schema;
    }
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
            addIssue: (arg) => {
                addIssueToContext(ctx, arg);
                if (arg.fatal) {
                    status.abort();
                }
                else {
                    status.dirty();
                }
            },
            get path() {
                return ctx.path;
            },
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
            const processed = effect.transform(ctx.data, checkCtx);
            if (ctx.common.async) {
                return Promise.resolve(processed).then(async (processed) => {
                    if (status.value === "aborted")
                        return INVALID;
                    const result = await this._def.schema._parseAsync({
                        data: processed,
                        path: ctx.path,
                        parent: ctx,
                    });
                    if (result.status === "aborted")
                        return INVALID;
                    if (result.status === "dirty")
                        return DIRTY(result.value);
                    if (status.value === "dirty")
                        return DIRTY(result.value);
                    return result;
                });
            }
            else {
                if (status.value === "aborted")
                    return INVALID;
                const result = this._def.schema._parseSync({
                    data: processed,
                    path: ctx.path,
                    parent: ctx,
                });
                if (result.status === "aborted")
                    return INVALID;
                if (result.status === "dirty")
                    return DIRTY(result.value);
                if (status.value === "dirty")
                    return DIRTY(result.value);
                return result;
            }
        }
        if (effect.type === "refinement") {
            const executeRefinement = (acc) => {
                const result = effect.refinement(acc, checkCtx);
                if (ctx.common.async) {
                    return Promise.resolve(result);
                }
                if (result instanceof Promise) {
                    throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
                }
                return acc;
            };
            if (ctx.common.async === false) {
                const inner = this._def.schema._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (inner.status === "aborted")
                    return INVALID;
                if (inner.status === "dirty")
                    status.dirty();
                // return value is ignored
                executeRefinement(inner.value);
                return { status: status.value, value: inner.value };
            }
            else {
                return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
                    if (inner.status === "aborted")
                        return INVALID;
                    if (inner.status === "dirty")
                        status.dirty();
                    return executeRefinement(inner.value).then(() => {
                        return { status: status.value, value: inner.value };
                    });
                });
            }
        }
        if (effect.type === "transform") {
            if (ctx.common.async === false) {
                const base = this._def.schema._parseSync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (!isValid(base))
                    return INVALID;
                const result = effect.transform(base.value, checkCtx);
                if (result instanceof Promise) {
                    throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
                }
                return { status: status.value, value: result };
            }
            else {
                return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
                    if (!isValid(base))
                        return INVALID;
                    return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                        status: status.value,
                        value: result,
                    }));
                });
            }
        }
        util.assertNever(effect);
    }
}
ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params),
    });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params),
    });
};
class ZodOptional extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.undefined) {
            return OK(undefined);
        }
        return this._def.innerType._parse(input);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodOptional.create = (type, params) => {
    return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params),
    });
};
class ZodNullable extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.null) {
            return OK(null);
        }
        return this._def.innerType._parse(input);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodNullable.create = (type, params) => {
    return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params),
    });
};
class ZodDefault extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === ZodParsedType.undefined) {
            data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
            data,
            path: ctx.path,
            parent: ctx,
        });
    }
    removeDefault() {
        return this._def.innerType;
    }
}
ZodDefault.create = (type, params) => {
    return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function" ? params.default : () => params.default,
        ...processCreateParams(params),
    });
};
class ZodCatch extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        // newCtx is used to not collect issues from inner types in ctx
        const newCtx = {
            ...ctx,
            common: {
                ...ctx.common,
                issues: [],
            },
        };
        const result = this._def.innerType._parse({
            data: newCtx.data,
            path: newCtx.path,
            parent: {
                ...newCtx,
            },
        });
        if (isAsync(result)) {
            return result.then((result) => {
                return {
                    status: "valid",
                    value: result.status === "valid"
                        ? result.value
                        : this._def.catchValue({
                            get error() {
                                return new ZodError(newCtx.common.issues);
                            },
                            input: newCtx.data,
                        }),
                };
            });
        }
        else {
            return {
                status: "valid",
                value: result.status === "valid"
                    ? result.value
                    : this._def.catchValue({
                        get error() {
                            return new ZodError(newCtx.common.issues);
                        },
                        input: newCtx.data,
                    }),
            };
        }
    }
    removeCatch() {
        return this._def.innerType;
    }
}
ZodCatch.create = (type, params) => {
    return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params),
    });
};
class ZodNaN extends ZodType {
    _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.nan) {
            const ctx = this._getOrReturnCtx(input);
            addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: ZodParsedType.nan,
                received: ctx.parsedType,
            });
            return INVALID;
        }
        return { status: "valid", value: input.data };
    }
}
ZodNaN.create = (params) => {
    return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params),
    });
};
class ZodBranded extends ZodType {
    _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
            data,
            path: ctx.path,
            parent: ctx,
        });
    }
    unwrap() {
        return this._def.type;
    }
}
class ZodPipeline extends ZodType {
    _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
            const handleAsync = async () => {
                const inResult = await this._def.in._parseAsync({
                    data: ctx.data,
                    path: ctx.path,
                    parent: ctx,
                });
                if (inResult.status === "aborted")
                    return INVALID;
                if (inResult.status === "dirty") {
                    status.dirty();
                    return DIRTY(inResult.value);
                }
                else {
                    return this._def.out._parseAsync({
                        data: inResult.value,
                        path: ctx.path,
                        parent: ctx,
                    });
                }
            };
            return handleAsync();
        }
        else {
            const inResult = this._def.in._parseSync({
                data: ctx.data,
                path: ctx.path,
                parent: ctx,
            });
            if (inResult.status === "aborted")
                return INVALID;
            if (inResult.status === "dirty") {
                status.dirty();
                return {
                    status: "dirty",
                    value: inResult.value,
                };
            }
            else {
                return this._def.out._parseSync({
                    data: inResult.value,
                    path: ctx.path,
                    parent: ctx,
                });
            }
        }
    }
    static create(a, b) {
        return new ZodPipeline({
            in: a,
            out: b,
            typeName: ZodFirstPartyTypeKind.ZodPipeline,
        });
    }
}
class ZodReadonly extends ZodType {
    _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
            if (isValid(data)) {
                data.value = Object.freeze(data.value);
            }
            return data;
        };
        return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params),
    });
};
var ZodFirstPartyTypeKind;
(function (ZodFirstPartyTypeKind) {
    ZodFirstPartyTypeKind["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
const stringType = ZodString.create;
const numberType = ZodNumber.create;
const booleanType = ZodBoolean.create;
ZodNever.create;
const arrayType = ZodArray.create;
const objectType = ZodObject.create;
ZodUnion.create;
ZodIntersection.create;
ZodTuple.create;
const enumType = ZodEnum.create;
ZodPromise.create;
ZodOptional.create;
ZodNullable.create;

// Enum options arrays
const VAT_RATE_CODE_OPTIONS = [
    '4', '5', '10', '22', '2', '6.4', '7', '7.3', '7.5', '7.65', '7.95',
    '8.3', '8.5', '8.8', '9.5', '12.3', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6'
];
const GOOD_OR_SERVICE_OPTIONS = ['B', 'S'];
const RECEIPT_PROOF_TYPE_OPTIONS = ['POS', 'VR', 'ND'];
// Enum types for receipt validation
const VatRateCodeSchema = enumType(VAT_RATE_CODE_OPTIONS);
const GoodOrServiceSchema = enumType(GOOD_OR_SERVICE_OPTIONS);
const ReceiptProofTypeSchema = enumType(RECEIPT_PROOF_TYPE_OPTIONS);
// Receipt Item Schema
const ReceiptItemSchema = objectType({
    good_or_service: GoodOrServiceSchema.optional(),
    quantity: stringType().min(1, { message: 'fieldIsRequired' }),
    description: stringType().min(1, { message: 'fieldIsRequired' }),
    unit_price: stringType().min(1, { message: 'fieldIsRequired' }),
    vat_rate_code: VatRateCodeSchema.optional(),
    simplified_vat_allocation: booleanType().optional(),
    discount: stringType().nullable().optional(),
    is_down_payment_or_voucher_redemption: booleanType().optional(),
    complimentary: booleanType().optional(),
});
// Main Receipt Input Schema
objectType({
    items: arrayType(ReceiptItemSchema).min(1, { message: 'arrayMin1' }),
    customer_tax_code: stringType().optional(),
    customer_lottery_code: stringType().optional(),
    discount: stringType().nullable().optional(),
    invoice_issuing: booleanType().optional(),
    uncollected_dcr_to_ssn: booleanType().optional(),
    services_uncollected_amount: stringType().nullable().optional(),
    goods_uncollected_amount: stringType().nullable().optional(),
    cash_payment_amount: stringType().nullable().optional(),
    electronic_payment_amount: stringType().nullable().optional(),
    ticket_restaurant_payment_amount: stringType().nullable().optional(),
    ticket_restaurant_quantity: numberType().optional(),
}).refine((data) => {
    // At least one payment method should be provided
    const hasCashPayment = data.cash_payment_amount && parseFloat(data.cash_payment_amount) > 0;
    const hasElectronicPayment = data.electronic_payment_amount && parseFloat(data.electronic_payment_amount) > 0;
    const hasTicketPayment = data.ticket_restaurant_payment_amount && parseFloat(data.ticket_restaurant_payment_amount) > 0;
    return hasCashPayment || hasElectronicPayment || hasTicketPayment;
}, {
    message: 'At least one payment method is required',
    path: ['payment_methods']
});
// Receipt Return or Void via PEM Schema
objectType({
    pem_id: stringType().optional(),
    items: arrayType(ReceiptItemSchema).min(1, { message: 'arrayMin1' }),
    document_number: stringType().min(1, { message: 'fieldIsRequired' }),
    document_date: stringType().optional(),
    lottery_code: stringType().optional(),
});
// Receipt Return or Void with Proof Schema
objectType({
    items: arrayType(ReceiptItemSchema).min(1, { message: 'arrayMin1' }),
    proof: ReceiptProofTypeSchema,
    document_datetime: stringType().min(1, { message: 'fieldIsRequired' }),
});

// Cashier Create Input Schema
objectType({
    email: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .email({ message: 'invalidEmail' }),
    password: stringType()
        .min(8, { message: 'passwordMinLength' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'passwordComplexity'
    }),
});

// Enum options arrays
const PEM_STATUS_OPTIONS = ['NEW', 'REGISTERED', 'ACTIVE', 'ONLINE', 'OFFLINE', 'DISCARDED'];
// Address Schema (reusable)
const AddressSchema = objectType({
    street_address: stringType().min(1, { message: 'fieldIsRequired' }),
    zip_code: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .regex(/^\d{5}$/, { message: 'invalidZipCode' }),
    city: stringType().min(1, { message: 'fieldIsRequired' }),
    province: stringType()
        .min(2, { message: 'provinceMinLength' })
        .max(2, { message: 'provinceMaxLength' })
        .toUpperCase(),
});
// PEM Status Schema
enumType(PEM_STATUS_OPTIONS);
// Activation Request Schema
objectType({
    registration_key: stringType().min(1, { message: 'fieldIsRequired' }),
});
// PEM Status Offline Request Schema
objectType({
    timestamp: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .refine((val) => !isNaN(Date.parse(val)), {
        message: 'invalidDateFormat'
    }),
    reason: stringType().min(1, { message: 'fieldIsRequired' }),
});

// Cash Register Create Schema
objectType({
    pem_serial_number: stringType().min(1, { message: 'fieldIsRequired' }),
    name: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .max(100, { message: 'nameMaxLength' }),
});

// Italian Fiscal ID validation regex (Codice Fiscale for individuals or Partita IVA for companies)
const FISCAL_ID_REGEX = /^([A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]|[0-9]{11})$/;
// Merchant Create Input Schema
objectType({
    fiscal_id: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .regex(FISCAL_ID_REGEX, { message: 'invalidFiscalId' })
        .toUpperCase(),
    name: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .max(200, { message: 'nameMaxLength' }),
    email: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .email({ message: 'invalidEmail' }),
    password: stringType()
        .min(8, { message: 'passwordMinLength' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'passwordComplexity'
    }),
    address: AddressSchema.optional(),
});
// Merchant Update Input Schema
objectType({
    name: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .max(200, { message: 'nameMaxLength' }),
    address: AddressSchema.optional(),
});

// Enum options arrays
const PEM_TYPE_OPTIONS = ['AP', 'SP', 'TM', 'PV'];
// PEM Data Schema
const PemDataSchema = objectType({
    version: stringType().min(1, { message: 'fieldIsRequired' }),
    type: enumType(PEM_TYPE_OPTIONS, {
        message: 'invalidPemType'
    }),
});
// PEM Create Input Schema
objectType({
    merchant_uuid: stringType()
        .min(1, { message: 'fieldIsRequired' })
        .uuid({ message: 'invalidUuid' }),
    address: AddressSchema.optional(),
    external_pem_data: PemDataSchema.optional(),
});

/**
 * ACube SDK Context
 */
const ACubeContext = React.createContext(undefined);
/**
 * ACube SDK Provider Component
 */
function ACubeProvider({ config, children, onUserChanged, onAuthError, onNetworkStatusChanged, }) {
    const [sdk, setSDK] = React.useState(null);
    const [user, setUser] = React.useState(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isOnline, setIsOnline] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [pendingOperations, setPendingOperations] = React.useState(0);
    React.useEffect(() => {
        let mounted = true;
        let sdkInstance = null;
        async function initializeSDK() {
            try {
                setIsLoading(true);
                setError(null);
                const events = {
                    onUserChanged: (newUser) => {
                        if (mounted) {
                            setUser(newUser);
                            setIsAuthenticated(!!newUser);
                            onUserChanged?.(newUser);
                        }
                    },
                    onAuthError: (authError) => {
                        if (mounted) {
                            setError(authError);
                            setUser(null);
                            setIsAuthenticated(false);
                            onAuthError?.(authError);
                        }
                    },
                    onNetworkStatusChanged: (online) => {
                        if (mounted) {
                            setIsOnline(online);
                            onNetworkStatusChanged?.(online);
                        }
                    },
                    onOfflineOperationAdded: () => {
                        if (mounted && sdkInstance) {
                            setPendingOperations(sdkInstance.getOfflineManager().getPendingCount());
                        }
                    },
                    onOfflineOperationCompleted: () => {
                        if (mounted && sdkInstance) {
                            setPendingOperations(sdkInstance.getOfflineManager().getPendingCount());
                        }
                    },
                };
                // Create and initialize SDK
                sdkInstance = new ACubeSDK(config, undefined, events);
                await sdkInstance.initialize();
                if (mounted) {
                    setSDK(sdkInstance);
                    setIsOnline(sdkInstance.isOnline());
                    // Check if already authenticated
                    const authenticated = await sdkInstance.isAuthenticated();
                    setIsAuthenticated(authenticated);
                    if (authenticated) {
                        const currentUser = await sdkInstance.getCurrentUser();
                        setUser(currentUser);
                    }
                    // Get initial pending operations count
                    setPendingOperations(sdkInstance.getOfflineManager().getPendingCount());
                }
            }
            catch (err) {
                if (mounted) {
                    const sdkError = err instanceof ACubeSDKError
                        ? err
                        : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to initialize SDK', err);
                    setError(sdkError);
                }
            }
            finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }
        initializeSDK();
        return () => {
            mounted = false;
            if (sdkInstance) {
                sdkInstance.destroy();
            }
        };
    }, [config, onUserChanged, onAuthError, onNetworkStatusChanged]);
    const contextValue = {
        sdk,
        user,
        isAuthenticated,
        isLoading,
        isOnline,
        error,
        pendingOperations,
    };
    return (React.createElement(ACubeContext.Provider, { value: contextValue }, children));
}
/**
 * Hook to use ACube SDK context
 */
function useACube() {
    const context = React.useContext(ACubeContext);
    if (context === undefined) {
        throw new Error('useACube must be used within an ACubeProvider');
    }
    return context;
}

/**
 * Hook for authentication operations
 */
function useAuth() {
    const { sdk, user, isAuthenticated } = useACube();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const login = React.useCallback(async (credentials) => {
        if (!sdk) {
            const authError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
            setError(authError);
            return null;
        }
        try {
            setIsLoading(true);
            setError(null);
            const loggedInUser = await sdk.login(credentials);
            return loggedInUser;
        }
        catch (err) {
            const authError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('AUTH_ERROR', 'Login failed', err);
            setError(authError);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, [sdk]);
    const logout = React.useCallback(async () => {
        if (!sdk) {
            const authError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
            setError(authError);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            await sdk.logout();
        }
        catch (err) {
            const authError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('AUTH_ERROR', 'Logout failed', err);
            setError(authError);
        }
        finally {
            setIsLoading(false);
        }
    }, [sdk]);
    const clearError = React.useCallback(() => {
        setError(null);
    }, []);
    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        clearError,
    };
}

/**
 * Hook for receipt operations
 */
function useReceipts() {
    const { sdk, isOnline } = useACube();
    const [receipts, setReceipts] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const createReceipt = React.useCallback(async (receiptData) => {
        if (!sdk) {
            const receiptError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
            setError(receiptError);
            return null;
        }
        try {
            setIsLoading(true);
            setError(null);
            if (isOnline) {
                // Online: create immediately
                const receipt = await sdk.api.receipts.create(receiptData);
                // Add to local list
                setReceipts(prev => [receipt, ...prev]);
                return receipt;
            }
            else {
                // Offline: queue for later
                const operationId = await sdk.getOfflineManager().queueReceiptCreation(receiptData);
                // Create a temporary receipt object for optimistic UI
                const tempReceipt = {
                    uuid: operationId,
                    type: 'sale',
                    created_at: new Date().toISOString(),
                    total_amount: receiptData.items.reduce((sum, item) => {
                        const itemTotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
                        const discount = parseFloat(item.discount || '0');
                        return sum + itemTotal - discount;
                    }, 0).toFixed(2),
                };
                setReceipts(prev => [tempReceipt, ...prev]);
                return tempReceipt;
            }
        }
        catch (err) {
            const receiptError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to create receipt', err);
            setError(receiptError);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, [sdk, isOnline]);
    const voidReceipt = React.useCallback(async (voidData) => {
        if (!sdk) {
            const receiptError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
            setError(receiptError);
            return false;
        }
        try {
            setIsLoading(true);
            setError(null);
            if (isOnline) {
                // Online: void immediately
                await sdk.api.receipts.void(voidData);
                return true;
            }
            else {
                // Offline: queue for later
                await sdk.getOfflineManager().queueReceiptVoid(voidData);
                return true;
            }
        }
        catch (err) {
            const receiptError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to void receipt', err);
            setError(receiptError);
            return false;
        }
        finally {
            setIsLoading(false);
        }
    }, [sdk, isOnline]);
    const returnReceipt = React.useCallback(async (returnData) => {
        if (!sdk) {
            const receiptError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
            setError(receiptError);
            return null;
        }
        try {
            setIsLoading(true);
            setError(null);
            if (isOnline) {
                // Online: return immediately
                const receipt = await sdk.api.receipts.return(returnData);
                // Add to local list
                setReceipts(prev => [receipt, ...prev]);
                return receipt;
            }
            else {
                // Offline: queue for later
                const operationId = await sdk.getOfflineManager().queueReceiptReturn(returnData);
                // Create a temporary receipt object for optimistic UI
                const tempReceipt = {
                    uuid: operationId,
                    type: 'return',
                    created_at: new Date().toISOString(),
                    total_amount: returnData.items.reduce((sum, item) => {
                        const itemTotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
                        const discount = parseFloat(item.discount || '0');
                        return sum + itemTotal - discount;
                    }, 0).toFixed(2),
                };
                setReceipts(prev => [tempReceipt, ...prev]);
                return tempReceipt;
            }
        }
        catch (err) {
            const receiptError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to return receipt', err);
            setError(receiptError);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, [sdk, isOnline]);
    const getReceipt = React.useCallback(async (receiptUuid) => {
        if (!sdk || !isOnline) {
            return null;
        }
        try {
            setError(null);
            return await sdk.api.receipts.get(receiptUuid);
        }
        catch (err) {
            const receiptError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to get receipt', err);
            setError(receiptError);
            return null;
        }
    }, [sdk, isOnline]);
    const getReceiptDetails = React.useCallback(async (receiptUuid, format = 'json') => {
        if (!sdk || !isOnline) {
            return null;
        }
        try {
            setError(null);
            return await sdk.api.receipts.getDetails(receiptUuid, format);
        }
        catch (err) {
            const receiptError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to get receipt details', err);
            setError(receiptError);
            return null;
        }
    }, [sdk, isOnline]);
    const refreshReceipts = React.useCallback(async () => {
        if (!sdk || !isOnline) {
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const page = await sdk.api.receipts.list({ page: 1, size: 50 });
            setReceipts(page.members || []);
        }
        catch (err) {
            const receiptError = err instanceof ACubeSDKError
                ? err
                : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to refresh receipts', err);
            setError(receiptError);
        }
        finally {
            setIsLoading(false);
        }
    }, [sdk, isOnline]);
    const clearError = React.useCallback(() => {
        setError(null);
    }, []);
    // Load receipts on mount if online
    React.useEffect(() => {
        if (sdk && isOnline) {
            refreshReceipts();
        }
    }, [sdk, isOnline, refreshReceipts]);
    return {
        receipts,
        isLoading,
        error,
        createReceipt,
        voidReceipt,
        returnReceipt,
        getReceipt,
        getReceiptDetails,
        refreshReceipts,
        clearError,
    };
}

/**
 * Hook for offline operations management
 */
function useOffline() {
    const { sdk, isOnline, pendingOperations } = useACube();
    const sync = React.useCallback(async () => {
        if (!sdk) {
            return null;
        }
        return await sdk.getOfflineManager().sync();
    }, [sdk]);
    const retryFailed = React.useCallback(async () => {
        if (!sdk) {
            return;
        }
        await sdk.getOfflineManager().retryFailed();
    }, [sdk]);
    const clearCompleted = React.useCallback(async () => {
        if (!sdk) {
            return;
        }
        await sdk.getOfflineManager().clearCompleted();
    }, [sdk]);
    const clearFailed = React.useCallback(async () => {
        if (!sdk) {
            return;
        }
        await sdk.getOfflineManager().clearFailed();
    }, [sdk]);
    const clearAll = React.useCallback(async () => {
        if (!sdk) {
            return;
        }
        await sdk.getOfflineManager().clearAll();
    }, [sdk]);
    const getQueueStats = React.useCallback(() => {
        if (!sdk) {
            return null;
        }
        return sdk.getOfflineManager().getQueueStats();
    }, [sdk]);
    return {
        isOnline,
        pendingOperations,
        sync,
        retryFailed,
        clearCompleted,
        clearFailed,
        clearAll,
        getQueueStats,
    };
}

/**
 * Web storage adapter using localStorage
 */
class WebStorageAdapter {
    async get(key) {
        try {
            return localStorage.getItem(key);
        }
        catch {
            return null;
        }
    }
    async set(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch (error) {
            throw new Error(`Failed to store item: ${error}`);
        }
    }
    async remove(key) {
        try {
            localStorage.removeItem(key);
        }
        catch (error) {
            throw new Error(`Failed to remove item: ${error}`);
        }
    }
    async clear() {
        try {
            localStorage.clear();
        }
        catch (error) {
            throw new Error(`Failed to clear storage: ${error}`);
        }
    }
    async getAllKeys() {
        try {
            return Object.keys(localStorage);
        }
        catch {
            return [];
        }
    }
    async multiGet(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = await this.get(key);
        }
        return result;
    }
    async multiSet(items) {
        for (const [key, value] of Object.entries(items)) {
            await this.set(key, value);
        }
    }
    async multiRemove(keys) {
        for (const key of keys) {
            await this.remove(key);
        }
    }
}
/**
 * Web secure storage adapter using encrypted localStorage
 */
class WebSecureStorageAdapter {
    constructor() {
        // Generate or retrieve encryption key
        this.encryptionKey = this.getOrCreateEncryptionKey();
    }
    async get(key) {
        try {
            const encrypted = localStorage.getItem(this.getSecureKey(key));
            if (!encrypted)
                return null;
            return this.decrypt(encrypted);
        }
        catch {
            return null;
        }
    }
    async set(key, value) {
        try {
            const encrypted = this.encrypt(value);
            localStorage.setItem(this.getSecureKey(key), encrypted);
        }
        catch (error) {
            throw new Error(`Failed to store secure item: ${error}`);
        }
    }
    async remove(key) {
        try {
            localStorage.removeItem(this.getSecureKey(key));
        }
        catch (error) {
            throw new Error(`Failed to remove secure item: ${error}`);
        }
    }
    async clear() {
        try {
            const keys = Object.keys(localStorage);
            const secureKeys = keys.filter(key => key.startsWith('secure_'));
            secureKeys.forEach(key => localStorage.removeItem(key));
        }
        catch (error) {
            throw new Error(`Failed to clear secure storage: ${error}`);
        }
    }
    async getAllKeys() {
        try {
            const keys = Object.keys(localStorage);
            return keys
                .filter(key => key.startsWith('secure_'))
                .map(key => key.replace('secure_', ''));
        }
        catch {
            return [];
        }
    }
    async multiGet(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = await this.get(key);
        }
        return result;
    }
    async multiSet(items) {
        for (const [key, value] of Object.entries(items)) {
            await this.set(key, value);
        }
    }
    async multiRemove(keys) {
        for (const key of keys) {
            await this.remove(key);
        }
    }
    async isAvailable() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        }
        catch {
            return false;
        }
    }
    async getSecurityLevel() {
        return 'Basic encryption using Web Crypto API';
    }
    getSecureKey(key) {
        return `secure_${key}`;
    }
    getOrCreateEncryptionKey() {
        let key = localStorage.getItem(WebSecureStorageAdapter.ENCRYPTION_KEY);
        if (!key) {
            key = this.generateKey();
            localStorage.setItem(WebSecureStorageAdapter.ENCRYPTION_KEY, key);
        }
        return key;
    }
    generateKey() {
        // Simple key generation - in production, use crypto.getRandomValues()
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    encrypt(text) {
        // Simple XOR encryption - in production, use Web Crypto API
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
            const textChar = text.charCodeAt(i);
            result += String.fromCharCode(textChar ^ keyChar);
        }
        return btoa(result);
    }
    decrypt(encrypted) {
        const text = atob(encrypted);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
            const textChar = text.charCodeAt(i);
            result += String.fromCharCode(textChar ^ keyChar);
        }
        return result;
    }
}
WebSecureStorageAdapter.ENCRYPTION_KEY = 'acube_secure_key';

var storage$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    WebSecureStorageAdapter: WebSecureStorageAdapter,
    WebStorageAdapter: WebStorageAdapter
});

/**
 * Web network monitor using navigator.onLine and Network Information API
 */
class WebNetworkMonitor {
    constructor() {
        this.listeners = [];
        this.handleOnline = () => {
            this.notifyListeners(true);
        };
        this.handleOffline = () => {
            this.notifyListeners(false);
        };
        // Set up global event listeners
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
        }
    }
    isOnline() {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            return navigator.onLine;
        }
        // Fallback to true if navigator is not available
        return true;
    }
    onStatusChange(callback) {
        this.listeners.push(callback);
        // Return cleanup function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    async getNetworkInfo() {
        // Use Network Information API if available
        if ('connection' in navigator) {
            const connection = navigator.connection;
            return {
                type: this.mapConnectionType(connection.type),
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
            };
        }
        // Fallback to basic info
        return {
            type: this.isOnline() ? 'unknown' : 'unknown',
        };
    }
    notifyListeners(online) {
        this.listeners.forEach(callback => {
            try {
                callback(online);
            }
            catch (error) {
                console.error('Error in network status callback:', error);
            }
        });
    }
    mapConnectionType(type) {
        switch (type) {
            case 'wifi':
                return 'wifi';
            case 'cellular':
            case '2g':
            case '3g':
            case '4g':
            case '5g':
                return 'cellular';
            case 'ethernet':
                return 'ethernet';
            default:
                return 'unknown';
        }
    }
    /**
     * Cleanup method to remove event listeners
     */
    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
        this.listeners = [];
    }
}

var network$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    WebNetworkMonitor: WebNetworkMonitor
});

/**
 * React Native storage adapter using AsyncStorage
 */
class ReactNativeStorageAdapter {
    constructor() {
        this.initializeAsyncStorage();
    }
    async initializeAsyncStorage() {
        try {
            // Try to require AsyncStorage - avoid dynamic import for Metro compatibility
            const AsyncStorageModule = require('@react-native-async-storage/async-storage');
            this.AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
        }
        catch {
            // Fallback to legacy AsyncStorage if available
            try {
                const ReactNative = require('react-native');
                this.AsyncStorage = ReactNative.AsyncStorage;
            }
            catch {
                throw new Error('AsyncStorage not available. Please install @react-native-async-storage/async-storage');
            }
        }
    }
    async get(key) {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            return await this.AsyncStorage.getItem(key);
        }
        catch (error) {
            console.error('Failed to get item from AsyncStorage:', error);
            return null;
        }
    }
    async set(key, value) {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            await this.AsyncStorage.setItem(key, value);
        }
        catch (error) {
            throw new Error(`Failed to store item: ${error}`);
        }
    }
    async remove(key) {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            await this.AsyncStorage.removeItem(key);
        }
        catch (error) {
            throw new Error(`Failed to remove item: ${error}`);
        }
    }
    async clear() {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            await this.AsyncStorage.clear();
        }
        catch (error) {
            throw new Error(`Failed to clear storage: ${error}`);
        }
    }
    async getAllKeys() {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            return await this.AsyncStorage.getAllKeys();
        }
        catch (error) {
            console.error('Failed to get all keys:', error);
            return [];
        }
    }
    async multiGet(keys) {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            const pairs = await this.AsyncStorage.multiGet(keys);
            const result = {};
            pairs.forEach(([key, value]) => {
                result[key] = value;
            });
            return result;
        }
        catch (error) {
            console.error('Failed to get multiple items:', error);
            const result = {};
            keys.forEach(key => {
                result[key] = null;
            });
            return result;
        }
    }
    async multiSet(items) {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            const pairs = Object.entries(items);
            await this.AsyncStorage.multiSet(pairs);
        }
        catch (error) {
            throw new Error(`Failed to store multiple items: ${error}`);
        }
    }
    async multiRemove(keys) {
        if (!this.AsyncStorage)
            await this.initializeAsyncStorage();
        try {
            await this.AsyncStorage.multiRemove(keys);
        }
        catch (error) {
            throw new Error(`Failed to remove multiple items: ${error}`);
        }
    }
}
/**
 * React Native secure storage adapter using expo-secure-store or react-native-keychain
 */
class ReactNativeSecureStorageAdapter {
    constructor() {
        this.isExpo = false;
        this.initializeSecureStorage();
    }
    async initializeSecureStorage() {
        // Try to initialize Expo SecureStore first
        try {
            // Use require() instead of dynamic import() to avoid Metro bundling issues
            const SecureStore = require('expo-secure-store');
            this.secureStore = SecureStore;
            this.isExpo = true;
            return;
        }
        catch (error) {
            // expo-secure-store not available, continue to fallback
            console.log('expo-secure-store not available, trying react-native-keychain');
        }
        // Fallback to react-native-keychain
        try {
            const Keychain = require('react-native-keychain');
            this.keychain = Keychain;
            this.isExpo = false;
            return;
        }
        catch (error) {
            // react-native-keychain not available
            console.error('react-native-keychain not available');
        }
        throw new Error('No secure storage available. Please install expo-secure-store or react-native-keychain');
    }
    async get(key) {
        if (!this.secureStore && !this.keychain) {
            await this.initializeSecureStorage();
        }
        try {
            if (this.isExpo && this.secureStore) {
                return await this.secureStore.getItemAsync(key);
            }
            else if (this.keychain) {
                const credentials = await this.keychain.getInternetCredentials(key);
                return credentials ? credentials.password : null;
            }
        }
        catch (error) {
            console.error('Failed to get secure item:', error);
        }
        return null;
    }
    async set(key, value) {
        if (!this.secureStore && !this.keychain) {
            await this.initializeSecureStorage();
        }
        try {
            if (this.isExpo && this.secureStore) {
                await this.secureStore.setItemAsync(key, value);
            }
            else if (this.keychain) {
                await this.keychain.setInternetCredentials(key, key, value);
            }
        }
        catch (error) {
            throw new Error(`Failed to store secure item: ${error}`);
        }
    }
    async remove(key) {
        if (!this.secureStore && !this.keychain) {
            await this.initializeSecureStorage();
        }
        try {
            if (this.isExpo && this.secureStore) {
                await this.secureStore.deleteItemAsync(key);
            }
            else if (this.keychain) {
                await this.keychain.resetInternetCredentials(key);
            }
        }
        catch (error) {
            throw new Error(`Failed to remove secure item: ${error}`);
        }
    }
    async clear() {
        // Note: This is a simplified implementation
        // In a real implementation, you'd need to track keys or use a different approach
        console.warn('Clear all secure items not fully implemented for React Native');
    }
    async getAllKeys() {
        // Note: This is not easily implementable with current secure storage solutions
        // You would need to maintain a separate index of keys
        console.warn('Get all secure keys not implemented for React Native');
        return [];
    }
    async multiGet(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = await this.get(key);
        }
        return result;
    }
    async multiSet(items) {
        for (const [key, value] of Object.entries(items)) {
            await this.set(key, value);
        }
    }
    async multiRemove(keys) {
        for (const key of keys) {
            await this.remove(key);
        }
    }
    async isAvailable() {
        try {
            await this.initializeSecureStorage();
            return true;
        }
        catch {
            return false;
        }
    }
    async getSecurityLevel() {
        if (this.isExpo) {
            return 'Expo SecureStore (iOS Keychain / Android EncryptedSharedPreferences)';
        }
        else {
            return 'React Native Keychain (iOS Keychain / Android Keystore)';
        }
    }
}

var storage$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ReactNativeSecureStorageAdapter: ReactNativeSecureStorageAdapter,
    ReactNativeStorageAdapter: ReactNativeStorageAdapter
});

/**
 * React Native network monitor using @react-native-community/netinfo
 */
class ReactNativeNetworkMonitor {
    constructor() {
        this.listeners = [];
        this.unsubscribe = null;
        this.currentState = true;
        this.initializeNetInfo();
    }
    async initializeNetInfo() {
        try {
            // Try to require NetInfo - avoid dynamic import for Metro compatibility
            const NetInfoModule = require('@react-native-community/netinfo');
            this.NetInfo = NetInfoModule.default || NetInfoModule;
            // Subscribe to network state changes
            this.subscribeToNetworkState();
        }
        catch (error) {
            console.warn('NetInfo not available. Network monitoring will be limited:', error);
        }
    }
    subscribeToNetworkState() {
        if (!this.NetInfo)
            return;
        this.unsubscribe = this.NetInfo.addEventListener((state) => {
            const isOnline = state.isConnected && state.isInternetReachable !== false;
            if (isOnline !== this.currentState) {
                this.currentState = isOnline;
                this.notifyListeners(isOnline);
            }
        });
    }
    isOnline() {
        return this.currentState;
    }
    onStatusChange(callback) {
        this.listeners.push(callback);
        // Initialize NetInfo if not already done
        if (!this.NetInfo) {
            this.initializeNetInfo();
        }
        // Return cleanup function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    async getNetworkInfo() {
        if (!this.NetInfo) {
            await this.initializeNetInfo();
        }
        if (!this.NetInfo) {
            return null;
        }
        try {
            const state = await this.NetInfo.fetch();
            return {
                type: this.mapConnectionType(state.type),
                effectiveType: this.mapEffectiveType(state.details?.cellularGeneration),
            };
        }
        catch (error) {
            console.error('Failed to get network info:', error);
            return null;
        }
    }
    notifyListeners(online) {
        this.listeners.forEach(callback => {
            try {
                callback(online);
            }
            catch (error) {
                console.error('Error in network status callback:', error);
            }
        });
    }
    mapConnectionType(type) {
        switch (type) {
            case 'wifi':
                return 'wifi';
            case 'cellular':
                return 'cellular';
            case 'ethernet':
                return 'ethernet';
            case 'none':
            case 'unknown':
            default:
                return 'unknown';
        }
    }
    mapEffectiveType(generation) {
        switch (generation) {
            case '2g':
                return '2g';
            case '3g':
                return '3g';
            case '4g':
                return '4g';
            case '5g':
                return '5g';
            default:
                return undefined;
        }
    }
    /**
     * Cleanup method to remove listeners and unsubscribe
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.listeners = [];
    }
}

var network$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ReactNativeNetworkMonitor: ReactNativeNetworkMonitor
});

/**
 * Node.js storage adapter using in-memory storage (for testing)
 */
class NodeStorageAdapter {
    constructor() {
        this.storage = new Map();
    }
    async get(key) {
        return this.storage.get(key) || null;
    }
    async set(key, value) {
        this.storage.set(key, value);
    }
    async remove(key) {
        this.storage.delete(key);
    }
    async clear() {
        this.storage.clear();
    }
    async getAllKeys() {
        return Array.from(this.storage.keys());
    }
    async multiGet(keys) {
        const result = {};
        keys.forEach(key => {
            result[key] = this.storage.get(key) || null;
        });
        return result;
    }
    async multiSet(items) {
        Object.entries(items).forEach(([key, value]) => {
            this.storage.set(key, value);
        });
    }
    async multiRemove(keys) {
        keys.forEach(key => {
            this.storage.delete(key);
        });
    }
}
/**
 * Node.js secure storage adapter using in-memory storage (for testing)
 * In production, this should use OS-specific secure storage
 */
class NodeSecureStorageAdapter {
    constructor() {
        this.secureStorage = new Map();
    }
    async get(key) {
        return this.secureStorage.get(key) || null;
    }
    async set(key, value) {
        this.secureStorage.set(key, value);
    }
    async remove(key) {
        this.secureStorage.delete(key);
    }
    async clear() {
        this.secureStorage.clear();
    }
    async getAllKeys() {
        return Array.from(this.secureStorage.keys());
    }
    async multiGet(keys) {
        const result = {};
        keys.forEach(key => {
            result[key] = this.secureStorage.get(key) || null;
        });
        return result;
    }
    async multiSet(items) {
        Object.entries(items).forEach(([key, value]) => {
            this.secureStorage.set(key, value);
        });
    }
    async multiRemove(keys) {
        keys.forEach(key => {
            this.secureStorage.delete(key);
        });
    }
    async isAvailable() {
        return true;
    }
    async getSecurityLevel() {
        return 'In-memory storage (testing only - not secure)';
    }
}

var storage = /*#__PURE__*/Object.freeze({
    __proto__: null,
    NodeSecureStorageAdapter: NodeSecureStorageAdapter,
    NodeStorageAdapter: NodeStorageAdapter
});

/**
 * Node.js network monitor (basic implementation)
 */
class NodeNetworkMonitor {
    constructor() {
        this.listeners = [];
        this.isConnected = true;
    }
    isOnline() {
        return this.isConnected;
    }
    onStatusChange(callback) {
        this.listeners.push(callback);
        // Return cleanup function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    async getNetworkInfo() {
        // Basic implementation - in production, could use system-specific APIs
        return {
            type: 'ethernet', // Assume ethernet for Node.js
        };
    }
    /**
     * Manually set network status (for testing)
     */
    setNetworkStatus(online) {
        if (online !== this.isConnected) {
            this.isConnected = online;
            this.notifyListeners(online);
        }
    }
    notifyListeners(online) {
        this.listeners.forEach(callback => {
            try {
                callback(online);
            }
            catch (error) {
                console.error('Error in network status callback:', error);
            }
        });
    }
    /**
     * Cleanup method
     */
    destroy() {
        this.listeners = [];
    }
}

var network = /*#__PURE__*/Object.freeze({
    __proto__: null,
    NodeNetworkMonitor: NodeNetworkMonitor
});

exports.ACubeProvider = ACubeProvider;
exports.useACube = useACube;
exports.useAuth = useAuth;
exports.useOffline = useOffline;
exports.useReceipts = useReceipts;
//# sourceMappingURL=react.cjs.js.map
