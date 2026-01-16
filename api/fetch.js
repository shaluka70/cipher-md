const axios = require('axios');
const speakeasy = require('speakeasy');

export default async function handler(req, res) {
    const { file, otp } = req.query;

    // 🔐 Vercel Dashboard එකේ Environment Variables වලින් දත්ත ලබා ගැනීම
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.REPO_OWNER;
    const REPO_NAME = process.env.REPO_NAME;
    const SHARED_SECRET = process.env.SHARED_SECRET;

    // 🛑 පරාමිති පරීක්ෂා කිරීම
    if (!otp) {
        return res.status(400).json({ error: "OTP is required" });
    }

    // 🛡️ Speakeasy මගින් OTP එක පරීක්ෂා කිරීම (Handshake)
    const isValid = speakeasy.totp.verify({
        secret: SHARED_SECRET,
        encoding: 'ascii',
        token: otp,
        window: 1 // තත්පර 30ක සහනයක් ලබා දීම (Network delay සඳහා)
    });

    if (!isValid) {
        console.error("❌ Security Alert: Invalid OTP attempt!");
        return res.status(403).json({ error: "Access Denied: Unauthorized" });
    }

    try {
        // 📁 අවස්ථාව 1: 'file' එකක් ඉල්ලලා නැත්නම්, මුළු Repo එකේම ෆයිල් ලිස්ට් එක ලබා දීම
        if (!file) {
            const listUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`;
            const listRes = await axios.get(listUrl, {
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
            });

            // Folder නෙවෙයි ෆයිල් නම් විතරක් Array එකක් විදිහට සකස් කිරීම
            const fileList = listRes.data
                .filter(item => item.type === 'file')
                .map(item => item.name);

            return res.status(200).json(fileList);
        }

        // 🏦 අවස්ථාව 2: නිශ්චිත ෆයිල් එකක් ඉල්ලලා තියෙනවා නම්, එහි Raw කේතය ලබා දීම
        const fetchUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${file}`;
        const response = await axios.get(fetchUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            },
            responseType: 'text'
        });

        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(response.data);

    // catch බ්ලොක් එක මෙහෙම වෙනස් කරන්න
} catch (error) {
    console.error("❌ GitHub Error Details:", error.response ? error.response.data : error.message);
    return res.status(500).json({ 
        error: "Sync Failed", 
        details: error.response ? error.response.data : error.message 
    });
}
}
