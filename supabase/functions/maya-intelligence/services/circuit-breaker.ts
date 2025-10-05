/**
 * CIRCUIT BREAKER SERVICE - Day 5-6
 * 
 * Provides resilience for LLM calls with automatic fallback
 * to the KISS classifier when OpenAI fails.
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold || 5,
      successThreshold: config?.successThreshold || 2,
      timeout: config?.timeout || 30000, // 30s
      resetTimeout: config?.resetTimeout || 60000, // 1 minute
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        console.log('⚠️ [CIRCUIT_BREAKER] Circuit OPEN - using fallback');
        return await fallback();
      }
      // Time to try again
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      console.log('🔄 [CIRCUIT_BREAKER] Circuit HALF_OPEN - attempting recovery');
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      console.log('❌ [CIRCUIT_BREAKER] Operation failed - using fallback');
      return await fallback();
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
      ),
    ]);
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        console.log('✅ [CIRCUIT_BREAKER] Circuit CLOSED - recovered');
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      console.log(
        `🔴 [CIRCUIT_BREAKER] Circuit OPEN - will retry in ${this.config.resetTimeout / 1000}s`
      );
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Manually reset circuit
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
    console.log('🔄 [CIRCUIT_BREAKER] Circuit manually reset');
  }
}
