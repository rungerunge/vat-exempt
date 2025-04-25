import axios from 'axios';

const VIES_API_URL = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';

export async function validateVAT(vatNumber) {
  try {
    // Extract country code and number
    const countryCode = vatNumber.substring(0, 2).toUpperCase();
    const number = vatNumber.substring(2);

    // Prepare SOAP request
    const soapRequest = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soap:Body>
          <tns1:checkVat>
            <tns1:countryCode>${countryCode}</tns1:countryCode>
            <tns1:vatNumber>${number}</tns1:vatNumber>
          </tns1:checkVat>
        </soap:Body>
      </soap:Envelope>
    `;

    // Make request to VIES API
    const response = await axios.post(VIES_API_URL, soapRequest, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': ''
      }
    });

    // Parse response
    const isValid = response.data.includes('<valid>true</valid>');
    
    // Cache the result (implement caching logic here)
    
    return {
      isValid,
      vatNumber,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('VAT validation error:', error);
    throw new Error('Failed to validate VAT number');
  }
} 