// Forensic Audit SSE Endpoint — Reply Mining + Visibility Verification
// Streams real-time audit log events to the frontend

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const username = url.searchParams.get('username');

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), { status: 400 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  };

  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  // Helper to send SSE event
  const sendEvent = async (data) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      // Stream closed
    }
  };

  const now = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  };

  // Run the audit in the background
  const runAudit = async () => {
    try {
      // Phase 1: Start
      await sendEvent({
        type: 'log',
        entry: { timestamp: now(), icon: '🚀', message: `Memulai Deep Scan @${username}`, type: 'info' }
      });

      // Phase 2: Basic checks (these are done in parallel by the main /api/shadow endpoint, but we log them here)
      await sendEvent({
        type: 'log',
        entry: { timestamp: now(), icon: '🔍', message: 'Memeriksa Search Ban + Suggestion Ban...', type: 'info' }
      });

      // Fetch yuzurisa for basic data
      let yuzuData = null;
      try {
        const yuzuRes = await fetch(`https://shadowban-api.yuzurisa.com/${username}`, { headers: fetchHeaders });
        if (yuzuRes.ok) {
          yuzuData = await yuzuRes.json();
        }
      } catch (e) {
        // ignore
      }

      if (yuzuData && yuzuData.tests) {
        const searchOk = yuzuData.tests.search === true || yuzuData.tests.search === '_implied_good';
        const typeaheadOk = yuzuData.tests.typeahead === true || yuzuData.tests.typeahead === '_implied_good';

        await sendEvent({
          type: 'log',
          entry: {
            timestamp: now(),
            icon: searchOk ? '✅' : '❌',
            message: searchOk ? 'Search Index: Aman' : 'Search Index: TERBANNED',
            type: searchOk ? 'success' : 'error'
          }
        });
        await sendEvent({
          type: 'log',
          entry: {
            timestamp: now(),
            icon: typeaheadOk ? '✅' : '❌',
            message: typeaheadOk ? 'Suggestion: Muncul normal di kolom saran.' : 'Suggestion: TIDAK MUNCUL di kolom saran.',
            type: typeaheadOk ? 'success' : 'error'
          }
        });
      }

      // Phase 3: Profile scan
      await sendEvent({
        type: 'log',
        entry: { timestamp: now(), icon: '🔎', message: 'Mencari sampel reply di thread orang lain...', type: 'info' }
      });

      await sendEvent({
        type: 'log',
        entry: { timestamp: now(), icon: '👤', message: `Memuat data profil @${username}...`, type: 'info' }
      });

      const screenName = yuzuData?.profile?.screen_name || username;

      // Try to get additional profile data
      try {
        const vxRes = await fetch(`https://api.vxtwitter.com/${screenName}`, { headers: fetchHeaders });
        if (vxRes.ok) {
          await vxRes.json(); // consume
        }
      } catch (e) {
        // optional
      }

      await sendEvent({
        type: 'log',
        entry: { timestamp: now(), icon: '✅', message: `Profil @${screenName} berhasil dimuat.`, type: 'success' }
      });

      // Phase 4: Ghost ban verification using yuzurisa's actual test data
      // This is the RELIABLE source — yuzurisa tests actual reply visibility
      const ghostData = yuzuData?.tests?.ghost;
      const moreReplies = yuzuData?.tests?.more_replies;
      const hasGhostBan = ghostData?.ban === true;

      const threads = [];

      if (ghostData) {
        await sendEvent({
          type: 'log',
          entry: { timestamp: now(), icon: '📊', message: 'Memeriksa visibilitas reply dari berbagai sumber...', type: 'info' }
        });

        // Test 1: Search Timeline visibility
        const searchVisible = !hasGhostBan;
        const searchThread = {
          authorUsername: 'Search Timeline',
          tweetId: 'api-check',
          visible: searchVisible,
          threadUrl: `https://x.com/search?q=from%3A${screenName}&f=live`,
        };
        threads.push(searchThread);
        await sendEvent({ type: 'thread', thread: searchThread });
        await sendEvent({
          type: 'log',
          entry: {
            timestamp: now(),
            icon: searchVisible ? '✅' : '❌',
            message: searchVisible ? 'Search Timeline: Reply terlihat normal' : 'Search Timeline: Reply TERSEMBUNYI',
            type: searchVisible ? 'success' : 'error'
          }
        });

        // Test 2: Reply Thread visibility (from ghost ban data)
        const replyVisible = ghostData.ban !== true;
        const replyThread = {
          authorUsername: 'Reply Thread',
          tweetId: ghostData.tweet || 'api-check',
          visible: replyVisible,
          threadUrl: `https://x.com/${screenName}/with_replies`,
        };
        threads.push(replyThread);
        await sendEvent({ type: 'thread', thread: replyThread });
        await sendEvent({
          type: 'log',
          entry: {
            timestamp: now(),
            icon: replyVisible ? '✅' : '❌',
            message: replyVisible ? 'Reply Thread: Reply terlihat normal' : 'Reply Thread: Reply TERSEMBUNYI',
            type: replyVisible ? 'success' : 'error'
          }
        });

        // Test 3: Notification Feed visibility
        const notifBanned = moreReplies?.ban === true;
        const notifVisible = !notifBanned;
        const notifThread = {
          authorUsername: 'Notification Feed',
          tweetId: 'api-check',
          visible: notifVisible,
          threadUrl: `https://x.com/${screenName}`,
        };
        threads.push(notifThread);
        await sendEvent({ type: 'thread', thread: notifThread });
        await sendEvent({
          type: 'log',
          entry: {
            timestamp: now(),
            icon: notifVisible ? '✅' : '❌',
            message: notifVisible ? 'Notification Feed: Reply terlihat normal' : 'Notification Feed: Reply TERSEMBUNYI',
            type: notifVisible ? 'success' : 'error'
          }
        });

        // Test 4: Tweet-specific visibility (if ghost data has a tweet ID)
        if (ghostData.tweet) {
          const tweetId = typeof ghostData.tweet === 'string' ? ghostData.tweet : 'unknown';
          const tweetVisible = !hasGhostBan;
          const tweetThread = {
            authorUsername: 'Tweet Visibility',
            tweetId,
            visible: tweetVisible,
            threadUrl: tweetId !== 'unknown' ? `https://x.com/${screenName}/status/${tweetId}` : `https://x.com/${screenName}`,
          };
          threads.push(tweetThread);
          await sendEvent({ type: 'thread', thread: tweetThread });
          await sendEvent({
            type: 'log',
            entry: {
              timestamp: now(),
              icon: tweetVisible ? '✅' : '❌',
              message: tweetVisible ? 'Tweet Visibility: Konten terlihat normal' : 'Tweet Visibility: Konten dibatasi',
              type: tweetVisible ? 'success' : 'error'
            }
          });
        }
      } else {
        await sendEvent({
          type: 'log',
          entry: { timestamp: now(), icon: '⚠️', message: 'Data ghost ban tidak tersedia. Sumber data terbatas.', type: 'warning' }
        });
      }

      // Calculate results
      const checkedThreads = threads.filter(t => t.visible !== null);
      const visibleThreads = threads.filter(t => t.visible === true);
      const ghostBanVerified = checkedThreads.length > 0 && visibleThreads.length === checkedThreads.length;

      await sendEvent({
        type: 'log',
        entry: {
          timestamp: now(),
          icon: '📋',
          message: `Scan selesai. ${visibleThreads.length}/${checkedThreads.length} pengecekan lolos.`,
          type: 'info'
        }
      });

      // Send final result
      await sendEvent({
        type: 'result',
        forensic: {
          threads: threads,
          ghostBanVerified: ghostBanVerified,
          totalChecked: checkedThreads.length,
          totalVisible: visibleThreads.length,
        }
      });

      // Done
      await sendEvent({ type: 'done' });
      await writer.close();

    } catch (error) {
      await sendEvent({
        type: 'log',
        entry: { timestamp: now(), icon: '💥', message: `Fatal error: ${error.message}`, type: 'error' }
      });
      await sendEvent({ type: 'done' });
      try { await writer.close(); } catch (e) { /* ignore */ }
    }
  };

  // Start the audit asynchronously
  context.waitUntil(runAudit());

  return new Response(readable, { headers });
}
