export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

  try {
    const { filename, base64 } = req.body;
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!base64 || !base64.includes(';base64,')) {
      return res.status(400).json({ error: 'Invalid base64 payload' });
    }

    const base64Data = base64.split(';base64,').pop();

    // Check if file already exists to get its SHA
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/assets/${filename}?ref=${BRANCH}`;
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

    // Write file to GitHub
    const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/assets/${filename}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-Serverless-CMS'
      },
      body: JSON.stringify({
        message: `Upload assets/${filename} via admin panel`,
        content: base64Data,
        sha: sha || undefined,
        branch: BRANCH
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json();
      throw new Error(errData.message || `GitHub returned status ${putRes.status}`);
    }

    return res.status(200).json({ success: true, url: `assets/${filename}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to upload asset to GitHub', details: err.message });
  }
}
