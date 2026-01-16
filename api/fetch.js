const axios = require('axios');
const { totp } = require('otplib');

export default async function handler(req, res) {
    const { file, otp } = req.query;


    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.REPO_OWNER;
    const REPO_NAME = process.env.REPO_NAME;
    const SHARED_SECRET = process.env.SHARED_SECRET;


    totp.options = { step: 30, window: 1 };
    if (!totp.check(otp, SHARED_SECRET)) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
    
        if (!file) {
            const listUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`;
            const listRes = await axios.get(listUrl, {
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
            });
            
       
            const fileList = listRes.data
                .filter(item => item.type === 'file')
                .map(item => item.name);
            
            return res.status(200).json(fileList);
        }

 
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

    } catch (error) {
        return res.status(500).json({ error: "Sync Failed" });
    }
}
