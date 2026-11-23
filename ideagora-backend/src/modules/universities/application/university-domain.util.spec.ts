import { BadRequestException } from '@nestjs/common';
import { normalizeUniversityDraft } from './university-domain.util.js';
import type { UniversityDraft } from '../domain/university-repository.js';

const draft: UniversityDraft = {
  accreditationCode: '  RUC-123 ',
  name: ' Universidad de prueba ',
  acronym: ' UDT ',
  province: ' Pichincha ',
  city: ' Quito ',
  website: '',
  campuses: [
    {
      name: ' Matriz ',
      legalName: ' Universidad de prueba ',
      province: ' Pichincha ',
      city: ' Quito ',
      reference: ' Centro ',
    },
  ],
  domains: [
    { domain: '@UNIVERSIDAD.EDU.EC' },
    { domain: 'sede.edu.ec', campusIndex: 0 },
  ],
};

describe('normalizeUniversityDraft', () => {
  it('normalizes domains and trims university and campus fields', () => {
    expect(normalizeUniversityDraft(draft)).toMatchObject({
      accreditationCode: 'RUC-123',
      name: 'Universidad de prueba',
      acronym: 'UDT',
      website: null,
      campuses: [{ name: 'Matriz', legalName: 'Universidad de prueba' }],
      domains: [
        { domain: 'universidad.edu.ec' },
        { domain: 'sede.edu.ec', campusIndex: 0 },
      ],
    });
  });

  it('requires a general domain and valid campus references', () => {
    expect(() =>
      normalizeUniversityDraft({
        ...draft,
        domains: [{ domain: 'sede.edu.ec', campusIndex: 0 }],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      normalizeUniversityDraft({
        ...draft,
        domains: [{ domain: 'universidad.edu.ec', campusIndex: 2 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects repeated domains and campus names', () => {
    expect(() =>
      normalizeUniversityDraft({
        ...draft,
        domains: [
          { domain: 'UNIVERSIDAD.edu.ec' },
          { domain: '@universidad.edu.ec' },
        ],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      normalizeUniversityDraft({
        ...draft,
        campuses: [draft.campuses[0], { ...draft.campuses[0], id: 'campus-2' }],
      }),
    ).toThrow(BadRequestException);
  });
});
