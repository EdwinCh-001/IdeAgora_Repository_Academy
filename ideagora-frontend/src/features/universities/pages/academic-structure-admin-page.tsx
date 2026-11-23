import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { getApiErrorMessage } from '../../../shared/api/api-client'
import { academicStructureApi } from '../api/academic-structure-api'
import {
  careerSchema,
  facultySchema,
  type CareerFormValues,
  type FacultyFormValues,
} from '../schemas/academic-structure-schema'
import type {
  AcademicCareerRecord,
  AcademicEntityStatus,
  AcademicFacultyRecord,
  AcademicStructureRecord,
} from '../types/academic-structure-types'
import { AdminWorkspace } from '../../../shared/ui/admin-workspace'
import { NotificationModal } from '../../../shared/ui/notification-modal'

const emptyFaculty: FacultyFormValues = {
  name: '',
  acronym: '',
  campusId: '',
}

const emptyCareer: CareerFormValues = {
  code: '',
  name: '',
}

interface AcademicStructureAdminPageProps {
  administratorName: string
  onLogout: () => Promise<void>
  onManageUsers: () => void
  onReviewDirectors: () => void
}

export function AcademicStructureAdminPage({
  administratorName,
  onLogout,
  onManageUsers,
  onReviewDirectors,
}: AcademicStructureAdminPageProps) {
  const [structure, setStructure] = useState<AcademicStructureRecord | null>(
    null,
  )
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(
    null,
  )
  const [isFacultyFormOpen, setIsFacultyFormOpen] = useState(false)
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null)
  const [isCareerFormOpen, setIsCareerFormOpen] = useState(false)
  const [editingCareerId, setEditingCareerId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const facultyForm = useForm<FacultyFormValues>({
    resolver: zodResolver(facultySchema),
    defaultValues: emptyFaculty,
    mode: 'onTouched',
  })
  const careerForm = useForm<CareerFormValues>({
    resolver: zodResolver(careerSchema),
    defaultValues: emptyCareer,
    mode: 'onTouched',
  })

  useEffect(() => {
    let active = true
    void academicStructureApi
      .get()
      .then((result) => {
        if (!active) return
        setStructure(result)
        setSelectedFacultyId(result.faculties[0]?.id ?? null)
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            getApiErrorMessage(
              error,
              'No se pudo cargar la estructura académica.',
            ),
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const selectedFaculty =
    structure?.faculties.find(({ id }) => id === selectedFacultyId) ?? null

  const replaceFaculty = (faculty: AcademicFacultyRecord) => {
    setStructure((current) =>
      current
        ? {
            ...current,
            faculties: current.faculties
              .map((item) => (item.id === faculty.id ? faculty : item))
              .sort((left, right) => left.name.localeCompare(right.name)),
          }
        : current,
    )
  }

  const showError = (error: unknown, fallback: string) => {
    setSuccessMessage('')
    setErrorMessage(getApiErrorMessage(error, fallback))
  }

  const startNewFaculty = () => {
    facultyForm.reset({
      ...emptyFaculty,
      campusId: structure?.assignedCampusId ?? '',
    })
    setSelectedFacultyId(null)
    setEditingFacultyId(null)
    setIsFacultyFormOpen(true)
    setIsCareerFormOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const startFacultyEdit = (faculty: AcademicFacultyRecord) => {
    facultyForm.reset({
      name: faculty.name,
      acronym: faculty.acronym ?? '',
      campusId: faculty.campusId ?? '',
    })
    setSelectedFacultyId(faculty.id)
    setEditingFacultyId(faculty.id)
    setIsFacultyFormOpen(true)
    setIsCareerFormOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const cancelFacultyEdit = () => {
    setIsFacultyFormOpen(false)
    setEditingFacultyId(null)
    facultyForm.reset(emptyFaculty)
    setErrorMessage('')
  }

  const saveFaculty = facultyForm.handleSubmit(async (values) => {
    if (!structure) return
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const payload = {
        name: values.name,
        acronym: values.acronym.trim() || null,
      }
      const faculty = editingFacultyId
        ? await academicStructureApi.updateFaculty(editingFacultyId, payload)
        : await academicStructureApi.createFaculty({
            ...payload,
            campusId:
              structure.assignedCampusId ??
              (values.campusId.trim() || null),
          })
      setStructure((current) =>
        current
          ? {
              ...current,
              faculties: current.faculties
                .filter((item) => item.id !== faculty.id)
                .concat(faculty)
                .sort((left, right) => left.name.localeCompare(right.name)),
            }
          : current,
      )
      setSelectedFacultyId(faculty.id)
      setIsFacultyFormOpen(false)
      setEditingFacultyId(null)
      setSuccessMessage(
        editingFacultyId
          ? 'Facultad actualizada correctamente.'
          : 'Facultad creada correctamente.',
      )
    } catch (error) {
      showError(error, 'No se pudo guardar la facultad.')
    } finally {
      setIsSaving(false)
    }
  })

  const changeFacultyStatus = async (faculty: AcademicFacultyRecord) => {
    const status: AcademicEntityStatus =
      faculty.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    if (
      status === 'INACTIVE' &&
      !window.confirm(
        `¿Inactivar la facultad ${faculty.name}? Sus carreras e historial se conservarán.`,
      )
    ) {
      return
    }
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      replaceFaculty(
        await academicStructureApi.setFacultyStatus(faculty.id, status),
      )
      setSuccessMessage(
        status === 'INACTIVE'
          ? 'Facultad inactivada. Su historial se conservó.'
          : 'Facultad reactivada correctamente.',
      )
    } catch (error) {
      showError(error, 'No se pudo cambiar el estado de la facultad.')
    } finally {
      setIsSaving(false)
    }
  }

  const startNewCareer = () => {
    careerForm.reset(emptyCareer)
    setEditingCareerId(null)
    setIsCareerFormOpen(true)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const startCareerEdit = (career: AcademicCareerRecord) => {
    careerForm.reset({ code: career.code, name: career.name })
    setEditingCareerId(career.id)
    setIsCareerFormOpen(true)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const cancelCareerEdit = () => {
    setIsCareerFormOpen(false)
    setEditingCareerId(null)
    careerForm.reset(emptyCareer)
    setErrorMessage('')
  }

  const saveCareer = careerForm.handleSubmit(async (values) => {
    if (!selectedFaculty) return
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        name: values.name,
      }
      const career = editingCareerId
        ? await academicStructureApi.updateCareer(editingCareerId, payload)
        : await academicStructureApi.createCareer(
            selectedFaculty.id,
            payload,
          )
      replaceFaculty({
        ...selectedFaculty,
        careers: selectedFaculty.careers
          .filter((item) => item.id !== career.id)
          .concat(career)
          .sort((left, right) => left.name.localeCompare(right.name)),
      })
      setIsCareerFormOpen(false)
      setEditingCareerId(null)
      setSuccessMessage(
        editingCareerId
          ? 'Carrera actualizada correctamente.'
          : 'Carrera creada correctamente.',
      )
    } catch (error) {
      showError(error, 'No se pudo guardar la carrera.')
    } finally {
      setIsSaving(false)
    }
  })

  const changeCareerStatus = async (career: AcademicCareerRecord) => {
    const status: AcademicEntityStatus =
      career.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    if (
      status === 'INACTIVE' &&
      !window.confirm(
        `¿Inactivar la carrera ${career.name}? Su historial se conservará.`,
      )
    ) {
      return
    }
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const updated = await academicStructureApi.setCareerStatus(
        career.id,
        status,
      )
      if (selectedFaculty) {
        replaceFaculty({
          ...selectedFaculty,
          careers: selectedFaculty.careers.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        })
      }
      setSuccessMessage(
        status === 'INACTIVE'
          ? 'Carrera inactivada. Su historial se conservó.'
          : 'Carrera reactivada correctamente.',
      )
    } catch (error) {
      showError(error, 'No se pudo cambiar el estado de la carrera.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminWorkspace
      roleLabel="Administrador local"
      links={[
        {
          id: 'academic-structure',
          label: 'Estructura académica',
          active: true,
        },
        {
          id: 'director-review',
          label: 'Validar directores',
          onClick: onReviewDirectors,
        },
        { id: 'users', label: 'Usuarios', onClick: onManageUsers },
      ]}
    >
    <main className="university-admin academic-admin">
      <header className="university-admin-header">
        <div>
          <p className="eyebrow">Administrador local · {administratorName}</p>
          <h1>Estructura académica</h1>
          <p>
            {structure?.university.name ?? 'Cargando universidad…'}
            {structure?.assignedCampusId
              ? ` · Sede: ${structure.campuses.find(({ id }) => id === structure.assignedCampusId)?.name ?? 'asignada'}`
              : ' · Administración universitaria'}
          </p>
        </div>
        <nav className="admin-header-actions" aria-label="Navegación">
          <button
            className="button button-quiet"
            type="button"
            onClick={() => void onLogout()}
          >
            Cerrar sesión
          </button>
        </nav>
      </header>

      <NotificationModal
        errorMessage={errorMessage}
        successMessage={successMessage}
        onClose={() => {
          setErrorMessage('')
          setSuccessMessage('')
        }}
      />

      <div className="university-admin-layout academic-admin-layout">
        <section className="university-list-card">
          <div className="university-list-heading">
            <h2>Facultades</h2>
            <button
              className="button button-primary"
              type="button"
              disabled={isLoading || isSaving}
              onClick={startNewFaculty}
            >
              Nueva
            </button>
          </div>
          {isLoading ? (
            <p className="empty-state" role="status">
              Cargando estructura académica…
            </p>
          ) : structure?.faculties.length ? (
            <ul className="university-list academic-faculty-list">
              {structure.faculties.map((faculty) => (
                <li key={faculty.id}>
                  <button
                    className={`university-list-item${selectedFacultyId === faculty.id ? ' is-selected' : ''}`}
                    type="button"
                    onClick={() => {
                      setSelectedFacultyId(faculty.id)
                      setIsFacultyFormOpen(false)
                      setIsCareerFormOpen(false)
                      setEditingFacultyId(null)
                      setEditingCareerId(null)
                      setErrorMessage('')
                    }}
                  >
                    <span>{faculty.name}</span>
                    <small>
                      {faculty.acronym || 'Sin sigla'}
                      {faculty.campusName ? ` · ${faculty.campusName}` : ''}
                    </small>
                    <span
                      className={`status-pill is-${faculty.status.toLowerCase()}`}
                    >
                      {faculty.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Todavía no hay facultades. Crea la primera para agregar carreras.
            </p>
          )}
        </section>

        <section className="university-panel academic-detail-panel">
          {isFacultyFormOpen ? (
            <form className="academic-form" onSubmit={saveFaculty}>
              <div className="university-panel-heading">
                <div>
                  <p className="eyebrow">Facultad</p>
                  <h2>
                    {editingFacultyId ? 'Editar facultad' : 'Nueva facultad'}
                  </h2>
                </div>
              </div>
              <label className="field">
                <span>Nombre completo</span>
                <input
                  {...facultyForm.register('name')}
                  autoComplete="off"
                  placeholder="Facultad de Ingeniería"
                />
                {facultyForm.formState.errors.name && (
                  <small className="field-error">
                    {facultyForm.formState.errors.name.message}
                  </small>
                )}
              </label>
              <label className="field">
                <span>Sigla o acrónimo (opcional)</span>
                <input
                  {...facultyForm.register('acronym')}
                  autoComplete="off"
                  placeholder="FI"
                />
                {facultyForm.formState.errors.acronym && (
                  <small className="field-error">
                    {facultyForm.formState.errors.acronym.message}
                  </small>
                )}
              </label>
              {!editingFacultyId && structure?.assignedCampusId === null && (
                <label className="field">
                  <span>Sede</span>
                  <select {...facultyForm.register('campusId')}>
                    <option value="">Toda la universidad</option>
                    {structure.campuses.map((campus) => (
                      <option
                        key={campus.id}
                        value={campus.id}
                        disabled={campus.status === 'INACTIVE'}
                      >
                        {campus.name}
                        {campus.status === 'INACTIVE' ? ' (inactiva)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {editingFacultyId && selectedFaculty?.campusName && (
                <p className="academic-note">
                  Sede asignada: {selectedFaculty.campusName}
                </p>
              )}
              <div className="button-row">
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando…' : 'Guardar facultad'}
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={cancelFacultyEdit}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : selectedFaculty ? (
            <>
              <div className="university-panel-heading academic-faculty-heading">
                <div>
                  <p className="eyebrow">Facultad</p>
                  <h2>{selectedFaculty.name}</h2>
                  <p className="academic-subtitle">
                    {selectedFaculty.acronym || 'Sin sigla'}
                    {selectedFaculty.campusName
                      ? ` · ${selectedFaculty.campusName}`
                      : ' · Toda la universidad'}
                  </p>
                </div>
                <span
                  className={`status-pill is-${selectedFaculty.status.toLowerCase()}`}
                >
                  {selectedFaculty.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="button-row academic-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => startFacultyEdit(selectedFaculty)}
                >
                  Editar facultad
                </button>
                <button
                  className={
                    selectedFaculty.status === 'ACTIVE'
                      ? 'button button-danger'
                      : 'button button-secondary'
                  }
                  type="button"
                  disabled={isSaving}
                  onClick={() => void changeFacultyStatus(selectedFaculty)}
                >
                  {selectedFaculty.status === 'ACTIVE'
                    ? 'Inactivar facultad'
                    : 'Reactivar facultad'}
                </button>
              </div>

              <div className="admin-section-heading academic-section-heading">
                <div>
                  <h3>Carreras</h3>
                  <p>
                    Registra el identificador y el nombre completo, sin siglas.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={
                    isSaving || selectedFaculty.status === 'INACTIVE'
                  }
                  onClick={startNewCareer}
                >
                  Nueva carrera
                </button>
              </div>
              {selectedFaculty.status === 'INACTIVE' && (
                <p className="academic-note">
                  Reactiva la facultad para agregar o activar carreras.
                </p>
              )}
              {selectedFaculty.careers.length ? (
                <ul className="academic-career-list">
                  {selectedFaculty.careers.map((career) => (
                    <li key={career.id}>
                      <div>
                        <strong>{career.name}</strong>
                        <span>{career.code}</span>
                      </div>
                      <span
                        className={`status-pill is-${career.status.toLowerCase()}`}
                      >
                        {career.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={isSaving}
                        onClick={() => startCareerEdit(career)}
                      >
                        Editar
                      </button>
                      <button
                        className={
                          career.status === 'ACTIVE'
                            ? 'button button-danger'
                            : 'button button-secondary'
                        }
                        type="button"
                        disabled={
                          isSaving ||
                          (selectedFaculty.status === 'INACTIVE' &&
                            career.status === 'INACTIVE')
                        }
                        onClick={() => void changeCareerStatus(career)}
                      >
                        {career.status === 'ACTIVE' ? 'Inactivar' : 'Reactivar'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">
                  Esta facultad todavía no tiene carreras registradas.
                </p>
              )}

              {isCareerFormOpen && (
                <form className="academic-form academic-career-form" onSubmit={saveCareer}>
                  <div className="university-panel-heading">
                    <div>
                      <p className="eyebrow">Carrera</p>
                      <h2>
                        {editingCareerId ? 'Editar carrera' : 'Nueva carrera'}
                      </h2>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Identificador</span>
                      <input
                        {...careerForm.register('code')}
                        autoComplete="off"
                        placeholder="ING-SW"
                      />
                      {careerForm.formState.errors.code && (
                        <small className="field-error">
                          {careerForm.formState.errors.code.message}
                        </small>
                      )}
                    </label>
                    <label className="field">
                      <span>Nombre completo (sin siglas)</span>
                      <input
                        {...careerForm.register('name')}
                        autoComplete="off"
                        placeholder="Ingeniería en Software"
                      />
                      {careerForm.formState.errors.name && (
                        <small className="field-error">
                          {careerForm.formState.errors.name.message}
                        </small>
                      )}
                    </label>
                  </div>
                  <div className="button-row">
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Guardando…' : 'Guardar carrera'}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={isSaving}
                      onClick={cancelCareerEdit}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : isLoading ? (
            <p className="empty-state" role="status">
              Preparando el panel…
            </p>
          ) : (
            <div className="academic-empty-panel">
              <p className="eyebrow">Estructura académica</p>
              <h2>Empieza por una facultad</h2>
              <p>
                Las carreras se agregan dentro de una facultad y el historial se
                conserva cuando se inactivan.
              </p>
              <button
                className="button button-primary"
                type="button"
                onClick={startNewFaculty}
              >
                Crear primera facultad
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
    </AdminWorkspace>
  )
}
