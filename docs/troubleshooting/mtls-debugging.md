# Debug mTLS

Diagnosi e risoluzione problemi mTLS (Mutual TLS).

## Verifica Stato mTLS

```typescript
const status = await sdk.getMTLSStatus();

console.log('Adapter disponibile:', status.adapterAvailable);
console.log('Pronto:', status.isReady);
console.log('Ha certificato:', status.hasCertificate);
console.log('Info certificato:', status.certificateInfo);
console.log('Info piattaforma:', status.platformInfo);
```

## Test Connessione

```typescript
const testResult = await sdk.testMTLSConnection();

if (testResult) {
  console.log('Connessione mTLS OK');
} else {
  console.log('Connessione mTLS FALLITA');
}
```

## Problemi Comuni

### Adapter Non Disponibile

```
ACubeSDKError: MTLS_ADAPTER_NOT_AVAILABLE
```

#### Causa
L'adapter mTLS non e stato caricato o non e supportato sulla piattaforma.

#### Verifica
```typescript
const status = await sdk.getMTLSStatus();
console.log('Adapter:', status.adapterAvailable);
console.log('Piattaforma:', status.platformInfo);
```

#### Soluzione

1. **Expo Go**: mTLS non supportato. Usa dev build:
```bash
npx expo run:ios
# oppure
npx expo run:android
```

2. **React Native**: Verifica dipendenze native
```bash
cd ios && pod install
```

### Certificato Non Trovato

```
hasCertificate: false
```

#### Soluzione
```typescript
// Ottieni certificato dal PEM
const certs = await sdk.pems.getCertificates(serialNumber);

// Salva certificato
await sdk.storeCertificate(
  certs.mtlsCertificate,
  privateKey, // Chiave privata dal PEM
  { format: 'pem' }
);

// Verifica
const status = await sdk.getMTLSStatus();
console.log('Certificato salvato:', status.hasCertificate);
```

### Certificato Scaduto

```typescript
const certInfo = await sdk.getCertificateInfo();

if (certInfo) {
  const expiresAt = new Date(certInfo.expiresAt);
  const now = new Date();

  if (expiresAt < now) {
    console.log('Certificato scaduto il:', expiresAt);

    // Rigenera certificato
    await sdk.clearCertificate();

    // Ottieni nuovo certificato
    const newCerts = await sdk.pems.getCertificates(serialNumber);
    await sdk.storeCertificate(newCerts.mtlsCertificate, newPrivateKey);
  }
}
```

### Formato Certificato Errato

#### Verifica formato PEM
```typescript
// Il certificato deve essere in formato PEM valido
const isValidPEM = (cert: string) => {
  return cert.includes('-----BEGIN CERTIFICATE-----') &&
         cert.includes('-----END CERTIFICATE-----');
};

if (!isValidPEM(certificate)) {
  console.log('Certificato non in formato PEM valido');
}
```

#### Conversione da P12/PKCS12
```typescript
// Se hai un file P12, specifica il formato
await sdk.storeCertificate(
  p12Content,
  '', // Password nel campo privateKey per P12
  { format: 'p12', password: 'p12password' }
);
```

### Chiave Privata Mancante

```
Errore: Private key required
```

#### Soluzione
```typescript
// La chiave privata viene fornita durante la creazione del Cash Register
const cashRegister = await sdk.cashRegisters.create({
  pemSerialNumber: 'PEM-001',
  name: 'Cassa 1',
});

// Salva entrambi
await sdk.storeCertificate(
  cashRegister.mtlsCertificate,
  cashRegister.privateKey, // Chiave privata inclusa
  { format: 'pem' }
);
```

### Errore Handshake SSL

```
SSL handshake failed
```

#### Cause possibili
1. Certificato non valido per il server
2. Certificato non firmato dalla CA corretta
3. Hostname mismatch

#### Debug
```typescript
// Abilita log debug
const sdk = await createACubeSDK({
  environment: 'sandbox',
  debug: true,
});

// Verifica endpoint
console.log('API URL:', sdk.getConfig().environment);

// Test connessione
const testResult = await sdk.testMTLSConnection();
```

## Flusso di Debug

```typescript
async function debugMTLS(sdk: ACubeSDK) {
  console.log('=== Debug mTLS ===');

  // 1. Verifica stato adapter
  const status = await sdk.getMTLSStatus();
  console.log('1. Stato adapter:', status);

  if (!status.adapterAvailable) {
    console.log('ERRORE: Adapter non disponibile');
    console.log('Soluzione: Usa dev build invece di Expo Go');
    return;
  }

  // 2. Verifica certificato
  if (!status.hasCertificate) {
    console.log('ERRORE: Nessun certificato');
    console.log('Soluzione: Configura certificato con storeCertificate()');
    return;
  }

  // 3. Verifica info certificato
  const certInfo = await sdk.getCertificateInfo();
  console.log('2. Info certificato:', certInfo);

  if (certInfo) {
    const expires = new Date(certInfo.expiresAt);
    if (expires < new Date()) {
      console.log('ERRORE: Certificato scaduto');
      console.log('Soluzione: Rigenera certificato');
      return;
    }
  }

  // 4. Test connessione
  console.log('3. Test connessione...');
  const testOk = await sdk.testMTLSConnection();

  if (!testOk) {
    console.log('ERRORE: Test connessione fallito');
    console.log('Possibili cause:');
    console.log('- Certificato non valido');
    console.log('- Chiave privata non corretta');
    console.log('- Problema di rete');
    return;
  }

  console.log('OK: mTLS configurato correttamente');
}

// Uso
await debugMTLS(sdk);
```

## Reset Certificato

```typescript
// Rimuovi certificato corrente
await sdk.clearCertificate();

// Verifica rimozione
const status = await sdk.getMTLSStatus();
console.log('Certificato rimosso:', !status.hasCertificate);

// Riconfigura
await sdk.storeCertificate(newCert, newKey, { format: 'pem' });
```

## Log Dettagliati

```typescript
// Intercetta errori mTLS
try {
  await sdk.receipts.create({ items: [...] });
} catch (error) {
  if (error instanceof ACubeSDKError) {
    console.log('=== Errore mTLS ===');
    console.log('Tipo:', error.type);
    console.log('Messaggio:', error.message);
    console.log('Status:', error.statusCode);

    if (error.originalError) {
      console.log('Errore originale:', error.originalError);
    }
  }
}
```

## Piattaforme Supportate

| Piattaforma | mTLS | Note |
|-------------|------|------|
| iOS (Dev Build) | Si | Richiede dev build |
| Android (Dev Build) | Si | Richiede dev build |
| Expo Go | No | Usa dev build |
| Web | Limitato | Solo browser compatibili |
| Node.js | Si | Pieno supporto |

## Prossimi Passi

- [Problemi Comuni](./common-issues.md)
- [Problemi Expo](./expo-specific.md)
