import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js usando o CDN para evitar problemas de empacotamento local
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Gera uma miniatura (thumbnail) de baixa resolução a partir da primeira página de um PDF.
 * @param file O arquivo PDF original.
 * @param scale O fator de escala (0.2 a 0.5 recomendado para baixa resolução).
 * @param quality A qualidade do JPEG (0 a 1).
 * @returns Um Blob contendo a imagem JPEG da miniatura.
 */
export async function generatePDFThumbnail(file: File, scale: number = 0.3, quality: number = 0.6): Promise<Blob> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Pegar a primeira página
    const page = await pdf.getPage(1);
    
    // Definir o viewport com a escala desejada
    const viewport = page.getViewport({ scale });
    
    // Criar um canvas temporário para renderizar a página
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Não foi possível criar o contexto do canvas');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Renderizar a página no canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    
    // Converter o canvas para um Blob JPEG
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao converter canvas para blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  } catch (error) {
    console.error('Erro ao gerar miniatura do PDF:', error);
    throw error;
  }
}

/**
 * Decrypts a base64 XOR-scrambled PDF and renders the first page to a high-quality image blob.
 * This prevents the real PDF bytes from ever being accessible in the browser's Network tab.
 */
export async function generateDecryptedPDFImage(
  base64Data: string, 
  xorKey: string,
  watermarkText: string | null = null
): Promise<Blob> {
  try {
    // 1. Decode base64 to binary string
    const binaryString = atob(base64Data);
    
    // 2. Convert to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 3. XOR decrypt
    const keyBytes = new TextEncoder().encode(xorKey);
    const keyLen = keyBytes.length;
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = bytes[i] ^ keyBytes[i % keyLen];
    }
    
    // 4. Render with pdf.js
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    // Use scale=2.0 for higher quality (since it's a full document preview, not just a small thumbnail)
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Não foi possível criar o contexto do canvas');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;

    // 5. Add Security Layers
    if (watermarkText) {
      // 5a. Load logo for watermark
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      });

      context.save();
      
      // --- LAYER 1: Signature & Barcode Redaction (Destructive) ---
      // This is the most secure part: it physically removes the signatures from the preview
      const redactionHeight = canvas.height * 0.28; // Covers roughly the bottom 28%
      const redactionY = canvas.height - redactionHeight;
      
      // Draw a solid dark redaction box
      context.fillStyle = '#1e293b'; // Slate 800
      context.fillRect(0, redactionY, canvas.width, redactionHeight);
      
      // Add text over redaction
      context.fillStyle = '#ffffff';
      context.font = 'bold 30px sans-serif';
      context.textAlign = 'center';
      context.fillText(
        'SIGNATURES BLOCKED - PAY CONTROL FEE TO UNLOCK FULL DOCUMENT', 
        canvas.width / 2, 
        redactionY + (redactionHeight / 2) - 15
      );
      context.font = '20px sans-serif';
      context.fillText(
        'ASSINATURAS BLOQUEADAS - PAGUE A TAXA PARA LIBERAR O DOCUMENTO ORIGINAL', 
        canvas.width / 2, 
        redactionY + (redactionHeight / 2) + 25
      );

      // --- LAYER 2: Tiled Watermark (Visual Protection) ---
      const fontSize = 55;
      context.font = `bold ${fontSize}px sans-serif`;
      context.fillStyle = 'rgba(120, 120, 120, 0.35)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      // Rotate for the tiled pattern
      context.rotate(-Math.PI / 6);

      const stepX = 350;
      const stepY = 250;

      for (let x = -canvas.height; x < canvas.width * 1.5; x += stepX) {
        for (let y = -canvas.width; y < canvas.height * 1.5; y += stepY) {
          // Only draw watermark ABOVE the redaction area to keep it clean
          // (Actually, drawing everywhere is fine, but let's stick to the grid)
          
          if (logoImg.complete && logoImg.naturalWidth > 0) {
            const logoWidth = 100;
            const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
            context.globalAlpha = 0.25;
            context.drawImage(logoImg, x - 50, y - logoHeight - 15, logoWidth, logoHeight);
            context.globalAlpha = 1.0;
          }
          
          context.fillStyle = 'rgba(120, 120, 120, 0.35)';
          context.fillText(watermarkText, x, y);
        }
      }

      context.restore();
    }
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao converter canvas para blob'));
          }
        },
        'image/jpeg',
        0.85
      );
    });
  } catch (error) {
    console.error('Erro ao gerar imagem descodificada do PDF:', error);
    throw error;
  }
}
