import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Upload, RotateCcw, Check } from 'lucide-react';

interface SignatureUploadProps {
  currentSignature?: string | null;
  userId: number;
}

export function SignatureUpload({ currentSignature, userId }: SignatureUploadProps) {
  const [signature, setSignature] = useState<string | null>(currentSignature || null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
        
        // If there's an existing signature, draw it
        if (signature && !signature.startsWith('data:image/png')) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = signature;
        }
      }
    }
  }, []);

  // Handle mouse/touch events for drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let clientX, clientY;
    
    if ('touches' in e) {
      // Touch event
      const rect = canvas.getBoundingClientRect();
      clientX = e.touches[0].clientX - rect.left;
      clientY = e.touches[0].clientY - rect.top;
    } else {
      // Mouse event
      clientX = e.nativeEvent.offsetX;
      clientY = e.nativeEvent.offsetY;
    }
    
    ctx.beginPath();
    ctx.moveTo(clientX, clientY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let clientX, clientY;
    
    if ('touches' in e) {
      // Touch event
      e.preventDefault(); // Prevent scrolling
      const rect = canvas.getBoundingClientRect();
      clientX = e.touches[0].clientX - rect.left;
      clientY = e.touches[0].clientY - rect.top;
    } else {
      // Mouse event
      clientX = e.nativeEvent.offsetX;
      clientY = e.nativeEvent.offsetY;
    }
    
    ctx.lineTo(clientX, clientY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.closePath();
    
    // Save the canvas content as an image
    const signatureImage = canvas.toDataURL('image/png');
    setSignature(signatureImage);
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  // File upload handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }
    
    if (file.size > 256 * 1024) {
      toast({
        title: 'File too large',
        description: 'Signature image must be less than 256KB',
        variant: 'destructive',
      });
      return;
    }
    
    setIsFileUploading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target || typeof event.target.result !== 'string') return;
      
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate dimensions to maintain aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > canvas.width) {
          const ratio = canvas.width / width;
          width = canvas.width;
          height = height * ratio;
        }
        
        if (height > canvas.height) {
          const ratio = canvas.height / height;
          height = canvas.height;
          width = width * ratio;
        }
        
        // Center the image
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        
        ctx.drawImage(img, x, y, width, height);
        
        // Save the canvas content as an image
        const signatureImage = canvas.toDataURL('image/png');
        setSignature(signatureImage);
        setIsFileUploading(false);
      };
      
      img.src = event.target.result;
    };
    
    reader.readAsDataURL(file);
  };

  // Upload signature to server
  const signatureMutation = useMutation({
    mutationFn: async (signatureData: { signatureImage: string }) => {
      const res = await apiRequest('PATCH', '/api/profile/signature', signatureData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({
        title: 'Signature updated',
        description: 'Your signature has been successfully saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update signature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSaveSignature = () => {
    if (!signature) {
      toast({
        title: 'No signature',
        description: 'Please draw or upload a signature first',
        variant: 'destructive',
      });
      return;
    }
    
    signatureMutation.mutate({ signatureImage: signature });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Signature Upload</CardTitle>
        <CardDescription>
          Draw your signature or upload an image. This will be used on certificates for events where you are a speaker.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md p-2 bg-gray-50 dark:bg-gray-900">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mb-4 touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCanvas}
              disabled={isFileUploading || signatureMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={triggerFileInput}
              disabled={isFileUploading || signatureMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>
        </div>
        
        {isFileUploading && <p className="text-sm mt-2 text-muted-foreground">Processing image...</p>}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={clearCanvas}
          disabled={signatureMutation.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        
        <Button 
          onClick={handleSaveSignature}
          disabled={!signature || signatureMutation.isPending}
        >
          {signatureMutation.isPending ? (
            <span className="flex items-center">
              <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </span>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Signature
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}