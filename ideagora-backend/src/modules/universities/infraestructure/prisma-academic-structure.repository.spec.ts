import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  AcademicStructureActor,
  AcademicStructureScope,
} from '../domain/academic-structure-repository.js';
import { PrismaAcademicStructureRepository } from './prisma-academic-structure.repository.js';

const scope: AcademicStructureScope = {
  universityId: 'university-id',
  universityName: 'Universidad de prueba',
  campusId: null,
  campuses: [{ id: 'campus-id', name: 'Sede Matriz', status: 'ACTIVE' }],
};

const actor: AcademicStructureActor = {
  id: 'local-admin-id',
  firstName: 'Ada',
  lastName: 'Lovelace',
  ipAddress: null,
};

function createRepository() {
  const faculty = {
    id: 'faculty-id',
    name: 'Facultad de Ingeniería',
    acronym: 'FI',
    campus_id: 'campus-id',
    status: 'INACTIVE' as const,
    campuses: { id: 'campus-id', name: 'Sede Matriz' },
    careers: [],
  };
  const transactionMock = {
    faculties: {
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue(faculty),
      update: vi.fn().mockResolvedValue(faculty),
    },
    careers: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    audit_logs: { create: vi.fn().mockResolvedValue({}) },
  };
  const findAdmin = vi.fn();
  const findFaculties = vi.fn().mockResolvedValue([]);
  const prisma = {
    $transaction: vi.fn(
      async (
        callback: (transaction: typeof transactionMock) => Promise<unknown>,
      ) => callback(transactionMock),
    ),
    users: { findFirst: findAdmin },
    faculties: { findMany: findFaculties },
  } as unknown as PrismaService;
  return {
    repository: new PrismaAcademicStructureRepository(prisma),
    transaction: transactionMock,
    faculty,
    findAdmin,
    findFaculties,
  };
}

describe('PrismaAcademicStructureRepository', () => {
  it('rejects a local admin whose assigned campus belongs to another university', async () => {
    const { repository, findAdmin } = createRepository();
    findAdmin.mockResolvedValue({
      university_id: 'university-id',
      campus_id: 'foreign-campus-id',
      campuses: { university_id: 'other-university-id' },
      universities: {
        id: 'university-id',
        name: 'Universidad de prueba',
        campuses: [],
      },
    } as never);

    await expect(repository.getLocalAdminScope(actor.id)).resolves.toBeNull();
  });

  it('limits faculty listings to the assigned campus', async () => {
    const { repository, findFaculties } = createRepository();

    await repository.list({ ...scope, campusId: 'campus-id' });

    expect(findFaculties).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          university_id: 'university-id',
          campus_id: 'campus-id',
        },
      }),
    );
  });

  it('rejects duplicate faculty names or acronyms within the same academic scope', async () => {
    const { repository, transaction } = createRepository();
    transaction.faculties.findFirst.mockResolvedValue({ id: 'existing-id' });

    await expect(
      repository.createFaculty(
        scope,
        {
          name: 'Facultad de Ingeniería',
          acronym: 'FI',
          campusId: null,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.faculties.create).not.toHaveBeenCalled();
  });

  it('inactivates a faculty without deleting its record and audits the change', async () => {
    const { repository, transaction } = createRepository();
    transaction.faculties.findFirst.mockResolvedValue({
      id: 'faculty-id',
      name: 'Facultad de Ingeniería',
      status: 'ACTIVE',
    });

    await repository.setFacultyStatus(
      scope,
      'faculty-id',
      'INACTIVE',
      actor,
    );

    expect(transaction.faculties.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'faculty-id' },
        data: expect.objectContaining({ status: 'INACTIVE' }),
      }),
    );
    expect(transaction.audit_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'FACULTY_DEACTIVATED',
          entity_type: 'FACULTY',
          entity_id: 'faculty-id',
        }),
      }),
    );
  });
});
