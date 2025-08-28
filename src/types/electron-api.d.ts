declare global {
  interface Window {
    electronAPI: {
      onAuthSuccess: (profile: any) => void;
      // Add other methods as needed
    };
  }
}

export {};
