import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AcademicStructureScope } from '../domain/academic-structure-repository.js';
import {
  normalizeCareerDraft,
  resolveFacultyCampus,
} from './academic-structure.util.js';

const universityScope: AcademicStructureScope = {
  universityId: 'university-id',
  universityName: 'Universidad de prueba',
  campusId: null,
  campuses: [
    { id: 'campus-id', name: 'Sede Matriz', status: 'ACTIVE' },
  ],
};

describe('academic structure utilities', () => {
  it('normalizes career identifiers and accepts a full career name', () => {
    expect(
      normalizeCareerDraft({
        code: ' ing-sw ',
        name: ' Ingeniería en Software ',
      }),
    ).toEqual({
      code: 'ING-SW',
      name: 'Ingeniería en Software',
    });
  });

  it('rejects abbreviations and acronyms in career names', () => {
    expect(() =>
      normalizeCareerDraft({
        code: 'ING-SW',
        name: 'ing. en TIC',
      }),
    ).toThrow(BadRequestException);
  });

  it('forces campus administrators to the assigned campus', () => {
    expect(
      resolveFacultyCampus(
        { ...universityScope, campusId: 'campus-id' },
        null,
      ),
    ).toBe('campus-id');
  });

  it('rejects faculty assignment to a campus outside the university', () => {
    expect(() =>
      resolveFacultyCampus(universityScope, 'other-campus-id'),
    ).toThrow(BadRequestException);
  });

  it('prevents campus administrators from selecting another campus', () => {
    expect(() =>
      resolveFacultyCampus(
        { ...universityScope, campusId: 'campus-id' },
        'other-campus-id',
      ),
    ).toThrow(ForbiddenException);
  });
});
