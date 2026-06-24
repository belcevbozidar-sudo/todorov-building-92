export default function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const pages = [
    "about.html",
    "contact.html",
    "gallery.html",
    "index.html",
    "service-finishing-works.html",
    "service-rough-construction.html",
    "service-turnkey-projects.html"
  ];
  return res.status(200).json(pages);
}
