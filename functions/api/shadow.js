export async function onRequestPost(context) {
  try {
    const { request } = context;
    const body = await request.json();
    const username = body.username;

    if (!username) {
      return new Response(JSON.stringify({ error: "Username is required" }), { status: 400 });
    }

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    // 1. Fetch from primary API
    const yuzuRes = await fetch(`https://shadowban-api.yuzurisa.com/${username}`, { headers });
    if (!yuzuRes.ok) {
      throw new Error('Failed to fetch from primary API: ' + yuzuRes.status);
    }
    const data = await yuzuRes.json();

    if (!data.profile || !data.profile.exists) {
      return new Response(JSON.stringify({
        username: username,
        displayName: '',
        profileImageUrl: '',
        exists: false,
        followersCount: 0,
        followingCount: 0,
        tests: {
          searchSuggestion: false,
          searchBan: false,
          ghostBan: false,
        },
        timestamp: new Date().toISOString(),
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const tests = data.tests || {};
    const screenName = data.profile.screen_name || username;

    // 2. Fallback chain for followers/following: vxtwitter -> yuzurisa profile -> 0
    let profileImageUrl = data.profile.profile_image_url_https 
      ? data.profile.profile_image_url_https.replace('_normal', '_400x400')
      : `https://unavatar.io/twitter/${screenName}`;
    let followersCount = data.profile.followers_count || 0;
    let followingCount = data.profile.friends_count || data.profile.following_count || 0;
    let displayName = data.profile.name || screenName;
    
    try {
      // Try the user info endpoint to get the most up-to-date stats if possible
      const vxUserRes = await fetch(`https://api.vxtwitter.com/${screenName}`, { headers });
      if (vxUserRes.ok) {
        const vxUserData = await vxUserRes.json();
        if (vxUserData.name) {
          displayName = vxUserData.name;
        }
        if (vxUserData.followers_count !== undefined && vxUserData.followers_count > 0) {
          followersCount = vxUserData.followers_count;
        }
        if (vxUserData.following_count !== undefined && vxUserData.following_count > 0) {
          followingCount = vxUserData.following_count;
        }
      }
    } catch(e) {
      console.warn('vxtwitter fetch failed, using yuzurisa fallback:', e.message);
    }

    // 3. Proxy image to Base64 to avoid cross-origin canvas tainting on frontend
    try {
      const bustUrl = new URL(profileImageUrl);
      bustUrl.searchParams.append('cb', Date.now().toString());
      const imgRes = await fetch(bustUrl.toString(), { headers });
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        profileImageUrl = `data:${contentType};base64,${b64}`;
      }
    } catch(e) {
      console.error('Failed to proxy image to base64', e);
    }

    const result = {
      username: screenName,
      displayName: displayName,
      profileImageUrl: profileImageUrl,
      followersCount: followersCount,
      followingCount: followingCount,
      isVerified: data.profile.is_blue_verified || data.profile.verified || false,
      exists: true,
      tests: {
        searchSuggestion: tests.typeahead === true || tests.typeahead === '_implied_good', 
        searchBan: tests.search === true || tests.search === '_implied_good',
        ghostBan: tests.ghost?.ban !== true,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
