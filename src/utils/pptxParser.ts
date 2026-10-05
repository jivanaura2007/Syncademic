import JSZip from 'jszip';

export interface SlideData {
  slideNumber: number;
  title: string;
  elements: Array<{
    type: 'title' | 'heading' | 'bullet' | 'paragraph' | 'table';
    text?: string;
    rows?: string[][];
  }>;
  rawText: string;
  notes?: string;
}

export interface PresentationData {
  fileName: string;
  totalSlides: number;
  slides: SlideData[];
}

/**
 * Extracts slides, titles, shapes, and bullet points from an uploaded .pptx file.
 */
export async function parsePptx(fileData: string | ArrayBuffer): Promise<PresentationData> {
  try {
    const zip = new JSZip();
    let zipContent: JSZip;

    if (typeof fileData === 'string') {
      if (fileData.startsWith('data:')) {
        const base64Data = fileData.split(',')[1];
        zipContent = await zip.loadAsync(base64Data, { base64: true });
      } else {
        zipContent = await zip.loadAsync(fileData);
      }
    } else {
      zipContent = await zip.loadAsync(fileData);
    }

    const slideFiles: { name: string; num: number }[] = [];
    zipContent.forEach((relativePath) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      if (match) {
        slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
      }
    });

    slideFiles.sort((a, b) => a.num - b.num);

    if (slideFiles.length === 0) {
      // Fallback if no ppt/slides structure found
      return {
        fileName: 'Presentation',
        totalSlides: 1,
        slides: [
          {
            slideNumber: 1,
            title: 'Academic Presentation',
            elements: [{ type: 'paragraph', text: 'Presentation loaded. Ready for viewing and study.' }],
            rawText: 'Presentation loaded.'
          }
        ]
      };
    }

    const slides: SlideData[] = [];

    for (const sFile of slideFiles) {
      const xmlStr = await zipContent.file(sFile.name)?.async('text');
      if (!xmlStr) continue;

      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, 'application/xml');

      let slideTitle = '';
      const elements: SlideData['elements'] = [];
      const textParts: string[] = [];

      // Extract all text paragraphs from <a:p> tags
      const paragraphs = doc.getElementsByTagName('a:p');
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const textNodes = p.getElementsByTagName('a:t');
        let fullParaText = '';
        for (let j = 0; j < textNodes.length; j++) {
          fullParaText += textNodes[j].textContent || '';
        }
        fullParaText = fullParaText.trim();
        if (!fullParaText) continue;

        textParts.push(fullParaText);

        if (!slideTitle) {
          slideTitle = fullParaText;
          elements.push({ type: 'title', text: fullParaText });
        } else if (fullParaText.length < 50 && !elements.some(e => e.type === 'heading')) {
          elements.push({ type: 'heading', text: fullParaText });
        } else {
          elements.push({ type: 'bullet', text: fullParaText });
        }
      }

      // Check for tables <a:tbl>
      const tables = doc.getElementsByTagName('a:tbl');
      for (let t = 0; t < tables.length; t++) {
        const tbl = tables[t];
        const rows = tbl.getElementsByTagName('a:tr');
        const tableData: string[][] = [];

        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].getElementsByTagName('a:tc');
          const rowData: string[] = [];
          for (let c = 0; c < cells.length; c++) {
            const cellTexts = cells[c].getElementsByTagName('a:t');
            let cellContent = '';
            for (let ct = 0; ct < cellTexts.length; ct++) {
              cellContent += (cellTexts[ct].textContent || '') + ' ';
            }
            rowData.push(cellContent.trim());
          }
          if (rowData.some(cell => cell.length > 0)) {
            tableData.push(rowData);
          }
        }

        if (tableData.length > 0) {
          elements.push({ type: 'table', rows: tableData });
        }
      }

      slides.push({
        slideNumber: sFile.num,
        title: slideTitle || `Slide ${sFile.num}`,
        elements: elements.length > 0 ? elements : [{ type: 'paragraph', text: textParts.join('\n') || 'Slide Content' }],
        rawText: textParts.join('\n')
      });
    }

    return {
      fileName: 'Presentation',
      totalSlides: slides.length,
      slides
    };
  } catch (err: any) {
    console.error('Error parsing PPTX document:', err);
    throw new Error('Unable to parse presentation file structure: ' + (err.message || 'Invalid format'));
  }
}
