import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable
} from "@nestjs/common";
import { API_CONFIG, type ApiConfig } from "../config/api-config.js";

type RateLimitedRequest = {
  readonly ip?: string;
  readonly method?: string;
  readonly routeOptions?: {
    readonly url?: string;
  };
  readonly url?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RateLimitedRequest>();
    const now = Date.now();
    const windowMs = this.config.apiRateLimitWindowSeconds * 1000;
    const key = buildRateLimitKey(request);
    const currentBucket = this.buckets.get(key);

    this.deleteExpiredBuckets(now);

    if (!currentBucket || currentBucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });

      return true;
    }

    currentBucket.count += 1;

    if (currentBucket.count > this.config.apiRateLimitMaxRequests) {
      throw new HttpException("Too many requests.", HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private deleteExpiredBuckets(now: number): void {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

function buildRateLimitKey(request: RateLimitedRequest): string {
  const ip = request.ip ?? "unknown";
  const method = request.method ?? "UNKNOWN";
  const route = request.routeOptions?.url ?? request.url ?? "UNKNOWN";

  return `${ip}:${method}:${route}`;
}
