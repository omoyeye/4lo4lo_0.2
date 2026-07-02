
import NodeCache from 'node-cache';

// Create cache instances with TTL in seconds
export const taskCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
export const userCache = new NodeCache({ stdTTL: 60 }); // 1 minute
export const dashboardCache = new NodeCache({ stdTTL: 30 }); // 30 seconds

// Cache keys
export const cacheKeys = {
  task: (id: number) => `task:${id}`,
  allTasks: 'all:tasks',
  user: (id: number) => `user:${id}`,
  dashboard: (userId: number) => `dashboard:${userId}`,
  dashboardStats: 'dashboard:stats',
};
