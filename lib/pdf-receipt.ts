import jsPDF from 'jspdf';

export interface PurchaseDetails {
  clientName: string;
  clientEmail: string;
  membershipDate: string;
  planName: string;
  baseEngagementCount: number;
  customEngagementCount: number;
  basePrice: number;
  totalPrice: number;
  socialMediaUrl: string;
  engagementType: string;
  additionalDetails?: string;
  receiptId: string;
  purchaseDate: string;
}

export function generatePDFReceipt(details: PurchaseDetails): jsPDF {
  const doc = new jsPDF();
  
  // Set up colors and fonts
  const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const mutedColor: [number, number, number] = [107, 114, 128]; // Gray-500
  
  let yPosition = 20;
  
  // Header - Company Logo/Name
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('4LO4LO', 105, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(...mutedColor);
  doc.text('Social Media Growth Platform', 105, yPosition, { align: 'center' });
  
  // Receipt Title
  yPosition += 15;
  doc.setFontSize(18);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE RECEIPT', 105, yPosition, { align: 'center' });
  
  // Receipt ID and Date
  yPosition += 10;
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text(`Receipt #${details.receiptId}`, 105, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(`Date: ${details.purchaseDate}`, 105, yPosition, { align: 'center' });
  
  // Divider Line
  yPosition += 10;
  doc.setDrawColor(...mutedColor);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, 190, yPosition);
  
  // Client Information Section
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT INFORMATION', 20, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${details.clientName}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Email: ${details.clientEmail}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Member Since: ${details.membershipDate}`, 20, yPosition);
  
  // Purchase Details Section
  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE DETAILS', 20, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Plan: ${details.planName}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Base Package: ${details.baseEngagementCount.toLocaleString()} engagements @ $${details.basePrice.toFixed(2)}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Requested: ${details.customEngagementCount.toLocaleString()} engagements`, 20, yPosition);
  yPosition += 6;
  doc.text(`Engagement Type: ${details.engagementType}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Social Media URL: ${details.socialMediaUrl}`, 20, yPosition);
  
  if (details.additionalDetails) {
    yPosition += 6;
    const splitDetails = doc.splitTextToSize(`Notes: ${details.additionalDetails}`, 170);
    doc.text(splitDetails, 20, yPosition);
    yPosition += splitDetails.length * 5;
  }
  
  // Price Calculation
  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PRICING BREAKDOWN', 20, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  
  const pricePerUnit = details.basePrice / details.baseEngagementCount;
  const multiplier = details.customEngagementCount / details.baseEngagementCount;
  
  doc.text(`Price per 1,000 engagements: $${(pricePerUnit * 1000).toFixed(2)}`, 20, yPosition);
  yPosition += 6;
  doc.text(`Multiplier: ${multiplier.toFixed(2)}x`, 20, yPosition);
  yPosition += 6;
  doc.text(`Calculation: $${details.basePrice.toFixed(2)} × ${multiplier.toFixed(2)} = $${details.totalPrice.toFixed(2)}`, 20, yPosition);
  
  // Total Amount Box
  yPosition += 15;
  doc.setFillColor(240, 240, 245);
  doc.rect(20, yPosition - 5, 170, 15, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT:', 25, yPosition + 4);
  doc.text(`$${details.totalPrice.toFixed(2)}`, 185, yPosition + 4, { align: 'right' });
  
  // Footer
  yPosition += 25;
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing 4LO4LO!', 105, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('For support, contact us at support@4lo4lo.site', 105, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('This is an automated receipt. Please keep it for your records.', 105, yPosition, { align: 'center' });
  
  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
