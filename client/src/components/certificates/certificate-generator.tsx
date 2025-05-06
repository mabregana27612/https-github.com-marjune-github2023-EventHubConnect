import { useRef } from 'react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/lib/utils';

interface CertificateGeneratorProps {
  eventTitle: string;
  eventDate: string;
  speakerName: string;
  attendeeName: string;
  certificateId: string;
  verificationUrl: string;
  onPdfGenerated: (pdfDataUrl: string) => void;
}

export function CertificateGenerator({
  eventTitle,
  eventDate,
  speakerName,
  attendeeName,
  certificateId,
  verificationUrl,
  onPdfGenerated,
}: CertificateGeneratorProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const generatePdf = async () => {
    if (!certificateRef.current) return;

    try {
      // Make sure the certificate template is visible during conversion
      const certificateTemplate = certificateRef.current;
      certificateTemplate.style.display = 'block';
      
      // Add a small delay to ensure DOM is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Convert the certificate template to an image with better options
      const imageData = await toPng(certificateTemplate, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        canvasWidth: 1684,
        canvasHeight: 1190
      });
      
      // Hide template again
      certificateTemplate.style.display = 'none';
      
      // Create a new PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add the image to the PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Get the PDF as a data URL
      const pdfDataUrl = pdf.output('datauristring');
      
      // Call the callback with the PDF data URL
      onPdfGenerated(pdfDataUrl);
    } catch (error) {
      console.error('Error generating PDF certificate:', error);
    }
  };

  // Format date to be more readable
  const formattedDate = formatDate(eventDate);

  return (
    <div>
      {/* Hidden certificate template that will be converted to PDF */}
      <div className="hidden">
        <div 
          ref={certificateRef}
          className="bg-white w-[842px] h-[595px] p-12 flex flex-col items-center text-center"
          style={{ 
            border: '15px solid #1E293B',
            boxShadow: '0 0 0 2px #fff, 0 0 0 15px #1E293B'
          }}
        >
          <div className="flex-1 flex flex-col items-center justify-between w-full">
            <div className="mt-4">
              <h1 className="text-4xl font-bold uppercase text-gray-900 mb-2">Certificate of Completion</h1>
              <p className="text-md text-gray-600">This certificate is proudly presented to</p>
              <h2 className="text-3xl font-bold text-primary-700 my-8 border-b-2 border-primary-500 pb-2">
                {attendeeName}
              </h2>
              <p className="text-lg text-gray-700 mb-1">
                For successfully attending the event
              </p>
              <h3 className="text-2xl font-semibold text-gray-800 max-w-xl mx-auto">
                {eventTitle}
              </h3>
              <p className="text-md text-gray-600 mt-4">
                Held on <span className="font-semibold">{formattedDate}</span>
              </p>
            </div>
            
            <div className="mt-12 w-full flex justify-between items-end">
              <div className="text-center">
                <div className="h-0.5 bg-gray-400 w-40 mb-2"></div>
                <p className="font-semibold">{speakerName}</p>
                <p className="text-sm text-gray-600">Speaker</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="mb-2">
                  <QRCodeSVG 
                    value={verificationUrl} 
                    size={80}
                    level="M"
                  />
                </div>
                <p className="text-xs text-gray-500">Certificate ID: {certificateId}</p>
                <p className="text-xs text-gray-500">Verify at {new URL(verificationUrl).hostname}</p>
              </div>
              
              <div className="text-center">
                <div className="h-0.5 bg-gray-400 w-40 mb-2"></div>
                <p className="font-semibold">Event Organizer</p>
                <p className="text-sm text-gray-600">EventPro</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Button to trigger PDF generation */}
      <button 
        onClick={generatePdf}
        className="hidden"
        id="generate-pdf-btn"
      >
        Generate PDF
      </button>
    </div>
  );
}