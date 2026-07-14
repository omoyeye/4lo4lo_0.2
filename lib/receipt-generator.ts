
export interface ReceiptData {
  username: string;
  planName: string;
  price: number;
  engagementType: string;
  socialMediaUrl: string;
  date: string;
  receiptId: string;
}

export function generateReceipt(data: ReceiptData): string {
  const receiptContent = `
════════════════════════════════════════
           4LO4LO RECEIPT
════════════════════════════════════════

Website: www.4lo4lo.site
Email: info@4lo4lo.site

Receipt ID: ${data.receiptId}
Date: ${data.date}

────────────────────────────────────────
CUSTOMER INFORMATION
────────────────────────────────────────
Username: ${data.username}

────────────────────────────────────────
PROMOTION DETAILS
────────────────────────────────────────
Plan: ${data.planName}
Engagement Type: ${data.engagementType}
Social Media URL: ${data.socialMediaUrl}
Amount: $${data.price.toFixed(2)}

────────────────────────────────────────
PAYMENT INSTRUCTIONS
────────────────────────────────────────
Please complete your payment using the 
provided Stripe payment link.

After payment, please send us an email at
info@4lo4lo.site with a screenshot of this
receipt and your payment confirmation.

────────────────────────────────────────
Thank you for using 4LO4LO!
Visit us at www.4lo4lo.site
════════════════════════════════════════
  `;
  
  return receiptContent.trim();
}

export function downloadReceipt(receiptContent: string, filename: string): void {
  const blob = new Blob([receiptContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
