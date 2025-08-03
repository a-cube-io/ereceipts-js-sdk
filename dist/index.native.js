import axios from 'axios';

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
                roles: jwtPayload.roles,
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
                roles: jwtPayload.roles,
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
    async list(params = {}) {
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
/**
 * Create and initialize ACube SDK
 */
async function createACubeSDK(config, customAdapters, events) {
    const sdk = new ACubeSDK(config, customAdapters, events);
    await sdk.initialize();
    return sdk;
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

export { ACubeSDK, ACubeSDKError, APIClient, AuthManager, CashRegistersAPI, CashiersAPI, ConfigManager, HttpClient, MerchantsAPI, OfflineManager, OperationQueue, PemsAPI, PointOfSalesAPI, ReceiptsAPI, SyncManager, createACubeSDK, createACubeSDK as default, detectPlatform, loadPlatformAdapters };
//# sourceMappingURL=index.native.js.map
