import { CatalogCategory, ScoutBranch, TroopRole } from '../../types';
import { getProgressao2025Catalog } from '../generated/progressao_2025_catalog';
import { getUpdatedSpecialtyCatalog } from '../updatedSpecialtyCatalog';

// New Unified Data (POR 2025+) — Lobinho/Escoteiro vêm do adapter (progressao_2025.sqlite).
// Os JSONs antigos só são usados para Sênior/Pioneiro (ainda sem dataset 2025+ pronto).
import seniorData from './branch_senior.json';
import pioneiroData from './branch_pioneiro.json';
// Fallbacks do JSON antigo (mantidos apenas para sair do erro de build se algo cair):
import lobinhoData from './branch_lobinho.json';
import escoteiroData from './branch_escoteiro.json';

// Legacy Data (2020)
import lobinhoLegacy from './lobinho_2020.json';
import escoteiroLegacy from './escoteiro_2020.json';
// Senior/Pioneiro Legacy not available separately, using unified fallback if needed or empty

import adultos from './adultos.json';

// Specialties & Modalities
import specsServicos from './specs_servicos.json';
import specsCiencia from './specs_ciencia.json';
import specsCultura from './specs_cultura.json';
import specsDesportos from './specs_desportos.json';
import specsHabilidades from './specs_habilidades.json';
import globalSpecialties from './specialties.json';
import modalidades from './modalidades.json';

// O POR 2025+ usa progressao_2025.sqlite para blocos de Lobinho/Escoteiro
// e a base pública UEB 2026 para especialidades ESP-UEB26-*.
// A base ESP-GUIA-* de 2024-1 permanece no repositório para transição,
// histórico e compatibilidade de fichas antigas.
export const getUnifiedCatalog = (branch: ScoutBranch, system: string, role?: TroopRole): CatalogCategory[] => {
    if (role && role !== TroopRole.JUVENIL) return adultos as CatalogCategory[];

    let baseCatalog: any[] = [];

    // Logic for System Selection
    if (system === 'LEGACY_2020') {
        // Legacy Loading
        if (branch === ScoutBranch.LOBINHO) baseCatalog = lobinhoLegacy;
        else if (branch === ScoutBranch.ESCOTEIRO) baseCatalog = escoteiroLegacy;
        else if (branch === ScoutBranch.SENIOR) baseCatalog = seniorData; // Fallback to unified
        else if (branch === ScoutBranch.PIONEIRO) baseCatalog = pioneiroData; // Fallback to unified
    } else {
        // Default / POR 2025+ — Lobinho/Escoteiro saem do adapter sobre progressao_2025.sqlite.
        if (branch === ScoutBranch.LOBINHO) {
            const fromAdapter = getProgressao2025Catalog(branch);
            if (fromAdapter.length === 0) console.error(`[${new Date().toISOString()}] getUnifiedCatalog: adapter POR_2025 vazio para Lobinho; usando fallback JSON legado.`);
            baseCatalog = fromAdapter.length > 0 ? fromAdapter : lobinhoData;
        } else if (branch === ScoutBranch.ESCOTEIRO) {
            const fromAdapter = getProgressao2025Catalog(branch);
            if (fromAdapter.length === 0) console.error(`[${new Date().toISOString()}] getUnifiedCatalog: adapter POR_2025 vazio para Escoteiro; usando fallback JSON legado.`);
            baseCatalog = fromAdapter.length > 0 ? fromAdapter : escoteiroData;
        } else if (branch === ScoutBranch.SENIOR) baseCatalog = seniorData;
        else if (branch === ScoutBranch.PIONEIRO) baseCatalog = pioneiroData;
    }

    // Modalities
    const modalidadeData = [
        ...modalidades.mar.map(c => ({ ...c, name: `⚓ ${c.name}` })),
        ...modalidades.ar.map(c => ({ ...c, name: `✈️ ${c.name}` }))
    ];

    const legacySpecialties = [
        { name: "Espec. Serviços", items: specsServicos },
        { name: "Espec. Ciência e Tecnologia", items: specsCiencia },
        { name: "Espec. Cultura", items: specsCultura },
        { name: "Espec. Desportos", items: specsDesportos },
        { name: "Espec. Habilidades", items: specsHabilidades },
        { name: "Insígnias Especiais", items: (globalSpecialties as any).insignias_especiais || [] },
        { name: "Cordões e Distintivos", items: (globalSpecialties as any).cordoes || [] }
    ];

    const allSpecialties = system === 'POR_2025'
        ? getUpdatedSpecialtyCatalog(branch)
        : legacySpecialties;

    return [...baseCatalog, ...modalidadeData, ...allSpecialties] as CatalogCategory[];
};
