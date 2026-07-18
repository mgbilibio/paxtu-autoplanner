import dataJson from './especialidades_guia.json';

export interface RamoEspecialidade { id: number; nome: string; slug: string; }
export interface EspecialidadeGuia { id: number; ramoId: number; nome: string; slug: string; nivel1: number; nivel2: number; nivel3: number; totalItens: number; fonte: string; }
export interface RequisitoEspecialidade { especialidadeId: number; posicao: number; texto: string; opcional: number; }

export const RAMOS_ESPECIALIDADES = (dataJson as any).ramos as RamoEspecialidade[];
export const ESPECIALIDADES_GUIA = (dataJson as any).especialidades as EspecialidadeGuia[];
export const REQUISITOS_GUIA = (dataJson as any).requisitos as RequisitoEspecialidade[];
