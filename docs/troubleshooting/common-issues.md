# Problemi Comuni

Soluzioni ai problemi piu frequenti nell'uso dell'SDK.

## SDK Non Inizializzato

### Errore
```
ACubeSDKError: SDK not initialized. Call initialize() first.
```

### Causa
Tentativo di usare l'SDK prima dell'inizializzazione.

### Soluzione
```typescript
// Usa createACubeSDK che inizializza automaticamente
const sdk = await createACubeSDK({
  environment: 'sandbox',
});

// Oppure inizializza manualmente
const sdk = new ACubeSDK({ environment: 'sandbox' });
await sdk.initialize();
```

## Errore Autenticazione

### Errore
```
ACubeSDKError: AUTH_ERROR - Invalid credentials
```

### Causa
Credenziali errate o sessione scaduta.

### Soluzione
```typescript
try {
  await sdk.login({ email, password });
} catch (error) {
  if (error instanceof ACubeSDKError && error.type === 'AUTH_ERROR') {
    // Credenziali errate
    console.log('Verifica email e password');
  }
}

// Per sessione scaduta
const isAuth = await sdk.isAuthenticated();
if (!isAuth) {
  // Ri-effettua login
  await sdk.login({ email, password });
}
```

## Errore di Rete

### Errore
```
ACubeSDKError: NETWORK_ERROR - Network request failed
```

### Causa
Nessuna connessione internet o server non raggiungibile.

### Soluzione
```typescript
// Verifica connessione
if (!sdk.isOnline()) {
  // Usa modalita offline
  const offlineManager = sdk.getOfflineManager();
  await offlineManager.queueReceiptCreation({ items: [...] });
}

// Implementa retry
const createReceiptWithRetry = async (data, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sdk.receipts.create(data);
    } catch (error) {
      if (error instanceof ACubeSDKError && error.type === 'NETWORK_ERROR') {
        if (i === maxRetries - 1) throw error;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
};
```

## Errore Validazione

### Errore
```
ACubeSDKError: VALIDATION_ERROR
violations: [{ propertyPath: 'items[0].unitPrice', message: 'Invalid format' }]
```

### Causa
Dati non conformi al formato richiesto.

### Soluzione
```typescript
try {
  await sdk.receipts.create({ items: [...] });
} catch (error) {
  if (error instanceof ACubeSDKError && error.type === 'VALIDATION_ERROR') {
    if (error.violations) {
      for (const v of error.violations) {
        console.log(`Campo ${v.propertyPath}: ${v.message}`);
      }
    }
  }
}

// Formato corretto per i prezzi: stringa con 2 decimali
const correctItem = {
  description: 'Prodotto',
  quantity: '1',        // Stringa
  unitPrice: '10.00',   // Stringa con 2 decimali
  vatRateCode: '22',    // Stringa: '22', '10', '5', '4', 'N1', etc.
};
```

## Risorsa Non Trovata

### Errore
```
ACubeSDKError: NOT_FOUND_ERROR - Resource not found
```

### Causa
UUID o identificatore non valido.

### Soluzione
```typescript
try {
  const receipt = await sdk.receipts.findById('uuid');
} catch (error) {
  if (error instanceof ACubeSDKError && error.type === 'NOT_FOUND_ERROR') {
    console.log('Scontrino non trovato');
    // Verifica UUID
    // Verifica permessi merchant
  }
}
```

## Certificato mTLS Non Configurato

### Errore
```
ACubeSDKError: MTLS_ADAPTER_NOT_AVAILABLE
```

### Causa
Tentativo di operazione mTLS senza certificato configurato.

### Soluzione
```typescript
// Verifica stato mTLS
const status = await sdk.getMTLSStatus();

if (!status.hasCertificate) {
  // Ottieni certificati dal PEM
  const certs = await sdk.pems.getCertificates(serialNumber);

  // Configura certificato
  await sdk.storeCertificate(
    certs.mtlsCertificate,
    privateKey,
    { format: 'pem' }
  );
}
```

## Operazioni Offline Non Sincronizzate

### Problema
Le operazioni in coda offline non vengono sincronizzate.

### Verifica
```typescript
const offlineManager = sdk.getOfflineManager();
const stats = offlineManager.getQueueStats();

console.log('Pending:', stats.pending);
console.log('Failed:', stats.failed);
```

### Soluzione
```typescript
// Forza sincronizzazione manuale
if (sdk.isOnline()) {
  const result = await offlineManager.sync();
  console.log('Sincronizzate:', result?.successCount);
  console.log('Fallite:', result?.failureCount);
}

// Riprova operazioni fallite
await offlineManager.retryFailed();

// Pulisci operazioni vecchie
await offlineManager.clearCompleted();
```

## Token Scaduto Durante Operazione

### Problema
Token JWT scade durante operazioni lunghe.

### Soluzione
```typescript
// L'SDK gestisce automaticamente il refresh del token
// Se ricevi AUTH_ERROR, ri-effettua login

sdk.events.onAuthError = (error) => {
  // Reindirizza a login
  navigation.navigate('Login');
};

// Verifica validita token prima di operazioni critiche
const isAuth = await sdk.isAuthenticated();
if (!isAuth) {
  await sdk.login({ email, password });
}
```

## Memoria Piena (Storage)

### Errore
```
ACubeSDKError: STORAGE_CERTIFICATE_ERROR
```

### Causa
Storage sicuro pieno o non disponibile.

### Soluzione
```typescript
// Pulisci dati vecchi
await sdk.clearCertificate();

// Pulisci coda offline
const offlineManager = sdk.getOfflineManager();
await offlineManager.clearAll();

// Riprova
await sdk.storeCertificate(certificate, privateKey);
```

## Debug

### Abilitare Log

```typescript
const sdk = await createACubeSDK({
  environment: 'sandbox',
  debug: true, // Abilita log dettagliati
});
```

### Log Errori Completi

```typescript
try {
  await sdk.receipts.create({ items: [...] });
} catch (error) {
  if (error instanceof ACubeSDKError) {
    console.log('Tipo:', error.type);
    console.log('Messaggio:', error.message);
    console.log('Status Code:', error.statusCode);
    console.log('Violations:', error.violations);
    console.log('Original Error:', error.originalError);
  }
}
```

## Prossimi Passi

- [Problemi Expo](./expo-specific.md)
- [Debug mTLS](./mtls-debugging.md)
