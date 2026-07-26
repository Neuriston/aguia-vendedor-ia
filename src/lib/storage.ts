import { Product, Customer, Proposal, OwnerNotification, SystemSettings } from '../types';
import { initialProducts, initialCustomers, initialProposals, initialNotifications, initialSettings } from '../data/mockData';
import { firestoreService } from '../services/FirestoreService';
import { productService } from '../services/ProductService';

const KEYS = {
  PRODUCTS: 'aguia_vendedor_products',
  CUSTOMERS: 'aguia_vendedor_customers',
  PROPOSALS: 'aguia_vendedor_proposals',
  NOTIFICATIONS: 'aguia_vendedor_notifications',
  SETTINGS: 'aguia_vendedor_settings',
};

export function getStoredProducts(): Product[] {
  try {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    let list: Product[] = [];
    if (!data) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(initialProducts));
      list = initialProducts;
    } else {
      list = JSON.parse(data);
    }

    // Sync to Firestore products collection & AI knowledge base
    list.forEach((p) => {
      firestoreService.saveProduct(p);
      productService.syncProductWithAI(p);
    });

    return list;
  } catch (e) {
    console.error('Error loading products from storage', e);
    return initialProducts;
  }
}

export function saveProducts(products: Product[]): void {
  try {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    products.forEach((p) => {
      firestoreService.saveProduct(p);
      productService.syncProductWithAI(p);
    });
  } catch (e) {
    console.error('Error saving products', e);
  }
}

export function getStoredCustomers(): Customer[] {
  try {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
    if (!data) {
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
      return initialCustomers;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading customers', e);
    return initialCustomers;
  }
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers', e);
  }
}

export function getStoredProposals(): Proposal[] {
  try {
    const data = localStorage.getItem(KEYS.PROPOSALS);
    if (!data) {
      localStorage.setItem(KEYS.PROPOSALS, JSON.stringify(initialProposals));
      return initialProposals;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading proposals', e);
    return initialProposals;
  }
}

export function saveProposals(proposals: Proposal[]): void {
  try {
    localStorage.setItem(KEYS.PROPOSALS, JSON.stringify(proposals));
  } catch (e) {
    console.error('Error saving proposals', e);
  }
}

export function getStoredNotifications(): OwnerNotification[] {
  try {
    const data = localStorage.getItem(KEYS.NOTIFICATIONS);
    if (!data) {
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(initialNotifications));
      return initialNotifications;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading notifications', e);
    return initialNotifications;
  }
}

export function saveNotifications(notifications: OwnerNotification[]): void {
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (e) {
    console.error('Error saving notifications', e);
  }
}

export function getStoredSettings(): SystemSettings {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(initialSettings));
      return initialSettings;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading settings', e);
    return initialSettings;
  }
}

export function saveSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function resetToSeedData(): void {
  localStorage.clear();
}
