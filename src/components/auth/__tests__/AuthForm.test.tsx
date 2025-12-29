import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthForm from '../AuthForm'

describe('AuthForm', () => {
  const mockOnAuth = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form by default', () => {
    render(<AuthForm onAuth={mockOnAuth} />)

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('should switch to register tab', async () => {
    const user = userEvent.setup()
    render(<AuthForm onAuth={mockOnAuth} />)

    const registerTab = screen.getByText('Register')
    await user.click(registerTab)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('should handle form input changes', async () => {
    const user = userEvent.setup()
    render(<AuthForm onAuth={mockOnAuth} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('should submit login form', async () => {
    const user = userEvent.setup()
    render(<AuthForm onAuth={mockOnAuth} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnAuth).toHaveBeenCalledWith({
        name: 'Guest User',
        email: 'test@example.com'
      })
    })
  })

  it('should submit register form with name', async () => {
    const user = userEvent.setup()
    render(<AuthForm onAuth={mockOnAuth} />)

    // Switch to register tab
    const registerTab = screen.getByText('Register')
    await user.click(registerTab)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnAuth).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com'
      })
    })
  })

  it('should require email and password fields', async () => {
    const user = userEvent.setup()
    render(<AuthForm onAuth={mockOnAuth} />)

    const submitButton = screen.getByRole('button', { name: /login/i })
    await user.click(submitButton)

    // Form validation should prevent submission
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toBeRequired()
    
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toBeRequired()
  })

  it('should display forgot password link', () => {
    render(<AuthForm onAuth={mockOnAuth} />)

    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })
})

