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

    // 2. Fetch from vxtwitter for followers/following & HD avatar
    let profileImageUrl = `https://unavatar.io/twitter/${data.profile.screen_name || username}`;
    let followersCount = 0;
    let followingCount = 0;
    
    try {
      const vxRes = await fetch(`https://api.vxtwitter.com/${data.profile.screen_name || username}`, { headers });
      if (vxRes.ok) {
        const vxData = await vxRes.json();
        profileImageUrl = vxData.profile_image_url ? vxData.profile_image_url.replace('_normal', '_400x400') : profileImageUrl;
        followersCount = vxData.followers_count || 0;
        followingCount = vxData.following_count || 0;
      } else {
        console.warn('vxtwitter failed with status:', vxRes.status);
      }
    } catch(e) {
      console.error('Failed to fetch vxtwitter data', e);
    }

    // 3. Proxy image to Base64 to avoid cross-origin canvas tainting on frontend
    try {
      const imgRes = await fetch(profileImageUrl, { headers });
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
      username: data.profile.screen_name || username,
      displayName: data.profile.name || data.profile.screen_name || username,
      profileImageUrl: profileImageUrl,
      followersCount: followersCount,
      followingCount: followingCount,
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
