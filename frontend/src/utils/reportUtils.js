import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// App blue palette
const BLUE_DARK = [28, 77, 141];   // #1C4D8D
const BLUE_MID  = [73, 136, 196];  // #4988C4
const BLUE_LIGHT = [189, 232, 245]; // #BDE8F5
const WHITE = [255, 255, 255];
const GRAY_TEXT = [100, 116, 139];  // #64748b
const DARK_TEXT = [15, 40, 84];     // #0F2854

/**
 * Draws the SafetyFirst shield logo (SVG path converted to jsPDF primitives)
 * and the "SafetyFirst" wordmark at position (x, y).
 */
function drawLogo(doc, x, y, size = 18) {
  const shield = size;
  const halfW = shield * 0.5;

  // Shield outer gradient simulation — two filled triangles + arc base
  doc.setFillColor(...BLUE_DARK);
  doc.triangle(x, y + shield * 0.25, x + shield, y + shield * 0.25, x + halfW, y, 'F');
  doc.setFillColor(...BLUE_MID);
  doc.triangle(x, y + shield * 0.25, x + halfW, y + shield, x + halfW, y + shield * 0.25, 'F');
  doc.triangle(x + halfW, y + shield * 0.25, x + shield, y + shield * 0.25, x + halfW, y + shield, 'F');

  // "SF" text inside shield
  doc.setTextColor(...WHITE);
  doc.setFontSize(size * 0.38);
  doc.setFont('helvetica', 'bold');
  doc.text('SF', x + halfW, y + shield * 0.72, { align: 'center' });
}

/**
 * Generates a professional SafetyFirst PDF report.
 *
 * @param {Object} opts
 * @param {string}   opts.title          - Report title
 * @param {string}   opts.dateRange      - Date range string shown in header
 * @param {Object}   opts.stats          - { totalPeople, totalViolations, safetyScore, complianceScore }
 * @param {string[]} opts.columns        - Table column headers
 * @param {Array[]}  opts.rows           - 2D array of table row values
 * @param {string}   opts.filename       - Output filename (without .pdf)
 */
export function downloadPDF({ title, dateRange, stats, columns, rows, filename }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const generatedAt = new Date().toLocaleString();

  // ── HEADER BAND ──────────────────────────────────────────────
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, pageW, 38, 'F');

  // Logo
  drawLogo(doc, margin, 6, 24);

  // Brand name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SafetyFirst', margin + 28, 16);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BLUE_LIGHT);
  doc.text('Warehouse Safety Monitoring System', margin + 28, 21.5);

  // Report title (right-aligned)
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, pageW - margin, 15, { align: 'right' });

  // Date range (right-aligned under title)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLUE_LIGHT);
  doc.text(`Period: ${dateRange}`, pageW - margin, 21.5, { align: 'right' });

  // Thin accent line below header
  doc.setDrawColor(...BLUE_MID);
  doc.setLineWidth(0.8);
  doc.line(0, 38, pageW, 38);

  // ── SUMMARY STATS ────────────────────────────────────────────
  const statY = 48;
  const boxW = (pageW - margin * 2 - 9) / 4;
  const statItems = [
    { label: 'Total People',      value: stats.totalPeople },
    { label: 'Total Violations',  value: stats.totalViolations },
    { label: 'Safety Score',      value: `${Number(stats.safetyScore || 0).toFixed(1)}%` },
    { label: 'Compliance Score',  value: `${Number(stats.complianceScore || 0).toFixed(1)}%` },
  ];

  statItems.forEach((item, i) => {
    const bx = margin + i * (boxW + 3);

    // Card background
    doc.setFillColor(...BLUE_LIGHT);
    doc.roundedRect(bx, statY, boxW, 20, 2, 2, 'F');

    // Card left accent bar
    doc.setFillColor(...BLUE_DARK);
    doc.roundedRect(bx, statY, 2.5, 20, 1, 1, 'F');

    // Label
    doc.setTextColor(...GRAY_TEXT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(item.label, bx + 6, statY + 7);

    // Value
    doc.setTextColor(...DARK_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(item.value), bx + 6, statY + 16);
  });

  // ── DATA TABLE ───────────────────────────────────────────────
  autoTable(doc, {
    startY: statY + 28,
    head: [columns],
    body: rows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: BLUE_DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [240, 248, 251], // #F0F8FB
    },
    rowStyles: {
      textColor: DARK_TEXT,
    },
    didDrawPage: (data) => {
      const pNum = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();

      // Footer line
      doc.setDrawColor(...BLUE_LIGHT);
      doc.setLineWidth(0.5);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

      // Generated timestamp (left)
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(`Generated: ${generatedAt}`, margin, pageH - 7);

      // Page number (right)
      doc.text(`Page ${pNum} of ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' });

      // Brand watermark centre
      doc.setFont('helvetica', 'normal');
      doc.text('SafetyFirst — Confidential Report', pageW / 2, pageH - 7, { align: 'center' });
    },
  });

  doc.save(`${filename}.pdf`);
}
