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
            // Setari pentru compatibilitate cu servere mai vechi sau configuratii nginx specifice
            rejectUnauthorized: false,
            minVersion: 'TLSv1', // Permitem versiuni mai vechi de TLS daca e necesar
            ciphers: 'DEFAULT:@SECLEVEL=0' // Nivel de securitate 0 pentru a permite algoritmi mai vechi (adesea necesar pentru certificate V3 legacy)
        });
        console.log('Certificatul SSL Client (V3) a fost incarcat cu setari de compatibilitate.');
    } else {
        console.warn('AVERTISMENT: Certificatele SSL Client lipsesc!');
    }
} catch (error) {
    console.error('Eroare la incarcarea certificatelor:', error.message);
}

// Endpoint principal pentru trimitere SMS
app.get('/send', async (req, res) => {
    const { to, text } = req.query;

    if (!to || !text) {
        return res.status(400).json({ error: 'Parametrii "to" si "text" sunt obligatorii.' });
    }

    const params = {
        username: 'ingaz',
        password: 'riOL5RG8toj6i1zt',
        from: 'IN-GAZ',
        to: to,
        text: text
    };

    // Noul URL furnizat: https://prepay.inter-mob.com/ingaz.asp
    const targetUrl = 'https://prepay.inter-mob.com/ingaz.asp';

    try {
        const response = await axios.get(targetUrl, {
            params,
            httpsAgent,
            timeout: 15000
        });

        res.status(200).json({
            success: true,
            remote_status: response.status,
            remote_body: response.data
        });

    } catch (error) {
        console.error('Eroare Inter-Mob:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            response_data: error.response ? error.response.data : 'Fara raspuns de la server.'
        });
    }
});

// Endpoint de testare a conexiunii (Catre test.php sau direct catre ingaz.asp)
app.get('/test-connection', async (req, res) => {
    // Testam direct noul endpoint furnizat pentru a vedea daca ne accepta certificatul/IP-ul
    const testUrl = 'https://prepay.inter-mob.com/ingaz.asp';
    
    try {
        const response = await axios.get(testUrl, {
            params: { username: 'ingaz', password: 'riOL5RG8toj6i1zt', from: 'IN-GAZ', to: 'test', text: 'test' },
            httpsAgent,
            timeout: 10000
        });
        res.send(`Rezultat Test (ingaz.asp): ${response.data}`);
    } catch (error) {
        // Daca primim 400 aici, inseamna ca serverul ne respinge certificatul sau IP-ul
        res.status(500).send(`Eroare Test 400 (ingaz.asp): ${error.message}. <br>Daca vezi asta, Dmitri trebuie sa verifice whitelist-ul de IP si activarea certificatului V3 pe server.`);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy-ul SMS Ingaz ruleaza pe portul ${PORT}`);
});
