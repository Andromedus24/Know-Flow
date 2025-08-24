import { User } from '../types';

// Enhanced API configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Enhanced error types
export interface APIError {
  success: false;
  error: string;
  details?: string;
  timestamp: string;
  requestId?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  message?: string;
}

// Enhanced request options
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
}

// Enhanced API client class
class APIClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config = API_CONFIG) {
    this.baseURL = config.BASE_URL;
    this.timeout = config.TIMEOUT;
    this.retryAttempts = config.RETRY_ATTEMPTS;
    this.retryDelay = config.RETRY_DELAY;
  }

  // Enhanced request method with retry logic
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      retryAttempts = this.retryAttempts,
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add authentication header if user is logged in
    const user = this.getCurrentUser();
    if (user?.uid) {
      requestHeaders['Authorization'] = `Bearer ${user.uid}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  // Retry wrapper for requests
  private async withRetry<T>(
    requestFn: () => Promise<APIResponse<T>>,
    attempts: number
  ): Promise<APIResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempts > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        return this.withRetry(requestFn, attempts - 1);
      }
      throw error;
    }
  }

  // Check if error is retryable
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'Request timeout',
      'Network error',
      'Failed to fetch',
      'ECONNRESET',
      'ETIMEDOUT',
    ];
    
    return retryableErrors.some(retryableError => 
      error.message?.includes(retryableError)
    );
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current user from localStorage or context
  private getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('knowflow_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request('/health'),
      this.retryAttempts
    );
  }

  // Enhanced user prompt endpoint
  async generateLearningPlan(
    userId: string,
    prompt: string,
    context?: Record<string, any>
  ): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request('/api/user-prompt', {
        method: 'POST',
        body: {
          userId,
          prompt,
          context,
          learningStyle: 'adaptive',
        },
      }),
      this.retryAttempts
    );
  }

  // Get user learning plans with pagination
  async getUserPlans(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<APIResponse<any>> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const endpoint = `/api/user/${userId}/plans${params.toString() ? `?${params.toString()}` : ''}`;
    
    return this.withRetry(
      () => this.request(endpoint),
      this.retryAttempts
    );
  }

  // Get user analytics
  async getUserAnalytics(
    userId: string,
    timeframe: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request(`/api/user/${userId}/analytics?timeframe=${timeframe}`),
      this.retryAttempts
    );
  }

  // Create learning session
  async createLearningSession(
    userId: string,
    sessionData: {
      planId: string;
      startTime: Date;
      duration?: number;
      concepts?: string[];
    }
  ): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request(`/api/user/${userId}/sessions`, {
        method: 'POST',
        body: sessionData,
      }),
      this.retryAttempts
    );
  }

  // Update learning progress
  async updateProgress(
    userId: string,
    progressData: {
      conceptId: string;
      masteryLevel: number;
      completed: boolean;
      timeSpent: number;
    }
  ): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request(`/api/user/${userId}/progress`, {
        method: 'POST',
        body: progressData,
      }),
      this.retryAttempts
    );
  }

  // Get personalized recommendations
  async getRecommendations(
    userId: string,
    options: {
      limit?: number;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      topics?: string[];
    } = {}
  ): Promise<APIResponse<any>> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.difficulty) params.append('difficulty', options.difficulty);
    if (options.topics) params.append('topics', options.topics.join(','));

    const endpoint = `/api/user/${userId}/recommendations${params.toString() ? `?${params.toString()}` : ''}`;
    
    return this.withRetry(
      () => this.request(endpoint),
      this.retryAttempts
    );
  }

  // Search learning content
  async searchContent(
    query: string,
    options: {
      limit?: number;
      difficulty?: string;
      topics?: string[];
    } = {}
  ): Promise<APIResponse<any>> {
    const params = new URLSearchParams({ query });
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.difficulty) params.append('difficulty', options.difficulty);
    if (options.topics) params.append('topics', options.topics.join(','));

    return this.withRetry(
      () => this.request(`/api/search/content?${params.toString()}`),
      this.retryAttempts
    );
  }

  // Batch operations
  async batchGeneratePlans(
    userPrompts: Array<{
      userId: string;
      prompt: string;
      context?: Record<string, any>;
    }>
  ): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request('/api/batch/generate-plans', {
        method: 'POST',
        body: { prompts: userPrompts },
      }),
      this.retryAttempts
    );
  }

  // Export user data
  async exportUserData(userId: string): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request(`/api/user/${userId}/export`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }),
      this.retryAttempts
    );
  }

  // Import user data
  async importUserData(
    userId: string,
    data: Record<string, any>
  ): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request(`/api/user/${userId}/import`, {
        method: 'POST',
        body: data,
      }),
      this.retryAttempts
    );
  }

  // Get system status
  async getSystemStatus(): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request('/api/system/status'),
      this.retryAttempts
    );
  }

  // Get API metrics
  async getAPIMetrics(): Promise<APIResponse<any>> {
    return this.withRetry(
      () => this.request('/api/system/metrics'),
      this.retryAttempts
    );
  }
}

// Create and export API client instance
export const apiClient = new APIClient();

// Export individual API functions for backward compatibility
export const {
  healthCheck,
  generateLearningPlan,
  getUserPlans,
  getUserAnalytics,
  createLearningSession,
  updateProgress,
  getRecommendations,
  searchContent,
  batchGeneratePlans,
  exportUserData,
  importUserData,
  getSystemStatus,
  getAPIMetrics,
} = apiClient;

// Enhanced error handling utilities
export class APIErrorHandler {
  static handle(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.error) {
      return error.error;
    }
    
    return 'An unexpected error occurred';
  }

  static isNetworkError(error: any): boolean {
    return error?.message?.includes('Network error') || 
           error?.message?.includes('Failed to fetch') ||
           error?.message?.includes('Request timeout');
  }

  static isAuthError(error: any): boolean {
    return error?.message?.includes('Unauthorized') || 
           error?.message?.includes('Authentication failed');
  }

  static isValidationError(error: any): boolean {
    return error?.message?.includes('Validation Error') || 
           error?.message?.includes('Invalid input');
  }
}

// Enhanced response utilities
export class APIResponseHandler {
  static isSuccess<T>(response: APIResponse<T>): response is APIResponse<T> & { success: true; data: T } {
    return response.success === true && response.data !== undefined;
  }

  static isError<T>(response: APIResponse<T>): response is APIResponse<T> & { success: false; error: APIError } {
    return response.success === false && response.error !== undefined;
  }

  static getData<T>(response: APIResponse<T>): T | null {
    return this.isSuccess(response) ? response.data : null;
  }

  static getError(response: APIResponse<any>): string | null {
    return this.isError(response) ? response.error.error : null;
  }
}

// Export types for use in components
export type { APIResponse, APIError, RequestOptions };
export default apiClient;
