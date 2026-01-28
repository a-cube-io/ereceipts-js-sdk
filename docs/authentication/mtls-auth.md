# Autenticazione mTLS

L'autenticazione mTLS (Mutual TLS) e' richiesta per operazioni fiscali critiche che necessitano di autenticazione con certificato client.

## Requisiti

- **Development Build**: mTLS non funziona con Expo Go
- **Certificato Client**: File .pem o .p12 fornito da ACube
- **Chiave Privata**: Associata al certificato
- **Modulo nativo**: `@a-cube-io/expo-mutual-tls`

## Installazione Modulo mTLS

Il SDK utilizza `@a-cube-io/expo-mutual-tls` per gestire le connessioni mTLS su iOS e Android.

```bash
npx expo install @a-cube-io/expo-mutual-tls
```

### Caratteristiche del Modulo

| Feature | Descrizione |
|---------|-------------|
| Formati supportati | P12 (PKCS#12), PEM |
| Storage sicuro | iOS Keychain, Android Keystore |
| Implementazione | Native Swift e Kotlin |
| Gestione scadenza | Warning automatici |
| Event logging | Monitoraggio operazioni |

## Quando Usare mTLS

| Operazione | Richiede mTLS |
|------------|---------------|
| Login/Logout | No |
| Lista scontrini | No |
| Crea scontrino | Si |
| Annulla scontrino | Si |
| Operazioni PEM | Si |
| Report giornalieri | Si |

## Setup Certificato

### Salvare il Certificato

```typescript
const certificate = `-----BEGIN CERTIFICATE-----
...contenuto certificato...
-----END CERTIFICATE-----`;

const privateKey = `-----BEGIN PRIVATE KEY-----
...contenuto chiave privata...
-----END PRIVATE KEY-----`;

await sdk.storeCertificate(certificate, privateKey, {
  format: 'pem',
});
```

### Verificare Stato mTLS

```typescript
const status = await sdk.getMTLSStatus();

console.log('Adapter disponibile:', status.adapterAvailable);
console.log('Certificato presente:', status.hasCertificate);
console.log('mTLS pronto:', status.isReady);

if (status.certificateInfo) {
  console.log('Info certificato:', status.certificateInfo);
}
```

### Test Connessione mTLS

```typescript
const connectionOk = await sdk.testMTLSConnection();
if (connectionOk) {
  console.log('Connessione mTLS funzionante');
} else {
  console.log('Errore connessione mTLS');
}
```

## Formati Certificato Supportati

### PEM (Consigliato)

```typescript
await sdk.storeCertificate(pemCert, pemKey, {
  format: 'pem',
});
```

### P12/PKCS12

```typescript
await sdk.storeCertificate(p12Data, '', {
  format: 'p12',
  password: 'certificate-password',
});
```

## Gestione Certificato

### Ottenere Info Certificato

```typescript
const certInfo = await sdk.getCertificateInfo();
if (certInfo) {
  console.log('Formato:', certInfo.format);
}
```

### Verificare Presenza Certificato

```typescript
const hasCert = await sdk.hasCertificate();
if (!hasCert) {
  console.log('Nessun certificato configurato');
}
```

### Rimuovere Certificato

```typescript
await sdk.clearCertificate();
console.log('Certificato rimosso');
```

## Development Build

Per usare mTLS con Expo, e' necessario generare un development build:

```bash
# Genera progetto nativo
npx expo prebuild

# iOS
npx expo run:ios

# Android
npx expo run:android
```

### EAS Build

```bash
# Development build con mTLS
eas build --profile development --platform all
```

## Errori Comuni

### Adapter Non Disponibile

```typescript
try {
  await sdk.storeCertificate(cert, key);
} catch (error) {
  if (error.type === 'MTLS_ADAPTER_NOT_AVAILABLE') {
    console.log('mTLS non disponibile - usa development build');
  }
}
```

### Certificato Non Valido

```typescript
try {
  await sdk.testMTLSConnection();
} catch (error) {
  console.log('Errore certificato:', error.message);
}
```

### Handshake Fallito

L'SDK riprova automaticamente in caso di errori TLS. Se persiste:

1. Verificare validita' certificato
2. Verificare chiave privata corretta
3. Verificare connettivita' rete

## Flusso mTLS

```
┌─────────────────┐      ┌─────────────────┐
│  App Client     │      │  ACube Server   │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │   1. Client Hello      │
         │───────────────────────>│
         │                        │
         │   2. Server Hello +    │
         │      Server Cert       │
         │<───────────────────────│
         │                        │
         │   3. Client Cert +     │
         │      Client Verify     │
         │───────────────────────>│
         │                        │
         │   4. Connection OK     │
         │<───────────────────────│
         │                        │
         │   5. API Request       │
         │───────────────────────>│
         │                        │
```

## Prossimi Passi

- [Gestione Certificati](./certificates.md)
- [API Reference](../api-reference/sdk-instance.md)
