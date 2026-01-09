import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Auth from '../Auth'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'

vi.mock('@/contexts/AuthContext')
vi.mock('@/hooks/use-toast')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Auth', () => {
  const mockSignIn = vi.fn()
  const mockSignUp = vi.fn()
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      isLoading: false,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn()
    } as any)
  })

  it('should render sign in form by default', () => {
    renderWithRouter(<Auth />)

    // There are multiple "Sign In" elements (tab and form), so use more specific queries
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should switch to sign up tab', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Auth />)

    const signUpTab = screen.getByText('Sign Up')
    await user.click(signUpTab)

    expect(screen.getByText('Create an account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should handle sign in', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ error: null })

    renderWithRouter(<Auth />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should handle sign in errors', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })

    renderWithRouter(<Auth />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sign in failed',
          variant: 'destructive'
        })
      )
    })
  })

  it('should validate required fields for sign in', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Auth />)

    // Find the form and submit it directly
    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')
    if (form) {
      fireEvent.submit(form)
    } else {
      // Fallback: click the button
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
    }

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Please enter both email and password.'
        })
      )
    }, { timeout: 3000 })

    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('should handle sign up', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ error: null })

    renderWithRouter(<Auth />)

    // Switch to sign up tab
    const signUpTab = screen.getByText('Sign Up')
    await user.click(signUpTab)

    // Wait for tab content to change
    await waitFor(() => {
      expect(screen.getByText('Create an account')).toBeInTheDocument()
    })

    // Get inputs after tab switch
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'Password123') // Meets new requirements: 8+ chars, uppercase, lowercase, number
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'Password123')
    })
  })

  it('should validate password length for sign up', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Auth />)

    // Switch to sign up tab
    const signUpTab = screen.getByText('Sign Up')
    await user.click(signUpTab)

    // Wait for tab content to change
    await waitFor(() => {
      expect(screen.getByText('Create an account')).toBeInTheDocument()
    })

    // Get inputs after tab switch
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'Pass1') // Too short (less than 8 chars)
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Password must be at least 8 characters.'
        })
      )
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should validate password uppercase requirement', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Auth />)

    // Switch to sign up tab
    const signUpTab = screen.getByText('Sign Up')
    await user.click(signUpTab)

    // Wait for tab content to change
    await waitFor(() => {
      expect(screen.getByText('Create an account')).toBeInTheDocument()
    })

    // Get inputs after tab switch
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'password123') // No uppercase
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Password must contain at least one uppercase letter.'
        })
      )
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should validate password number requirement', async () => {
    const user = userEvent.setup()
    renderWithRouter(<Auth />)

    // Switch to sign up tab
    const signUpTab = screen.getByText('Sign Up')
    await user.click(signUpTab)

    // Wait for tab content to change
    await waitFor(() => {
      expect(screen.getByText('Create an account')).toBeInTheDocument()
    })

    // Get inputs after tab switch
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'Password') // No number
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Password must contain at least one number.'
        })
      )
    })

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should show loading state during sign in', async () => {
    const user = userEvent.setup()
    // Create a promise that we can control
    let resolveSignIn: (value: any) => void
    const signInPromise = new Promise<any>((resolve) => {
      resolveSignIn = resolve
    })
    mockSignIn.mockReturnValue(signInPromise)

    renderWithRouter(<Auth />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    })

    // Resolve the sign in
    resolveSignIn!({ error: null })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })
})

