import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigate } from 'react-router-dom'
import OnboardingFlow from '../OnboardingFlow'
import { useAuth } from '@/contexts/AuthContext'
import { completeOnboarding } from '@/services/userService'
import { toast } from '@/hooks/use-toast'

vi.mock('react-router-dom')
vi.mock('@/contexts/AuthContext')
vi.mock('@/services/userService')
vi.mock('@/hooks/use-toast')

describe('OnboardingFlow', () => {
  const mockOnClose = vi.fn()
  const mockOnComplete = vi.fn()
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAuth).mockReturnValue({
      userProfile: {
        id: 'user-123',
        role: 'editor',
        onboardingCompleted: false,
        onboardingEnabled: true
      }
    } as any)
  })

  it('should render onboarding dialog when open', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    expect(screen.getByText('Welcome to Kinship Atlas!')).toBeInTheDocument()
    expect(screen.getByText(/Let's get you started/i)).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(
      <OnboardingFlow
        isOpen={false}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    expect(screen.queryByText('Welcome to Kinship Atlas!')).not.toBeInTheDocument()
  })

  it('should display progress indicator', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument()
    expect(screen.getByText(/17%/i)).toBeInTheDocument() // 1/6 = ~17%
  })

  it('should navigate to next step', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Add Family Members')).toBeInTheDocument()
      expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument()
    })
  })

  it('should navigate to previous step', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Go to step 2
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Add Family Members')).toBeInTheDocument()
    })

    // Go back to step 1
    const previousButton = screen.getByRole('button', { name: /previous/i })
    await user.click(previousButton)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Kinship Atlas!')).toBeInTheDocument()
    })
  })

  it('should show "Try This Feature" button for steps with routes', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Navigate to step 2 (Family Members)
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      const tryButton = screen.getByRole('button', { name: /try this feature/i })
      expect(tryButton).toBeInTheDocument()
    })
  })

  it('should navigate to feature route when "Try This Feature" is clicked', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Navigate to step 2 (Family Members)
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      const tryButton = screen.getByRole('button', { name: /try this feature/i })
      expect(tryButton).toBeInTheDocument()
    })

    const tryButton = screen.getByRole('button', { name: /try this feature/i })
    await user.click(tryButton)

    expect(mockOnClose).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/add-family-member')
  })

  it('should complete onboarding on final step', async () => {
    const user = userEvent.setup()
    vi.mocked(completeOnboarding).mockResolvedValue({ success: true })

    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Navigate through all steps
    for (let i = 0; i < 5; i++) {
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await waitFor(() => {
        expect(nextButton).toBeInTheDocument()
      })
    }

    // On final step, button should say "Get Started"
    const getStartedButton = screen.getByRole('button', { name: /get started/i })
    await user.click(getStartedButton)

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledOnce()
      expect(mockOnComplete).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
      expect(toast).toHaveBeenCalledWith({
        title: 'Onboarding Complete!',
        description: 'You\'re all set to start building your family history.',
      })
    })
  })

  it('should handle completion error', async () => {
    const user = userEvent.setup()
    vi.mocked(completeOnboarding).mockResolvedValue({
      success: false,
      error: 'Failed to complete onboarding'
    })

    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Navigate to final step
    for (let i = 0; i < 5; i++) {
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await waitFor(() => {
        expect(nextButton).toBeInTheDocument()
      })
    }

    const getStartedButton = screen.getByRole('button', { name: /get started/i })
    await user.click(getStartedButton)

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to complete onboarding',
        variant: 'destructive',
      })
    })
  })

  it('should skip onboarding', async () => {
    const user = userEvent.setup()
    vi.mocked(completeOnboarding).mockResolvedValue({ success: true })

    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const skipButton = screen.getByRole('button', { name: /skip tutorial/i })
    await user.click(skipButton)

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledOnce()
      expect(mockOnComplete).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should close dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Find close button (X icon button)
    const closeButton = screen.getByRole('button', { name: '' })
    const buttons = screen.getAllByRole('button')
    const xButton = buttons.find(btn => btn.querySelector('svg'))
    
    if (xButton) {
      await user.click(xButton)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('should update progress as steps change', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    // Initial step should show 17% (1/6)
    expect(screen.getByText(/17%/i)).toBeInTheDocument()

    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      // Step 2 should show 33% (2/6)
      expect(screen.getByText(/33%/i)).toBeInTheDocument()
    })
  })

  it('should not show previous button on first step', () => {
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })

  it('should show all onboarding steps', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingFlow
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    )

    const steps = [
      'Welcome to Kinship Atlas!',
      'Add Family Members',
      'Create Relationship Stories',
      'Add Artifacts',
      'Upload Media',
      'Family Tree View'
    ]

    for (const stepTitle of steps) {
      expect(screen.getByText(stepTitle)).toBeInTheDocument()
      
      if (stepTitle !== steps[steps.length - 1]) {
        const nextButton = screen.getByRole('button', { name: /next/i })
        await user.click(nextButton)
        await waitFor(() => {
          // Wait for next step to appear
        })
      }
    }
  })
})
