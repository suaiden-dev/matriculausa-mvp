import jsPDF from 'jspdf';

export interface StudentTermAcceptanceData {
  student_name: string;
  student_email: string;
  term_title: string;
  accepted_at: string;
  ip_address: string;
  user_agent: string;
  country?: string;
  affiliate_code?: string;
  term_content?: string;
}

export const generateTermAcceptancePDF = (data: StudentTermAcceptanceData): void => {
  try {
    // Criar novo documento PDF
    const pdf = new jsPDF();
    
    // Configurações de estilo
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = margin;

    // Função para adicionar texto com quebra de linha automática
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12): number => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      for (let i = 0; i < lines.length; i++) {
        if (y > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(lines[i], x, y);
        y += fontSize * 0.6; // Espaçamento entre linhas
      }
      
      return y;
    };

    // Função para adicionar linha separadora
    const addSeparator = (y: number): number => {
      if (y > pdf.internal.pageSize.getHeight() - margin - 10) {
        pdf.addPage();
        y = margin;
      }
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      return y + 8;
    };

    // Cabeçalho do documento
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERM ACCEPTANCE DOCUMENT', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('MatriculaUSA - Academic Management System', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    currentY = addSeparator(currentY);

    // STUDENT INFORMATION - PRIMEIRA SEÇÃO (como solicitado)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STUDENT INFORMATION', margin, currentY);
    currentY += 12;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    // Nome
    pdf.setFont('helvetica', 'bold');
    pdf.text('Name:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.student_name, margin + 30, currentY);
    currentY += 8;

    // Email
    pdf.setFont('helvetica', 'bold');
    pdf.text('Email:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.student_email, margin + 30, currentY);
    currentY += 8;

    // País (se disponível)
    if (data.country && data.country !== 'N/A') {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Country:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(data.country, margin + 40, currentY);
      currentY += 8;
    }

    currentY += 5;
    currentY = addSeparator(currentY);

    // TERM CONTENT - SEGUNDA SEÇÃO
    if (data.term_content && currentY < pdf.internal.pageSize.getHeight() - 100) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM CONTENT', margin, currentY);
      currentY += 15;

      // Parse and format the term content with proper styling (igual ao MyStudents.tsx)
      const formatTermContent = (content: string): number => {
        // First, extract content from HTML tags and identify structure
        const parseHtmlContent = (html: string) => {
          const elements: Array<{text: string, type: 'h1' | 'h2' | 'h3' | 'p' | 'strong'}> = [];
          
          // Replace HTML entities first
          let processedHtml = html
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          // Remove HTML tags completely and work with plain text
          const cleanText = processedHtml.replace(/<[^>]*>/g, '').trim();
          
          // Split into paragraphs by double line breaks, then by single line breaks
          const paragraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
          
          paragraphs.forEach((paragraph, paragraphIndex) => {
            const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            lines.forEach((line, lineIndex) => {
              let type: 'h1' | 'h2' | 'h3' | 'p' | 'strong' = 'p';
              
              // Main titles (first line of document or standalone short lines that look like titles)
              if ((paragraphIndex === 0 && lineIndex === 0) || 
                  (lines.length === 1 && line.length < 60 && line.match(/^[A-Z]/) && !line.match(/^\d+\./))) {
                type = 'h1';
              }
              // Section headers (numbered like "1. Purpose")
              else if (line.match(/^\d+\.\s+[A-Za-z]/)) {
                type = 'h2';
              }
              // Subsection headers (lines ending with colon or all caps short lines)
              else if (line.endsWith(':') || (line.match(/^[A-Z\s&/()]{3,}$/) && line.length < 80)) {
                type = 'h3';
              }
              // Everything else is paragraph content
              else {
                type = 'p';
              }
              
              elements.push({ text: line, type });
            });
            
            // Add spacing between paragraphs
            if (paragraphIndex < paragraphs.length - 1) {
              elements.push({ text: '', type: 'p' });
            }
          });

          return elements;
        };

        const elements = parseHtmlContent(content);
        
        elements.forEach((element) => {
          // Skip empty elements but add small spacing
          if (element.text === '') {
            currentY += 3;
            return;
          }
          
          // Check if we need a new page
          if (currentY > pdf.internal.pageSize.getHeight() - 40) {
            pdf.addPage();
            currentY = margin;
          }
          
          switch (element.type) {
            case 'h1':
              currentY += 5;
              pdf.setFontSize(13);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 13);
              currentY += 8;
              break;
              
            case 'h2':
              currentY += 6;
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 11);
              currentY += 5;
              break;
              
            case 'h3':
            case 'strong':
              currentY += 3;
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 10);
              currentY += 4;
              break;
              
            case 'p':
            default:
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'normal');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 9);
              currentY += 4;
              break;
          }
        });
        
        return currentY + 5;
      };

      try {
        currentY = formatTermContent(data.term_content);
        currentY += 15; // Espaço extra após o conteúdo
      } catch (error) {
        console.error('Error formatting term content:', error);
        // Fallback to simple text if formatting fails
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        let plainTextContent = data.term_content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        const maxTermContentLength = 3000;
        const termContent = plainTextContent.length > maxTermContentLength 
          ? plainTextContent.substring(0, maxTermContentLength) + '...'
          : plainTextContent;
        
        currentY = addWrappedText(termContent, margin, currentY, pageWidth - margin - 20, 10);
        currentY += 15;
      }

      currentY = addSeparator(currentY);
    }

    // TERM ACCEPTANCE DETAILS - ÚLTIMA SEÇÃO (como solicitado)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERM ACCEPTANCE DETAILS', margin, currentY);
    currentY += 12;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    // Termo aceito
    pdf.setFont('helvetica', 'bold');
    pdf.text('Accepted Term:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(data.term_title, margin + 70, currentY, pageWidth - margin - 90, 11);
    currentY += 3;

    // Data e hora da aceitação (formato americano)
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date/Time:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    const formattedDate = new Date(data.accepted_at).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    pdf.text(formattedDate, margin + 55, currentY);
    currentY += 8;

    // Endereço IP
    pdf.setFont('helvetica', 'bold');
    pdf.text('IP Address:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.ip_address || 'Not available', margin + 55, currentY);
    currentY += 8;

    // User Agent (navegador/dispositivo)
    pdf.setFont('helvetica', 'bold');
    pdf.text('Browser/Device:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(data.user_agent || 'Not available', margin, currentY + 8, pageWidth - margin - 20, 9);
    currentY += 5;

    currentY = addSeparator(currentY);


    // Rodapé com informações legais
    const footerY = pdf.internal.pageSize.getHeight() - 30;
    currentY = addSeparator(currentY + 10);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const legalText = `This document was automatically generated by MatriculaUSA system on ${new Date().toLocaleString('en-US')}. ` +
      'It serves as proof of term acceptance by the student mentioned above. ' +
      'This document has legal validity and can be used as evidence of user agreement with the presented terms.';
    
    addWrappedText(legalText, margin, footerY, pageWidth - margin - 20, 8);

    // Gerar nome do arquivo
    const fileName = `term_acceptance_${data.student_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Fazer download do PDF
    pdf.save(fileName);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Erro ao gerar documento PDF. Tente novamente.');
  }
};

/**
 * Gera PDF de aceitação de termos e retorna como Blob para envio em notificações
 */
export const generateTermAcceptancePDFBlob = (data: StudentTermAcceptanceData): Blob => {
  try {
    // Criar novo documento PDF
    const pdf = new jsPDF();
    
    // Configurações de estilo
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = margin;

    // Função para adicionar texto com quebra de linha automática
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12): number => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      for (let i = 0; i < lines.length; i++) {
        if (y > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(lines[i], x, y);
        y += fontSize * 0.6; // Espaçamento entre linhas
      }
      
      return y;
    };

    // Função para adicionar linha separadora
    const addSeparator = (y: number): number => {
      if (y > pdf.internal.pageSize.getHeight() - margin - 10) {
        pdf.addPage();
        y = margin;
      }
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      return y + 8;
    };

    // Cabeçalho do documento
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERM ACCEPTANCE DOCUMENT', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('MatriculaUSA - Academic Management System', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;

    currentY = addSeparator(currentY);

    // STUDENT INFORMATION - PRIMEIRA SEÇÃO (como solicitado)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STUDENT INFORMATION', margin, currentY);
    currentY += 12;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    // Nome
    pdf.setFont('helvetica', 'bold');
    pdf.text('Name:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(data.student_name, margin + 25, currentY, pageWidth - margin - 25, 11);
    currentY += 8;

    // Email
    pdf.setFont('helvetica', 'bold');
    pdf.text('Email:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(data.student_email, margin + 25, currentY, pageWidth - margin - 25, 11);
    currentY += 8;

    // País (se disponível)
    if (data.country) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Country:', margin, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY = addWrappedText(data.country, margin + 25, currentY, pageWidth - margin - 25, 11);
      currentY += 8;
    }

    currentY = addSeparator(currentY);

    // TERM CONTENT - SEGUNDA SEÇÃO
    if (data.term_content) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERM CONTENT', margin, currentY);
      currentY += 15;

      // Função para formatar conteúdo HTML do termo (igual ao MyStudents.tsx)
      const formatTermContent = (content: string): number => {
        // First, extract content from HTML tags and identify structure
        const parseHtmlContent = (html: string) => {
          const elements: Array<{text: string, type: 'h1' | 'h2' | 'h3' | 'p' | 'strong'}> = [];
          
          // Replace HTML entities first
          let processedHtml = html
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          // Remove HTML tags completely and work with plain text
          const cleanText = processedHtml.replace(/<[^>]*>/g, '').trim();
          
          // Split into paragraphs by double line breaks, then by single line breaks
          const paragraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
          
          paragraphs.forEach((paragraph, paragraphIndex) => {
            const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            lines.forEach((line, lineIndex) => {
              let type: 'h1' | 'h2' | 'h3' | 'p' | 'strong' = 'p';
              
              // Main titles (first line of document or standalone short lines that look like titles)
              if ((paragraphIndex === 0 && lineIndex === 0) || 
                  (lines.length === 1 && line.length < 60 && line.match(/^[A-Z]/) && !line.match(/^\d+\./))) {
                type = 'h1';
              }
              // Section headers (numbered like "1. Purpose")
              else if (line.match(/^\d+\.\s+[A-Za-z]/)) {
                type = 'h2';
              }
              // Subsection headers (lines ending with colon or all caps short lines)
              else if (line.endsWith(':') || (line.match(/^[A-Z\s&/()]{3,}$/) && line.length < 80)) {
                type = 'h3';
              }
              // Everything else is paragraph content
              else {
                type = 'p';
              }
              
              elements.push({ text: line, type });
            });
            
            // Add spacing between paragraphs
            if (paragraphIndex < paragraphs.length - 1) {
              elements.push({ text: '', type: 'p' });
            }
          });

          return elements;
        };

        const elements = parseHtmlContent(content);
        
        elements.forEach((element) => {
          // Skip empty elements but add small spacing
          if (element.text === '') {
            currentY += 3;
            return;
          }
          
          // Check if we need a new page
          if (currentY > pdf.internal.pageSize.getHeight() - 40) {
            pdf.addPage();
            currentY = margin;
          }
          
          switch (element.type) {
            case 'h1':
              currentY += 5;
              pdf.setFontSize(13);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 13);
              currentY += 8;
              break;
              
            case 'h2':
              currentY += 6;
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 11);
              currentY += 5;
              break;
              
            case 'h3':
            case 'strong':
              currentY += 3;
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'bold');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 10);
              currentY += 4;
              break;
              
            case 'p':
            default:
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'normal');
              currentY = addWrappedText(element.text, margin, currentY, pageWidth - margin - 20, 9);
              currentY += 4;
              break;
          }
        });
        
        return currentY + 5;
      };

      try {
        currentY = formatTermContent(data.term_content);
        currentY += 15; // Espaço extra após o conteúdo
      } catch (error) {
        console.error('Error formatting term content:', error);
        // Fallback to simple text if formatting fails
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        let plainTextContent = data.term_content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        const maxTermContentLength = 3000;
        const termContent = plainTextContent.length > maxTermContentLength 
          ? plainTextContent.substring(0, maxTermContentLength) + '...'
          : plainTextContent;
        
        currentY = addWrappedText(termContent, margin, currentY, pageWidth - margin - 20, 10);
        currentY += 15;
      }

      currentY = addSeparator(currentY);
    }

    // TERM ACCEPTANCE DETAILS - ÚLTIMA SEÇÃO (como solicitado)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERM ACCEPTANCE DETAILS', margin, currentY);
    currentY += 12;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    // Título do termo
    pdf.setFont('helvetica', 'bold');
    pdf.text('Term Title:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(data.term_title, margin + 25, currentY, pageWidth - margin - 25, 11);
    currentY += 8;

    // Data de aceitação (formato americano)
    pdf.setFont('helvetica', 'bold');
    pdf.text('Accepted At:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    const formattedDate = new Date(data.accepted_at).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    currentY = addWrappedText(formattedDate, margin + 25, currentY, pageWidth - margin - 25, 11);
    currentY += 8;

    // Endereço IP
    pdf.setFont('helvetica', 'bold');
    pdf.text('IP Address:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(data.ip_address, margin + 25, currentY, pageWidth - margin - 25, 11);
    currentY += 8;

    // User Agent
    pdf.setFont('helvetica', 'bold');
    pdf.text('User Agent:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY = addWrappedText(data.user_agent, margin + 25, currentY, pageWidth - margin - 25, 11);
    currentY += 12;

    // Rodapé com informações legais
    const footerY = pdf.internal.pageSize.getHeight() - 30;
    currentY = addSeparator(currentY + 10);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const legalText = `This document was automatically generated by MatriculaUSA system on ${new Date().toLocaleString('en-US')}. ` +
      'It serves as proof of term acceptance by the student mentioned above. ' +
      'This document has legal validity and can be used as evidence of user agreement with the presented terms.';
    
    addWrappedText(legalText, margin, footerY, pageWidth - margin - 20, 8);

    // Retornar PDF como Blob
    return pdf.output('blob');

  } catch (error) {
    console.error('Erro ao gerar PDF blob:', error);
    throw error;
  }
};