# Daily Report API

Consultazione report giornalieri delle transazioni.

## Accesso

```typescript
const dailyReports = sdk.dailyReports;
```

## Metodi

### findById(merchantUuid, reportUuid)

Ottiene un report giornaliero specifico.

```typescript
const report = await sdk.dailyReports.findById(
  'merchant-uuid',
  'report-uuid'
);
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `reportUuid` - UUID del report

**Ritorna:** `Promise<DailyReport>`

### findAll(merchantUuid, params)

Lista report giornalieri con filtri.

```typescript
const page = await sdk.dailyReports.findAll('merchant-uuid', {
  pemSerialNumber: 'POS-001',
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  status: 'sent',
  page: 1,
});
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `params` - `DailyReportsParams`

**Ritorna:** `Promise<Page<DailyReport>>`

## Tipi

### DailyReport

```typescript
interface DailyReport {
  uuid: string;
  pemSerialNumber: string;
  date: string;
  totalReceipts: number;
  totalAmount: string;
  status: DailyReportStatus;
}
```

### DailyReportStatus

```typescript
type DailyReportStatus = 'pending' | 'sent' | 'error';
```

### DailyReportsParams

```typescript
interface DailyReportsParams {
  pemSerialNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: DailyReportStatus;
  page?: number;
}
```

## Esempi

### Recupero Report Mensile

```typescript
const reports = await sdk.dailyReports.findAll('merchant-uuid', {
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
});

let totalMonthAmount = 0;
let totalMonthReceipts = 0;

for (const report of reports.members) {
  totalMonthAmount += parseFloat(report.totalAmount);
  totalMonthReceipts += report.totalReceipts;

  console.log(
    `${report.date}: ${report.totalReceipts} scontrini, ${report.totalAmount} EUR`
  );
}

console.log(`Totale mese: ${totalMonthReceipts} scontrini, ${totalMonthAmount} EUR`);
```

### Verifica Report per POS

```typescript
const posReports = await sdk.dailyReports.findAll('merchant-uuid', {
  pemSerialNumber: 'POS-001',
  status: 'sent',
});

for (const report of posReports.members) {
  console.log(`${report.date}: ${report.status}`);
}
```

### Monitoraggio Report con Errori

```typescript
const errorReports = await sdk.dailyReports.findAll('merchant-uuid', {
  status: 'error',
});

if (errorReports.members.length > 0) {
  console.log('Report con errori da verificare:');
  for (const report of errorReports.members) {
    console.log(`- ${report.date} (POS: ${report.pemSerialNumber})`);
  }
}
```

## Prossimi Passi

- [Journal API](./journals.md)
- [Receipt API](./receipts.md)
