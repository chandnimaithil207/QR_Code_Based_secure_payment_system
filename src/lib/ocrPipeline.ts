import { supabase } from './supabaseClient';

export interface OCRExtractResult {
  transactionId: string;
  amount: string;
}

export interface VerificationResult {
  transactionId: string;
  amount: string;
  date: string;
  customerName: string | null;
  verified: boolean;
  status: 'verified' | 'mismatch' | 'not_found';
}

export function preprocessImage(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 1000;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.filter = 'contrast(1.4) grayscale(100%)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  });
}

export async function runOCR(
  imageDataUrl: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  const Tesseract = await import('tesseract.js');

  onProgress?.('Loading OCR engine...');

  const processedImage = await preprocessImage(imageDataUrl);

  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m: { status: string; progress?: number }) => {
      if (m.status === 'recognizing text' && m.progress) {
        onProgress?.(`Analyzing: ${Math.round(m.progress * 100)}%`);
      } else if (m.status === 'loading language traineddata') {
        onProgress?.('Loading language model...');
      } else if (m.status === 'initializing tesseract') {
        onProgress?.('Initializing OCR...');
      }
    },
  });

  onProgress?.('Reading text from image...');

  const { data: { text } } = await worker.recognize(processedImage);
  await worker.terminate();

  return text;
}

export function extractTransactionDetails(text: string): OCRExtractResult {
  const txnPatterns = [
    /TXN[-\s]?\d{4,10}/i,
    /Transaction\s*(?:ID|No\.?|#)[:\s]*([A-Z0-9][\w-]{4,20})/i,
    /TXN([A-Z0-9-]{4,10})/i,
    /#[A-Z0-9]{5,10}/i,
    /ID[:\s]*([A-Z0-9-]{5,15})/i,
  ];

  let foundTxn = '';
  for (const pattern of txnPatterns) {
    const match = text.match(pattern);
    if (match) {
      foundTxn = match[0]
        .replace(/^(Transaction\s*(?:ID|No\.?|#)[:\s]*|ID[:\s]*)/i, '')
        .replace(/\s/g, '')
        .toUpperCase();
      break;
    }
  }

  const amountPatterns = [
    /₹\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /Amount[:\s]*₹?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /Total[:\s]*₹?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /Paid[:\s]*₹?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /(\d{1,3}(?:,\d{3})?\.\d{2})\s*(?:USD|INR)?/i,
  ];

  let foundAmount = '';
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      foundAmount = match[1].replace(/,/g, '');
      if (parseFloat(foundAmount) > 0) {
        break;
      }
      foundAmount = '';
    }
  }

  return {
    transactionId: foundTxn,
    amount: foundAmount ? `₹${foundAmount}` : '',
  };
}

export async function verifyAgainstDatabase(
  transactionId: string,
  submittedAmount: string
): Promise<VerificationResult> {
  const cleanAmount = submittedAmount.replace(/[₹$,\s]/g, '');
  const parsedAmount = parseFloat(cleanAmount);

  const { data: tx, error: lookupError } = await supabase
    .from('transactions')
    .select('transaction_id, amount, customer_name, status, created_at')
    .eq('transaction_id', transactionId.trim())
    .maybeSingle();

  if (lookupError) {
    throw new Error('Could not reach the verification service.');
  }

  if (!tx) {
    await supabase.from('screenshot_verifications').insert({
      transaction_id: transactionId.trim(),
      submitted_amount: submittedAmount.trim(),
      matched: false,
      customer_name: null,
    });

    return {
      transactionId: transactionId.trim(),
      amount: submittedAmount.trim(),
      date: new Date().toLocaleDateString('en-IN'),
      customerName: null,
      verified: false,
      status: 'not_found',
    };
  }

  const amountMatches = !isNaN(parsedAmount) && Math.abs(Number(tx.amount) - parsedAmount) < 0.01;
  const matched = amountMatches && tx.status === 'verified';

  await supabase.from('screenshot_verifications').insert({
    transaction_id: transactionId.trim(),
    submitted_amount: submittedAmount.trim(),
    matched,
    customer_name: tx.customer_name ?? null,
  });

  return {
    transactionId: tx.transaction_id,
    amount: Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    date: new Date(tx.created_at).toLocaleString('en-IN'),
    customerName: tx.customer_name,
    verified: matched,
    status: matched ? 'verified' : 'mismatch',
  };
}

export async function processImageForVerification(
  imageDataUrl: string,
  onProgress?: (msg: string) => void
): Promise<{ extracted: OCRExtractResult; verification: VerificationResult }> {
  onProgress?.('Preparing image...');

  const text = await runOCR(imageDataUrl, onProgress);
  console.log('OCR extracted text:', text);

  onProgress?.('Extracting transaction details...');

  const extracted = extractTransactionDetails(text);

  onProgress?.('');

  if (!extracted.transactionId || !extracted.amount) {
    return { extracted, verification: null as unknown as VerificationResult };
  }

  const verification = await verifyAgainstDatabase(extracted.transactionId, extracted.amount);
  return { extracted, verification };
}
