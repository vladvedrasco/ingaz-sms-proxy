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

// Parametrii fixi furnizati de Dmitri
const SMS_PARAMS = {
    username: 'ingaz',
    password: 'riOL5RG8toj6i1zt',
    from: 'IN-GAZ'
};

const TARGET_URL = 'https://prepay.inter-mob.com/ingaz.asp';

// Endpoint principal pentru trimitere SMS (folosit de Lovable)
app.get('/send', async (req, res) => {
    const { to, text } = req.query;

    if (!to || !text) {
        return res.status(400).json({ success: false, error: 'Parametrii "to" si "text" sunt obligatorii.' });
    }

    // Combinam parametrii de baza cu cei primiti de la Lovable
    const finalParams = {
        ...SMS_PARAMS,
        to: to,
        text: text
    };

    console.log(`Proxy: Trimitere SMS catre ${to}...`);

    try {
        // Folosim GET cu parametrii in URL conform cerintei .asp
        const response = await axios.get(TARGET_URL, {
            params: finalParams,
            httpsAgent,
            timeout: 15000
        });

        console.log('Raspuns Inter-Mob:', response.data);

        // Verificam daca raspunsul contine "Accepted for delivery" sau codul 202
        if (response.status === 200 || response.status === 202) {
            res.status(200).json({
                success: true,
                remote_status: response.status,
                remote_data: response.data
            });
        } else {
            res.status(500).json({
                success: false,
                remote_status: response.status,
                remote_data: response.data
            });
        }

    } catch (error) {
        console.error('Eroare Proxy:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response ? error.response.data : 'Nu s-a primit raspuns de la serverul de SMS.'
        });
    }
});

// Endpoint de testare a conexiunii (folosit pentru verificare manuala)
app.get('/test-connection', async (req, res) => {
    try {
        const response = await axios.get(TARGET_URL, {
            params: { ...SMS_PARAMS, to: '37300000000', text: 'Test' },
            httpsAgent,
            timeout: 10000
        });
        res.send(`Rezultat Test: ${response.status} - ${response.data}`);
    } catch (error) {
        res.status(500).send(`Eroare Test: ${error.response ? error.response.status : error.message} <br> ${error.response ? JSON.stringify(error.response.data) : ''}`);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy-ul SMS Ingaz ruleaza pe portul ${PORT}`);
});
