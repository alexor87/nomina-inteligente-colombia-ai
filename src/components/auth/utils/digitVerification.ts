
export const calculateVerificationDigit = (nit: string): string => {
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  
  // Remove any non-digit characters
  const cleanNit = nit.replace(/\D/g, '');
  
  if (!cleanNit || cleanNit.length === 0) return '';
  
  let sum = 0;
  const nitArray = cleanNit.split('').reverse();
  
  for (let i = 0; i < nitArray.length && i < weights.length; i++) {
    sum += parseInt(nitArray[i]) * weights[i];
  }
  
  const remainder = sum % 11;
  
  if (remainder < 2) {
    return remainder.toString();
  } else {
    return (11 - remainder).toString();
  }
};
