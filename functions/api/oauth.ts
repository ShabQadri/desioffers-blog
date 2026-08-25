export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers restricted to domain
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.SITE_URL || 'https://blog.desioffers.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Step 1: Initial auth request from Sveltia CMS -> Redirect to GitHub OAuth
  if (!code) {
    const clientId = env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'GITHUB_CLIENT_ID is not configured in environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', clientId);
    githubAuthUrl.searchParams.set('scope', 'repo,user');
    if (state) githubAuthUrl.searchParams.set('state', state);

    return Response.redirect(githubAuthUrl.toString(), 302);
  }

  // Step 2: Callback from GitHub with authorization code -> Exchange for token
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        state,
      }),
    });

    const data: any = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error_description || data.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Step 3: Return HTML payload posting message to window.opener for Sveltia CMS
    const content = `authorization:github:success:${JSON.stringify({
      token: data.access_token,
      provider: 'github',
    })}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Authorizing Sveltia CMS...</title></head>
        <body>
          <script>
            (function() {
              function receiveMessage(e) {
                window.opener.postMessage('${content}', e.origin);
              }
              window.addEventListener("message", receiveMessage, false);
              window.opener.postMessage("authorizing:github", "*");
            })();
          </script>
          <p>Authorizing with GitHub... You may close this window if it does not close automatically.</p>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html', ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'OAuth authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
