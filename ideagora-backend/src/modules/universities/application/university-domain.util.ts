import { BadRequestException } from '@nestjs/common';
import type { UniversityDraft } from '../domain/university-repository.js';

const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i;

export function normalizeUniversityDraft(
  input: UniversityDraft,
): UniversityDraft {
  const domains = input.domains.map((entry) => ({
    ...entry,
    domain: normalizeDomain(entry.domain),
  }));
  const uniqueDomains = new Set(domains.map(({ domain }) => domain));
  if (uniqueDomains.size !== domains.length) {
    throw new BadRequestException('Los dominios no pueden repetirse.');
  }
  if (!domains.some(({ campusIndex }) => campusIndex === undefined)) {
    throw new BadRequestException(
      'Agrega al menos un dominio institucional general.',
    );
  }

  for (const { campusIndex } of domains) {
    if (
      campusIndex !== undefined &&
      (!Number.isInteger(campusIndex) ||
        campusIndex < 0 ||
        campusIndex >= input.campuses.length)
    ) {
      throw new BadRequestException(
        'Un dominio hace referencia a una sede que no existe.',
      );
    }
  }

  const campusNames = input.campuses.map(({ name }) => name.trim().toLowerCase());
  if (new Set(campusNames).size !== campusNames.length) {
    throw new BadRequestException('Los nombres de sede no pueden repetirse.');
  }
  const campusIds = input.campuses
    .map(({ id }) => id)
    .filter((id): id is string => Boolean(id));
  if (new Set(campusIds).size !== campusIds.length) {
    throw new BadRequestException('Una sede no puede repetirse en el formulario.');
  }

  return {
    ...input,
    accreditationCode: input.accreditationCode.trim(),
    name: input.name.trim(),
    acronym: input.acronym?.trim() || null,
    province: input.province.trim(),
    city: input.city.trim(),
    website: input.website?.trim() || null,
    campuses: input.campuses.map((campus) => ({
      ...campus,
      name: campus.name.trim(),
      legalName: campus.legalName?.trim() || null,
      province: campus.province.trim(),
      city: campus.city.trim(),
      reference: campus.reference?.trim() || null,
    })),
    domains,
  };
}

export function normalizeDomain(domain: string): string {
  const normalized = domain.trim().toLowerCase().replace(/^@/, '');
  if (!DOMAIN_PATTERN.test(normalized)) {
    throw new BadRequestException(`El dominio "${domain}" no es válido.`);
  }
  return normalized;
}
