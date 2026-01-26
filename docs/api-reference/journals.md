# Journal API

Gestione giornali di cassa per tracciamento transazioni.

## Accesso

```typescript
const journals = sdk.journals;
```

## Metodi

### findById(merchantUuid, journalUuid)

Ottiene un giornale specifico.

```typescript
const journal = await sdk.journals.findById(
  'merchant-uuid',
  'journal-uuid'
);
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `journalUuid` - UUID del giornale

**Ritorna:** `Promise<Journal>`

### findAll(merchantUuid, params)

Lista giornali con filtri.

```typescript
const page = await sdk.journals.findAll('merchant-uuid', {
  pemSerialNumber: 'POS-001',
  status: 'open',
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  page: 1,
});
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `params` - `JournalsParams`

**Ritorna:** `Promise<Page<Journal>>`

### close(merchantUuid, input)

Chiude un giornale aperto.

```typescript
const closedJournal = await sdk.journals.close('merchant-uuid', {
  journalUuid: 'journal-uuid',
});
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `input` - `JournalCloseInput`

**Ritorna:** `Promise<Journal>`

## Tipi

### Journal

```typescript
interface Journal {
  uuid: string;
  pemSerialNumber: string;
  date: string;
  sequenceNumber: number;
  totalReceipts: number;
  totalAmount: string;
  status: JournalStatus;
}
```

### JournalStatus

```typescript
type JournalStatus = 'open' | 'closed';
```

### JournalsParams

```typescript
interface JournalsParams {
  pemSerialNumber?: string;
  status?: JournalStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}
```

### JournalCloseInput

```typescript
interface JournalCloseInput {
  journalUuid: string;
}
```

## Esempi

### Chiusura Giornale a Fine Giornata

```typescript
// 1. Trova giornale aperto per il POS
const openJournals = await sdk.journals.findAll('merchant-uuid', {
  pemSerialNumber: 'POS-001',
  status: 'open',
});

if (openJournals.members.length > 0) {
  const journal = openJournals.members[0];

  // 2. Chiudi il giornale
  const closed = await sdk.journals.close('merchant-uuid', {
    journalUuid: journal.uuid,
  });

  console.log('Giornale chiuso:', closed.uuid);
  console.log('Totale scontrini:', closed.totalReceipts);
  console.log('Totale importo:', closed.totalAmount);
}
```

### Riepilogo Giornali Mensili

```typescript
const journals = await sdk.journals.findAll('merchant-uuid', {
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  status: 'closed',
});

for (const journal of journals.members) {
  console.log(
    `Giornale #${journal.sequenceNumber} (${journal.date}): ` +
    `${journal.totalReceipts} scontrini, ${journal.totalAmount} EUR`
  );
}
```

### Verifica Giornali Aperti

```typescript
const openJournals = await sdk.journals.findAll('merchant-uuid', {
  status: 'open',
});

if (openJournals.members.length > 0) {
  console.log('Giornali aperti da chiudere:');
  for (const journal of openJournals.members) {
    console.log(
      `- POS ${journal.pemSerialNumber}: ` +
      `${journal.totalReceipts} scontrini, ${journal.totalAmount} EUR`
    );
  }
}
```

## Prossimi Passi

- [Daily Report API](./daily-reports.md)
- [Point of Sale API](./point-of-sales.md)
