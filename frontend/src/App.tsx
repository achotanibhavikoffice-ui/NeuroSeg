import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  DEFAULT_ABLATION,
  DEFAULT_COHORT,
  neuroApi,
  type AblationModelRow,
  type PatientRecord,
  type StudyStackResponse,
} from './api';
import { AppLayout } from './layouts/AppLayout';
import { AblationLabPage } from './pages/AblationLabPage';
import { CohortPage } from './pages/CohortPage';
import { DashboardPage } from './pages/DashboardPage';
import { HematologyLabPage } from './pages/HematologyLabPage';
import { LongitudinalPage } from './pages/LongitudinalPage';
import { ReportsPage } from './pages/ReportsPage';
import { UncertaintyLabPage } from './pages/UncertaintyLabPage';
import { WorkstationPage } from './pages/WorkstationPage';

export default function App() {
  const [patients, setPatients] = useState<PatientRecord[]>(DEFAULT_COHORT);
  const [activePatientId, setActivePatientId] = useState<string>(DEFAULT_COHORT[0].patient_id);
  const [study, setStudy] = useState<StudyStackResponse | null>(null);
  const [ablation, setAblation] = useState<AblationModelRow[]>(DEFAULT_ABLATION);
  const [currentSlice, setCurrentSlice] = useState<number>(8);

  const activePatient =
    patients.find((p) => p.patient_id === activePatientId) || patients[0];

  useEffect(() => {
    neuroApi.getCohort().then(setPatients);
    neuroApi.getAblation().then(setAblation);
  }, []);

  useEffect(() => {
    neuroApi.getStudyStack(activePatientId, 8).then((res) => {
      setStudy(res);
      setCurrentSlice((res.volumetry.peak_lesion_slice_index || 9) - 1);
    });
  }, [activePatientId]);

  return (
    <AppLayout
      patients={patients}
      activePatient={activePatient}
      onSelectPatient={setActivePatientId}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <DashboardPage
              patients={patients}
              activePatient={activePatient}
              study={study}
              ablation={ablation}
              onSelectPatient={setActivePatientId}
              onJumpToSlice={setCurrentSlice}
            />
          }
        />
        <Route
          path="/workstation"
          element={
            <WorkstationPage
              activePatient={activePatient}
              study={study}
              currentSlice={currentSlice}
              onSliceChange={setCurrentSlice}
            />
          }
        />
        <Route
          path="/hematology"
          element={<HematologyLabPage activePatient={activePatient} />}
        />
        <Route
          path="/uncertainty"
          element={<UncertaintyLabPage activePatient={activePatient} study={study} />}
        />
        <Route path="/ablation" element={<AblationLabPage ablation={ablation} />} />
        <Route
          path="/longitudinal"
          element={<LongitudinalPage activePatient={activePatient} />}
        />
        <Route
          path="/cohort"
          element={
            <CohortPage
              patients={patients}
              activePatient={activePatient}
              onSelectPatient={setActivePatientId}
            />
          }
        />
        <Route
          path="/reports"
          element={<ReportsPage activePatient={activePatient} study={study} />}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
