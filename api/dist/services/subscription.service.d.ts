import type { SubscriptionCreateInput, SubscriptionUpdateInput, SubscriptionResponse } from '../models/subscription';
export declare class SubscriptionService {
    create(input: SubscriptionCreateInput): Promise<SubscriptionResponse>;
    getByUserId(userId: number, categoryId?: number): Promise<SubscriptionResponse[]>;
    getById(id: number): Promise<SubscriptionResponse | null>;
    update(id: number, userId: number, input: SubscriptionUpdateInput): Promise<SubscriptionResponse | null>;
    delete(id: number, userId: number): Promise<boolean>;
    getArticleStats(subscriptionId: number): Promise<{
        total: number;
        unread: number;
    }>;
    private toResponse;
}
export declare const subscriptionService: SubscriptionService;
//# sourceMappingURL=subscription.service.d.ts.map