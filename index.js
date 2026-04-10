const express = require('express');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurare Certificate SSL Client (V3)
const certPath = path.join(__dirname, 'v3_cert.pem');
const keyPath = path.join(__dirname, 'v3_key.pem');

// Initializam agentul HTTPS cu setari de compatibilitate maxima (Legacy SSL)
let httpsAgent;
try {
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        httpsAgent = new https.Agent({
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            rejectUnauthorized: false,
            minVersion: 'TLSv1',
            ciphers: 'DEFAULT:@SECLEVEL=0'
        });
        console.log('Certificatul SSL Client (V3) incarcat.');
    } else {
        console.warn('AVERTISMENT: Certificatele SSL Client lipsesc!');
    }
} catch (error) {
    console.error('Eroare la incarcarea certificatelor:', error.message);
}

const SMS_PARAMS = {
    username: 'ingaz',
    password: 'riOL5RG8toj6i1zt',
    from: 'IN-GAZ'
};

const TARGET_URL = 'https://prepay.inter-mob.com/ingaz.asp';

// --- ENDPOINT TEST GET ---
app.get('/test-get', async (req, res) => {
    try {
        const response = await axios.get(TARGET_URL, {
            params: { ...SMS_PARAMS, to: '37369000000', text: 'Test GET' },
            httpsAgent,
            timeout: 10000
        });
        res.send(`Rezultat Test GET: ${response.status} - ${JSON.stringify(response.data)}`);
    } catch (error) {
        res.status(500).send(`Eroare Test GET: ${error.response ? error.response.status : error.message} <br> ${error.response ? JSON.stringify(error.response.data) : ''}`);
    }
});

// --- ENDPOINT TEST POST ---
app.get('/test-post', async (req, res) => {
    try {
        // Incercam POST cu parametrii trimisi ca form-data (standard pentru .asp)
        const qs = require('querystring');
        const postData = qs.stringify({ ...SMS_PARAMS, to: '37369000000', text: 'Test POST' });
        
        const response = await axios.post(TARGET_URL, postData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent,
            timeout: 10000
        });
        res.send(`Rezultat Test POST: ${response.status} - ${JSON.stringify(response.data)}`);
    } catch (error) {
        res.status(500).send(`Eroare Test POST: ${error.response ? error.response.status : error.message} <br> ${error.response ? JSON.stringify(error.response.data) : ''}`);
    }
});

// Endpoint principal (automatizat sa incerce ambele daca e nevoie)
app.get('/send', async (req, res) => {
    const { to, text } = req.query;
    if (!to || !text) return res.status(400).send('Lipsesc parametri.');

    try {
        // Implicit folosim POST deoarece 405 indica de obicei ca GET nu e permis
        const qs = require('querystring');
        const postData = qs.stringify({ ...SMS_PARAMS, to, text });
        const response = await axios.post(TARGET_URL, postData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent,
            timeout: 15000
        });
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => console.log(`Proxy SMS activ pe portul ${PORT}`));
