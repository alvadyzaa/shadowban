import type { CheckResult } from '../types';

// This is a template for the REAL implementation using a proxy service.
// In a production environment, you would call your backend API which then rotates proxies
// to scrape Twitter or uses a commercial API like ScraperAPI/BrightData.

export const checkShadowbanReal = async (username: string): Promise<CheckResult> => {
  try {
    const response = await fetch('/api/shadow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch data from backend');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Real check failed:", error);
    throw error;
  }
};

export const checkShadowbanMock = async (username: string): Promise<CheckResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isBanned = username.toLowerCase().includes('ban');
      const isGhost = username.toLowerCase().includes('ghost');
      
      resolve({
        username,
        exists: true,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        profileImageUrl: `https://unavatar.io/twitter/${username}`,
        followersCount: Math.floor(Math.random() * 10000),
        followingCount: Math.floor(Math.random() * 1000),
        tests: {
          searchSuggestion: !isBanned,
          searchBan: !isBanned,
          ghostBan: !isGhost,
        },
        timestamp: new Date().toISOString(),
      });
    }, 1500);
  });
};
