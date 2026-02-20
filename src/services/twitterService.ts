import type { CheckResult } from '../types';

// This is a template for the REAL implementation using a proxy service.
// In a production environment, you would call your backend API which then rotates proxies
// to scrape Twitter or uses a commercial API like ScraperAPI/BrightData.

export const checkShadowbanReal = async (username: string): Promise<CheckResult> => {
  if (import.meta.env?.DEV) {
    try {
      const yuzuRes = await fetch(`https://shadowban-api.yuzurisa.com/${username}`);
      if (!yuzuRes.ok) throw new Error('API failed');
      const data = await yuzuRes.json();
      
      if (!data.profile || !data.profile.exists) {
        return {
           exists: false, username, tests: { searchSuggestion: false, searchBan: false, ghostBan: false }, timestamp: new Date().toISOString()
        };
      }
      
      const tests = data.tests || {};
      let profileImageUrl = `https://unavatar.io/twitter/${data.profile.screen_name || username}`;
      let followersCount = 0;
      let followingCount = 0;
      
      try {
        const vxRes = await fetch(`https://api.vxtwitter.com/${data.profile.screen_name || username}`);
        if (vxRes.ok) {
           const vxData = await vxRes.json();
           profileImageUrl = vxData.profile_image_url ? vxData.profile_image_url.replace('_normal', '_400x400') : profileImageUrl;
           followersCount = vxData.followers_count || 0;
           followingCount = vxData.following_count || 0;
        }
      } catch (e) {
        console.warn('vxtwitter fetch failed in dev mode');
      }

      // Proxy image via blob base64 to avoid Canvas Tainted Canvas local errors
      try {
        const imgBlob = await fetch(profileImageUrl).then(r => r.blob());
        const reader = new FileReader();
        profileImageUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imgBlob);
        });
      } catch (e) {
        console.warn('Local blob proxy failed');
      }

      return {
        username: data.profile.screen_name || username,
        displayName: data.profile.name || data.profile.screen_name || username,
        profileImageUrl: profileImageUrl,
        followersCount,
        followingCount,
        isVerified: data.profile.is_blue_verified || data.profile.verified || followersCount >= 5000,
        exists: true,
        tests: {
          searchSuggestion: tests.typeahead === true || tests.typeahead === '_implied_good', 
          searchBan: tests.search === true || tests.search === '_implied_good',
          ghostBan: tests.ghost?.ban !== true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch(err) {
      console.error(err);
      throw err;
    }
  }

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
