# Attivazione POS

Flusso completo per attivare un punto vendita.

## Panoramica

```
1. Creazione Merchant (se necessario)
2. Creazione PEM
3. Attivazione POS
4. Configurazione Certificato mTLS
5. Creazione Cash Register (opzionale)
```

## 1. Verifica Merchant

```typescript
// Ottieni lista merchant
const merchants = await sdk.merchants.findAll();

// Usa merchant esistente o creane uno nuovo
let merchantUuid: string;

if (merchants.members.length > 0) {
  merchantUuid = merchants.members[0].uuid;
} else {
  const newMerchant = await sdk.merchants.create({
    name: 'La Mia Attivita',
    vatNumber: 'IT12345678901',
    fiscalId: 'IT12345678901',
    address: {
      streetAddress: 'Via Roma',
      streetNumber: '1',
      zipCode: '00100',
      city: 'Roma',
      province: 'RM',
    },
  });
  merchantUuid = newMerchant.uuid;
}
```

## 2. Creazione PEM

```typescript
const pem = await sdk.pems.create({
  merchantUuid,
  address: {
    streetAddress: 'Via del Negozio',
    streetNumber: '10',
    zipCode: '00184',
    city: 'Roma',
    province: 'RM',
  },
});

console.log('PEM Creato');
console.log('Serial Number:', pem.serialNumber);
console.log('Registration Key:', pem.registrationKey);

// Salva questi dati per l'attivazione
```

## 3. Attivazione POS

```typescript
// Attiva il POS con la chiave di registrazione
await sdk.pointOfSales.activate(pem.serialNumber, {
  registrationKey: pem.registrationKey,
});

console.log('POS Attivato');

// Verifica stato
const pos = await sdk.pointOfSales.findById(pem.serialNumber);
console.log('Stato:', pos.status); // 'ACTIVATED'
```

## 4. Configurazione Certificato mTLS

```typescript
// Ottieni certificati
const certs = await sdk.pems.getCertificates(pem.serialNumber);

// Configura certificato nell'SDK
await sdk.storeCertificate(
  certs.mtlsCertificate,
  'PRIVATE_KEY_FROM_PEM_CREATION', // Chiave privata
  { format: 'pem' }
);

// Verifica configurazione
const mtlsStatus = await sdk.getMTLSStatus();
console.log('mTLS Configurato:', mtlsStatus.isReady);
```

## 5. Creazione Cash Register (Opzionale)

```typescript
// Crea registratore di cassa virtuale
const cashRegister = await sdk.cashRegisters.create({
  pemSerialNumber: pem.serialNumber,
  name: 'Cassa 1',
});

console.log('Cash Register creato:', cashRegister.uuid);

// Il cash register include certificati mTLS propri
await sdk.storeCertificate(
  cashRegister.mtlsCertificate,
  cashRegister.privateKey,
  { format: 'pem' }
);
```

## 6. Test Connessione

```typescript
// Testa connessione mTLS
const testResult = await sdk.testMTLSConnection();

if (testResult) {
  console.log('Connessione mTLS OK');
} else {
  console.log('Errore connessione mTLS');
}
```

## 7. Prima Operazione

```typescript
// Crea primo scontrino di test
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Test Attivazione',
      quantity: '1',
      unitPrice: '0.01',
      vatRateCode: '22',
    },
  ],
});

console.log('Primo scontrino:', receipt.documentNumber);
```

## Flusso Completo

```typescript
import { createACubeSDK, ACubeSDKError } from '@acube/ereceipt-sdk';

async function activatePOS(
  merchantUuid: string,
  address: Address
): Promise<string> {
  const sdk = await createACubeSDK({
    environment: 'production',
  });

  try {
    // 1. Login
    await sdk.login({
      email: 'admin@example.com',
      password: 'password',
    });

    // 2. Crea PEM
    console.log('Creazione PEM...');
    const pem = await sdk.pems.create({
      merchantUuid,
      address,
    });
    console.log('PEM creato:', pem.serialNumber);

    // 3. Attiva POS
    console.log('Attivazione POS...');
    await sdk.pointOfSales.activate(pem.serialNumber, {
      registrationKey: pem.registrationKey,
    });
    console.log('POS attivato');

    // 4. Ottieni certificati
    console.log('Recupero certificati...');
    const certs = await sdk.pems.getCertificates(pem.serialNumber);

    // 5. Configura mTLS
    console.log('Configurazione mTLS...');
    await sdk.storeCertificate(
      certs.mtlsCertificate,
      'PRIVATE_KEY', // Da ottenere durante creazione PEM
      { format: 'pem' }
    );

    // 6. Test connessione
    console.log('Test connessione...');
    const testOk = await sdk.testMTLSConnection();

    if (!testOk) {
      throw new Error('Test connessione fallito');
    }

    console.log('Attivazione completata!');
    return pem.serialNumber;

  } catch (error) {
    if (error instanceof ACubeSDKError) {
      console.error('Errore:', error.type, error.message);
    }
    throw error;
  } finally {
    sdk.destroy();
  }
}

// Uso
const serialNumber = await activatePOS('merchant-uuid', {
  streetAddress: 'Via Esempio',
  streetNumber: '1',
  zipCode: '00100',
  city: 'Roma',
  province: 'RM',
});
```

## Gestione Errori

```typescript
try {
  await sdk.pointOfSales.activate(serialNumber, { registrationKey });
} catch (error) {
  if (error instanceof ACubeSDKError) {
    switch (error.type) {
      case 'NOT_FOUND_ERROR':
        console.log('PEM non trovato');
        break;
      case 'VALIDATION_ERROR':
        console.log('Chiave di registrazione non valida');
        break;
      case 'FORBIDDEN_ERROR':
        console.log('Non autorizzato');
        break;
      default:
        console.log('Errore:', error.message);
    }
  }
}
```

## Verifica Stati POS

```typescript
const pos = await sdk.pointOfSales.findById(serialNumber);

switch (pos.status) {
  case 'NEW':
    console.log('PEM creato, da attivare');
    break;
  case 'REGISTERED':
    console.log('Registrato, in attesa di attivazione');
    break;
  case 'ACTIVATED':
    console.log('Attivo e pronto');
    break;
  case 'ONLINE':
    console.log('Online e operativo');
    break;
  case 'OFFLINE':
    console.log('Offline - verificare connettivita');
    break;
  case 'DISCARDED':
    console.log('Dismesso');
    break;
}
```

## Prossimi Passi

- [Flusso Scontrini](./receipts-flow.md)
- [App Completa](./complete-app.md)
