export async function onRequestGet(context) {
  try {
    if (context.env?.VISITOR_COUNTER) {
      const currentValue = Number((await context.env.VISITOR_COUNTER.get('hits')) || '0');
      const nextValue = currentValue + 1;

      await context.env.VISITOR_COUNTER.put('hits', String(nextValue));

      return new Response(JSON.stringify({ count: nextValue }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.counterapi.dev/v1/shadowcheck/hits/up', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Counter API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
