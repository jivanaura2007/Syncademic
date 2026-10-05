import * as XLSX from 'xlsx';

export function getNormalizedMimeType(file: File): string {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.csv')) return 'text/csv';
  if (lowerName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lowerName.endsWith('.xls')) return 'application/vnd.ms-excel';

  if (file.type) {
    const cleanType = file.type.toLowerCase().trim();
    if (cleanType === 'image/jpg' || cleanType === 'image/pjpeg') return 'image/jpeg';
    if (cleanType === 'image/x-png') return 'image/png';
    if (cleanType === 'application/x-pdf') return 'application/pdf';
    return cleanType;
  }

  return 'application/octet-stream';
}

// Client-side image optimization: resize large camera photos down to max 2048px to keep text crystal clear
export async function optimizeImageIfLarge(file: File): Promise<Blob | File> {
  if (!file.type.startsWith('image/') || file.size < 2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 2048;
      let { width, height } = img;

      if (width <= maxDim && height <= maxDim) {
        resolve(file);
        return;
      }

      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        mime,
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

// Convert file to sanitized pure Base64 (no data URI header, no whitespace)
export async function readFileAsCleanBase64(file: File): Promise<{ base64: string; mimeType: string; name: string; size: number }> {
  const mimeType = getNormalizedMimeType(file);
  const processedBlob = await optimizeImageIfLarge(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.replace(/^data:[^;]+;base64,/, '').replace(/[\s\r\n\t]+/g, '');
      resolve({
        base64,
        mimeType,
        name: file.name,
        size: processedBlob.size
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(processedBlob);
  });
}

// Parse Excel / CSV locally with XLSX
export async function parseExcelOrCsvLocally(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let fullText = '';
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
        });
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Convert any academic timetable time string (e.g. "8:10", "8:10am", "3:30", "3:30pm") into strict 24-hour "HH:MM"
export function normalizeTimeTo24Hour(raw: string, isEnd = false): string {
  if (!raw || typeof raw !== 'string') return isEnd ? '10:00' : '08:10';
  const clean = raw.trim().toLowerCase();

  const isPm = clean.includes('pm') || clean.includes('p.m.');
  const isAm = clean.includes('am') || clean.includes('a.m.');

  const match = clean.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!match) return isEnd ? '10:00' : '08:10';

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;

  if (isPm) {
    if (h < 12) h += 12;
  } else if (isAm) {
    if (h === 12) h = 0;
  } else {
    // In college/university timetables, afternoon classes 1:00 PM to 6:59 PM (hours 1 to 6) are PM
    // Hours 7 to 11 are AM (07:00 to 11:59). Hour 12 is 12:00 PM.
    if (h >= 1 && h <= 6) {
      h += 12;
    }
  }

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Robustly parse any day representation (e.g. 1, "1", "Monday", "tue", "Wed", "THU", "Friday", "M", "T") into DayOfWeek (1-7)
export function parseDayOfWeek(raw: any): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (typeof raw === 'number' && raw >= 1 && raw <= 7) return raw as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  const str = String(raw || '').toLowerCase().trim();

  if (str === '1' || str.includes('mon')) return 1;
  if (str === '2' || str.includes('tue')) return 2;
  if (str === '3' || str.includes('wed')) return 3;
  if (str === '4' || str.includes('thu')) return 4;
  if (str === '5' || str.includes('fri')) return 5;
  if (str === '6' || str.includes('sat')) return 6;
  if (str === '7' || str.includes('sun')) return 7;

  // Single letter day abbreviations
  if (str === 'm') return 1;
  if (str === 't') return 2;
  if (str === 'w') return 3;
  if (str === 'th' || str === 'r') return 4;
  if (str === 'f') return 5;
  if (str === 's') return 6;

  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 7) return num as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  return 1;
}
