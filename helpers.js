function roundedToCents(value) {
    return Math.round(value * 100) / 100;
}

function lineNetTotal(item, grossPrices) {
    var lineTotal = item.quantity * item.unitPrice;
    var raw;
    if (grossPrices) {
        raw = item.vatPercentage > 0
            ? item.quantity * item.unitPrice / (1 + item.vatPercentage / 100)
            : lineTotal;
    } else {
        raw = lineTotal;
    }
    return roundedToCents(raw);
}

function subtotalNet(invoice) {
    var grossPrices = invoice.grossPrices || false;
    return invoice.items.reduce(function (sum, item) {
        return sum + lineNetTotal(item, grossPrices);
    }, 0);
}

function effectiveDiscountAmount(invoice) {
    var sub = subtotalNet(invoice);
    if (invoice.discountPercentage != null && invoice.discountPercentage > 0) {
        return roundedToCents(sub * invoice.discountPercentage / 100);
    }
    if (invoice.discountAmount != null && invoice.discountAmount > 0) {
        return Math.min(roundedToCents(invoice.discountAmount), sub);
    }
    return 0;
}

function totalNet(invoice) {
    return subtotalNet(invoice) - effectiveDiscountAmount(invoice);
}

function renderNumberFormat(format, number, year, isCancellation) {
    var result = "";
    var i = 0;

    while (i < format.length) {
        if (format.charAt(i) === "{") {
            var closeIndex = format.indexOf("}", i + 1);
            if (closeIndex === -1) {
                result += format.charAt(i);
                i += 1;
                continue;
            }
            var token = format.slice(i + 1, closeIndex);

            if (token.length > 0 && /^Y+$/.test(token)) {
                var divisor = Math.pow(10, token.length);
                var truncated = year % divisor;
                result += String(truncated).padStart(token.length, "0");
            } else if (token.length > 0 && /^N+$/.test(token)) {
                result += String(number).padStart(token.length, "0");
            } else if (token.length >= 2 && token.charAt(0) === "'" && token.charAt(token.length - 1) === "'") {
                result += token.slice(1, -1);
            }

            i = closeIndex + 1;
        } else {
            result += format.charAt(i);
            i += 1;
        }
    }

    if (isCancellation) {
        var separator = findSeparator(format);
        result = "STO" + separator + result;
    }

    return result;
}

function findSeparator(format) {
    var lastWasToken = false;
    for (var i = 0; i < format.length; i += 1) {
        if (format.charAt(i) === "{") {
            var closeIndex = format.indexOf("}", i + 1);
            if (closeIndex !== -1) {
                lastWasToken = true;
                i = closeIndex;
                continue;
            }
        }
        if (lastWasToken) {
            return format.charAt(i);
        }
    }
    return "-";
}

function invoiceNumber(invoice, profile) {
    var year = parseInt(invoice.date.slice(0, 4), 10);
    var isCancellation = invoice.cancelledInvoiceId != null;

    if (invoice.numberFormat) {
        return renderNumberFormat(invoice.numberFormat, invoice.number, year, isCancellation);
    }

    return renderNumberFormat(profile.numberFormat, invoice.number, year, isCancellation);
}

function sortInvoices(invoices, profile) {
    return invoices.slice().sort(function (lhs, rhs) {
        var year1 = parseInt(lhs.date.slice(0, 4), 10);
        var year2 = parseInt(rhs.date.slice(0, 4), 10);
        if (year1 !== year2) {
            return year2 - year1;
        }

        function numberFor(invoice) {
            if (invoice.cancelledInvoiceId) {
                for (var i = 0; i < invoices.length; i += 1) {
                    if (invoices[i].id === invoice.cancelledInvoiceId) {
                        return invoiceNumber(invoices[i], profile);
                    }
                }
            }
            return invoiceNumber(invoice, profile);
        }

        var number1 = numberFor(lhs);
        var number2 = numberFor(rhs);
        if (number1 === number2) {
            if (lhs.cancelledInvoiceId == null && rhs.cancelledInvoiceId != null) {
                return -1;
            }
            if (lhs.cancelledInvoiceId != null && rhs.cancelledInvoiceId == null) {
                return 1;
            }
            return 0;
        }
        return number1 > number2 ? -1 : 1;
    });
}

module.exports = {
    roundedToCents: roundedToCents,
    lineNetTotal: lineNetTotal,
    subtotalNet: subtotalNet,
    totalNet: totalNet,
    invoiceNumber: invoiceNumber,
    sortInvoices: sortInvoices
};
