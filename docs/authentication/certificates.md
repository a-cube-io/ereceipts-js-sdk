# Gestione Certificati

Guida alla gestione dei certificati client per l'autenticazione mTLS.

## Ottenere un Certificato

I certificati sono forniti da ACube durante il processo di onboarding:

1. Contattare il supporto ACube
2. Fornire dati identificativi dell'esercente
3. Ricevere certificato (.pem o .p12) e chiave privata
4. Configurare il certificato nell'app

## Formati Supportati

### PEM

Formato testuale, piu' facile da gestire:

```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0Gcz3P8...
-----END CERTIFICATE-----
```

### P12/PKCS12

Formato binario, include certificato e chiave in un unico file protetto da password.

## API Certificati

### Salvare Certificato

```typescript
await sdk.storeCertificate(certificate, privateKey, {
  format: 'pem',
});
```

### Verificare Presenza

```typescript
const hasCert = await sdk.hasCertificate();
```

### Ottenere Info

```typescript
const info = await sdk.getCertificateInfo();
if (info) {
  console.log('Formato:', info.format);
}
```

### Rimuovere Certificato

```typescript
await sdk.clearCertificate();
```

## Storage Sicuro

I certificati sono salvati in modo sicuro:

| Piattaforma | Storage |
|-------------|---------|
| iOS | Keychain |
| Android | EncryptedSharedPreferences |
| Web | Non supportato |

## Caricamento da File

### React Native / Expo

```typescript
import * as FileSystem from 'expo-file-system';

async function loadCertificateFromFile(uri: string) {
  const content = await FileSystem.readAsStringAsync(uri);
  return content;
}

const certUri = 'path/to/certificate.pem';
const keyUri = 'path/to/private-key.pem';

const certificate = await loadCertificateFromFile(certUri);
const privateKey = await loadCertificateFromFile(keyUri);

await sdk.storeCertificate(certificate, privateKey, {
  format: 'pem',
});
```

### Da Bundle Assets

```typescript
const certificate = require('./assets/certificate.pem');
const privateKey = require('./assets/private-key.pem');

await sdk.storeCertificate(certificate, privateKey);
```

## Validazione

### Test Connessione

```typescript
const isValid = await sdk.testMTLSConnection();
if (!isValid) {
  console.log('Certificato non valido o scaduto');
}
```

### Status Completo

```typescript
const status = await sdk.getMTLSStatus();

if (!status.adapterAvailable) {
  console.log('mTLS non disponibile su questa piattaforma');
} else if (!status.hasCertificate) {
  console.log('Nessun certificato configurato');
} else if (!status.isReady) {
  console.log('Certificato presente ma non pronto');
} else {
  console.log('mTLS pronto per l\'uso');
}
```

## Errori Comuni

### Formato Non Valido

```typescript
try {
  await sdk.storeCertificate(cert, key);
} catch (error) {
  if (error.message.includes('format')) {
    console.log('Formato certificato non valido');
  }
}
```

### Chiave Non Corrispondente

Se la chiave privata non corrisponde al certificato, le richieste mTLS falliranno con errore SSL/TLS.

### Certificato Scaduto

I certificati hanno una data di scadenza. Verificare periodicamente la validita'.

## Best Practices

1. **Non includere certificati nel codice sorgente**
2. **Usare variabili d'ambiente o config esterne**
3. **Implementare rotazione certificati**
4. **Monitorare scadenza certificati**
5. **Usare storage sicuro (Keychain/EncryptedSharedPreferences)**

## Prossimi Passi

- [API Reference](../api-reference/sdk-instance.md)
- [Esempi](../examples/basic-usage.md)
