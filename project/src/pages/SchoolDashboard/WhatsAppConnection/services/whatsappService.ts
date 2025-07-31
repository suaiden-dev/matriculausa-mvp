import { QRCodePayload } from '../types';

export const generateQRCode = async (payload: QRCodePayload): Promise<string> => {
  const response = await fetch('https://nwh.suaiden.com/webhook/gerar_qr_code_whastapp_matriculausa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const responseText = await response.text();
  let qrCodeData = null;

  try {
    const parsedResponse = JSON.parse(responseText);
    qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
  } catch (jsonError) {
    if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
      qrCodeData = responseText;
    }
  }

  if (!qrCodeData || !/^[A-Za-z0-9+/=]+$/.test(qrCodeData) || qrCodeData.length <= 100) {
    throw new Error('QR Code not found or invalid in response');
  }

  return qrCodeData;
};

export const refreshQRCode = async (instanceName: string): Promise<string> => {
  const response = await fetch('https://nwh.suaiden.com/webhook/qrcode_atualizado', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ instance_name: instanceName }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }

  const responseText = await response.text();
  let qrCodeData = null;

  try {
    const parsedResponse = JSON.parse(responseText);
    qrCodeData = parsedResponse.qrCode || parsedResponse.base64 || parsedResponse.qr_code;
  } catch (jsonError) {
    if (responseText && /^[A-Za-z0-9+/=]+$/.test(responseText) && responseText.length > 100) {
      qrCodeData = responseText;
    }
  }

  if (!qrCodeData || !/^[A-Za-z0-9+/=]+$/.test(qrCodeData) || qrCodeData.length <= 100) {
    throw new Error('QR Code not found or invalid in refresh response');
  }

  return qrCodeData;
};