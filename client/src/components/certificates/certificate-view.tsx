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
  };

  // Trigger PDF generation
  const generatePdf = () => {
    setLoading(true);
    setError(null);
    
    // Find and click the hidden button in the CertificateGenerator component
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
          <a 
            href={pdfUrl} 
            download={`Certificate_${certificate.eventTitle}_${certificate.userName}.pdf`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        )}
      </CardFooter>
    </Card>
  );
}