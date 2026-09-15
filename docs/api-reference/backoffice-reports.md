# Back-office Report API

Gestione dei documenti gestionali (back-office report) emessi da un PEM: lettura giornale, telemetria e report sugli scontrini.

## Accesso

```typescript
const backofficeReports = sdk.backofficeReports;
```

## Metodi

### findAll(serialNumber, params)

Lista i back-office report di un PEM con filtri.

```typescript
const page = await sdk.backofficeReports.findAll('PEM-SN-001', {
  type: 'journal_reading',
  issuanceDatetimeAfter: '2024-01-01T00:00:00Z',
  page: 1,
  size: 30,
});
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM
- `params` - `BackofficeReportsParams`

**Ritorna:** `Promise<Page<BackofficeReport>>`

### downloadPdf(serialNumber, reportUuid)

Scarica il PDF di un back-office report.

```typescript
const pdf = await sdk.backofficeReports.downloadPdf('PEM-SN-001', 'report-uuid');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM
- `reportUuid` - UUID del report

**Ritorna:** `Promise<Blob>`

### queueJournalReading(serialNumber)

Mette in coda la generazione del report di lettura del giornale attualmente aperto. Restituisce 409 se il PEM non ha un giornale aperto.

```typescript
const queued = await sdk.backofficeReports.queueJournalReading('PEM-SN-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM

**Ritorna:** `Promise<BackofficeReportQueued>`

### queueTelemetry(serialNumber)

Mette in coda la generazione del report di stato e telemetria del PEM. Restituisce 409 se il PEM non ha un giornale aperto.

```typescript
const queued = await sdk.backofficeReports.queueTelemetry('PEM-SN-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM

**Ritorna:** `Promise<BackofficeReportQueued>`

### queueReceiptsReport(serialNumber, input)

Mette in coda la generazione di un report su uno o più scontrini.

```typescript
const queued = await sdk.backofficeReports.queueReceiptsReport('PEM-SN-001', {
  type: 'details',
  filterBy: {
    documentNumber: '1234-5678',
  },
});
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM
- `input` - `QueueReceiptsBackofficeReportInput`

**Ritorna:** `Promise<BackofficeReportQueued>`

## Accesso

- **Merchant**: richiede un JWT valido.
- **Cashier**: richiede un JWT valido e un certificato mTLS valido.

## Tipi

### BackofficeReport

```typescript
interface BackofficeReport {
  uuid: string;
  status: BackofficeReportStatus;
  issuanceDatetime: string;
  type: BackofficeReportType;
  documentNumber?: string | null;
  journalProgressiveNumber?: number | null;
}
```

### BackofficeReportStatus

```typescript
type BackofficeReportStatus = 'queued' | 'processing' | 'ready' | 'failed';
```

### BackofficeReportType

```typescript
type BackofficeReportType = 'journal_closure' | 'journal_reading' | 'telemetry' | 'details';
```

### BackofficeReportsParams

```typescript
interface BackofficeReportsParams {
  page?: number;
  size?: number;
  type?: BackofficeReportType | BackofficeReportType[];
  issuanceDatetimeBefore?: string;
  issuanceDatetimeStrictlyBefore?: string;
  issuanceDatetimeAfter?: string;
  issuanceDatetimeStrictlyAfter?: string;
}
```

### BackofficeReportQueued

```typescript
interface BackofficeReportQueued {
  uuid: string;
}
```

### QueueReceiptsBackofficeReportInput

```typescript
interface QueueReceiptsBackofficeReportInput {
  type: 'details';
  filterBy: DocumentNumberFilter;
}
```

### DocumentNumberFilter

```typescript
interface DocumentNumberFilter {
  documentNumber: string;
}
```

## Esempi

### Chiusura Giornata: Lettura e Telemetria

```typescript
// Genera il report di lettura del giornale aperto
const journalReading = await sdk.backofficeReports.queueJournalReading('PEM-SN-001');

// Genera il report di telemetria corrente
const telemetry = await sdk.backofficeReports.queueTelemetry('PEM-SN-001');

console.log('Report in coda:', journalReading.uuid, telemetry.uuid);
```

### Report su uno Scontrino Specifico

```typescript
const queued = await sdk.backofficeReports.queueReceiptsReport('PEM-SN-001', {
  type: 'details',
  filterBy: { documentNumber: '0002-0008' },
});

// Attendi che lo stato diventi "ready" interrogando findAll/il report specifico,
// poi scarica il PDF
const pdf = await sdk.backofficeReports.downloadPdf('PEM-SN-001', queued.uuid);
```

### Filtrare i Report per Tipo e Intervallo Date

```typescript
const reports = await sdk.backofficeReports.findAll('PEM-SN-001', {
  type: ['journal_reading', 'telemetry'],
  issuanceDatetimeAfter: '2024-01-01T00:00:00Z',
  issuanceDatetimeBefore: '2024-01-31T23:59:59Z',
});

for (const report of reports.members) {
  console.log(`${report.type}: ${report.status} (${report.issuanceDatetime})`);
}
```

## Prossimi Passi

- [Journal API](./journals.md)
- [Receipt API](./receipts.md)
