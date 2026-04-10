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

// Initializam agentul HTTPS cu certificatul client
let httpsAgent;
try {
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        httpsAgent = new https.Agent({
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            rejectUnauthorized: false // Ignoram eroarea de validare a serverului lor (auto-semnat/issuer necunoscut)
        });
        console.log('Certificatul SSL Client a fost incarcat cu succes.');
    } else {
        console.warn('AVERTISMENT: Certificatele SSL Client lipsesc! Proxy-ul ar putea sa nu functioneze.');
    }
} catch (error) {
    console.error('Eroare la incarcarea certificatelor:', error.message);
}

// Endpoint principal pentru trimitere SMS
// Exemplu apel din Lovable: https://ingz.onrender.com/send?to=+37369xxxxxx&text=Mesaj
app.get('/send', async (req, res) => {
    const { to, text } = req.query;

    if (!to || !text) {
        return res.status(400).json({ error: 'Parametrii "to" si "text" sunt obligatorii.' });
    }

    // Parametrii API-ului original Inter-Mob (conform noilor date)
    const params = {
        username: process.env.SMS_USER || 'ingaz',
        password: process.env.SMS_PASSWORD || 'riOL5RG8toj6i1zt',
        from: process.env.SMS_FROM || 'IN-GAZ',
        to: to,
        text: text
    };

    // NOUL URL furnizat de Dmitri: https://prepay.inter-mob.com/ingaz.asp
    const targetUrl = 'https://prepay.inter-mob.com/ingaz.asp';

    console.log(`Trimitere SMS catre ${to} folosind noul endpoint .asp...`);

    try {
        const response = await axios.get(targetUrl, {
            params,
            httpsAgent,
            timeout: 15000 // 15 secunde timeout
        });

        console.log(`Raspuns de la Inter-Mob: ${response.status} - ${response.data}`);
        
        // Returnam raspunsul catre Lovable
        res.status(200).json({
            success: true,
            remote_status: response.status,
            remote_body: response.data
        });

    } catch (error) {
        console.error('Eroare la comunicarea cu Inter-Mob:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response ? error.response.data : 'Nu s-a primit raspuns de la serverul de SMS.'
        });
    }
});

// Endpoint de testare a conexiunii (ca cel cerut de Dmitri)
app.get('/test-connection', async (req, res) => {
    const testUrl = 'https://gateway.inter-mob.com/test.php';
    
    try {
        const response = await axios.get(testUrl, {
            httpsAgent,
            timeout: 10000
        });
        res.send(`Rezultat Test: ${response.data}`);
    } catch (error) {
        res.status(500).send(`Eroare Test: ${error.message}`);
    }
});

// Pornire server
app.listen(PORT, () => {
    console.log(`Proxy-ul SMS Ingaz ruleaza pe portul ${PORT}`);
});
