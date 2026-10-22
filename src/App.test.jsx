import { describe, it, expect } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';

describe('App smoke tests', () => {
  it('renders without crashing on the login route', async () => {
    let container;

    await act(async () => {
      ({ container } = render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      ));
    });

    expect(container).toBeTruthy();
  });

  it('renders the login heading', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    const brand = await screen.findAllByText(/المسيمير | ALMUSAYMIR/i);
    expect(brand.length).toBeGreaterThan(0);
  });

  it('renders without crashing on the register route', async () => {
    let container;

    await act(async () => {
      ({ container } = render(
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      ));
    });

    expect(container).toBeTruthy();
  });
});
