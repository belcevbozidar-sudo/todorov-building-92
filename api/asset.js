export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
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
    const filename = req.query.name;
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const cleanName = filename.replace(/^assets\//, '');

    // Get SHA of the file from GitHub
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/assets/${cleanName}?ref=${BRANCH}`;
    const getRes = await fetch(getUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-Serverless-CMS'
      }
    });

    if (!getRes.ok) {
      return res.status(404).json({ error: 'Asset not found on GitHub' });
    }

    const getData = await getRes.json();
    const sha = getData.sha;

    // Delete file on GitHub
    const deleteUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/assets/${cleanName}`;
    const deleteRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vercel-Serverless-CMS'
      },
      body: JSON.stringify({
        message: `Delete assets/${cleanName} via admin panel`,
        sha: sha,
        branch: BRANCH
      })
    });

    if (!deleteRes.ok) {
      const errData = await deleteRes.json();
      throw new Error(errData.message || `GitHub returned status ${deleteRes.status}`);
    }

    return res.status(200).json({ success: true, message: `Deleted assets/${cleanName}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete asset from GitHub', details: err.message });
  }
}
