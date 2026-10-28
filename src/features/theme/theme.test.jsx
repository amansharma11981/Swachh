import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeProvider.jsx'
import ThemeToggle from '../../components/ui/ThemeToggle.jsx'

function TestConsumer() {
  const { preference, resolvedTheme, isLight } = useTheme()
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="is-light">{isLight ? 'true' : 'false'}</span>
    </div>
  )
}

describe('Theme System', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('defaults to light theme when a user visits without saved preferences, even if OS prefers dark', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('dark'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    render(
      <ThemeProvider>
        <TestConsumer />
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(screen.getByTestId('pref').textContent).toBe('light')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
    expect(screen.getByTestId('is-light').textContent).toBe('true')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('allows toggling between light and dark theme using the ThemeToggle button', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
        <ThemeToggle />
      </ThemeProvider>
    )

    expect(screen.getByTestId('resolved').textContent).toBe('light')

    // Click toggle to switch to dark
    const toggleBtn = screen.getByRole('button', { name: /switch to dark theme/i })
    fireEvent.click(toggleBtn)

    expect(screen.getByTestId('pref').textContent).toBe('dark')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(screen.getByTestId('is-light').textContent).toBe('false')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('swachhai-theme')).toBe('dark')
    expect(localStorage.getItem('swachhai-theme-explicit')).toBe('true')

    // Click toggle to switch back to light
    const switchBackBtn = screen.getByRole('button', { name: /switch to light theme/i })
    fireEvent.click(switchBackBtn)

    expect(screen.getByTestId('pref').textContent).toBe('light')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
    expect(screen.getByTestId('is-light').textContent).toBe('true')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('swachhai-theme')).toBe('light')
  })

  it('renders theme toggle text inside span with theme-toggle-text class for responsive control', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const toggleBtn = screen.getByRole('button', { name: /switch to dark theme/i })
    const textSpan = toggleBtn.querySelector('.theme-toggle-text')
    expect(textSpan).not.toBeNull()
    expect(textSpan?.textContent).toBe('Light')
  })
})
