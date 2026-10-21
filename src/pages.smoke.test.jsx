// Smoke test: renders every lazy page component in isolation to catch runtime crashes.
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';

const Loading = () => <div>loading</div>;

const pages = [
  { name: 'CatalogPage', imp: () => import('./components/RoyalHome/CatalogPage'), path: '/catalog/x' },
  { name: 'ContactPage', imp: () => import('./components/RoyalHome/ContactPage'), path: '/contact' },
  { name: 'RoyalHarajPage', imp: () => import('./components/RoyalHome/RoyalHarajPage'), path: '/haraj' },
  { name: 'AdFormPage', imp: () => import('./components/RoyalHome/AdFormPage'), path: '/haraj/post' },
  { name: 'BranchDetail', imp: () => import('./pages/BranchDetail'), path: '/branch/x' },
  { name: 'BranchesManagement', imp: () => import('./pages/BranchesManagement'), path: '/branches' },
  { name: 'AdvertisementsPage', imp: () => import('./pages/AdvertisementsPage'), path: '/advertisements' },
  { name: 'EmployeesPage', imp: () => import('./pages/EmployeesPage'), path: '/employees' },
  { name: 'AboutPage', imp: () => import('./pages/AboutPage'), path: '/about' },
  { name: 'AIChat', imp: () => import('./components/AIChat'), path: '/ai-chat' },
  { name: 'AdDetailsPage', imp: () => import('./pages/AdDetailsPage'), path: '/ad/x' },
  { name: 'ChatPage', imp: () => import('./pages/ChatPage'), path: '/chat' },
  { name: 'Register', imp: () => import('./pages/Register'), path: '/register' },
  { name: 'ForgotPassword', imp: () => import('./pages/ForgotPassword'), path: '/forgot-password' },
  { name: 'OwnerPanel', imp: () => import('./pages/OwnerPanel'), path: '/owner-panel' },
  { name: 'OwnerPrivateRoom', imp: () => import('./pages/OwnerPrivateRoom'), path: '/owner-private-room' },
  { name: 'UsersList', imp: () => import('./pages/UsersList'), path: '/users' },
  { name: 'AdminPage', imp: () => import('./components/pages/AdminPage'), path: '/admin' },
  { name: 'SettingsPage', imp: () => import('./components/pages/SettingsPage'), path: '/settings' },
  { name: 'OTPPage', imp: () => import('./components/pages/OTPPage'), path: '/otp' },
  { name: 'ComplaintsPage', imp: () => import('./components/pages/ComplaintsPage'), path: '/complaints' },
  { name: 'Navigation', imp: () => import('./components/Navigation'), path: '/nav' },
];

describe('Page smoke render tests', () => {
  for (const p of pages) {
    it(`renders ${p.name} without crashing`, async () => {
      const Comp = lazy(p.imp);
      let container;
      await act(async () => {
        ({ container } = render(
          <MemoryRouter initialEntries={[p.path]}>
            <AuthProvider>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path={p.path} element={<Comp />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </MemoryRouter>
        ));
      });
      expect(container).toBeTruthy();
    });
  }
});