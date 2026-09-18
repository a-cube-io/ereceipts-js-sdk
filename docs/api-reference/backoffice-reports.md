# Back-office Report API

Gestione dei documenti gestionali (back-office report) emessi da un PEM: lettura giornale, telemetria e report sugli scontrini.

Ogni chiamata di "queueing" crea una **richiesta** (`request_uuid`) che genera uno o più **report** (`BackofficeReport`, ciascuno con il proprio `uuid`) associati a quella richiesta. Usa `findAllRequests`/`request_uuid` per seguire lo stato di avanzamento di una richiesta e `findAll` (filtrato per `requestUuid`) per recuperare i report effettivamente generati.

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
  requestUuid: 'request-uuid',
  issuanceDatetimeAfter: '2024-01-01T00:00:00Z',
  page: 1,
  size: 30,
});
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM
- `params` - `BackofficeReportsParams`

**Ritorna:** `Promise<Page<BackofficeReport>>`

### findAllRequests(serialNumber, params)

Lista le richieste di generazione di back-office report per un PEM.

```typescript
const requests = await sdk.backofficeReports.findAllRequests('PEM-SN-001', {
  page: 1,
  size: 30,
});
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM
- `params` - `BackofficeReportRequestsParams`

**Ritorna:** `Promise<Page<BackofficeReportRequest>>`

### downloadPdf(serialNumber, reportUuid)

Scarica il PDF di un back-office report.

```typescript
const pdf = await sdk.backofficeReports.downloadPdf('PEM-SN-001', 'report-uuid');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM
- `reportUuid` - UUID del report (non il `requestUuid` della richiesta)

**Ritorna:** `Promise<Blob>`

### queueJournalReading(serialNumber)

Mette in coda la generazione del report di lettura del giornale attualmente aperto. Restituisce 409 se il PEM non ha un giornale aperto.

```typescript
const queued = await sdk.backofficeReports.queueJournalReading('PEM-SN-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM

**Ritorna:** `Promise<BackofficeReportRequestQueued>`

### queueTelemetry(serialNumber)

Mette in coda la generazione del report di stato e telemetria del PEM. Restituisce 409 se il PEM non ha un giornale aperto.

```typescript
const queued = await sdk.backofficeReports.queueTelemetry('PEM-SN-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM

**Ritorna:** `Promise<BackofficeReportRequestQueued>`

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

**Ritorna:** `Promise<BackofficeReportRequestQueued>`

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
  journalId?: number | null;
  requestUuid: string;
  requestDatetime: string;
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
  requestUuid?: string;
  issuanceDatetimeBefore?: string;
  issuanceDatetimeStrictlyBefore?: string;
  issuanceDatetimeAfter?: string;
  issuanceDatetimeStrictlyAfter?: string;
}
```

### BackofficeReportRequest

```typescript
interface BackofficeReportRequest {
  requestUuid: string;
  type: BackofficeReportType;
  filterBy?: Record<string, unknown> | null;
  status: BackofficeReportRequestStatus;
  requestDatetime: string;
  reports?: BackofficeReportRequestReports | null;
}
```

### BackofficeReportRequestStatus

```typescript
type BackofficeReportRequestStatus = 'queued' | 'processed' | 'failed';
```

### BackofficeReportRequestReports

Stato di avanzamento della generazione dei report associati a una richiesta. `null` finché la richiesta non è in stato `processed`.

```typescript
interface BackofficeReportRequestReports {
  ready: boolean;
  count: number;
  readyCount: number;
}
```

### BackofficeReportRequestsParams

```typescript
interface BackofficeReportRequestsParams {
  page?: number;
  size?: number;
}
```

### BackofficeReportRequestQueued

```typescript
interface BackofficeReportRequestQueued {
  requestUuid: string;
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

console.log('Richieste in coda:', journalReading.requestUuid, telemetry.requestUuid);
```

### Report su uno Scontrino Specifico

```typescript
const queued = await sdk.backofficeReports.queueReceiptsReport('PEM-SN-001', {
  type: 'details',
  filterBy: { documentNumber: '0002-0008' },
});

// Segui lo stato della richiesta finché reports.ready non è true
const requests = await sdk.backofficeReports.findAllRequests('PEM-SN-001');
const request = requests.members.find((r) => r.requestUuid === queued.requestUuid);

if (request?.reports?.ready) {
  // Recupera i report effettivamente generati dalla richiesta
  const reports = await sdk.backofficeReports.findAll('PEM-SN-001', {
    requestUuid: queued.requestUuid,
  });

  for (const report of reports.members) {
    const pdf = await sdk.backofficeReports.downloadPdf('PEM-SN-001', report.uuid);
    console.log('PDF scaricato per report', report.uuid, pdf);
  }
}
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
