(function() {
    // Live config URL from npoint.io
    const CONFIG_URL = 'https://api.npoint.io/167fa0a9b46f63552d6c';
    // Separate npoint.io bucket ONLY for click stats (POST to update)
    // IMPORTANT: Replace this with your actual npoint.io stats bucket URL
    // Create one at https://www.npoint.io/ with initial content: {}
    const STATS_URL = 'https://api.npoint.io/11fabcace6a879b9112b';

    // Session storage keys
    const STORAGE_KEY_COUNT = 'aff_search_count';
    const STORAGE_KEY_TRIGGERED = 'aff_triggered';

    // Get the current site identifier from the script tag's data-site attribute
    const scriptTag = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();
    const SITE_ID = scriptTag ? (scriptTag.getAttribute('data-site') || '') : '';

    // Reset trigger flag on every page load (but keep count within session)
    // Actually reset count on load — each page load is fresh
    sessionStorage.removeItem(STORAGE_KEY_COUNT);
    sessionStorage.removeItem(STORAGE_KEY_TRIGGERED);

    // Helper: Get a weighted random link
    function getWeightedLink(links) {
        if (!links || links.length === 0) return null;
        if (links.length === 1) return links[0].url;

        const totalWeight = links.reduce((sum, l) => sum + (l.weight || 1), 0);
        let rand = Math.random() * totalWeight;
        for (const l of links) {
            if (rand < (l.weight || 1)) return l.url;
            rand -= (l.weight || 1);
        }
        return links[0].url;
    }

    // Helper: Check frequency rules (localStorage-based)
    function passesFrequencyRules(ad) {
        const id = ad.id;
        const freq = ad.frequency || {};

        // Don't show again if user already clicked this ad (hide_after_click)
        if (freq.hide_after_click !== false && localStorage.getItem(`ad_${id}_clicked`)) {
            return false;
        }

        // Once per 24h
        if (freq.once_per_24h !== false) {
            const lastShown = localStorage.getItem(`ad_${id}_last_shown`);
            if (lastShown) {
                const hoursSince = (Date.now() - new Date(lastShown).getTime()) / 36e5;
                if (hoursSince < 24) return false;
            }
        }

        return true;
    }

    // Helper: Date-range schedule check
    function passesSchedule(ad) {
        const sched = ad.schedule || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (sched.start_date) {
            if (today < new Date(sched.start_date)) return false;
        }
        if (sched.end_date) {
            if (today > new Date(sched.end_date)) return false;
        }
        return true;
    }

    // Open the ad link in a new tab
    function openAdInNewTab(ad) {
        const links = ad.links || (ad.link ? [{ url: ad.link, weight: 100 }] : []);
        const url = getWeightedLink(links);
        if (!url) return;

        // Track impression & last_shown
        const id = ad.id;
        localStorage.setItem(`ad_${id}_last_shown`, new Date().toISOString());
        let imp = parseInt(localStorage.getItem(`ad_${id}_impressions`) || '0', 10);
        localStorage.setItem(`ad_${id}_impressions`, imp + 1);

        // Open new tab
        const newWin = window.open(url, '_blank', 'noopener,noreferrer');
        if (!newWin) {
            // Fallback if popup blocker intercepts
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // Mark as triggered for this session so we don't fire again
        sessionStorage.setItem(STORAGE_KEY_TRIGGERED, 'true');

        // Track click as "shown" for hide_after_click
        localStorage.setItem(`ad_${id}_clicked`, 'true');
        let clk = parseInt(localStorage.getItem(`ad_${id}_clicks`) || '0', 10);
        localStorage.setItem(`ad_${id}_clicks`, clk + 1);

        // Track centrally via npoint.io (fire-and-forget, read-modify-write)
        trackCentralClick(id);
    }

    // ─── Central Click Tracker via npoint.io ────────────────────────────────────
    // Structure stored in npoint: { "adId--YYYYMMDD--site": count, ... }
    // We read, increment, then write back.
    function trackCentralClick(adId) {
        try {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const siteSlug = window.location.hostname.replace(/\./g, '-');
            const clickKey = `${adId}--${today}--${siteSlug}`;

            // Read current stats, increment, write back
            fetch(STATS_URL + '?v=' + Date.now())
                .then(r => r.ok ? r.json() : {})
                .then(stats => {
                    stats[clickKey] = (stats[clickKey] || 0) + 1;
                    return fetch(STATS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(stats)
                    });
                })
                .catch(() => {}); // silent fail – ad opens regardless
        } catch(e) { /* silent */ }
    }

    // Fetch config and pick one matching ad to show
    async function fetchAndTrigger() {
        // Don't fire more than once per page load
        if (sessionStorage.getItem(STORAGE_KEY_TRIGGERED)) return;
        sessionStorage.setItem(STORAGE_KEY_TRIGGERED, 'true'); // lock immediately

        try {
            const res = await fetch(`${CONFIG_URL}?v=${Date.now()}`);
            if (!res.ok) throw new Error('Config fetch failed');
            const data = await res.json();

            const currentDomain = window.location.hostname || 'localhost';

            // 1. Filter active
            let validAds = (data.ads || []).filter(ad => {
                const status = ad.status || (ad.active ? 'active' : 'paused');
                return status === 'active';
            });

            // 2. Filter by target_websites
            validAds = validAds.filter(ad => {
                const targets = ad.target_websites ||
                    (ad.targets ? ad.targets.split(',').map(t => t.trim()) : []);
                if (!targets.length) return true; // global
                return targets.some(d =>
                    currentDomain === d || currentDomain.endsWith(`.${d}`)
                );
            });

            // 3. Filter by schedule
            validAds = validAds.filter(passesSchedule);

            // 4. Filter by frequency
            validAds = validAds.filter(passesFrequencyRules);

            if (validAds.length === 0) {
                sessionStorage.removeItem(STORAGE_KEY_TRIGGERED); // allow retry next session
                return;
            }

            // Pick a random matching ad
            const ad = validAds[Math.floor(Math.random() * validAds.length)];
            openAdInNewTab(ad);

        } catch (e) {
            sessionStorage.removeItem(STORAGE_KEY_TRIGGERED);
        }
    }

    // Track user interactions per session and fire when threshold is reached
    function trackInteraction() {
        if (sessionStorage.getItem(STORAGE_KEY_TRIGGERED)) return;

        let count = parseInt(sessionStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
        count += 1;
        sessionStorage.setItem(STORAGE_KEY_COUNT, count);

        // Threshold: use data-trigger attribute on the script tag, default 3
        const threshold = parseInt(scriptTag ? (scriptTag.getAttribute('data-trigger') || '3') : '3', 10);

        if (count >= threshold) {
            fetchAndTrigger();
        }
    }

    // Expose for manual call (backward compat with test.html)
    window.onUserSearchPerformed = trackInteraction;

    // Auto-detect clicks on interactive elements
    document.addEventListener('click', function(e) {
        const el = e.target.closest('button, a, [role="button"], input[type="submit"], label');
        if (el) trackInteraction();
    }, true);

    document.addEventListener('submit', function() {
        trackInteraction();
    }, true);

})();
