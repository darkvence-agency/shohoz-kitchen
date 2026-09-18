const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${tens[t]} ${ones[o]}` : tens[t];
};

const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (h) parts.push(`${ones[h]} Hundred`);
    if (rest) parts.push(twoDigits(rest));
    return parts.join(' ');
};

export const numberToWords = (num: number): string => {
    if (!num || num <= 0) return 'Zero Taka Only';
    num = Math.floor(num);

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundredRest = num;

    const parts: string[] = [];
    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
    if (hundredRest) parts.push(threeDigits(hundredRest));

    return `${parts.join(' ').trim()} Taka Only`;
};
