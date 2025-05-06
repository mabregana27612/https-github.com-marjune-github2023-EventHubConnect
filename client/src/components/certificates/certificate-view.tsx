import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import { CertificateGenerator } from './certificate-generator';
import { formatDate } from '@/lib/utils';

interface CertificateViewProps {
  certificate: {
    id: number;
    eventId: number;
    eventTitle: string;
    userId: number;
    userName: string;
    eventDate: string;
    issuedAt: string;
    certificateUrl: string;
    speakerSignature?: string;
  };
  speakerName?: string;
}

export function CertificateView({ certificate, speakerName = 'Event Speaker' }: CertificateViewProps) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const verificationUrl = `${window.location.origin}/certificates/verify/${certificate.id}`;

  // Generate PDF from template
  const handlePdfGenerated = (pdfDataUrl: string) => {
    setPdfUrl(pdfDataUrl);
    setLoading(false);
    
    // Store the PDF data in a variable instead of session storage
    // Session storage has size limitations and PDF data is too large
    try {
      // Only store a reference to the PDF instead of the full data
      sessionStorage.setItem(`certificate-${certificate.id}-available`, 'true');
    } catch (error) {
      console.error('Error setting certificate availability flag:', error);
    }
  };

  // Direct download function that doesn't rely on iframe
  const handleDirectDownload = () => {
    if (!pdfUrl) {
      setError('No PDF available. Please regenerate the certificate.');
      return;
    }
    
    try {
      // For browsers that don't handle data URLs well for download, fetch the PDF data
      // Create a separate fetch request for the PDF data
      fetch('/api/certificates/download/' + certificate.id, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then(blob => {
        // Create a blob URL
        const url = URL.createObjectURL(blob);
        
        // Create a temporary anchor element
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificate_${certificate.eventTitle}_${certificate.userName}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      })
      .catch(error => {
        console.error('Download error:', error);
        setError('Failed to download certificate. Please try again.');
      });
    } catch (error) {
      console.error('Error during direct download:', error);
      setError('Download failed. Please try again.');
    }
  };

  // Trigger PDF generation
  const generatePdf = () => {
    setLoading(true);
    setError(null);
    
    // Always regenerate the PDF - don't try to retrieve from session storage
    // PDFs are too large to reliably store in session storage
    setTimeout(() => {
      const generateButton = document.getElementById('generate-pdf-btn');
      if (generateButton) {
        generateButton.click();
      } else {
        setLoading(false);
        setError('Could not generate certificate. Please try again.');
      }
    }, 500);
  };

  // Format dates
  const formattedEventDate = formatDate(certificate.eventDate);
  const formattedIssuedDate = formatDate(certificate.issuedAt);

  // Generate PDF on component mount
  useEffect(() => {
    generatePdf();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Certificate for {certificate.eventTitle}</CardTitle>
        <CardDescription>
          Issued on {formattedIssuedDate} for event on {formattedEventDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 bg-red-50 rounded-md">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              onClick={generatePdf} 
              className="mt-4"
              disabled={loading}
            >
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-md">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-2" />
            <p className="text-gray-500">Generating your certificate...</p>
          </div>
        ) : pdfUrl ? (
          <div className="border rounded-md overflow-hidden">
            <iframe 
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-[500px]"
              title={`Certificate for ${certificate.eventTitle}`}
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-md">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-gray-700">Certificate preview is not available</p>
          </div>
        )}
        
        {/* Hidden certificate generator used to create PDF */}
        <CertificateGenerator
          eventTitle={certificate.eventTitle}
          eventDate={certificate.eventDate}
          speakerName={speakerName}
          speakerSignature={certificate.speakerSignature}
          attendeeName={certificate.userName}
          certificateId={certificate.id.toString()}
          verificationUrl={verificationUrl}
          onPdfGenerated={handlePdfGenerated}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={generatePdf}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        
        {pdfUrl && (
          <Button
            id={`certificate-download-${certificate.id}`}
            onClick={handleDirectDownload}
            className="inline-flex h-10 items-center justify-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}