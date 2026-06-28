import { defineStore } from 'pinia';
import { ref } from 'vue';
import { subscriptionApi, type Subscription, type SubscriptionCreateInput, type SubscriptionUpdateInput } from '@/api/subscription';

export const useSubscriptionStore = defineStore('subscription', () => {
  const subscriptions = ref<Subscription[]>([]);
  const currentSubscription = ref<Subscription | null>(null);
  const loading = ref(false);
  const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  async function fetchSubscriptions(params?: { page?: number; limit?: number; categoryId?: number }) {
    loading.value = true;
    try {
      const res = await subscriptionApi.list(params);
      subscriptions.value = res.data.list;
      pagination.value = res.data.pagination;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSubscription(id: number) {
    loading.value = true;
    try {
      const res = await subscriptionApi.get(id);
      currentSubscription.value = res.data;
      return res.data;
    } finally {
      loading.value = false;
    }
  }

  async function createSubscription(data: SubscriptionCreateInput) {
    const res = await subscriptionApi.create(data);
    return res.data;
  }

  async function fetchAllSubscriptions() {
    const res = await subscriptionApi.list({ page: 1, limit: 100 });
    return res.data.list;
  }

  async function updateSubscription(id: number, data: SubscriptionUpdateInput) {
    const res = await subscriptionApi.update(id, data);
    return res.data;
  }

  async function deleteSubscription(id: number) {
    await subscriptionApi.delete(id);
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id);
  }

  return {
    subscriptions,
    currentSubscription,
    loading,
    pagination,
    fetchSubscriptions,
    fetchSubscription,
    fetchAllSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
  };
});
