import React from 'react';

interface DocumentRendererProps {
  htmlContent?: string | null;
  className?: string;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  htmlContent,
  className,
}) => {
  const safeHtml =
    htmlContent && htmlContent.trim().length > 0
      ? htmlContent
      : `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Documento não disponível</h2>
          <p>O conteúdo do documento ainda não foi gerado.</p>
        </div>
      `;

  return (
    <div
      className={`w-full bg-white rounded-lg shadow-sm overflow-hidden ${className}`}
      style={{ minHeight: '600px' }}
    >
      <iframe
        srcDoc={safeHtml}
        className="w-full h-full border-none"
        title="Documento Jurídico"
        sandbox="allow-scripts"
      />
    </div>
  );
}; 
