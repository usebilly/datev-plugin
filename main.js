var helpers = require('./helpers.js');

var DEBITOR_ACCOUNT = '10000';
var SACHKONTENLAENGE = 4;
var COLUMN_COUNT = 125;

var COL = {
	umsatz: 0,
	sollHaben: 1,
	wkzUmsatz: 2,
	konto: 6,
	gegenkonto: 7,
	belegdatum: 9,
	belegfeld1: 10,
	buchungstext: 13,
	festschreibung: 113,
	leistungsdatum: 114,
};

// Fixed column headers prescribed by DATEV Buchungsstapel format version 13
var COLUMN_HEADERS =
	'Umsatz (ohne Soll/Haben-Kz);Soll/Haben-Kennzeichen;WKZ Umsatz;Kurs;Basisumsatz;WKZ Basisumsatz;Konto;Gegenkonto (ohne BU-Schl\u00fcssel);BU-Schl\u00fcssel;Belegdatum;Belegfeld 1;Belegfeld 2;Skonto;Buchungstext;Postensperre;Diverse Adressnummer;Gesch\u00e4ftspartnerbank;Sachverhalt;Zinssperre;Beleglink;Beleginfo \u2013 Art 1;Beleginfo \u2013 Inhalt 1;Beleginfo \u2013 Art 2;Beleginfo \u2013 Inhalt 2;Beleginfo \u2013 Art 3;Beleginfo \u2013 Inhalt 3;Beleginfo \u2013 Art 4;Beleginfo \u2013 Inhalt 4;Beleginfo \u2013 Art 5;Beleginfo \u2013 Inhalt 5;Beleginfo \u2013 Art 6;Beleginfo \u2013 Inhalt 6;Beleginfo \u2013 Art 7;Beleginfo \u2013 Inhalt 7;Beleginfo \u2013 Art 8;Beleginfo \u2013 Inhalt 8;KOST1 \u2013 Kostenstelle;KOST2 \u2013 Kostenstelle;Kost Menge;EU-Land u. USt-IdNr.;EU-Steuersatz;Abw. Versteuerungsart;Sachverhalt L+L;Funktionserg\u00e4nzung L+L;BU 49 Hauptfunktionstyp;BU 49 Hauptfunktionsnummer;BU 49 Funktionserg\u00e4nzung;Zusatzinformation \u2013 Art 1;Zusatzinformation \u2013 Inhalt 1;Zusatzinformation \u2013 Art 2;Zusatzinformation \u2013 Inhalt 2;Zusatzinformation \u2013 Art 3;Zusatzinformation \u2013 Inhalt 3;Zusatzinformation \u2013 Art 4;Zusatzinformation \u2013 Inhalt 4;Zusatzinformation \u2013 Art 5;Zusatzinformation \u2013 Inhalt 5;Zusatzinformation \u2013 Art 6;Zusatzinformation \u2013 Inhalt 6;Zusatzinformation \u2013 Art 7;Zusatzinformation \u2013 Inhalt 7;Zusatzinformation \u2013 Art 8;Zusatzinformation \u2013 Inhalt 8;Zusatzinformation \u2013 Art 9;Zusatzinformation \u2013 Inhalt 9;Zusatzinformation \u2013 Art 10;Zusatzinformation \u2013 Inhalt 10;Zusatzinformation \u2013 Art 11;Zusatzinformation \u2013 Inhalt 11;Zusatzinformation \u2013 Art 12;Zusatzinformation \u2013 Inhalt 12;Zusatzinformation \u2013 Art 13;Zusatzinformation \u2013 Inhalt 13;Zusatzinformation \u2013 Art 14;Zusatzinformation \u2013 Inhalt 14;Zusatzinformation \u2013 Art 15;Zusatzinformation \u2013 Inhalt 15;Zusatzinformation \u2013 Art 16;Zusatzinformation \u2013 Inhalt 16;Zusatzinformation \u2013 Art 17;Zusatzinformation \u2013 Inhalt 17;Zusatzinformation \u2013 Art 18;Zusatzinformation \u2013 Inhalt 18;Zusatzinformation \u2013 Art 19;Zusatzinformation \u2013 Inhalt 19;Zusatzinformation \u2013 Art 20;Zusatzinformation \u2013 Inhalt 20;St\u00fcck;Gewicht;Zahlweise;Forderungsart;Veranlagungsjahr;Zugeordnete F\u00e4lligkeit;Skontotyp;Auftragsnummer;Buchungstyp;USt-Schl\u00fcssel (Anzahlungen);EU-Mitgliedstaat (Anzahlungen);Sachverhalt L+L (Anzahlungen);EU-Steuersatz (Anzahlungen);Erl\u00f6skonto (Anzahlungen);Herkunft-Kz;Leerfeld;KOST-Datum;SEPA-Mandatsreferenz;Skontosperre;Gesellschaftername;Beteiligtennummer;Identifikationsnummer;Zeichnernummer;Postensperre bis;Bezeichnung;Kennzeichen;Festschreibung;Leistungsdatum;Datum Zuord.;F\u00e4lligkeit;Generalumkehr;Steuersatz;Land;Abrechnungsreferent;BVV-Position;EU-Mitgliedstaat u. UStID (Ursprung);EU-Steuersatz (Ursprung);Abw. Skontokonto';

