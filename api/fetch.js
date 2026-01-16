const speakeasy = require('speakeasy');

export default async function handler(req, res) {
    const { file, otp } = req.query;

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.REPO_OWNER;
    const REPO_NAME = process.env.REPO_NAME;
    const SHARED_SECRET = process.env.SHARED_SECRET;

    // 🛡️ OTP පරීක්ෂාව
    const isValid = speakeasy.totp.verify({
        secret: SHARED_SECRET,
        encoding: 'ascii',
        token: otp,
        window: 1
    });

    if (!isValid) {
        return res.status(403).json({ error: "Unauthorized: Invalid OTP" });
    }

    try {
        // 📁 ෆයිල් ලිස්ට් එක ලබා ගැනීම
        if (!file) {
            const listUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`;
            const response = await fetch(listUrl, {
                headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
            });
            
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error("GitHub error");

            const fileList = data.filter(item => item.type === 'file').map(item => item.name);
            return res.status(200).json(fileList);
        }

        // 📥 නිශ්චිත ෆයිල් එකක් ලබා ගැනීම
        const fetchUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${file}`;
        const response = await fetch(fetchUrl, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        const content = await response.text();
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(content);

    } catch (error) {
        return res.status(500).json({ error: "Sync Failed", details: error.message });
    }
}
