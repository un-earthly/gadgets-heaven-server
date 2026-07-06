import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
    tenantId: string;
    slug: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getTenantId(): string | undefined {
    return tenantStorage.getStore()?.tenantId;
}

export function getTenantSlug(): string | undefined {
    return tenantStorage.getStore()?.slug;
}
