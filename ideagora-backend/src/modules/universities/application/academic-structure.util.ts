import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type {
  AcademicStructureRepository,
  AcademicStructureScope,
  CareerDraft,
  FacultyDraft,
} from '../domain/academic-structure-repository.js';

const careerAcronymPattern =
  /(?:^|\s)(?:[A-ZÁÉÍÓÚÜÑ]{2,6}|(?:[Ii]ng|[Ll]ic|[Tt][eé]c|[Aa]dm|[Cc]ont)\.)(?=$|\s|[.,])/u;

export async function requireAcademicStructureScope(
  repository: AcademicStructureRepository,
  administratorId: string,
): Promise<AcademicStructureScope> {
  const scope = await repository.getLocalAdminScope(administratorId);
  if (!scope) {
    throw new ForbiddenException(
      'No tienes una universidad o sede asignada para gestionar su estructura académica.',
    );
  }
  return scope;
}

export function resolveFacultyCampus(
  scope: AcademicStructureScope,
  requestedCampusId: string | null,
): string | null {
  if (scope.campusId) {
    if (requestedCampusId && requestedCampusId !== scope.campusId) {
      throw new ForbiddenException(
        'Solo puedes gestionar facultades de la sede que tienes asignada.',
      );
    }
    if (
      !scope.campuses.some(
        (campus) =>
          campus.id === scope.campusId && campus.status === 'ACTIVE',
      )
    ) {
      throw new ForbiddenException(
        'No puedes crear facultades en una sede inactiva.',
      );
    }
    return scope.campusId;
  }

  if (requestedCampusId) {
    const campus = scope.campuses.find(({ id }) => id === requestedCampusId);
    if (!campus) {
      throw new BadRequestException(
        'La sede seleccionada no pertenece a tu universidad.',
      );
    }
    if (campus.status !== 'ACTIVE') {
      throw new BadRequestException(
        'No puedes crear facultades en una sede inactiva.',
      );
    }
  }
  return requestedCampusId;
}

export function normalizeFacultyDraft(draft: FacultyDraft): FacultyDraft {
  return {
    name: draft.name.trim(),
    acronym: draft.acronym?.trim() || null,
    campusId: draft.campusId,
  };
}

export function normalizeCareerDraft(draft: CareerDraft): CareerDraft {
  const name = draft.name.trim();
  if (careerAcronymPattern.test(name)) {
    throw new BadRequestException(
      'Escribe el nombre completo de la carrera, sin siglas ni abreviaturas.',
    );
  }
  return {
    code: draft.code.trim().toUpperCase(),
    name,
  };
}
