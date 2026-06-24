export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'belcevbozidar-sudo';
  const REPO_NAME = 'todorov-building-92';
  const BRANCH = 'main';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN environment variable is not configured on Vercel.' });
  }

  // GET /api/page?name=[filename]
  if (req.method === 'GET') {
    const name = req.query.name;
    if (!name || !name.endsWith('.html') || name.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
      const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${name}?ref=${BRANCH}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Serverless-CMS'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(content);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read page from GitHub', details: err.message });
    }
  }

  // POST /api/page
  if (req.method === 'POST') {
    try {
      const { name, html } = req.body;
      if (!name || !name.endsWith('.html') || name.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      if (!html) {
        return res.status(400).json({ error: 'HTML content is required' });
      }

      // 1. Get SHA of current file
      const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${name}?ref=${BRANCH}`;
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Serverless-CMS'
        }
      });

      let sha = '';
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      }

      // 2. Commit file back to GitHub
      const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${name}`;
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Serverless-CMS'
        },
        body: JSON.stringify({
          message: `Update ${name} via admin panel`,
          content: Buffer.from(html, 'utf-8').toString('base64'),
          sha: sha || undefined,
          branch: BRANCH
        })
      });

      if (!putRes.ok) {
        const errData = await putRes.json();
        throw new Error(errData.message || `GitHub returned status ${putRes.status}`);
      }

      return res.status(200).json({ success: true, message: `Saved ${name} successfully to repository` });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save page to GitHub', details: err.message });
    }
  }
}