function revenueAccount(vatPercentage, exemption) {
	if (exemption === 'smallBusiness') {
		return '8195';
	}
	if (vatPercentage === 19) {
		return '8400';
	}
	if (vatPercentage === 7) {
		return '8300';
	}
	return '8120';
}

function formatGermanAmount(value) {
	return value.toFixed(2).replace('.', ',');
}

function formatDatePart(dateStr, pattern) {
	var parts = dateStr.split('-');
	var year = parts[0];
	var month = parts[1];
	var day = parts[2];

	if (pattern === 'ddMM') {
		return day + month;
	}
	if (pattern === 'ddMMyyyy') {
		return day + month + year;
	}
	if (pattern === 'yyyyMMdd') {
		return year + month + day;
	}
	return '';
}

function formatTimestamp(date) {
	function pad(value, length) {
		return String(value).padStart(length, '0');
	}
	return pad(date.getFullYear(), 4) + pad(date.getMonth() + 1, 2) + pad(date.getDate(), 2) + pad(date.getHours(), 2) + pad(date.getMinutes(), 2) + pad(date.getSeconds(), 2) + '000';
}

function buildHeader(currency, fiscalYearStart, periodStart, periodEnd, timestamp) {
	return ['"EXTF"', '700', '21', '"Buchungsstapel"', '13', formatTimestamp(timestamp), '', '"BI"', '"Billy"', '', '', '', formatDatePart(fiscalYearStart, 'yyyyMMdd'), String(SACHKONTENLAENGE), formatDatePart(periodStart, 'yyyyMMdd'), formatDatePart(periodEnd, 'yyyyMMdd'), '"Billy Export"', '', '1', '', '0', '"' + currency + '"', '', '', '', '', '', '', '', ''].join(';');
}

function buildBookingRows(invoice, profile) {
	var isCancellation = invoice.cancelledInvoiceId != null;
	var sollHaben = isCancellation ? 'H' : 'S';
	var invoiceNumber = helpers.invoiceNumber(invoice, profile).slice(0, 36);
	var customerName = (invoice.recipient && invoice.recipient.name ? invoice.recipient.name : '').replace(/"/g, '').slice(0, 60);

	var belegdatum = formatDatePart(invoice.date, 'ddMM');
	var leistungsdatum = formatDatePart(invoice.serviceDateStart, 'ddMMyyyy');

	var rates = [];
	var seen = {};
	invoice.items.forEach(function(item) {
		if (!seen[item.vatPercentage]) {
			seen[item.vatPercentage] = true;
			rates.push(item.vatPercentage);
		}
	});
	rates.sort(function(a, b) {
		return a - b;
	});

	var sub = helpers.subtotalNet(invoice);
	var net = helpers.totalNet(invoice);
	var grossPrices = invoice.grossPrices || false;
	var exemption = invoice.vatExemptionReason || 'none';

	return rates
		.map(function(rate) {
			var originalBasis = invoice.items
				.filter(function(item) {
					return item.vatPercentage === rate;
				})
				.reduce(function(sum, item) {
					return sum + helpers.lineNetTotal(item, grossPrices);
				}, 0);

			var discountedBasis = sub > 0 ? helpers.roundedToCents((originalBasis * net) / sub) : originalBasis;
			var vatAmount = rate > 0 ? helpers.roundedToCents((discountedBasis * rate) / 100) : 0;
			var grossAmount = discountedBasis + vatAmount;

			if (Math.abs(grossAmount) < 0.01) {
				return null;
			}

			var gegenkonto = revenueAccount(rate, exemption);
			var row = new Array(COLUMN_COUNT);
			for (var i = 0; i < COLUMN_COUNT; i += 1) {
				row[i] = '';
			}

			row[COL.umsatz] = formatGermanAmount(Math.abs(grossAmount));
			row[COL.sollHaben] = '"' + sollHaben + '"';
			row[COL.konto] = DEBITOR_ACCOUNT;
			row[COL.gegenkonto] = gegenkonto;
			row[COL.belegdatum] = belegdatum;
			row[COL.belegfeld1] = '"' + invoiceNumber + '"';
			row[COL.buchungstext] = '"' + customerName + '"';
			row[COL.festschreibung] = '0';
			row[COL.leistungsdatum] = leistungsdatum;

			if (invoice.currency !== 'EUR') {
				row[COL.wkzUmsatz] = '"' + invoice.currency + '"';
			}

			return row.join(';');
		})
		.filter(function(row) {
			return row != null;
		});
}

function buildDATEV(invoices, profile) {
	var now = new Date();
	var dates = invoices
		.map(function(invoice) {
			return invoice.date;
		})
		.sort();
	var today = now.toISOString().slice(0, 10);
	var periodStart = dates.length > 0 ? dates[0] : today;
	var periodEnd = dates.length > 0 ? dates[dates.length - 1] : today;
	var fiscalYearStart = periodStart.slice(0, 4) + '-01-01';

	var header = buildHeader(profile.currency, fiscalYearStart, periodStart, periodEnd, now);
	var rows = [];
	invoices.forEach(function(invoice) {
		buildBookingRows(invoice, profile).forEach(function(row) {
			rows.push(row);
		});
	});

	return [header, COLUMN_HEADERS].concat(rows).join('\r\n');
}

exports.exportInvoices = function(invoices, profile) {
	var sorted = helpers.sortInvoices(invoices, profile);
	return buildDATEV(sorted, profile);
};
