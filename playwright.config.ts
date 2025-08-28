import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Give tests a much longer timeout
  timeout: 90000, // 90 seconds
  
  expect: {
    // Shorter timeout for individual assertions
    timeout: 10000, // 10 seconds
  },

  // Ensure tests run one at a time
  workers: 1, 
});