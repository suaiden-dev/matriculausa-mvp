// Configuração do CKEditor 5 para o sistema de gerenciamento de termos

// Configuração personalizada do CKEditor para build decoupled-document
export const ckEditorConfig = {
  // Toolbar básica para evitar conflitos
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'underline',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'outdent',
    'indent',
    '|',
    'link',
    'blockQuote',
    'insertTable',
    '|',
    'undo',
    'redo'
  ],

  // Configuração de heading com opções específicas
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
      { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' }
    ]
  },

  // Configuração de idioma
  language: 'pt-br',

  // Configuração de placeholder
  placeholder: 'Digite o conteúdo do termo aqui...',

  // Configuração para preservar HTML
  allowedContent: true,

  // Configuração para preservar classes CSS e estilos
  extraAllowedContent: '*(*);*{*}'
};

// Estilos personalizados para o CKEditor
export const ckEditorStyles = `
  .ck-editor__editable {
    min-height: 400px;
    font-size: 14px;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .ck-editor__editable.ck-focused {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .ck-editor__editable h1,
  .ck-editor__editable h2,
  .ck-editor__editable h3,
  .ck-editor__editable h4,
  .ck-editor__editable h5,
  .ck-editor__editable h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    color: #1e293b;
  }

  .ck-editor__editable p {
    margin-bottom: 1em;
  }

  .ck-editor__editable ul,
  .ck-editor__editable ol {
    padding-left: 1.5em;
    margin-bottom: 1em;
  }

  .ck-editor__editable li {
    margin-bottom: 0.25em;
  }

  .ck-editor__editable blockquote {
    border-left: 4px solid #e2e8f0;
    padding-left: 1em;
    margin: 1.5em 0;
    font-style: italic;
    color: #64748b;
  }

  .ck-editor__editable code {
    background-color: #f1f5f9;
    padding: 0.125em 0.25em;
    border-radius: 0.25rem;
    font-size: 0.875em;
    color: #dc2626;
  }

  .ck-editor__editable pre {
    background-color: #1e293b;
    color: #e2e8f0;
    padding: 1em;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5em 0;
  }

  .ck-editor__editable a {
    color: #2563eb;
    text-decoration: underline;
  }

  .ck-editor__editable a:hover {
    color: #1d4ed8;
  }

  .ck-editor__editable table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }

  .ck-editor__editable table th,
  .ck-editor__editable table td {
    border: 1px solid #e2e8f0;
    padding: 0.5em;
    text-align: left;
  }

  .ck-editor__editable table th {
    background-color: #f8fafc;
    font-weight: 600;
  }

  .ck-editor__editable img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
  }

  .ck-editor__editable hr {
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 2em 0;
  }

  /* Container do editor decoupled */
  .ck-editor-container {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  /* Container da toolbar */
  .ck-toolbar-container {
    border-bottom: 1px solid #e2e8f0;
  }

  /* Estilos para a toolbar */
  .ck-toolbar {
    border: none;
    border-radius: 0;
    background-color: #f8fafc;
    padding: 8px;
  }

  .ck-editor__main > .ck-editor__editable {
    border: none;
    border-radius: 0;
  }

  /* Estilos para botões da toolbar */
  .ck-button {
    border-radius: 4px;
  }

  .ck-button:hover {
    background-color: #e2e8f0;
  }

  .ck-button.ck-on {
    background-color: #3b82f6;
    color: white;
  }

  /* Estilos para dropdowns */
  .ck-dropdown__panel {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
`;