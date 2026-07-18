import { LOB_2025_DETAILS } from '../data/details/lob_2025_details';
import { ESC_2025_DETAILS } from '../data/details/esc_2025_details';
import { LEGACY_2020_DETAILS } from '../data/details/legacy_2020_details';

const ALL_DETAILS: Record<string, string> = {
    ...LOB_2025_DETAILS,
    ...ESC_2025_DETAILS,
    ...LEGACY_2020_DETAILS
};

export const getProgressionDetail = (code: string): string | null => {
    if (!code) return null;
    
    // Attempt to match full code
    if (ALL_DETAILS[code]) return ALL_DETAILS[code];
    
    // Attempt to match base code (if it has suffixes like -N1)
    const baseCode = code.split('-N')[0];
    if (ALL_DETAILS[baseCode]) return ALL_DETAILS[baseCode];

    return null;
};
